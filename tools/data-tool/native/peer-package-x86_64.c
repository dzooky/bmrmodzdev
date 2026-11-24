/* Diagnostic-only private helper. FD3 is the accepted Unix socket. */
struct ucred { int pid; unsigned int uid; unsigned int gid; };
static long call5(long n,long a,long b,long c,long d,long e){
 long ret; register long r10 __asm__("r10")=d, r8 __asm__("r8")=e;
 __asm__ volatile("syscall":"=a"(ret):"a"(n),"D"(a),"S"(b),"d"(c),"r"(r10),"r"(r8):"rcx","r11","memory");return ret;
}
__attribute__((noreturn)) void _start(void){
 struct ucred peer={0,0,0};unsigned int len=sizeof(peer);
 long rc=call5(55,3,1,17,(long)&peer,(long)&len);
 int ok=rc==0&&len==sizeof(peer)&&peer.pid>0;
 /* Binary private stdout, never returned to the IPC client. */
 if(ok&&call5(1,1,(long)&peer,sizeof(peer),0,0)!=sizeof(peer))ok=0;
 call5(60,ok?0:2,0,0,0,0);for(;;){}
}
