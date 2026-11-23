// Linux-only host prototype. Never install or invoke in the MGU Data Tool.
// The caller explicitly passes an ALREADY ACCEPTED Unix socket as descriptor 3.
// This proof checks the kernel SO_PEERCRED API; it does not authenticate an app.
#define _GNU_SOURCE
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/un.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>
int main(void) {
  struct ucred peer;
  struct sockaddr_storage local;
  socklen_t length = sizeof(peer), address_length = sizeof(local);
  int unix_socket = 0, peer_observed = 0, pid_positive = 0, same_uid = 0;
  if (getsockname(3, (struct sockaddr *)&local, &address_length) == 0)
    unix_socket = local.ss_family == AF_UNIX;
  if (unix_socket && getsockopt(3, SOL_SOCKET, SO_PEERCRED, &peer, &length) == 0 &&
      length == sizeof(peer)) {
    peer_observed = 1;
    pid_positive = peer.pid > 0;
    same_uid = peer.uid == getuid();
  }
  printf("{\"ok\":%s,\"mode\":\"linux-host-proof-only\",\"unixSocket\":%s,"
         "\"kernelPeerObserved\":%s,\"pidPositive\":%s,\"sameUid\":%s,"
         "\"applicationIdentityVerified\":false,\"productionAccessEnabled\":false}\n",
         unix_socket && peer_observed && pid_positive ? "true" : "false",
         unix_socket ? "true" : "false",
         peer_observed ? "true" : "false",
         pid_positive ? "true" : "false",
         same_uid ? "true" : "false");
  // No uid/gid/pid, path, raw socket data, or package name is printed.
  return unix_socket && peer_observed && pid_positive ? 0 : 2;
}
