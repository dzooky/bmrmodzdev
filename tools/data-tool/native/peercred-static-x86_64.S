/* Explicit MGU experiment. Statically linked x86_64 Linux syscalls only.
 * fd 3 = already accepted AF_UNIX client socket; no read/write on fd 3.
 * stdout fixed flags, no PID/UID/GID or package identity. */
.global _start
.section .text
_start:
  sub $64, %rsp
  movl $32, 48(%rsp)
  mov $51, %rax
  mov $3, %rdi
  lea 16(%rsp), %rsi
  lea 48(%rsp), %rdx
  syscall
  test %rax, %rax
  js failed
  cmpw $1, 16(%rsp)
  jne failed
  movl $12, 48(%rsp)
  mov $55, %rax
  mov $3, %rdi
  mov $1, %rsi
  mov $17, %rdx
  lea 0(%rsp), %r10
  lea 48(%rsp), %r8
  syscall
  test %rax, %rax
  js failed
  cmpl $12, 48(%rsp)
  jne failed
  cmpl $0, 0(%rsp)
  jle failed
  mov $1, %rax
  mov $1, %rdi
  lea success(%rip), %rsi
  mov $(success_end-success), %rdx
  syscall
  xor %rdi, %rdi
  jmp done
failed:
  mov $1, %rax
  mov $1, %rdi
  lea failure(%rip), %rsi
  mov $(failure_end-failure), %rdx
  syscall
  mov $2, %rdi
done:
  mov $60, %rax
  syscall
.section .rodata
success:
  .ascii "{\"ok\":true,\"mode\":\"mgu-native-peer-probe\",\"unixSocket\":true,\"kernelPeerObserved\":true,\"applicationIdentityVerified\":false,\"productionAccessEnabled\":false}\n"
success_end:
failure:
  .ascii "{\"ok\":false,\"mode\":\"mgu-native-peer-probe\",\"unixSocket\":false,\"kernelPeerObserved\":false,\"applicationIdentityVerified\":false,\"productionAccessEnabled\":false}\n"
failure_end:
.section .note.GNU-stack,"",@progbits
