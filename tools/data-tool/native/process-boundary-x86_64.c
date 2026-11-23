/* Linux x86_64, libc-free, explicit one-shot diagnostic only.
 * FD3 is the established Unix socket. Peer PID comes ONLY from SO_PEERCRED.
 * Never expose PIDs, UIDs, paths, names, or grant application privileges. */
typedef unsigned long size_t;
struct ucred { int pid; unsigned int uid; unsigned int gid; };
static long call5(long n,long a,long b,long c,long d,long e){
 long ret; register long r10 __asm__("r10")=d, r8 __asm__("r8")=e;
 __asm__ volatile("syscall":"=a"(ret):"a"(n),"D"(a),"S"(b),"d"(c),"r"(r10),"r"(r8):"rcx","r11","memory");return ret;
}
static long call3(long n,long a,long b,long c){return call5(n,a,b,c,0,0);}
static int eq(const char *a,const char *b,size_t n){for(size_t i=0;i<n;i++)if(a[i]!=b[i])return 0;return 1;}
static void append(char *out,size_t *n,const char *s){while(*s&&*n<1800)out[(*n)++]=*s++;}
static void flag(char *out,size_t *n,const char *name,int yes){append(out,n,"\"");append(out,n,name);append(out,n,"\":");append(out,n,yes?"true":"false");append(out,n,",");}
static int pidpath(char *dest,int pid,const char *suffix){
 const char *base="/proc/";size_t n=0;while(*base)dest[n++]=*base++;
 if(pid<=0)return 0;
 char rev[16];int digits=0;
 while(pid>0&&digits<12){rev[digits++]=(char)('0'+pid%10);pid/=10;}
 if(pid>0||digits==0)return 0;
 while(digits)dest[n++]=rev[--digits];
 while(*suffix&&n<100)dest[n++]=*suffix++;
 dest[n]=0;return 1;
}
static long readpath(const char *path,char *buf,long cap){
 long fd=call3(2,(long)path,0,0);if(fd<0)return -1;
 long got=call3(0,fd,(long)buf,cap);
 call3(3,fd,0,0);return got;
}
__attribute__((noreturn))void _start(void){
 struct ucred peer={0,0,0};unsigned int len=sizeof(peer);
 long rc=call5(55,3,1,17,(long)&peer,(long)&len);
 int kernel=rc==0&&len==sizeof(peer)&&peer.pid>0;
 int sameuid=kernel&&(long)peer.uid==call3(102,0,0,0);
 char pathname[128],pcg[2048],scg[2048],stat[512],exe[128];
 long a=-1,b=-1,st=-1,ex=-1;
 if(kernel&&pidpath(pathname,peer.pid,"/cgroup"))a=readpath(pathname,pcg,sizeof(pcg));
 b=readpath("/proc/self/cgroup",scg,sizeof(scg));
 if(kernel&&pidpath(pathname,peer.pid,"/stat"))st=readpath(pathname,stat,sizeof(stat));
 if(kernel&&pidpath(pathname,peer.pid,"/exe"))ex=call3(89,(long)pathname,(long)exe,sizeof(exe));
 int different=a>0&&b>0&&(a!=b||(a==b&&!eq(pcg,scg,(size_t)a)));
 int statparse=0;
 if(st>0)for(long i=0;i<st;i++)if(stat[i]==')'&&i+2<st){statparse=1;break;}
 char out[2048];size_t n=0;
 append(out,&n,"{\"mode\":\"passive-process-boundary\",");
 flag(out,&n,"ok",kernel);
 flag(out,&n,"kernelPeerObserved",kernel);
 flag(out,&n,"sameUidAsService",sameuid);
 flag(out,&n,"peerCgroupReadable",a>0);
 flag(out,&n,"serviceCgroupReadable",b>0);
 flag(out,&n,"peerCgroupDifferentFromService",different);
 flag(out,&n,"peerProcStatReadable",statparse);
 flag(out,&n,"peerExeLinkReadable",ex>0);
 flag(out,&n,"installedPackageIdentityVerified",0);
 flag(out,&n,"processInstanceVerified",0);
 flag(out,&n,"applicationIdentityVerified",0);
 flag(out,&n,"productionAccessEnabled",0);
 append(out,&n,"\"observationOnly\":true}\n");
 call3(1,1,(long)out,n);
 call3(60,kernel?0:2,0,0);
 for(;;){}
}
