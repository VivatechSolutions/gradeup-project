import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

/* ─── FONTS & TOKENS ─────────────────────────────────────── */
const SYSTEM_FONT_STACK = 'system-ui,-apple-system,"Segoe UI",sans-serif';

const T = {
  indigo:"#6366f1",indigoL:"#818cf8",indigoD:"#4338ca",indigoXL:"#c7d2fe",
  purple:"#a855f7",purpleL:"#c084fc",purpleD:"#7c3aed",purpleXL:"#e9d5ff",
  rose:"#f43f5e",roseL:"#fb7185",roseD:"#e11d48",roseXL:"#fecdd3",
  blue:"#3b82f6",blueL:"#60a5fa",blueD:"#1d4ed8",blueXL:"#bfdbfe",
  pink:"#ec4899",cyan:"#06b6d4",cyanL:"#67e8f9",
  emerald:"#10b981",emeraldL:"#34d399",
  amber:"#f59e0b",amberL:"#fcd34d",
};

/* ─── GLOBAL CSS ──────────────────────────────────────────── */
const CSS = `
*{box-sizing:border-box;margin:0;padding:0;font-family:${SYSTEM_FONT_STACK};}
html{scroll-behavior:smooth;}
body{overflow-x:hidden;font-family:${SYSTEM_FONT_STACK};}
button,a{font-family:${SYSTEM_FONT_STACK};cursor:pointer;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-thumb{background:linear-gradient(180deg,${T.indigo},${T.rose},${T.cyan});border-radius:4px;}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes spinR{to{transform:rotate(-360deg)}}
@keyframes spinCounter{to{transform:rotate(-360deg)}}
@keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}33%{transform:translateY(-18px) rotate(1deg)}66%{transform:translateY(-9px) rotate(-1deg)}}
@keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes pulse2{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes shimmer{0%{background-position:-400% center}100%{background-position:400% center}}
@keyframes fadeUp{from{opacity:0;transform:translateY(50px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes orb1{0%{transform:translate(0,0) scale(1)}25%{transform:translate(50px,-40px) scale(1.05)}50%{transform:translate(25px,55px) scale(.97)}75%{transform:translate(-45px,25px) scale(1.03)}100%{transform:translate(0,0) scale(1)}}
@keyframes orb2{0%{transform:translate(0,0)}33%{transform:translate(-55px,35px)}66%{transform:translate(40px,-30px)}100%{transform:translate(0,0)}}
@keyframes dash{to{stroke-dashoffset:-1200}}
@keyframes dash2{to{stroke-dashoffset:-600}}
@keyframes badgePulse{0%,100%{box-shadow:0 0 0 0 rgba(244,63,94,.5)}50%{box-shadow:0 0 0 16px transparent}}
@keyframes ringPulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.12);opacity:.2}}
@keyframes slideX{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes countUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes morphBg{0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}}
@keyframes glitch{0%,100%{clip-path:inset(0 0 100% 0)}10%{clip-path:inset(30% 0 50% 0)}20%{clip-path:inset(60% 0 10% 0)}30%{clip-path:inset(0 0 0 0)}40%{clip-path:inset(80% 0 5% 0)}50%{clip-path:inset(0 0 0 0)}}
@keyframes particleDrift{0%{transform:translateY(0) translateX(0) scale(1);opacity:.7}100%{transform:translateY(-120px) translateX(var(--dx,20px)) scale(.3);opacity:0}}
@keyframes wave{0%,100%{d:path("M0,50 Q200,20 400,50 Q600,80 800,50 L800,100 L0,100 Z")}50%{d:path("M0,50 Q200,80 400,50 Q600,20 800,50 L800,100 L0,100 Z")}}
@keyframes glow-pulse{0%{filter:drop-shadow(0 0 12px ${T.indigo}80)}50%{filter:drop-shadow(0 0 24px ${T.indigo}cc)}100%{filter:drop-shadow(0 0 12px ${T.indigo}80)}}
@keyframes blob-rotate{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes float-smooth{0%,100%{transform:translateY(0) translateX(0)}50%{transform:translateY(-16px) translateX(8px)}}
@keyframes slide-up{0%{opacity:0;transform:translateY(40px)}100%{opacity:1;transform:translateY(0)}}
@keyframes scale-in{0%{opacity:0;transform:scale(.95)}100%{opacity:1;transform:scale(1)}}
/* Slider specific */
.feature-slider-track {
  display:flex;
  gap:24px;
  transition:transform .6s cubic-bezier(.23,1,.32,1);
  will-change:transform;
  user-select:none;
}
.feature-card-wrap {
  flex-shrink:0;
  transition:all .5s cubic-bezier(.23,1,.32,1);
  will-change:transform,opacity,filter;
  cursor:grab;
}
.feature-card-wrap:active {cursor:grabbing;}
.feature-card-inner {
  border-radius:28px;
  overflow:hidden;
  position:relative;
  transition:all .5s cubic-bezier(.23,1,.32,1);
  will-change:transform,box-shadow;
  height:100%;
}
.feature-card-inner:hover .card-shimmer {
  animation:tiltShimmer .7s ease forwards;
}
.card-shimmer {
  position:absolute;top:0;left:-100%;width:50%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);
  pointer-events:none;z-index:10;
  transform:skewX(-15deg);
}
.slider-dot {
  width:8px;height:8px;border-radius:50%;
  transition:all .35s cubic-bezier(.23,1,.32,1);
  cursor:pointer;
}
.slider-dot.active {
  width:28px;border-radius:4px;
}
.parallax-layer-bg{will-change:transform;transform-origin:center center;}
.parallax-layer-mid{will-change:transform;transform-origin:center center;}
.parallax-layer-fg{will-change:transform;transform-origin:center center;}


.parallax-layer{will-change:transform;transform:translateZ(0);}
.gpu{transform:translateZ(0);will-change:transform;backface-visibility:hidden;}
.no-select{user-select:none;}
.smooth-scroll{transform:translateZ(0);backface-visibility:hidden;perspective:1000px;will-change:transform;}
.premium-blur{backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);}
.smooth-transition{transition:all .25s cubic-bezier(.25,.46,.45,.94);}
`;

/* ─── HOOKS ───────────────────────────────────────────────── */
function useScrollY(){
  const [y,setY]=useState(0);
  useEffect(()=>{
    let ticking=false;
    const h=()=>{
      if(!ticking){
        window.requestAnimationFrame(()=>{
          setY(window.scrollY);
          ticking=false;
        });
        ticking=true;
      }
    };
    window.addEventListener("scroll",h,{passive:true});
    return()=>window.removeEventListener("scroll",h);
  },[]);
  return y;
}

function useMouse(){
  const [m,setM]=useState({x:0.5,y:0.5,raw:{x:0,y:0}});
  useEffect(()=>{
    let raf:any=0;
    let next={x:0.5,y:0.5,raw:{x:window.innerWidth*.5,y:window.innerHeight*.5}};
    let throttle:any=0;
    const h=(e:any)=>{
      next={x:e.clientX/window.innerWidth,y:e.clientY/window.innerHeight,raw:{x:e.clientX,y:e.clientY}};
      if(raf||throttle)return;
      throttle=setTimeout(()=>throttle=0,12);
      raf=requestAnimationFrame(()=>{
        setM(next);
        raf=0;
      });
    };
    window.addEventListener("mousemove",h,{passive:true});
    return()=>{
      window.removeEventListener("mousemove",h);
      if(raf)cancelAnimationFrame(raf);
      if(throttle)clearTimeout(throttle);
    };
  },[]);
  return m;
}

function useInView(threshold=0.1){
  const ref=useRef(null);
  const [v,setV]=useState(false);
  useEffect(()=>{
    const o=new IntersectionObserver(([e])=>{if(e.isIntersecting)setV(true);},{threshold});
    if(ref.current)o.observe(ref.current);
    return()=>o.disconnect();
  },[]);
  return[ref,v];
}

function useSectionDepth(sRef){
  const [d,setD]=useState(0);
  useEffect(()=>{
    const h=()=>{
      if(!sRef.current)return;
      const r=sRef.current.getBoundingClientRect();
      const winH=window.innerHeight;
      setD(Math.max(0,Math.min(1,(winH-r.top)/(winH+r.height))));
    };
    window.addEventListener("scroll",h,{passive:true});
    h();
    return()=>window.removeEventListener("scroll",h);
  },[]);
  return d;
}

function useWindowSize(){
  const [s,setS]=useState({w:1200,h:800});
  useEffect(()=>{
    const h=()=>setS({w:window.innerWidth,h:window.innerHeight});
    h();
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
  return s;
}

/* ─── REVEAL ──────────────────────────────────────────────── */
function Reveal({children,delay=0,dir="up",style={}}){
  const [ref,v]=useInView();
  const dirs={up:"translateY(80px)",down:"translateY(-60px)",left:"translateX(-80px)",right:"translateX(80px)",scale:"scale(.75) translateY(30px)"};
  return(
    <div ref={ref} style={{opacity:v?1:0,transform:v?"none":(dirs[dir]||dirs.up),transition:`opacity 1s cubic-bezier(.23,1,.32,1) ${delay}s, transform 1s cubic-bezier(.23,1,.32,1) ${delay}s`,...style}}>
      {children}
    </div>
  );
}

/* ─── MAG BUTTON ──────────────────────────────────────────── */
function Mag({children,onClick,style={},className=""}){
  const el=useRef(null);
  const lastPos=useRef({x:0,y:0});
  const raf=useRef(0);
  
  return(
    <button ref={el}
      onMouseMove={e=>{
        const r=el.current.getBoundingClientRect();
        const x=(e.clientX-r.left-r.width/2)*.32;
        const y=(e.clientY-r.top-r.height/2)*.32;
        if(Math.abs(x-lastPos.current.x)>1||Math.abs(y-lastPos.current.y)>1){
          if(raf.current)cancelAnimationFrame(raf.current);
          raf.current=requestAnimationFrame(()=>{
            el.current.style.transform=`translate(${x}px,${y}px)`;
            lastPos.current={x,y};
            raf.current=0;
          });
        }
      }}
      onMouseLeave={()=>{
        el.current.style.transform="translate(0,0)";
        lastPos.current={x:0,y:0};
        if(raf.current)cancelAnimationFrame(raf.current);
      }}
      onClick={onClick} className={className}
      style={{transition:"transform .2s cubic-bezier(.25,.46,.45,.94)",willChange:"transform",...style}}>
      {children}
    </button>
  );
}

/* ─── TILT CARD ───────────────────────────────────────────── */
function Tilt({children,style={},glow=T.indigo,intensity=14}){
  const el=useRef(null);
  const raf=useRef(0);
  const lastTilt=useRef({x:0,y:0});
  
  return(
    <div ref={el}
      onMouseMove={e=>{
        const r=el.current.getBoundingClientRect();
        const x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
        const rotX=(y-.5)*-intensity,rotY=(x-.5)*intensity;
        
        if(Math.abs(rotX-lastTilt.current.x)>0.3||Math.abs(rotY-lastTilt.current.y)>0.3){
          if(raf.current)cancelAnimationFrame(raf.current);
          raf.current=requestAnimationFrame(()=>{
            el.current.style.transform=`perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
            const g=el.current.querySelector(".tg");
            if(g){g.style.opacity=".8";g.style.left=`${x*100}%`;g.style.top=`${y*100}%`;}
            lastTilt.current={x:rotX,y:rotY};
            raf.current=0;
          });
        }
      }}
      onMouseLeave={()=>{
        el.current.style.transform="perspective(1000px) rotateX(0) rotateY(0) scale(1)";
        const g=el.current.querySelector(".tg");if(g)g.style.opacity="0";
        lastTilt.current={x:0,y:0};
        if(raf.current)cancelAnimationFrame(raf.current);
      }}
      style={{position:"relative",overflow:"hidden",transformStyle:"preserve-3d",transition:"transform .28s cubic-bezier(.25,.46,.45,.94)",willChange:"transform",...style}}>
      <div className="tg" style={{position:"absolute",width:280,height:280,borderRadius:"50%",background:`radial-gradient(circle,${glow}75,transparent 70%)`,transform:"translate(-50%,-50%)",pointerEvents:"none",opacity:0,transition:"opacity .18s",zIndex:1}}/>
      {children}
    </div>
  );
}

/* ─── COUNTER ─────────────────────────────────────────────── */
function Counter({end,suffix="",prefix=""}){
  const [v,setV]=useState(0);
  const [ref,inView]=useInView();
  useEffect(()=>{
    if(!inView)return;
    let s=0;const step=end/100;
    const t=setInterval(()=>{s+=step;if(s>=end){setV(end);clearInterval(t);}else setV(Math.floor(s));},14);
    return()=>clearInterval(t);
  },[inView,end]);
  return <span ref={ref}>{prefix}{v>=1000?v.toLocaleString():v}{suffix}</span>;
}

/* ─── CUSTOM CURSOR ───────────────────────────────────────── */
function Cursor(){
  const {w:winW}=useWindowSize();
  const dot=useRef(null),ring=useRef(null);
  const pos=useRef({x:0,y:0}),lp=useRef({x:0,y:0});
  const [hovered,setHovered]=useState(false);
  useEffect(()=>{
    if(winW<1024)return;
    const mv=(e)=>{
      pos.current={x:e.clientX,y:e.clientY};
      if(dot.current){dot.current.style.transform=`translate(${e.clientX-5}px,${e.clientY-5}px)`;}
    };
    const over=(e)=>setHovered(e.target.closest("button,a,[data-hover]")!=null);
    window.addEventListener("mousemove",mv,{passive:true});
    window.addEventListener("mouseover",over,{passive:true});
    let raf;
    const tick=()=>{
      lp.current.x+=(pos.current.x-lp.current.x)*.09;
      lp.current.y+=(pos.current.y-lp.current.y)*.09;
      if(ring.current){ring.current.style.transform=`translate(${lp.current.x-20}px,${lp.current.y-20}px) scale(${hovered?1.6:1})`;}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseover",over);cancelAnimationFrame(raf);};
  },[hovered,winW]);
  if(winW<1024)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:99999,pointerEvents:"none"}}>
      <div ref={dot} style={{position:"fixed",top:0,left:0,width:10,height:10,borderRadius:"50%",background:"#fff",boxShadow:"0 0 12px rgba(255,255,255,.8)",willChange:"transform"}}/>
      <div ref={ring} style={{position:"fixed",top:0,left:0,width:40,height:40,borderRadius:"50%",border:`1.5px solid ${T.indigoL}cc`,transition:"transform .12s ease-out",willChange:"transform"}}/>
    </div>
  );
}

/* ─── PROGRESS BAR ────────────────────────────────────────── */
function ProgressBar(){
  const [p,setP]=useState(0);
  useEffect(()=>{
    const h=()=>{const d=document.documentElement;setP(d.scrollTop/(d.scrollHeight-d.clientHeight)*100);};
    window.addEventListener("scroll",h,{passive:true});
    return()=>window.removeEventListener("scroll",h);
  },[]);
  return <div style={{position:"fixed",top:0,left:0,zIndex:9999,height:3,width:`${p}%`,background:`linear-gradient(90deg,${T.blue},${T.indigo},${T.purple},${T.rose},${T.amber})`,boxShadow:`0 0 20px ${T.indigo}`,transition:"width .05s"}}/>;
}

/* ─── PARTICLES ───────────────────────────────────────────── */
function Particles({count=24,isDark}){
  const particles=useRef(null);
  const pData=useRef([...Array(count)].map((_,i)=>({
    x:Math.random()*100,y:Math.random()*100+50,
    size:1.5+Math.random()*3,
    color:[T.indigo,T.rose,T.blue,T.purple,T.cyan,T.amber][i%6],
    dur:3+Math.random()*5,delay:Math.random()*4,
    dx:(Math.random()-.5)*60,
  })));
  return(
    <div ref={particles} style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
      {pData.current.map((p,i)=>(
        <div key={i} style={{
          position:"absolute",left:`${p.x}%`,top:`${p.y}%`,
          width:p.size,height:p.size,borderRadius:"50%",background:p.color,
          opacity:isDark?.55:.35,
          animation:`particleDrift ${p.dur}s ${p.delay}s ease-out infinite`,
          "--dx":`${p.dx}px`,
        }}/>
      ))}
    </div>
  );
}

/* ─── BACKGROUND ──────────────────────────────────────────── */
function BgLayer({scrollY,theme}){
  const isDark=theme==="dark";
  return(
    <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
      {/* Base gradient */}
      <div style={{position:"absolute",inset:0,background:isDark
        ?"radial-gradient(ellipse at 15% 15%,#12062a 0%,#080318 45%,#030612 100%)"
        :"radial-gradient(ellipse at 15% 15%,#f0ecff 0%,#fde8f3 28%,#e8f0ff 55%,#e0faf6 80%,#fff8e8 100%)"}}/>
      
      {/* Grid */}
      <div style={{position:"absolute",inset:0,opacity:isDark?.04:.07,
        backgroundImage:`linear-gradient(${isDark?"#818cf880":"#6366f180"} 1px,transparent 1px),linear-gradient(90deg,${isDark?"#818cf880":"#6366f180"} 1px,transparent 1px)`,
        backgroundSize:"72px 72px",transform:`translateY(${scrollY*.06}px)`}}/>

      {/* Animated orbs – light gets vivid colours */}
      {[
        {w:1000,h:1000,t:"-28%",l:"-22%",g:isDark?`${T.indigo}20,${T.purple}10`:`${T.indigo}55,${T.purpleL}30`,spd:.14,anim:"orb1 22s ease-in-out infinite"},
        {w:750,h:750,t:"20%",r:"-18%",g:isDark?`${T.rose}18,${T.pink}08`:`${T.rose}60,${T.pink}32`,spd:-.12,anim:"orb2 17s ease-in-out infinite"},
        {w:600,h:600,b:"0%",l:"18%",g:isDark?`${T.blue}14,${T.cyan}06`:`${T.blue}50,${T.cyan}26`,spd:-.2,anim:"orb1 27s ease-in-out infinite 5s"},
        {w:480,h:480,t:"52%",r:"22%",g:isDark?`${T.purple}16`:`${T.purple}45,${T.purpleL}20`,spd:.24,anim:"orb2 13s ease-in-out infinite 8s"},
        {w:700,h:360,t:"2%",r:"-3%",g:isDark?`${T.rose}10`:`${T.amber}35,${T.rose}20`,spd:.08,anim:"orb1 19s ease-in-out infinite 3s"},
        {w:420,h:420,b:"15%",r:"8%",g:isDark?`${T.cyan}10`:`${T.cyan}38,${T.emerald}18`,spd:-.15,anim:"orb2 24s ease-in-out infinite 11s"},
      ].map((o,i)=>(
        <div key={i} style={{position:"absolute",width:o.w,height:o.h,borderRadius:"50%",
          ...(o.t?{top:o.t}:{}),  ...(o.b?{bottom:o.b}:{}),
          ...(o.l?{left:o.l}:{}),  ...(o.r?{right:o.r}:{}),
          background:`radial-gradient(circle,${o.g},transparent 70%)`,
          filter:`blur(${70+i*10}px)`,
          transform:`translateY(${scrollY*o.spd}px)`,
          animation:o.anim}}/>
      ))}

      {/* Noise texture */}
      <div style={{position:"absolute",inset:0,opacity:isDark?.025:.018,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize:"200px 200px"}}/>

      {/* Light mode: extra colour layers */}
      {!isDark&&<>
        <div style={{position:"absolute",inset:0,opacity:.06,
          backgroundImage:"radial-gradient(circle at 80% 10%,#f59e0b,transparent 40%),radial-gradient(circle at 5% 90%,#06b6d4,transparent 35%)"}}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:320,opacity:.12,
          background:`linear-gradient(to top,${T.indigo}22,transparent)`}}/>
      </>}
    </div>
  );
}

/* ─── 3D HERO BRAIN (simplified elegant design) ─────────────── */
function HeroBrain3D({mouse,scrollY,isDark}){
  const container=useRef(null);
  const [tick,setTick]=useState(0);
  const time=useRef(0);
  
  useEffect(()=>{
    const id=setInterval(()=>{time.current+=.016;setTick(n=>n+1);},60);
    return()=>clearInterval(id);
  },[]);

  const mx=(mouse.x-.5)*28,my=(mouse.y-.5)*20;
  const t=time.current;

  /* Simple rotating rings with glow */
  const ringConfigs=[
    {r:180,dur:28,rev:false,dots:3,dotR:7,c:T.indigo,opacity:.6},
    {r:120,dur:18,rev:true,dots:4,dotR:5.5,c:T.rose,opacity:.5},
    {r:70,dur:12,rev:false,dots:2,dotR:4,c:T.blue,opacity:.4},
  ];

  return(
    <div ref={container} style={{position:"relative",width:520,height:400,flexShrink:0,
      transform:`translateY(${scrollY*-.14}px)`,transition:"transform .08s",willChange:"transform"}}>

      {/* Animated morphing blobs in background */}
      {[0,1,2].map((i)=>{
        const blob_t=t+i*1.2;
        const scale=1.2+Math.sin(blob_t*.4)*0.3;
        const rotY=Math.sin(blob_t*.2)*15;
        const rotX=Math.cos(blob_t*.25)*12;
        return(
          <div key={i} style={{position:"absolute",left:"50%",top:"50%",transform:`translate(-50%,-50%) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`,
            width:260-i*40,height:260-i*40,borderRadius:`${60-i*15}% ${40+i*8}% ${35-i*10}% ${65+i*5}%`,
            background:i===0?`linear-gradient(135deg,${T.indigo}${isDark?"20":"28"},${T.purple}${isDark?"12":"18"})`
              :i===1?`linear-gradient(45deg,${T.rose}${isDark?"14":"20"},${T.pink}${isDark?"08":"12"})`
              :`linear-gradient(225deg,${T.blue}${isDark?"16":"22"},${T.cyan}${isDark?"08":"14"})`,
            filter:`blur(${8+i*5}px)`,
            willChange:"transform",
            transition:"all .16s",
            animation:`morphBg ${10+i*2}s ease-in-out infinite`,
            animationDelay:`${i*.6}s`,
            opacity:isDark?0.7:0.6,
            zIndex:1-i}}/>
        );
      })}

      {/* Rotating rings with dots */}
      {ringConfigs.map((rc,ri)=>(
        <div key={ri} style={{position:"absolute",left:"50%",top:"50%",
          width:rc.r*2,height:rc.r*2,marginLeft:-rc.r,marginTop:-rc.r,
          borderRadius:"50%",
          border:`1.2px solid ${rc.c}${isDark?"25":"35"}`,
          animation:`${rc.rev?"spinR":"spin"} ${rc.dur}s linear infinite`,
          boxShadow:`0 0 20px ${rc.c}${isDark?"12":"16"}`,
          zIndex:10-ri}}>
          {[...Array(rc.dots)].map((_,di)=>{
            const ang=(di/rc.dots)*Math.PI*2;
            const cx=rc.r+rc.r*Math.cos(ang)-rc.dotR;
            const cy=rc.r+rc.r*Math.sin(ang)-rc.dotR;
            return(
              <div key={di} style={{position:"absolute",left:cx,top:cy,
                width:rc.dotR*2,height:rc.dotR*2,borderRadius:"50%",
                background:rc.c,
                boxShadow:`0 0 ${rc.dotR*2.5}px ${rc.c}`,
                opacity:rc.opacity}}/>
            );
          })}
        </div>
      ))}

      {/* Floating stats badges with smooth parallax */}
      {[
        {label:"AI Power",val:"99%",color:T.emerald,x:-65,y:45,speed:.24},
        {label:"Active",val:"500K+",color:T.rose,x:420,y:130,speed:.16},
        {label:"Global",val:"50+",color:T.blue,x:-40,y:310,speed:.30},
        {label:"Success",val:"98%",color:T.amber,x:425,y:50,speed:.20},
      ].map((b,i)=>(
        <div key={i} style={{position:"absolute",left:b.x,top:b.y,
          padding:"12px 20px",borderRadius:18,
          backdropFilter:"blur(16px)",
          background:isDark?`${b.color}12`:`.${b.color}18`,
          border:`1.5px solid ${b.color}${isDark?"35":"45"}`,
          boxShadow:`0 8px 28px ${b.color}${isDark?"15":"22"}`,
          animation:`float-smooth ${2.5+i*.5}s ease-in-out infinite`,
          animationDelay:`${i*.3}s`,
          transform:`translate(${mx*b.speed}px,${my*b.speed}px)`,
          transition:"transform .24s cubic-bezier(.25,.46,.45,.94)",
          zIndex:20,willChange:"transform"}}>
          <div style={{fontSize:9,color:b.color,fontWeight:800,letterSpacing:".12em",opacity:.9}}>{b.label}</div>
          <div style={{fontSize:18,fontWeight:900,color:b.color,letterSpacing:"-.02em",marginTop:4}}>{b.val}</div>
        </div>
      ))}

      {/* Center glow orb */}
      <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",
        width:200,height:200,borderRadius:"50%",
        background:`radial-gradient(circle,${T.indigo}${isDark?"25":"32"},${T.purple}${isDark?"08":"12"},transparent 70%)`,
        filter:"blur(32px)",
        animation:`glow-pulse 3s ease-in-out infinite`,
        zIndex:5}}/>
    </div>
  );
}

/* ─── 3D PLANET ───────────────────────────────────────────── */
function Planet3D({scrollY,isDark,mouse}){
  const {w:winW}=useWindowSize();
  const time=useRef(0);
  const [tick,setTick]=useState(0);
  
  useEffect(()=>{
    let raf=0;
    let last=performance.now();
    const loop=(now)=>{
      const delta=Math.min(16,now-last);
      last=now;
      time.current+=delta*0.0003;
      setTick(n=>n+1);
      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(raf);
  },[]);

  const t=time.current;
  const mx=(mouse.x-.5)*14,my=(mouse.y-.5)*10;
  
  // Responsive sizing
  let size, planetRadius, ringRadii;
  if(winW<480){
    size=320;
    planetRadius=size*0.24;
    ringRadii=[size*0.30,size*0.36,size*0.42,size*0.48,size*0.52];
  } else if(winW<768){
    size=480;
    planetRadius=size*0.26;
    ringRadii=[size*0.32,size*0.38,size*0.44,size*0.50,size*0.56];
  } else if(winW<1024){
    size=640;
    planetRadius=size*0.27;
    ringRadii=[size*0.34,size*0.40,size*0.46,size*0.52,size*0.58];
  } else {
    size=800;
    planetRadius=size*0.28;
    ringRadii=[size*0.36,size*0.42,size*0.48,size*0.54,size*0.60];
  }
  
  const center=size/2;
  
  // Dashboard feature nodes - orbiting around rings
  const featureNodes=[
    {label:"Analytics",icon:"📊",color:T.indigo,orbitSpeed:0.35,distRadius:ringRadii[4]},
    {label:"AI Tutor",icon:"🤖",color:T.cyan,orbitSpeed:0.38,distRadius:ringRadii[4]},
    {label:"Quiz Bank",icon:"❓",color:T.blue,orbitSpeed:0.32,distRadius:ringRadii[3]},
    {label:"Study Path",icon:"🗺️",color:T.purple,orbitSpeed:0.36,distRadius:ringRadii[3]},
    {label:"Live Chat",icon:"💬",color:T.rose,orbitSpeed:0.34,distRadius:ringRadii[2]},
    {label:"Achievements",icon:"🏆",color:T.emerald,orbitSpeed:0.37,distRadius:ringRadii[2]},
    {label:"Community",icon:"👥",color:T.amber,orbitSpeed:0.33,distRadius:ringRadii[1]},
    {label:"Feedback",icon:"⚡",color:T.pink,orbitSpeed:0.39,distRadius:ringRadii[1]},
  ];

  // Ring data with proper rotation
  const rings=[
    {rx:ringRadii[0],ry:ringRadii[0]*0.055,color:T.cyan,glowColor:T.cyanL,strokeWidth:1.2,rotationAngle:t*180,speed:42},
    {rx:ringRadii[1],ry:ringRadii[1]*0.060,color:T.indigo,glowColor:T.indigoL,strokeWidth:1.5,rotationAngle:-t*200,speed:35},
    {rx:ringRadii[2],ry:ringRadii[2]*0.065,color:T.rose,glowColor:T.roseL,strokeWidth:1.4,rotationAngle:t*220,speed:40},
    {rx:ringRadii[3],ry:ringRadii[3]*0.070,color:T.blue,glowColor:T.blueL,strokeWidth:1.3,rotationAngle:-t*190,speed:38},
    {rx:ringRadii[4],ry:ringRadii[4]*0.075,color:T.purple,glowColor:T.purpleL,strokeWidth:1.6,rotationAngle:t*240,speed:45},
  ];

  return(
    <div style={{position:"relative",width:size,height:size,margin:"0 auto",
      transform:`translateY(${scrollY*.04}px) scale(${winW<480?.85:winW<768?.92:1})`,
      transition:"transform .12s cubic-bezier(.25,.46,.45,.94)",willChange:"transform", perspective:"1200px"}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{overflow:"visible",
        transformStyle:"preserve-3d",willChange:"transform",transition:"transform .15s ease-out"}}>
        <defs>
          <radialGradient id="planetGrad" cx="35%" cy="32%">
            <stop offset="0%" stopColor={T.indigoL}/>
            <stop offset="35%" stopColor={T.purpleD}/>
            <stop offset="100%" stopColor="#0a0420"/>
          </radialGradient>
          <radialGradient id="atmosphereGrad" cx="50%" cy="50%">
            <stop offset="60%" stopColor="transparent"/>
            <stop offset="100%" stopColor={`${T.indigo}${isDark?"40":"55"}`}/>
          </radialGradient>
          <filter id="ringGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="planetShadow">
            <feGaussianBlur stdDeviation="6"/>
          </filter>
        </defs>

        {/* Planet shadow */}
        <circle cx={center} cy={center} r={planetRadius+8} fill="rgba(0,0,0,.25)" filter="url(#planetShadow)"/>
        
        {/* Planet body */}
        <circle cx={center} cy={center} r={planetRadius} fill="url(#planetGrad)"/>

        {/* Planet surface details - ROTATING */}
        {[
          [center-planetRadius*0.28,center-planetRadius*0.32,planetRadius*0.24,planetRadius*0.18],
          [center+planetRadius*0.18,center-planetRadius*0.20,planetRadius*0.20,planetRadius*0.14],
          [center-planetRadius*0.12,center+planetRadius*0.24,planetRadius*0.18,planetRadius*0.12],
        ].map(([cx,cy,rx,ry],i)=>(
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={T.emerald} 
            opacity={isDark?.22:.28}
            transform={`rotate(${t*88+i*120},${center},${center})`}/>
        ))}

        {/* Atmosphere glow */}
        <circle cx={center} cy={center} r={planetRadius+10} fill="url(#atmosphereGrad)"/>
        <circle cx={center} cy={center} r={planetRadius+12} fill="none" stroke={T.indigoL} 
          strokeWidth={size/48} opacity={isDark?.14:.20}/>

        {/* ══ ROTATING RINGS ══════════════════════════════════════ */}
        {rings.map((ring,idx)=>{
          const angle=ring.rotationAngle;
          const rotTransform=`rotateZ(${angle}deg)`;
          return(
            <g key={idx}>
              {/* Ring stroke */}
              <ellipse cx={center} cy={center} rx={ring.rx} ry={ring.ry} fill="none"
                stroke={ring.color} strokeWidth={ring.strokeWidth} 
                opacity={isDark?.75:.85}
                filter="url(#ringGlow)"
                transform={rotTransform}/>
              
              {/* Ring glow */}
              <ellipse cx={center} cy={center} rx={ring.rx} ry={ring.ry} fill="none"
                stroke={ring.glowColor} strokeWidth={ring.strokeWidth*3.5} 
                opacity={isDark?.14:.18}
                filter="url(#ringGlow)"
                transform={rotTransform}/>
            </g>
          );
        })}
      </svg>

      {/* ══ ORBITING FEATURE NODES (on ring axis) ══════════════════════════════════════ */}
      {featureNodes.map((node,idx)=>{
        // Nodes orbit around the rings
        const orbitAngle=t*node.orbitSpeed+(idx*(Math.PI*2/featureNodes.length));
        const frontness=(Math.sin(orbitAngle)+1)/2;
        const nodeX=center+Math.cos(orbitAngle)*node.distRadius+mx*(0.05+frontness*0.08);
        const nodeY=center+Math.sin(orbitAngle)*node.distRadius*0.55+my*(0.04+frontness*0.06)-scrollY*0.01*frontness;
        const scale=0.70+frontness*0.85;
        
        // Responsive sizing
        let badgeWidth, badgeHeight, iconSize, labelSize, borderRadius;
        if(winW<480){
          badgeWidth=winW<360?72:80;
          badgeHeight=winW<360?44:48;
          iconSize=16+frontness*9;
          labelSize=8;
          borderRadius=20;
        } else if(winW<768){
          badgeWidth=96;
          badgeHeight=56;
          iconSize=20+frontness*11;
          labelSize=9;
          borderRadius=24;
        } else {
          badgeWidth=128;
          badgeHeight=62;
          iconSize=24+frontness*13;
          labelSize=10;
          borderRadius=28;
        }
        
        const isVisible=frontness>0.12;
        if(!isVisible)return null;
        const isFront=frontness>0.62;
        
        return(
          <div key={node.label} style={{
            position:"absolute",
            left:nodeX,
            top:nodeY,
            transform:`translate(-50%,-50%) scale(${scale}) translateZ(0)`,
            transformOrigin:"center",
            zIndex:Math.round(20+frontness*40),
            opacity:Math.max(0.35,0.55+frontness*0.40),
            pointerEvents:"none",
            willChange:"transform, opacity",
            transition:"none",
            filter:`drop-shadow(0 ${isFront?36:18}px ${isFront?56:32}px ${node.color}${isFront?"85":"50"}) drop-shadow(0 0 ${isFront?32:16}px ${node.color}${isFront?"70":"35"})`
          }}>
            {/* Premium metallic accent line */}
            <div style={{
              position:"absolute",
              top:0,
              left:"50%",
              transform:"translateX(-50%)",
              width:"80%",
              height:2,
              background:`linear-gradient(90deg,transparent,${node.color}99,transparent)`,
              borderRadius:1,
              opacity:isFront?.9:.4
            }}/>
            
            {/* Animated ring pulse effect */}
            {isFront&&<div style={{
              position:"absolute",
              inset:-12,
              borderRadius:"50%",
              border:`1.5px solid ${node.color}`,
              opacity:0.3,
              animation:`ringPulse 2s cubic-bezier(.4,.0,.6,1) infinite`,
              pointerEvents:"none"
            }}/>}
            
            {/* Main feature card */}
            <div style={{
              position:"relative",
              width:badgeWidth,
              height:badgeHeight,
              borderRadius:borderRadius,
              background:isDark
                ?`linear-gradient(135deg,${node.color}${isFront?"55":"35"},${node.color}${isFront?"22":"10"})`
                :`linear-gradient(135deg,${node.color}${isFront?"40":"24"},${node.color}${isFront?"18":"08"})`,
              border:`${isFront?2.4:1.8}px solid ${node.color}${isFront?"dd":"66"}`,
              boxShadow:isFront
                ?`0 0 0 ${isFront?1.5:0}px ${node.color}${isDark?"40":"30"}, 
                   0 0 32px ${node.color}${isDark?"75":"65"}, 
                   inset 0 1px 8px ${node.color}${isDark?"50":"60"}, 
                   inset 0 0 24px ${node.color}${isDark?"15":"20"}`
                :`0 0 20px ${node.color}${isDark?"50":"55"}, 
                   inset 0 1px 4px ${node.color}${isDark?"35":"45"}`,
              backdropFilter:`blur(${isFront?40:28}px)`,
              WebkitBackdropFilter:`blur(${isFront?40:28}px)`,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              gap:isFront?12:8,
              fontWeight:900,
              color:isDark?"#f8fafc":"#0f172a",
              transition:"all .25s cubic-bezier(.23,1,.32,1)",
              overflow:"hidden",
              whiteSpace:"nowrap",
              position:"relative"
            }}>
              {/* Background shimmer effect */}
              <div style={{
                position:"absolute",
                inset:0,
                background:`linear-gradient(45deg,transparent,${node.color}${isDark?"08":"12"},transparent)`,
                pointerEvents:"none",
                opacity:isFront?.6:.2
              }}/>
              
              {/* Icon with enhanced glow */}
              <span style={{
                fontSize:iconSize,
                lineHeight:1,
                fontWeight:700,
                transition:"all .25s cubic-bezier(.23,1,.32,1)",
                flexShrink:0,
                textShadow:`0 0 ${isFront?24:12}px ${node.color}${isDark?"95":"75"}`,
                filter:`drop-shadow(0 0 ${isFront?16:8}px ${node.color}${isDark?"80":"60"})`,
                position:"relative",
                zIndex:1
              }}>{node.icon}</span>
              
              {/* Label with better typography */}
              {frontness>0.48&&<span style={{
                whiteSpace:"nowrap",
                transition:"all .25s cubic-bezier(.23,1,.32,1)",
                fontSize:labelSize,
                letterSpacing:".7px",
                fontWeight:900,
                textTransform:"uppercase",
                position:"relative",
                zIndex:1,
                textShadow:`0 1px 2px ${node.color}${isDark?"40":"30"}`
              }}>{node.label}</span>}
            </div>
          </div>
        );
      })}

      {/* Premium glow layers */}
      <div style={{position:"absolute",bottom:-winW<480?60:-80,left:"50%",transform:"translateX(-50%)",
        width:size*0.65,height:size*0.12,borderRadius:"50%",
        background:`radial-gradient(ellipse,${T.indigo}${isDark?"35":"48"},transparent 60%)`,
        filter:"blur(32px)",boxShadow:`0 0 100px ${T.indigo}70, 0 20px 60px ${T.indigo}50`}}/>
      
      <div style={{position:"absolute",bottom:-winW<480?55:-70,left:"50%",transform:"translateX(-50%)",
        width:size*0.52,height:size*0.10,borderRadius:"50%",
        background:`radial-gradient(ellipse,${T.purple}${isDark?"22":"32"},transparent 70%)`,
        filter:"blur(40px)"}}/>
      
      <div style={{position:"absolute",bottom:-winW<480?50:-60,left:"50%",transform:"translateX(-50%)",
        width:size*0.40,height:size*0.08,borderRadius:"50%",
        background:`radial-gradient(ellipse,${T.rose}${isDark?"16":"24"},transparent 75%)`,
        filter:"blur(28px)"}}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADVANCED PARALLAX FEATURE SLIDER
   ═══════════════════════════════════════════════════════════ */
const STUDENT_FEATURES = [
  {
    icon:"🧠", title:"AI Tutor", tag:"Neural Adaptive",
    desc:"42+ signal cognitive tracking. The AI adapts your curriculum every 30 seconds based on your learning velocity and attention patterns.",
    color:T.indigo, glow:T.indigoL,
    stats:[{l:"Signals",v:"42+"},{l:"Adapt",v:"30s"},{l:"Accuracy",v:"94%"}],
    mockup:[
      {type:"bar",label:"Focus",val:92,c:T.indigo},
      {type:"bar",label:"Retention",val:88,c:T.cyan},
      {type:"bar",label:"Speed",val:85,c:T.emerald},
    ],
    role:"student",
  },
  {
    icon:"📊", title:"Progress Dashboard", tag:"Live Analytics",
    desc:"Real-time visual performance tracking, weakness heatmaps, streak monitoring, and AI-powered grade forecasting with 92% accuracy.",
    color:T.blue, glow:T.blueL,
    stats:[{l:"Metrics",v:"25+"},{l:"Forecast",v:"92%"},{l:"Streaks",v:"Live"}],
    mockup:[
      {type:"line",points:[42,66,50,82,60,90,70,88,76,94],c:T.cyan},
    ],
    role:"student",
  },
  {
    icon:"📚", title:"Book Library", tag:"50K+ Resources",
    desc:"Curated digital library with AI-powered recommendations. Summaries, annotations, and linked practice questions for every resource.",
    color:T.emerald, glow:T.emeraldL,
    stats:[{l:"Books",v:"50K+"},{l:"Topics",v:"200+"},{l:"Formats",v:"PDF,Audio"}],
    mockup:[],
    role:"student",
  },
  {
    icon:"📝", title:"Homework Helper", tag:"Instant Feedback",
    desc:"Sub-100ms AI analysis on every submitted answer with targeted micro-explanations that pinpoint exactly where your thinking went wrong.",
    color:T.amber, glow:T.amberL,
    stats:[{l:"Response",v:"<100ms"},{l:"Accuracy",v:"96%"},{l:"Subjects",v:"All"}],
    mockup:[],
    role:"student",
  },
  {
    icon:"💬", title:"Community Hub", tag:"Peer Learning",
    desc:"AI-enhanced peer collaboration with live co-study rooms, guided group sessions, and real-time doubt resolution from top students.",
    color:T.pink, glow:T.roseL,
    stats:[{l:"Active",v:"50K"},{l:"Rooms",v:"1K+"},{l:"Response",v:"<2min"}],
    mockup:[],
    role:"student",
  },
  {
    icon:"👥", title:"Group Chat", tag:"Real-time Collab",
    desc:"Structured group discussions with AI moderation, topic threading, resource sharing, and smart summarization of long conversations.",
    color:T.purple, glow:T.purpleL,
    stats:[{l:"Groups",v:"Unlimited"},{l:"Members",v:"Up to 200"},{l:"AI",v:"Moderated"}],
    mockup:[],
    role:"student",
  },
  {
    icon:"🏆", title:"Achievements", tag:"Gamified Progress",
    desc:"Streaks, XP, dynamic leaderboards, and unlockable badges powered by behavioral science to keep your learning momentum at peak.",
    color:T.amber, glow:T.amberL,
    stats:[{l:"Badges",v:"100+"},{l:"XP Levels",v:"50"},{l:"Leaderboard",v:"Global"}],
    mockup:[],
    role:"student",
  },
  {
    icon:"⚔️", title:"Debate Arena", tag:"Critical Thinking",
    desc:"AI-powered debate platform where you argue positions, receive structured counter-arguments, and develop critical reasoning skills.",
    color:T.rose, glow:T.roseL,
    stats:[{l:"Topics",v:"500+"},{l:"Skill",v:"Critical"},{l:"AI",v:"Referee"}],
    mockup:[],
    role:"student",
  },
  {
    icon:"🎥", title:"Live Meetings", tag:"Virtual Classroom",
    desc:"HD video meetings with AI transcription, live Q&A management, breakout rooms, whiteboard collaboration, and automatic notes.",
    color:T.cyan, glow:T.cyanL,
    stats:[{l:"HD",v:"1080p"},{l:"Latency",v:"<50ms"},{l:"Capacity",v:"500+"}],
    mockup:[],
    role:"student",
  },
  {
    icon:"🎓", title:"Seminars", tag:"Expert Sessions",
    desc:"Live and recorded expert-led seminars with interactive polls, Q&A queues, resource downloads, and certificates of completion.",
    color:T.teal, glow:"#5eead4",
    stats:[{l:"Experts",v:"200+"},{l:"Weekly",v:"50+ Live"},{l:"Cert",v:"Verified"}],
    mockup:[],
    role:"student",
  },
  {
    icon:"📋", title:"Exam Prep", tag:"Smart Assessment",
    desc:"Adaptive mock exams that recalibrate difficulty mid-session. Detailed post-exam analytics show exactly what to study next.",
    color:T.violet, glow:T.purpleL,
    stats:[{l:"Banks",v:"100K Qs"},{l:"Adaptive",v:"Real-time"},{l:"Analysis",v:"Deep"}],
    mockup:[],
    role:"student",
  },
  {
    icon:"🗓️", title:"Calendar", tag:"Smart Schedule",
    desc:"AI-powered study scheduler that auto-plans your sessions based on exam dates, energy patterns, and retention science.",
    color:T.sky, glow:T.blueL,
    stats:[{l:"Plans",v:"Auto"},{l:"Reminders",v:"Smart"},{l:"Sync",v:"All apps"}],
    mockup:[],
    role:"student",
  },
];

const TEACHER_FEATURES = [
  {
    icon:"🛠️", title:"Content Manager", tag:"Create & Publish",
    desc:"Advanced drag-and-drop content builder with AI-assisted writing, multimedia embedding, and auto-generated assessments for every lesson.",
    color:T.emerald, glow:T.emeraldL,
    stats:[{l:"Templates",v:"500+"},{l:"AI Assist",v:"Yes"},{l:"Formats",v:"20+"}],
    mockup:[],
    role:"teacher",
  },
  {
    icon:"👩‍🎓", title:"Student Manager", tag:"Full Roster View",
    desc:"Comprehensive student tracking with individual performance cards, engagement scores, at-risk alerts, and parent communication tools.",
    color:T.blue, glow:T.blueL,
    stats:[{l:"Per Student",v:"40+ KPIs"},{l:"Alerts",v:"Real-time"},{l:"Export",v:"CSV/PDF"}],
    mockup:[],
    role:"teacher",
  },
  {
    icon:"📎", title:"Assignments", tag:"Auto-Grade",
    desc:"Create, distribute, and auto-grade assignments at scale. AI checks short answers, flags plagiarism, and provides rubric-aligned feedback.",
    color:T.amber, glow:T.amberL,
    stats:[{l:"Auto-grade",v:"90%"},{l:"Plagiarism",v:"AI check"},{l:"Rubrics",v:"Custom"}],
    mockup:[],
    role:"teacher",
  },
  {
    icon:"📈", title:"Analytics Suite", tag:"Data-Driven Teaching",
    desc:"Deep-dive class analytics with cohort comparisons, learning gap maps, predictive dropout alerts, and curriculum effectiveness scores.",
    color:T.purple, glow:T.purpleL,
    stats:[{l:"Metrics",v:"80+"},{l:"Cohorts",v:"Compare"},{l:"Predictions",v:"AI"}],
    mockup:[
      {type:"bar",label:"Engagement",val:87,c:T.purple},
      {type:"bar",label:"Completion",val:91,c:T.indigo},
      {type:"bar",label:"Mastery",val:78,c:T.rose},
    ],
    role:"teacher",
  },
  {
    icon:"📤", title:"PDF Uploader", tag:"Instant Library",
    desc:"Upload PDFs and watch AI automatically extract key concepts, generate quizzes, create flashcards, and index for smart search.",
    color:T.rose, glow:T.roseL,
    stats:[{l:"OCR",v:"99%"},{l:"Quiz Gen",v:"Auto"},{l:"Languages",v:"40+"}],
    mockup:[],
    role:"teacher",
  },
  {
    icon:"💬", title:"Community", tag:"Teacher Network",
    desc:"Connect with educators globally to share lesson plans, teaching strategies, and collaborate on curriculum improvement projects.",
    color:T.cyan, glow:T.cyanL,
    stats:[{l:"Teachers",v:"20K+"},{l:"Resources",v:"Shared"},{l:"Collab",v:"Global"}],
    mockup:[],
    role:"teacher",
  },
  {
    icon:"🗓️", title:"Class Calendar", tag:"Schedule Manager",
    desc:"Centralized calendar for classes, office hours, exam schedules, and parent-teacher meetings with automated reminder flows.",
    color:T.teal, glow:"#5eead4",
    stats:[{l:"Sync",v:"All LMS"},{l:"Reminders",v:"Auto"},{l:"Timezone",v:"Global"}],
    mockup:[],
    role:"teacher",
  },
];

/* Mini mockup renderer inside card */
function CardMockup({card,isDark}){
  if(!card.mockup||card.mockup.length===0){
    // Default decorative element
    return(
      <div style={{position:"relative",height:80,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        {[...Array(5)].map((_,i)=>(
          <div key={i} style={{
            width:8+i*4,height:30+Math.sin(i)*20+20,borderRadius:4,
            background:`linear-gradient(to top,${card.color}40,${card.color}80)`,
            animation:`float2 ${1.5+i*.3}s ease-in-out infinite`,
            animationDelay:`${i*.15}s`,
          }}/>
        ))}
      </div>
    );
  }
  if(card.mockup[0]?.type==="bar"){
    return(
      <div style={{display:"flex",gap:12,alignItems:"flex-end",height:80,padding:"0 4px"}}>
        {card.mockup.map((b,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{fontSize:10,fontWeight:700,color:b.c}}>{b.val}%</div>
            <div style={{width:"100%",borderRadius:4,overflow:"hidden",height:50,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:`${b.c}15`}}>
              <div style={{width:"100%",height:`${b.val}%`,background:`linear-gradient(to top,${b.c},${b.c}80)`,borderRadius:4,animation:`progressFill .8s ${i*.15}s ease forwards`,"--fill":`${b.val}%`}}/>
            </div>
            <div style={{fontSize:9,color:isDark?"#94a3b8":"#6b7280",fontWeight:600,textAlign:"center"}}>{b.label}</div>
          </div>
        ))}
      </div>
    );
  }
  if(card.mockup[0]?.type==="line"){
    const pts=card.mockup[0].points;
    const max=Math.max(...pts);
    const pathD=pts.map((v,i)=>`${i===0?"M":"L"}${i*(100/(pts.length-1))},${60-v/max*55}`).join(" ");
    return(
      <svg viewBox="0 0 100 65" width="100%" height={80} preserveAspectRatio="none" style={{borderRadius:8}}>
        <defs><linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop stopColor={card.glow}/><stop offset="100%" stopColor={card.color}/></linearGradient></defs>
        <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((v,i)=><circle key={i} cx={i*(100/(pts.length-1))} cy={60-v/max*55} r="2.5" fill={card.color}/>)}
      </svg>
    );
  }
  return null;
}

/* ─── ADVANCED PARALLAX SLIDER ────────────────────────────── */
function ParallaxFeatureSlider({isDark,scrollY}){
  const {w:winW}=useWindowSize();
  const [activeTab,setActiveTab]=useState<"student"|"teacher">("student");
  const [activeIdx,setActiveIdx]=useState(0);
  const [isDragging,setIsDragging]=useState(false);
  const [dragStart,setDragStart]=useState({x:0,scrollX:0});
  const [autoPlay,setAutoPlay]=useState(true);
  const [mousePos,setMousePos]=useState({x:0,y:0});
  const trackRef=useRef(null);
  const sectionRef=useRef(null);
  const sectionDepth=useSectionDepth(sectionRef);
  const autoRef=useRef<any>(null);

  const features=activeTab==="student"?STUDENT_FEATURES:TEACHER_FEATURES;

  // Card sizing responsive
  const isMobile=winW<640;
  const isTablet=winW>=640&&winW<1024;
  const cardWidth=isMobile?Math.min(300,winW-60):isTablet?340:420;
  const cardHeight=isMobile?440:isTablet?500:560;
  const visibleCards=isMobile?1:isTablet?2:3;
  const sideScale=isMobile?0.88:0.82;
  const gap=24;

  // Clamp active index
  const clampedIdx=Math.max(0,Math.min(activeIdx,features.length-1));

  // Auto play
  useEffect(()=>{
    if(!autoPlay)return;
    autoRef.current=setInterval(()=>{
      setActiveIdx(i=>(i+1)%features.length);
    },3800);
    return()=>clearInterval(autoRef.current);
  },[autoPlay,features.length,activeTab]);

  // Reset on tab change
  useEffect(()=>{setActiveIdx(0);setAutoPlay(true);},[activeTab]);

  // Touch/drag
  const onDragStart=(e)=>{
    setIsDragging(true);
    setAutoPlay(false);
    const x=e.touches?e.touches[0].clientX:e.clientX;
    setDragStart({x,scrollX:clampedIdx});
  };
  const onDragMove=(e)=>{
    if(!isDragging)return;
    const x=e.touches?e.touches[0].clientX:e.clientX;
    const diff=dragStart.x-x;
    if(Math.abs(diff)>40){
      const dir=diff>0?1:-1;
      setActiveIdx(Math.max(0,Math.min(features.length-1,dragStart.scrollX+dir)));
      setIsDragging(false);
    }
  };
  const onDragEnd=()=>{setIsDragging(false);};

  // Mouse parallax inside active card
  const handleMouseMove=(e,cardEl)=>{
    if(!cardEl)return;
    const r=cardEl.getBoundingClientRect();
    setMousePos({x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5});
  };

  // Offset calculation
  const containerWidth=typeof window!=="undefined"?Math.min(winW,1440):1440;
  const centerOffset=(containerWidth-(cardWidth+gap*(visibleCards-1)))/2;
  const trackOffset=centerOffset-(clampedIdx*(cardWidth+gap));

  const card=features[clampedIdx];
  const tabColor=activeTab==="student"?T.indigo:T.emerald;
  const tabGlow=activeTab==="student"?T.indigoL:T.emeraldL;

  return(
    <section ref={sectionRef} style={{
      position:"relative",zIndex:2,
      padding:isMobile?"80px 0 100px":isTablet?"100px 0 120px":"120px 0 140px",
      overflow:"hidden",
    }}>
      {/* Section BG parallax blobs */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
        <div style={{
          position:"absolute",top:`${-10+sectionDepth*30}%`,left:"5%",
          width:600,height:600,borderRadius:"50%",
          background:isDark?`radial-gradient(circle,${tabColor}08,transparent)`:`radial-gradient(circle,${tabColor}18,transparent)`,
          filter:"blur(80px)",
          transform:`translateY(${-sectionDepth*80}px) scale(${0.9+sectionDepth*.2})`,
          transition:"transform .15s,background .5s",
        }}/>
        <div style={{
          position:"absolute",bottom:`${5+sectionDepth*20}%`,right:"5%",
          width:500,height:500,borderRadius:"50%",
          background:isDark?`radial-gradient(circle,${T.rose}06,transparent)`:`radial-gradient(circle,${T.rose}14,transparent)`,
          filter:"blur(70px)",
          transform:`translateY(${sectionDepth*60}px)`,
          transition:"transform .15s",
        }}/>
        {/* Floating particles */}
        {[...Array(12)].map((_,i)=>(
          <div key={i} style={{
            position:"absolute",
            left:`${(i*83+7)%100}%`,top:`${(i*61+13)%100}%`,
            width:2+i%3,height:2+i%3,borderRadius:"50%",
            background:[T.indigo,T.rose,T.cyan,T.amber,T.purple][i%5],
            opacity:isDark?.3:.2,
            animation:`float ${3+i*.5}s ease-in-out infinite`,
            animationDelay:`${i*.3}s`,
          }}/>
        ))}
        {/* Grid lines bg */}
        <div style={{
          position:"absolute",inset:0,
          backgroundImage:`linear-gradient(${isDark?"rgba(99,102,241,.04)":"rgba(99,102,241,.06)"} 1px,transparent 1px),linear-gradient(90deg,${isDark?"rgba(99,102,241,.04)":"rgba(99,102,241,.06)"} 1px,transparent 1px)`,
          backgroundSize:"80px 80px",
          transform:`translateY(${sectionDepth*20}px)`,
          opacity:0.5,
        }}/>
      </div>

      {/* Section header */}
      <div style={{maxWidth:1440,margin:"0 auto",padding:isMobile?"0 16px":"0 32px",marginBottom:isMobile?40:64}}>
        <Reveal dir="up">
          <div style={{textAlign:"center"}}>
            <div style={{
              display:"inline-flex",alignItems:"center",gap:8,
              padding:"6px 20px",borderRadius:999,marginBottom:20,
              background:isDark?`${tabColor}18`:`${tabColor}12`,
              border:`1px solid ${tabColor}40`,
              fontSize:11,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase",
              color:tabGlow,transition:"all .4s",
            }}>
              <span style={{animation:"pulse2 2s infinite"}}>✦</span>
              Platform Features
            </div>
            <h2 style={{
              fontFamily: SYSTEM_FONT_STACK,
              fontSize:isMobile?"clamp(32px,8vw,44px)":"clamp(44px,5vw,72px)",
              fontWeight:900,letterSpacing:"-.04em",lineHeight:1.08,
              marginBottom:16,
            }}>
              Everything You Need to{" "}
              <span style={{
                background:`linear-gradient(135deg,${tabColor},${T.rose},${T.cyan})`,
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                backgroundSize:"200%",animation:"shimmer 4s linear infinite",
              }}>Excel</span>
            </h2>
            <p style={{
              color:isDark?"#94a3b8":"#4b5563",
              fontSize:isMobile?15:17,lineHeight:1.7,
              maxWidth:540,margin:"0 auto 32px",
            }}>
              Purpose-built tools for both students and teachers — powered by neural AI and designed for results.
            </p>

            {/* Tab switcher */}
            <div style={{
              display:"inline-flex",borderRadius:20,overflow:"hidden",
              background:isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.06)",
              border:`1px solid ${isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.08)"}`,
              padding:4,gap:4,
            }}>
              {(["student","teacher"] as const).map(tab=>{
                const isActive=activeTab===tab;
                const tColor=tab==="student"?T.indigo:T.emerald;
                return(
                  <button key={tab} onClick={()=>{setActiveTab(tab);setAutoPlay(true);}}
                    style={{
                      padding:isMobile?"10px 20px":"12px 32px",borderRadius:16,
                      fontWeight:700,fontSize:isMobile?12:14,
                      letterSpacing:".04em",textTransform:"capitalize",
                      background:isActive?`linear-gradient(135deg,${tColor},${tab==="student"?T.purple:T.cyan})`:"transparent",
                      color:isActive?"#fff":isDark?"#64748b":"#6b7280",
                      border:"none",
                      boxShadow:isActive?`0 4px 24px ${tColor}50`:"none",
                      transition:"all .35s cubic-bezier(.23,1,.32,1)",
                    }}>
                    {tab==="student"?"🎓 Student":"👩‍🏫 Teacher"}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── SLIDER TRACK ── */}
      <div style={{position:"relative",overflow:"hidden"}}
        onMouseEnter={()=>setAutoPlay(false)}
        onMouseLeave={()=>setAutoPlay(true)}>

        {/* Fade edges */}
        <div style={{
          position:"absolute",left:0,top:0,bottom:0,width:isMobile?40:100,zIndex:10,pointerEvents:"none",
          background:`linear-gradient(to right,${isDark?"rgba(3,6,18,1)":"rgba(240,236,255,1)"},transparent)`,
        }}/>
        <div style={{
          position:"absolute",right:0,top:0,bottom:0,width:isMobile?40:100,zIndex:10,pointerEvents:"none",
          background:`linear-gradient(to left,${isDark?"rgba(3,6,18,1)":"rgba(240,236,255,1)"},transparent)`,
        }}/>

        {/* Cards track */}
        <div
          onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
          style={{overflow:"hidden",height:cardHeight+60,cursor:isDragging?"grabbing":"grab"}}>
          <div
            className="feature-slider-track"
            style={{
              paddingLeft:centerOffset||20,
              transform:`translateX(${trackOffset||0}px)`,
              height:cardHeight+20,
              alignItems:"center",
              transition:isDragging?"none":"transform .6s cubic-bezier(.23,1,.32,1)",
            }}>
            {features.map((f,i)=>{
              const isActive=i===clampedIdx;
              const dist=Math.abs(i-clampedIdx);
              const scale=isActive?1:dist===1?sideScale:0.72;
              const opacity=isActive?1:dist===1?.65:.4;
              const blur=isActive?0:dist===1?2:6;
              const zIdx=isActive?20:dist===1?10:5;

              return(
                <div key={`${activeTab}-${i}`}
                  className="feature-card-wrap"
                  style={{
                    width:cardWidth,
                    height:isActive?cardHeight:cardHeight*scale,
                    transform:`scale(${scale}) translateZ(0)`,
                    opacity,
                    filter:`blur(${blur}px)`,
                    zIndex:zIdx,
                    flexShrink:0,
                    marginTop:isActive?0:20,
                  }}
                  onClick={()=>{if(!isDragging){setActiveIdx(i);setAutoPlay(false);}}}
                  onMouseMove={isActive?(e)=>handleMouseMove(e,e.currentTarget):undefined}
                  onMouseLeave={()=>setMousePos({x:0,y:0})}>

                  <div className="feature-card-inner"
                    style={{
                      background:isDark
                        ?`linear-gradient(150deg,${f.color}25,${f.color}08,rgba(8,3,24,.95))`
                        :`linear-gradient(150deg,${f.color}16,${f.color}06,rgba(255,255,255,.97))`,
                      border:`${isActive?2:1.5}px solid ${f.color}${isDark?isActive?"60":"28":isActive?"50":"20"}`,
                      boxShadow:isActive
                        ?`0 0 0 1px ${f.color}20, 0 40px 100px ${f.color}35, 0 0 80px ${f.color}15, inset 0 1px 0 ${f.color}30`
                        :`0 8px 32px ${f.color}12`,
                      backdropFilter:"blur(32px)",
                      transform:isActive
                        ?`perspective(800px) rotateX(${mousePos.y*-6}deg) rotateY(${mousePos.x*8}deg)`
                        :"none",
                      transition:"transform .15s ease,box-shadow .4s,border .4s,background .4s",
                      height:"100%",
                    }}>
                    <div className="card-shimmer"/>

                    {/* Card content */}
                    <div style={{padding:isMobile?24:32,height:"100%",display:"flex",flexDirection:"column",position:"relative",zIndex:2}}>

                      {/* Tag + role badge */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                        <span style={{
                          fontSize:10,fontWeight:800,letterSpacing:".16em",textTransform:"uppercase",
                          color:f.color,padding:"5px 12px",borderRadius:999,
                          background:`${f.color}18`,border:`1px solid ${f.color}35`,
                        }}>{f.tag}</span>
                        <span style={{
                          fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"capitalize",
                          color:isDark?"#475569":"#9ca3af",
                          background:isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.05)",
                          padding:"4px 10px",borderRadius:999,
                        }}>{f.role}</span>
                      </div>

                      {/* Icon with parallax layer */}
                      <div style={{
                        fontSize:isMobile?48:60,
                        lineHeight:1,marginBottom:16,
                        transform:isActive?`translate(${mousePos.x*-12}px,${mousePos.y*-8}px)`:"none",
                        transition:"transform .12s ease",
                        display:"inline-block",
                        animation:`iconBounce 3s ease-in-out infinite`,
                        animationDelay:`${(clampedIdx*0.1)%1}s`,
                        filter:`drop-shadow(0 0 20px ${f.color}60)`,
                      }}>{f.icon}</div>

                      {/* Title layer */}
                      <h3 style={{
                        fontFamily:SYSTEM_FONT_STACK,
                        fontSize:isMobile?22:26,fontWeight:900,
                        letterSpacing:"-.03em",lineHeight:1.2,
                        marginBottom:12,
                        color:isDark?"#f1f5f9":"#111827",
                        transform:isActive?`translate(${mousePos.x*-6}px,${mousePos.y*-4}px)`:"none",
                        transition:"transform .14s ease",
                      }}>{f.title}</h3>

                      {/* Description */}
                      <p style={{
                        fontSize:isMobile?13:14.5,lineHeight:1.72,
                        color:isDark?"#94a3b8":"#4b5563",
                        marginBottom:20,flex:1,
                        transform:isActive?`translate(${mousePos.x*-3}px,${mousePos.y*-2}px)`:"none",
                        transition:"transform .16s ease",
                      }}>{f.desc}</p>

                      {/* Mini mockup visualization */}
                      <div style={{
                        marginBottom:20,
                        padding:16,borderRadius:16,
                        background:isDark?`${f.color}08`:`${f.color}06`,
                        border:`1px solid ${f.color}20`,
                      }}>
                        <CardMockup card={f} isDark={isDark}/>
                      </div>

                      {/* Stats */}
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {f.stats.map((st,si)=>(
                          <div key={si} style={{
                            flex:"1 1 auto",padding:"8px 12px",borderRadius:12,
                            background:isDark?`${f.color}12`:`${f.color}10`,
                            border:`1px solid ${f.color}25`,
                            textAlign:"center",minWidth:60,
                          }}>
                            <div style={{fontSize:13,fontWeight:900,color:f.color,letterSpacing:"-.01em"}}>{st.v}</div>
                            <div style={{fontSize:9,fontWeight:700,color:isDark?"#475569":"#9ca3af",letterSpacing:".08em",textTransform:"uppercase",marginTop:2}}>{st.l}</div>
                          </div>
                        ))}
                      </div>

                      {/* Glow line bottom */}
                      {isActive&&(
                        <div style={{
                          position:"absolute",bottom:0,left:0,right:0,height:3,
                          background:`linear-gradient(90deg,transparent,${f.color},transparent)`,
                          borderRadius:"0 0 28px 28px",
                          opacity:.7,
                        }}/>
                      )}
                    </div>

                    {/* Outer glow for active */}
                    {isActive&&(
                      <div style={{
                        position:"absolute",inset:-1,borderRadius:28,pointerEvents:"none",
                        background:`radial-gradient(ellipse at ${50+mousePos.x*30}% ${50+mousePos.y*30}%,${f.color}15,transparent 60%)`,
                        transition:"background .12s",
                      }}/>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Nav arrows ── */}
        {!isMobile&&(
          <>
            <button onClick={()=>{setActiveIdx(i=>Math.max(0,i-1));setAutoPlay(false);}}
              style={{
                position:"absolute",left:isMobile?8:24,top:"50%",transform:"translateY(-50%)",
                width:48,height:48,borderRadius:"50%",border:`1.5px solid ${tabColor}40`,
                background:isDark?`${tabColor}15`:`${tabColor}10`,color:tabGlow,
                fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",
                zIndex:20,cursor:"pointer",transition:"all .22s",
                opacity:clampedIdx===0?.3:1,
                backdropFilter:"blur(16px)",
                boxShadow:`0 8px 24px ${tabColor}20`,
              }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${tabColor}30`;e.currentTarget.style.transform="translateY(-50%) scale(1.1)";}}
              onMouseLeave={e=>{e.currentTarget.style.background=isDark?`${tabColor}15`:`${tabColor}10`;e.currentTarget.style.transform="translateY(-50%) scale(1)";}}
              disabled={clampedIdx===0}>‹</button>
            <button onClick={()=>{setActiveIdx(i=>Math.min(features.length-1,i+1));setAutoPlay(false);}}
              style={{
                position:"absolute",right:isMobile?8:24,top:"50%",transform:"translateY(-50%)",
                width:48,height:48,borderRadius:"50%",border:`1.5px solid ${tabColor}40`,
                background:isDark?`${tabColor}15`:`${tabColor}10`,color:tabGlow,
                fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",
                zIndex:20,cursor:"pointer",transition:"all .22s",
                opacity:clampedIdx===features.length-1?.3:1,
                backdropFilter:"blur(16px)",
                boxShadow:`0 8px 24px ${tabColor}20`,
              }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${tabColor}30`;e.currentTarget.style.transform="translateY(-50%) scale(1.1)";}}
              onMouseLeave={e=>{e.currentTarget.style.background=isDark?`${tabColor}15`:`${tabColor}10`;e.currentTarget.style.transform="translateY(-50%) scale(1)";}}
              disabled={clampedIdx===features.length-1}>›</button>
          </>
        )}
      </div>

      {/* ── Dot indicators ── */}
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginTop:28,padding:"0 16px"}}>
        {features.map((_,i)=>(
          <div key={i} className={`slider-dot${i===clampedIdx?" active":""}`}
            onClick={()=>{setActiveIdx(i);setAutoPlay(false);}}
            style={{
              background:i===clampedIdx?tabColor:isDark?"rgba(255,255,255,.2)":"rgba(0,0,0,.15)",
              boxShadow:i===clampedIdx?`0 0 12px ${tabColor}80`:"none",
              transition:"all .35s cubic-bezier(.23,1,.32,1)",
              cursor:"pointer",
              width:i===clampedIdx?28:8,height:8,borderRadius:i===clampedIdx?4:50,
            }}/>
        ))}
      </div>

      {/* ── Progress bar under dots ── */}
      <div style={{display:"flex",justifyContent:"center",marginTop:16}}>
        <div style={{width:isMobile?200:280,height:2,borderRadius:1,background:isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.08)",overflow:"hidden"}}>
          <div style={{
            height:"100%",borderRadius:1,
            background:`linear-gradient(90deg,${tabColor},${T.rose})`,
            width:`${((clampedIdx+1)/features.length)*100}%`,
            transition:"width .5s cubic-bezier(.23,1,.32,1)",
            boxShadow:`0 0 8px ${tabColor}60`,
          }}/>
        </div>
      </div>

      {/* ── Feature count label ── */}
      <div style={{textAlign:"center",marginTop:12}}>
        <span style={{fontSize:11,fontWeight:600,color:isDark?"#475569":"#9ca3af",letterSpacing:".1em"}}>
          {clampedIdx+1} / {features.length} Features
        </span>
      </div>

      {/* ── Quick feature grid below slider ── */}
      <div style={{maxWidth:1440,margin:"60px auto 0",padding:isMobile?"0 16px":"0 32px"}}>
        <Reveal dir="up" delay={.1}>
          <div style={{
            display:"grid",
            gridTemplateColumns:isMobile?"repeat(2,1fr)":isTablet?"repeat(3,1fr)":"repeat(6,1fr)",
            gap:12,
          }}>
            {(activeTab==="student"?STUDENT_FEATURES:TEACHER_FEATURES).map((f,i)=>(
              <button key={i}
                onClick={()=>{setActiveIdx(i);setAutoPlay(false);}}
                style={{
                  display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                  padding:"16px 8px",borderRadius:16,
                  background:clampedIdx===i
                    ?(isDark?`${f.color}20`:`${f.color}14`)
                    :(isDark?"rgba(255,255,255,.03)":"rgba(0,0,0,.03)"),
                  border:`1.5px solid ${clampedIdx===i?f.color+"50":isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)"}`,
                  cursor:"pointer",
                  transition:"all .25s cubic-bezier(.23,1,.32,1)",
                  boxShadow:clampedIdx===i?`0 4px 20px ${f.color}25`:"none",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background=isDark?`${f.color}14`:`${f.color}10`;e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.background=clampedIdx===i?(isDark?`${f.color}20`:`${f.color}14`):(isDark?"rgba(255,255,255,.03)":"rgba(0,0,0,.03)");e.currentTarget.style.transform="";}}
              >
                <span style={{fontSize:isMobile?20:24}}>{f.icon}</span>
                <span style={{
                  fontSize:10,fontWeight:700,textAlign:"center",lineHeight:1.3,
                  color:clampedIdx===i?f.color:(isDark?"#64748b":"#6b7280"),
                  transition:"color .2s",
                }}>{f.title}</span>
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}


function DashViz({depth,isDark,scrollY}){
  const bars=[62,84,46,92,74,88,52,96,68,80];
  const line=[42,66,50,82,60,90,70,88,76,94];
  const yPara=-depth*30;
  const [hoveredIndex,setHoveredIndex]=useState(null);
  const [mouse,setMouse]=useState({x:0,y:0});
  const svgRef=useRef(null);
  const handleMouseMove=(e)=>{
    if(!svgRef.current)return;
    const rect=svgRef.current.getBoundingClientRect();
    setMouse({x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height});
  };
  return(
    <div style={{transform:`translateY(${yPara}px)`,transition:"transform .1s"}}>
      <Tilt glow={T.indigo} style={{borderRadius:26,overflow:"hidden",
        background:isDark?"rgba(10,5,30,.8)":"rgba(255,255,255,.9)",
        border:`1.5px solid ${T.indigo}${isDark?"25":"30"}`,
        backdropFilter:"blur(24px)",
        boxShadow:isDark?`0 20px 80px ${T.indigo}15`:`0 20px 80px ${T.indigo}20, 0 4px 20px rgba(0,0,0,.08)`}}>
        <svg ref={svgRef} width="480" height="330" viewBox="0 0 480 330" style={{cursor:"none"}} onMouseMove={handleMouseMove} onMouseLeave={()=>setMouse({x:0,y:0})}>
          <defs>
            <linearGradient id="b1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.indigo}/><stop offset="100%" stopColor={T.purple} stopOpacity=".6"/>
            </linearGradient>
            <linearGradient id="b2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.rose}/><stop offset="100%" stopColor={T.pink} stopOpacity=".6"/>
            </linearGradient>
            <linearGradient id="ln" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={T.blue}/><stop offset="100%" stopColor={T.cyan}/>
            </linearGradient>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.cyan} stopOpacity=".3"/><stop offset="100%" stopColor={T.cyan} stopOpacity="0"/>
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0,1,2,3,4,5].map(i=>(
            <line key={i} x1="40" y1={255-i*40} x2="450" y2={255-i*40}
              stroke={isDark?"rgba(255,255,255,.05)":"rgba(99,102,241,.09)"} strokeWidth="1"/>
          ))}

          {/* Bars with hover + mouse tracking interaction */}
          {bars.map((h,i)=>{
            const bH=Math.min(h,h*depth*1.8)*1.85;
            const x=48+i*40;
            const isHovered=hoveredIndex===i;
            const mouseInfluence=Math.abs(mouse.x-(i+1)/10)<0.08?Math.sin((mouse.y-.5)*Math.PI)*.08:0;
            const scale=isHovered?1.2:1+Math.abs(mouseInfluence)*.3;
            const yOffset=isHovered?-12:mouseInfluence*15;
            return(
              <g key={i} style={{cursor:"none"}}
                onMouseEnter={()=>setHoveredIndex(i)}
                onMouseLeave={()=>setHoveredIndex(null)}>
                <rect x={x} y={255-bH} width="26" height={bH} fill={i%2===0?"url(#b1)":"url(#b2)"} rx="5" 
                  opacity={isHovered?.98:.75} style={{transition:"all .25s ease",transformBox:"fill-box",transform:`scale(${scale},1) translateY(${yOffset}px)`}}/>
                <rect x={x} y={255-bH} width="26" height="4" fill={i%2===0?T.indigoL:T.roseL} rx="2" 
                  opacity={isHovered?.9:.5} style={{transition:"all .25s ease"}}/>
                {isHovered&&(
                  <text x={x+13} y={255-bH-16} textAnchor="middle" fontSize="12" fontWeight="800"
                    fill={i%2===0?T.indigo:T.rose} fontFamily={SYSTEM_FONT_STACK}>{h}%</text>
                )}
              </g>
            );
          })}

          {/* Area fill under line */}
          <polygon
            points={line.map((v,i)=>`${61+i*40},${255-v*1.68}`).join(" ")+" "+`${61+9*40},255 61,255`}
            fill="url(#areaGrad)"/>

          {/* Line chart with mouse tracking */}
          {line.slice(1).map((v,i)=>{
            const prev=line[i];
            const lineX=(61+i*40+61+(i+1)*40)/2;
            const mouseTrack=Math.abs(mouse.x-(lineX/480))<0.12;
            return<line key={i} x1={61+i*40} y1={255-prev*1.68} x2={61+(i+1)*40} y2={255-v*1.68}
              stroke="url(#ln)" strokeWidth={hoveredIndex===i||hoveredIndex===i+1||mouseTrack?"3.5":"2.5"} strokeLinecap="round"
              style={{transition:"stroke-width .2s ease",opacity:mouseTrack?.9:1}}
              onMouseEnter={()=>setHoveredIndex(i)}
              onMouseLeave={()=>setHoveredIndex(null)}/>;
          })}

          {/* Data dots with interactive glow + mouse tracking */}
          {line.map((v,i)=>{
            const dotX=61+i*40;
            const dotY=255-v*1.68;
            const isHovered=hoveredIndex===i;
            const mouseProx=Math.hypot(mouse.x*480-dotX,mouse.y*330-dotY);
            const isMouseNear=mouseProx<45;
            const radius=isHovered?7:isMouseNear?5.5:4.5;
            return(
              <g key={i}
                onMouseEnter={()=>setHoveredIndex(i)}
                onMouseLeave={()=>setHoveredIndex(null)}>
                {(isHovered||isMouseNear)&&(
                  <circle cx={dotX} cy={dotY} r="14" fill={T.cyan} opacity={isHovered?"0.3":`${0.1+isMouseNear*.15}`}
                    style={{animation:isHovered?"pulse2 1s ease-in-out infinite":`pulse2 ${1.2+i*.12}s ease-in-out infinite`}}/>
                )}
                <circle cx={dotX} cy={dotY} r={radius} fill={T.cyan}
                  stroke={isDark?"rgba(10,5,30,.8)":"rgba(255,255,255,.8)"} strokeWidth="2"
                  style={{animation:isHovered?`pulse2 .7s ease-in-out infinite`:`pulse2 ${1.4+i*.15}s ease-in-out infinite`,animationDelay:`${i*.1}s`,transition:"r .15s ease,opacity .2s ease",cursor:"none",opacity:isMouseNear?.9:1}}/>
                {(isHovered||isMouseNear)&&(
                  <text x={dotX} y={dotY-22} textAnchor="middle" fontSize="11" fontWeight="800"
                    fill={T.cyan} fontFamily={SYSTEM_FONT_STACK} style={{animation:"fadeIn .2s ease"}}>{v}%</text>
                )}
              </g>
            );
          })}

          {/* X axis labels */}
          {["M","T","W","T","F","S","S","M","T","W"].map((l,i)=>(
            <text key={i} x={61+i*40} y={278} textAnchor="middle"
              fill={isDark?"#475569":"#8b92b5"} fontSize="11"
              fontFamily={SYSTEM_FONT_STACK}>{l}</text>
          ))}

          {/* Stats pills */}
          {[
            {x:20,y:12,w:118,h:48,color:T.indigo,label:"PERFORMANCE",val:"94.2%"},
            {x:155,y:12,w:108,h:48,color:T.rose,label:"STREAK",val:"48 days"},
            {x:278,y:12,w:100,h:48,color:T.blue,label:"RANK",val:"Top 3%"},
            {x:392,y:12,w:78,h:48,color:T.emerald,label:"XP",val:"+2.4K"},
          ].map((b,i)=>(
            <g key={i}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="12"
                fill={isDark?`${b.color}1a`:`${b.color}14`}/>
              <text x={b.x+b.w/2} y={b.y+17} textAnchor="middle"
                fill={b.color} fontSize="9" fontWeight="700" letterSpacing="1"
                fontFamily={SYSTEM_FONT_STACK}>{b.label}</text>
              <text x={b.x+b.w/2} y={b.y+36} textAnchor="middle"
                fill={isDark?"#f1f5f9":"#1e1b4b"} fontSize="16" fontWeight="800"
                fontFamily={SYSTEM_FONT_STACK}>{b.val}</text>
            </g>
          ))}
        </svg>
      </Tilt>
    </div>
  );
}

/* ─── LEARNING PATH VIZ ───────────────────────────────────── */
function LPathViz({depth,isDark}){
  const steps=[
    {x:70,y:215,label:"Assess",icon:"📋",color:T.indigo},
    {x:180,y:135,label:"Learn",icon:"📚",color:T.blue},
    {x:290,y:200,label:"Practice",icon:"✏️",color:T.purple},
    {x:400,y:120,label:"Master",icon:"🏆",color:T.rose},
    {x:510,y:180,label:"Advance",icon:"🚀",color:T.emerald},
  ];
  const pathD="M70,215 C110,215 145,135 180,135 C215,135 255,200 290,200 C325,200 365,120 400,120 C435,120 475,180 510,180";

  return(
    <div style={{transform:`translateY(${-depth*20}px)`,transition:"transform .12s"}}>
      <Tilt glow={T.purple} style={{borderRadius:24,overflow:"visible",
        background:isDark?"rgba(10,5,30,.78)":"rgba(255,255,255,.88)",
        border:`1.5px solid ${T.purple}${isDark?"25":"30"}`,
        backdropFilter:"blur(20px)",
        boxShadow:isDark?`0 16px 60px ${T.purple}12`:`0 16px 60px ${T.purple}18`}}>
        <svg width="590" height="300" viewBox="0 0 590 300" style={{overflow:"visible"}}>
          <defs>
            <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={T.indigo}/>
              <stop offset="50%" stopColor={T.purple}/>
              <stop offset="100%" stopColor={T.rose}/>
            </linearGradient>
          </defs>

          {/* Track glow */}
          <path d={pathD} fill="none" stroke={T.purple} strokeWidth="12" opacity={isDark?.08:.12}/>

          {/* Animated path */}
          <path d={pathD} fill="none" stroke="url(#pathGrad)" strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${depth*1100} 1200`}/>

          {/* Progress dot on path */}
          {depth>.1&&(
            <circle r="7" fill={T.rose}>
              <animateMotion dur="3s" repeatCount="indefinite">
                <mpath href="#lpath"/>
              </animateMotion>
            </circle>
          )}
          <path id="lpath" d={pathD} fill="none" stroke="none"/>

          {/* Steps */}
          {steps.map((s,i)=>{
            const vis=depth>(i*.14);
            return(
              <g key={i} style={{opacity:vis?1:0,transition:`opacity .6s ${i*.12}s`}}>
                <circle cx={s.x} cy={s.y} r={36} fill={s.color} opacity={isDark?.12:.18}/>
                <circle cx={s.x} cy={s.y} r={26} fill={s.color} opacity=".92"/>
                <circle cx={s.x} cy={s.y} r={32} fill="none" stroke={s.color} strokeWidth="1.5"
                  opacity={isDark?.35:.45} style={{animation:"ringPulse 2.2s ease-in-out infinite",animationDelay:`${i*.4}s`}}/>
                <text x={s.x} y={s.y+6} textAnchor="middle" fontSize="15">{s.icon}</text>
                <text x={s.x} y={s.y+54} textAnchor="middle"
                  fill={isDark?"#e2e8f0":"#1e1b4b"} fontSize="12" fontWeight="700"
                  fontFamily={SYSTEM_FONT_STACK}>{s.label}</text>
                {/* Checkmark */}
                {depth>(i*.18+.2)&&(
                  <g>
                    <circle cx={s.x+18} cy={s.y-18} r="11" fill={T.emerald}/>
                    <text x={s.x+18} y={s.y-14} textAnchor="middle" fontSize="11" fill="#fff">✓</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </Tilt>
    </div>
  );
}

/* ─── SKILLS RADAR ────────────────────────────────────────── */
function RadarViz({depth,isDark}){
  const skills=[
    {name:"Math",val:.92},{name:"Science",val:.78},{name:"English",val:.85},
    {name:"History",val:.70},{name:"Coding",val:.95},{name:"Art",val:.65},
  ];
  const cx=200,cy=200,maxR=140;
  const angleStep=(Math.PI*2)/skills.length;
  const getPoint=(i,r)=>({
    x:cx+Math.cos(i*angleStep-Math.PI/2)*r,
    y:cy+Math.sin(i*angleStep-Math.PI/2)*r,
  });
  const polyPts=skills.map((s,i)=>{
    const p=getPoint(i,s.val*maxR*Math.min(1,depth*1.8));
    return `${p.x},${p.y}`;
  }).join(" ");

  return(
    <Tilt glow={T.cyan} style={{borderRadius:24,
      background:isDark?"rgba(10,5,30,.78)":"rgba(255,255,255,.88)",
      border:`1.5px solid ${T.cyan}${isDark?"25":"30"}`,
      backdropFilter:"blur(20px)"}}>
      <svg width="400" height="400" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={T.indigo} stopOpacity=".5"/>
            <stop offset="100%" stopColor={T.cyan} stopOpacity=".3"/>
          </linearGradient>
        </defs>
        {/* Grid rings */}
        {[.25,.5,.75,1].map((f,i)=>(
          <polygon key={i}
            points={skills.map((_,j)=>{const p=getPoint(j,f*maxR);return`${p.x},${p.y}`;}).join(" ")}
            fill="none" stroke={isDark?"rgba(255,255,255,.07)":"rgba(99,102,241,.12)"} strokeWidth="1"/>
        ))}
        {/* Spokes */}
        {skills.map((_,i)=>{
          const p=getPoint(i,maxR);
          return<line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke={isDark?"rgba(255,255,255,.06)":"rgba(99,102,241,.1)"} strokeWidth="1"/>;
        })}
        {/* Data polygon */}
        <polygon points={polyPts} fill="url(#radarFill)" stroke={T.cyan} strokeWidth="2.5" opacity=".9"/>
        {/* Data dots */}
        {skills.map((s,i)=>{
          const p=getPoint(i,s.val*maxR*Math.min(1,depth*1.8));
          return<circle key={i} cx={p.x} cy={p.y} r="6" fill={T.cyan}
            stroke={isDark?"rgba(10,5,30,.8)":"#fff"} strokeWidth="2"
            style={{animation:`pulse2 ${1.5+i*.2}s ease-in-out infinite`}}/>;
        })}
        {/* Labels */}
        {skills.map((s,i)=>{
          const p=getPoint(i,maxR+24);
          return(
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fill={isDark?"#cbd5e1":"#374151"} fontSize="12" fontWeight="700"
              fontFamily={SYSTEM_FONT_STACK}>{s.name}</text>
          );
        })}
        {/* Center label */}
        <text x={cx} y={cy-6} textAnchor="middle" fill={isDark?"#94a3b8":"#6b7280"}
          fontSize="11" fontFamily={SYSTEM_FONT_STACK}>Skill</text>
        <text x={cx} y={cy+10} textAnchor="middle" fill={isDark?"#e2e8f0":"#1e1b4b"}
          fontSize="13" fontWeight="800" fontFamily={SYSTEM_FONT_STACK}>Profile</text>
      </svg>
    </Tilt>
  );
}

/* ─── SCROLLING MARQUEE ───────────────────────────────────── */
function Marquee({items,speed=30,isDark,reverse=false}){
  return(
    <div style={{overflow:"hidden",position:"relative",padding:"16px 0"}}>
      <div style={{display:"flex",gap:0,animation:`slideX ${speed}s linear infinite ${reverse?"reverse":""}`,width:"max-content"}}>
        {[...items,...items].map((item,i)=>(
          <div key={i} style={{
            display:"inline-flex",alignItems:"center",gap:10,
            padding:"10px 28px",marginRight:16,
            borderRadius:999,whiteSpace:"nowrap",
            background:isDark?"rgba(255,255,255,.05)":"rgba(99,102,241,.08)",
            border:`1px solid ${isDark?"rgba(255,255,255,.08)":"rgba(99,102,241,.15)"}`,
            fontSize:13,fontWeight:600,
            color:isDark?"#94a3b8":"#4b5563"}}>
            <span style={{fontSize:15}}>{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── PRICING SECTION ─────────────────────────────────────── */
function PricingSection({theme,onGetStarted}){
  const [yearly,setYearly]=useState(false);
  const isDark=theme==="dark";
  const plans=[
    {name:"Scholar",m:0,y:0,color:T.blue,badge:null,
      features:["5 AI Tutors","20 Quizzes/week","Basic Analytics","Community Access","Mobile App","Progress Tracking"]},
    {name:"Pro",m:12,y:99,color:T.indigo,badge:"⭐ Most Popular",pop:true,
      features:["Unlimited AI Tutors","Unlimited Quizzes","Advanced Analytics","Priority Support","3D Study Spaces","Custom Learning Paths","API Access","Offline Mode"]},
    {name:"Institution",m:null,y:null,color:T.purple,badge:"🏢 Enterprise",
      features:["Site-wide License","Unlimited Users","Dedicated Manager","Custom Integrations","Teacher Dashboards","White-label Options","SLA Guarantee","24/7 Support"]},
  ];
  const muted=isDark?"#94a3b8":"#4b5563";
  const text=isDark?"#f1f5f9":"#1e1b4b";

  return(
    <div>
      {/* Comparison bars */}
      <Reveal dir="up">
        <div style={{display:"flex",justifyContent:"center",marginBottom:56}}>
          <div style={{width:"100%",maxWidth:560}}>
            {[{l:"Traditional Education",p:32,c:"#64748b"},{l:"Other AI Platforms",p:61,c:T.blue},{l:"GradeUp AI",p:97,c:T.indigo}].map((b,i)=>(
              <div key={i} style={{marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:600,color:muted}}>{b.l}</span>
                  <span style={{fontSize:13,fontWeight:800,color:b.c}}>{b.p}%</span>
                </div>
                <div style={{height:10,borderRadius:5,overflow:"hidden",background:isDark?"rgba(255,255,255,.06)":"rgba(99,102,241,.1)"}}>
                  <div style={{height:"100%",borderRadius:5,background:b.c,width:`${b.p}%`,
                    transition:"width 1.5s cubic-bezier(.23,1,.32,1)",boxShadow:`0 0 12px ${b.c}60`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Toggle */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:18,marginBottom:52}}>
        <span style={{fontWeight:700,fontSize:14,color:!yearly?T.indigoL:muted}}>Monthly</span>
        <div onClick={()=>setYearly(p=>!p)} data-hover style={{width:60,height:32,borderRadius:16,cursor:"none",position:"relative",
          background:yearly?`linear-gradient(135deg,${T.indigo},${T.rose})`:"rgba(99,102,241,.2)",
          transition:"background .35s",border:`1.5px solid ${T.indigo}40`,boxShadow:yearly?`0 4px 20px ${T.indigo}40`:"none"}}>
          <div style={{position:"absolute",top:3,left:yearly?32:3,width:24,height:24,borderRadius:"50%",
            background:"#fff",transition:"left .35s cubic-bezier(.23,1,.32,1)",boxShadow:"0 2px 10px rgba(0,0,0,.25)"}}/>
        </div>
        <span style={{fontWeight:700,fontSize:14,color:yearly?T.indigoL:muted}}>
          Yearly{" "}
          <span style={{background:`linear-gradient(90deg,${T.emerald},${T.cyan})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:12,fontWeight:800}}>−30%</span>
        </span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24}}>
        {plans.map((p,i)=>{
          const price=yearly?p.y:p.m;
          return(
            <Reveal key={p.name} delay={i*.15}>
              <Tilt glow={p.color} style={{borderRadius:28,position:"relative",height:"100%",
                border:p.pop?`2px solid ${p.color}60`:`1.5px solid ${p.color}25`,
                background:isDark
                  ?p.pop?`linear-gradient(150deg,${p.color}20,${T.purple}10,rgba(10,5,30,.8))`:"rgba(10,5,30,.72)"
                  :p.pop?`linear-gradient(150deg,${p.color}12,${T.purple}06,rgba(255,255,255,.95))`:"rgba(255,255,255,.9)",
                backdropFilter:"blur(24px)",
                boxShadow:p.pop?`0 0 70px ${p.color}28,0 8px 40px rgba(0,0,0,.15)`:"none",
                transform:p.pop?"translateY(-12px)":"none",
                padding:36}}>
                {p.badge&&(
                  <div style={{position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",
                    background:p.pop?`linear-gradient(90deg,${T.amber},${T.rose})`:`linear-gradient(90deg,${p.color},${T.purple})`,
                    borderRadius:999,padding:"6px 20px",fontSize:11,fontWeight:800,color:"#fff",
                    whiteSpace:"nowrap",boxShadow:`0 4px 20px ${p.color}50`,
                    animation:p.pop?"badgePulse 2s infinite":"none"}}>
                    {p.badge}
                  </div>
                )}
                <div style={{color:p.color,fontSize:11,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",marginBottom:10}}>{p.name}</div>
                <div style={{marginBottom:28}}>
                  {price===null
                    ?<span style={{fontSize:36,fontWeight:800,color:text,fontFamily:SYSTEM_FONT_STACK}}>Custom</span>
                    :<><span style={{fontSize:56,fontWeight:900,lineHeight:1,color:text,fontFamily:SYSTEM_FONT_STACK}}>${price}</span><span style={{color:muted,fontSize:14,fontWeight:500}}>/{yearly?"yr":"mo"}</span></>
                  }
                </div>
                <div style={{borderTop:`1px solid ${p.color}18`,paddingTop:22,marginBottom:28}}>
                  {p.features.map((f,fi)=>(
                    <div key={fi} style={{display:"flex",gap:12,alignItems:"center",marginBottom:13}}>
                      <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        background:`${p.color}18`,border:`1px solid ${p.color}45`,
                        fontSize:10,color:p.color,fontWeight:700}}>✓</div>
                      <span style={{color:muted,fontSize:14}}>{f}</span>
                    </div>
                  ))}
                </div>
                <Mag onClick={onGetStarted} style={{width:"100%",padding:"15px 0",borderRadius:16,fontWeight:800,fontSize:14,
                  background:p.pop?`linear-gradient(135deg,${p.color},${T.rose})`:"transparent",
                  color:p.pop?"#fff":p.color,
                  border:p.pop?"none":`1.5px solid ${p.color}55`,
                  boxShadow:p.pop?`0 8px 32px ${p.color}45`:"none"}}>
                  {price===0?"Start Free":price===null?"Contact Sales":"Start Free Trial →"}
                </Mag>
              </Tilt>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────── */
function FAQ({q,a,isDark,i}){
  const [open,setOpen]=useState(false);
  return(
    <Reveal delay={i*.07}>
      <div style={{borderBottom:`1px solid ${isDark?"rgba(255,255,255,.07)":"rgba(99,102,241,.15)"}`,overflow:"hidden"}}>
        <button onClick={()=>setOpen(o=>!o)} data-hover style={{width:"100%",padding:"22px 0",display:"flex",justifyContent:"space-between",
          alignItems:"center",background:"none",border:"none",color:isDark?"#f1f5f9":"#1e1b4b",fontWeight:700,fontSize:16,textAlign:"left"}}>
          <span style={{flex:1,paddingRight:16}}>{q}</span>
          <div style={{width:28,height:28,borderRadius:"50%",border:`1.5px solid ${open?T.rose:T.indigoL}`,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
            color:open?T.rose:T.indigoL,fontSize:18,transform:`rotate(${open?45:0}deg)`,
            transition:"all .3s cubic-bezier(.23,1,.32,1)"}}>+</div>
        </button>
        <div style={{maxHeight:open?300:0,overflow:"hidden",transition:"max-height .55s cubic-bezier(.23,1,.32,1)"}}>
          <p style={{color:isDark?"#94a3b8":"#4b5563",fontSize:15,lineHeight:1.75,paddingBottom:24}}>{a}</p>
        </div>
      </div>
    </Reveal>
  );
}

/* ─── NEURAL ADAPT PERFORMANCE VIZ ───────────────────────── */
function NeuralAdaptPerformance({depth,isDark}){
  const signals=[
    {name:"Focus",val:.92,color:T.indigo},
    {name:"Retention",val:.88,color:T.cyan},
    {name:"Speed",val:.85,color:T.emerald},
    {name:"Accuracy",val:.95,color:T.rose},
  ];
  
  return(
    <div style={{transform:`translateY(${-depth*35}px)`,transition:"transform .12s"}}>
      <Tilt glow={T.purple} style={{borderRadius:32,overflow:"hidden",
        background:isDark?"rgba(10,5,30,.85)":"rgba(255,255,255,.95)",
        border:`1.5px solid ${T.purple}${isDark?"25":"30"}`,
        backdropFilter:"blur(24px)",
        boxShadow:isDark?`0 20px 80px ${T.purple}15`:`0 20px 80px ${T.purple}20`,
        padding:48}}>
        <div style={{marginBottom:32}}>
          <div style={{color:T.purple,fontSize:11,fontWeight:800,letterSpacing:".22em",textTransform:"uppercase",marginBottom:8}}>Neural Adapt</div>
          <h3 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:28,fontWeight:900,marginBottom:4,letterSpacing:"-.02em"}}>Performance Profile</h3>
          <p style={{color:isDark?"#94a3b8":"#4b5563",fontSize:13}}>Real-time cognitive metrics</p>
        </div>
        <svg width="100%" height="180" viewBox="0 0 520 180" style={{marginBottom:20}}>
          <defs><linearGradient id="perfGradIndigo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.indigo} stopOpacity=".6"/><stop offset="100%" stopColor={T.indigo} stopOpacity=".1"/></linearGradient></defs>
          {signals.map((sig,i)=>{const x=60+i*130;const barH=sig.val*100;return(<g key={i}><rect x={x-20} y={160-barH} width={40} height={barH} rx="6" fill={sig.color} opacity=".7" style={{animation:`countUp .8s ${i*.1}s ease forwards`,transformOrigin:`${x}px 160px`}}/><rect x={x-22} y={160-barH-4} width={44} height={4} rx="2" fill={sig.color} opacity=".4" style={{animation:`countUp .8s ${i*.1}s ease forwards`}}/><text x={x} y={175} textAnchor="middle" fontSize="12" fontWeight="700" fill={isDark?"#94a3b8":"#4b5563"} fontFamily={SYSTEM_FONT_STACK}>{sig.name}</text><text x={x} y={150-barH} textAnchor="middle" fontSize="11" fontWeight="800" fill={sig.color} fontFamily={SYSTEM_FONT_STACK}>{Math.round(sig.val*100)}%</text></g>);})}
        </svg>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
          {[{icon:"⚡",label:"Active Signals",val:"42/42"},{icon:"🧠",label:"Learning State",val:"Optimal"}].map((item,i)=>(<div key={i} style={{padding:16,borderRadius:12,background:`${T.purple}${isDark?"12":"08"}`,border:`1px solid ${T.purple}${isDark?"25":"30"}`,display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:18}}>{item.icon}</span><div><div style={{fontSize:11,color:isDark?"#94a3b8":"#4b5563",fontWeight:600}}>{item.label}</div><div style={{fontSize:14,fontWeight:800,color:isDark?"#f1f5f9":"#1e1b4b"}}>{item.val}</div></div></div>))}
        </div>
      </Tilt>
    </div>
  );
}

/* ─── FLOATING CARD STACK ─────────────────────────────────── */
function CardStack({scrollY,isDark,sectionDepth}){
  const {w:winW}=useWindowSize();
  const compact=winW<768;
  const [hoveredIndex,setHoveredIndex]=useState<null|number>(null);
  
  const cards=[
    {icon:"🧠",title:"Neural Adapt",sub:"42 signals tracked",desc:"AI tracks cognitive patterns and adapts difficulty in real-time.",color:T.indigo},
    {icon:"⚡",title:"Instant Feedback",sub:"<100ms response",desc:"Get targeted explanations instantly after every answer.",color:T.rose},
    {icon:"📊",title:"Deep Analytics",sub:"Live heatmaps",desc:"Track progress with visual insights, trends, and predictive analytics.",color:T.blue},
    {icon:"🔢",title:"Mathematics",sub:"Step logic",desc:"Break down equations, patterns, and shortcuts with adaptive hints.",color:T.purple},
    {icon:"🔬",title:"Science",sub:"Lab concepts",desc:"See reactions, experiments, and models with guided practice.",color:T.cyan},
    {icon:"💻",title:"Coding",sub:"Debug faster",desc:"Practice syntax, logic, and problem solving with real feedback.",color:T.emerald},
    {icon:"📖",title:"History",sub:"Timeline maps",desc:"Connect events, causes, and eras through visual story flows.",color:T.amber},
    {icon:"✍️",title:"English",sub:"Write clearly",desc:"Build comprehension, vocabulary, grammar, and fluency together.",color:T.roseL},
  ];

  return(
    <div style={{position:"relative",width:"100%",maxWidth:compact?"100%":560,margin:"0 auto",perspective:1200,minHeight:560}}>
      <div style={{position:"relative",width:"100%"}}>
        {cards.map((c,i)=>{
          const isHovered=hoveredIndex===i;
          const isBehind=hoveredIndex!==null&&i<hoveredIndex;
          const baseTop=compact?i*56:i*52;
          return(
            <div key={c.title}
              onMouseEnter={()=>setHoveredIndex(i)}
              onMouseLeave={()=>setHoveredIndex(null)}
              style={{
                position:"absolute",
                top:baseTop,
                left:0,
                right:0,
                width:"100%",
                minHeight:isHovered?(compact?320:360):(compact?56:52),
                borderRadius:isHovered?32:26,
                background:isDark?`linear-gradient(135deg,${c.color}26,rgba(10,5,30,.92))`:`linear-gradient(135deg,${c.color}16,rgba(255,255,255,.97))`,
                border:`1.5px solid ${c.color}${isDark?isHovered?"60":"35":isHovered?"55":"40"}`,
                backdropFilter:"blur(32px)",
                boxShadow:isHovered
                  ?`0 32px 80px ${c.color}45, inset 0 1px 0 ${c.color}32, 0 0 80px ${c.color}25`
                  :isDark?`0 6px 18px ${c.color}14`:`0 6px 18px ${c.color}16`,
                padding:isHovered?(compact?"32px 32px":"40px 40px"):(compact?"16px 18px":"16px 20px"),
                transform:`scale(${isHovered?1.03:isBehind?.92:1}) translateZ(0)`,
                transition:"all .35s cubic-bezier(.23,1,.32,1), box-shadow .3s",
                zIndex:isHovered?120:(isBehind?5:20+i),
                cursor:"pointer",
                overflow:"hidden",
                willChange:"transform, box-shadow, filter",
                opacity:isHovered?1:(isBehind?.3:.9),
                filter:`blur(${isBehind?14:0}px)`,
                backdropFilter:isBehind?"blur(32px)":"blur(32px)"
              }}>
              {!isHovered&&(
                <div style={{display:"flex",alignItems:"center",gap:16,height:"100%"}}>
                  <div style={{
                    width:48,height:48,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",
                    background:`${c.color}20`,fontSize:26,flexShrink:0,
                    animation:`float ${2.5+i*.3}s ease-in-out infinite`,animationDelay:`${i*.15}s`
                  }}>
                    {c.icon}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:15,color:isDark?"#f1f5f9":"#1e1b4b",marginBottom:2,letterSpacing:"-.01em"}}>{c.title}</div>
                    <div style={{fontSize:11,color:c.color,fontWeight:600,opacity:.85}}>{c.sub}</div>
                  </div>
                </div>
              )}

              {isHovered&&(
                <div style={{animation:"fadeUp .35s cubic-bezier(.23,1,.32,1)"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:24}}>
                    <div style={{
                      width:72,height:72,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",
                      background:`linear-gradient(135deg,${c.color}30,${c.color}14)`,
                      border:`2.5px solid ${c.color}48`,
                      fontSize:40,flexShrink:0,
                      boxShadow:`0 16px 48px ${c.color}32, inset 0 1px 0 ${c.color}40`,
                      animation:`float ${2+i*.25}s ease-in-out infinite`,animationDelay:`${i*.1}s`
                    }}>
                      {c.icon}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:900,fontSize:26,color:isDark?"#f1f5f9":"#1e1b4b",marginBottom:6,lineHeight:1.1,letterSpacing:"-.02em"}}>{c.title}</div>
                      <div style={{fontSize:13,color:c.color,fontWeight:700}}>{c.sub}</div>
                    </div>
                  </div>
                  <div style={{fontSize:15.5,color:isDark?"#cbd5e1":"#4b5563",lineHeight:1.8,fontWeight:500,marginBottom:24}}>
                    {c.desc}
                  </div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap",animation:"fadeIn .4s ease .15s both"}}>
                    {["Adaptive path","Skill graph","Topic focus"].map((item)=>(
                      <span key={item} style={{
                        padding:"10px 14px",borderRadius:999,border:`1.5px solid ${c.color}45`,
                        background:`${c.color}16`,color:c.color,fontSize:11,fontWeight:700,
                        transition:"all .2s",letterSpacing:".05em"
                      }}>{item}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GradeUp(){
  const [,setLocation]=useLocation();
  const [theme,setTheme]=useState("dark");
  const scrollY=useScrollY();
  const mouse=useMouse();
  const isDark=theme==="dark";
  const {w:winW}=useWindowSize();
  const isMobile=winW<640;
  const isTablet=winW>=640&&winW<1024;
  const isCompact=winW<1100;
  const shellPadding=isMobile?"0 16px":isTablet?"0 24px":"0 clamp(20px,4vw,52px)";
  const sectionPadding=isMobile?"120px 16px":isTablet?"132px 24px":"150px clamp(20px,4vw,52px)";
  const heroGridColumns=isCompact?"1fr":"1fr 1fr";
  const benefitsTopGrid=isCompact?"1fr":"1.15fr .85fr";
  const benefitsBottomGrid=winW<900?"1fr":winW<1280?"repeat(2,minmax(0,1fr))":"repeat(3,minmax(0,1fr))";
  const statsGridColumns=winW<700?"repeat(2,minmax(0,1fr))":"repeat(4,minmax(0,1fr))";
  const splitGridColumns=winW<1024?"1fr":"1fr 1fr";
  const footerGridColumns=winW<800?"1fr":winW<1200?"1.4fr 1fr 1fr":"2fr 1fr 1fr 1fr";
  const featureGridColumns=winW<640?"1fr":winW<960?"repeat(2,minmax(0,1fr))":winW<1400?"repeat(3,minmax(0,1fr))":"repeat(4,minmax(0,1fr))";
  const goToAuth=useCallback(()=>setLocation("/auth"),[setLocation]);

  /* Section refs */
  const heroRef=useRef(null),benefRef=useRef(null),featRef=useRef(null);
  const statsRef=useRef(null),testiRef=useRef(null),pricingRef=useRef(null),faqRef=useRef(null),ctaRef=useRef(null);
  const heroDepth=useSectionDepth(heroRef);
  const benefDepth=useSectionDepth(benefRef);
  const featDepth=useSectionDepth(featRef);
  const statsDepth=useSectionDepth(statsRef);
  const testiDepth=useSectionDepth(testiRef);
  const pricingDepth=useSectionDepth(pricingRef);
  const faqDepth=useSectionDepth(faqRef);
  const ctaDepth=useSectionDepth(ctaRef);

  /* Derived theme tokens */
  const text=isDark?"#f1f5f9":"#111827";
  const muted=isDark?"#94a3b8":"#4b5563";
  const border=isDark?"rgba(255,255,255,.08)":"rgba(99,102,241,.16)";
  const navBg=isDark?"rgba(5,2,18,.92)":"rgba(248,246,255,.95)";
  const cardBg=isDark?"rgba(10,5,28,.82)":"rgba(255,255,255,.92)";

  const features=[
    {icon:"🧠",t:"Neural Adaptive AI",d:"42+ signal tracking. Real-time curriculum morphing every 30 seconds based on your cognitive state and learning velocity.",c:T.indigo},
    {icon:"🌐",t:"3D Study Spaces",d:"Spatial memory anchoring with immersive virtual classrooms that improve concept recall and long-term retention.",c:T.blue},
    {icon:"⚡",t:"Instant Feedback",d:"Sub-second AI analysis on every answer with precise micro-explanations in your language.",c:T.amber},
    {icon:"🔒",t:"Enterprise Security",d:"AES-256 end-to-end encryption with GDPR, FERPA, and COPPA aligned workflows.",c:T.emerald},
    {icon:"📊",t:"Deep Analytics",d:"Visual learning trajectories, weakness heatmaps, and predictive grade forecasting with AI-backed signals.",c:T.cyan},
    {icon:"🎮",t:"Gamification Engine",d:"Streaks, XP, and leaderboards powered by behavioral design that keep momentum high.",c:T.rose},
    {icon:"👥",t:"Collaborative Spaces",d:"AI-enhanced peer learning with live co-study sessions, guided rooms, and group challenges.",c:T.purple},
    {icon:"✅",t:"Smart Assessments",d:"Adaptive tests that recalibrate question difficulty mid-session to maintain the right challenge level.",c:T.pink},
    {icon:"🗺️",t:"Concept Maps",d:"Auto-generated knowledge graphs expose topic dependencies, blind spots, and next best actions.",c:T.amber},
  ];

  const featureCards=[
    ...features.map((feature,index)=>(
      {
        ...feature,
        tag:["Live adaptation","Immersive recall","Under 1 second","Trusted by schools","Actionable insights","Retention loops","Study together","Dynamic difficulty","See the gaps"][index],
      }
    )),
    {icon:"🔢",t:"Mathematics Paths",d:"See formulas, shortcuts, and worked steps arranged by mastery level instead of static chapters.",c:T.indigoL,tag:"Math focus"},
    {icon:"🔬",t:"Science Labs",d:"Explore diagrams, reactions, and practical experiments with layered explanations and quick checks.",c:T.cyanL,tag:"Science focus"},
    {icon:"💻",t:"Coding Studio",d:"Practice logic, syntax, debugging, and web development in guided interactive sequences.",c:T.blueL,tag:"Code focus"},
    {icon:"📖",t:"History Stories",d:"Connect timelines, events, and causes with visual context cards instead of flat notes.",c:T.amberL,tag:"History focus"},
    {icon:"✍️",t:"English Fluency",d:"Build reading, grammar, writing, and speaking confidence through adaptive practice loops.",c:T.roseL,tag:"Language focus"},
    {icon:"📈",t:"Web Chat Graphs",d:"Track conversations, concept links, and answer quality in interactive graph-style study views.",c:T.emeraldL,tag:"Interactive graph"},
  ];

  const testimonials=[
    {name:"Sarah Chen",role:"Harvard University, Year 3",text:"GradeUp's 3D interface is unlike anything I've used. My GPA jumped from 3.1 to 3.8 in one semester. The neural AI literally knows what I need before I do.",av:"SC",c:T.indigo},
    {name:"Prof. Marcus Reid",role:"Head of CS, MIT",text:"I've integrated GradeUp across 400 students. The analytics dashboard gives unprecedented insight into learning patterns. Truly revolutionary pedagogical technology.",av:"MR",c:T.rose},
    {name:"Aisha Patel",role:"Curriculum Director, IIT Delhi",text:"Within 3 weeks, student engagement metrics were up 73%. The AI tutor handles FAQ load so professors can focus on deep teaching.",av:"AP",c:T.blue},
    {name:"Jordan Kim",role:"High School Student, Seoul",text:"I went from failing Math to top of my class in 2 months. The adaptive questions somehow always know exactly what I'm struggling with.",av:"JK",c:T.emerald},
  ];

  const faqs=[
    {q:"How does the AI learn my study style?",a:"Our neural engine tracks 42+ signals including response latency, error patterns, and re-attempt behaviour to build a live cognitive profile that updates every session with increasing precision."},
    {q:"What makes the 3D interface different?",a:"Spatial memory anchoring is neurologically proven. Our 3D parallax environments attach concepts to spatial contexts, dramatically improving long-term recall and engagement."},
    {q:"Is GradeUp available on mobile?",a:"Yes — full native iOS and Android apps with the same 3D experience optimised for touch. Offline mode lets you study anywhere."},
    {q:"Monthly vs yearly — what changes?",a:"Yearly plans save 30% and include extended analytics history, priority AI queuing, exclusive content drops, and early access to new features."},
    {q:"Can educators build their own content?",a:"Yes! Our Creator Studio lets educators build AI-assisted 3D courses with auto-graded assessments and real-time student progress tracking."},
    {q:"Is student data private?",a:"All data is AES-256 encrypted. We never sell data. Full GDPR, FERPA, and COPPA compliance with optional on-premise deployment for institutions."},
  ];

  const marqueeItems1=[
    {icon:"🧠",text:"Neural AI Tutoring"},{icon:"📊",text:"Live Analytics"},
    {icon:"🌐",text:"3D Study Spaces"},{icon:"⚡",text:"Instant Feedback"},
    {icon:"🎯",text:"Adaptive Testing"},{icon:"🏆",text:"Gamified Learning"},
    {icon:"👥",text:"Peer Collaboration"},{icon:"🚀",text:"Skill Acceleration"},
  ];
  const marqueeItems2=[
    {icon:"🔒",text:"SOC 2 Certified"},{icon:"🌍",text:"50+ Countries"},
    {icon:"📱",text:"Mobile Native"},{icon:"🎓",text:"500K+ Students"},
    {icon:"⭐",text:"4.9★ Rating"},{icon:"🤝",text:"Harvard Approved"},
    {icon:"💡",text:"Patent Pending AI"},{icon:"🛡️",text:"GDPR Compliant"},
  ];

  return(
    <div style={{minHeight:"100vh",color:text,fontFamily:SYSTEM_FONT_STACK,overflowX:"hidden"}}>
      <style>{CSS}</style>
      <Cursor/>
      <ProgressBar/>
      <BgLayer scrollY={scrollY} theme={theme}/>

      {/* ── NAV ──────────────────────────────────────── */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:shellPadding,height:isMobile?64:72,
        background:navBg,backdropFilter:"blur(28px) saturate(200%)",
        borderBottom:`1px solid ${border}`,
        boxShadow:isDark?"0 1px 0 rgba(255,255,255,.04)":"0 1px 0 rgba(99,102,241,.12), 0 4px 24px rgba(99,102,241,.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:12,
            background:`linear-gradient(135deg,${T.indigo},${T.rose})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:900,fontSize:17,color:"#fff",
            boxShadow:`0 0 24px ${T.indigo}60,0 0 48px ${T.rose}20`,
            animation:"spin 22s linear infinite"}}>G</div>
          <span style={{fontWeight:800,fontSize:isMobile?16:18,letterSpacing:"-.03em",fontFamily:SYSTEM_FONT_STACK}}>
            GradeUp{" "}
            <span style={{background:`linear-gradient(90deg,${T.indigo},${T.rose})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>AI</span>
          </span>
        </div>

        <div style={{display:isCompact?"none":"flex",gap:32}}>
          {["Features","Benefits","Pricing","FAQ"].map(n=>(
            <a key={n} href={`#${n.toLowerCase()}`} data-hover
              style={{color:muted,fontWeight:600,fontSize:13,textDecoration:"none",
                letterSpacing:".05em",textTransform:"uppercase",transition:"color .2s"}}
              onMouseEnter={e=>e.target.style.color=T.indigoL}
              onMouseLeave={e=>e.target.style.color=muted}>{n}</a>
          ))}
        </div>

        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} data-hover
            style={{width:38,height:38,borderRadius:"50%",border:`1px solid ${border}`,
              background:isDark?"rgba(255,255,255,.06)":"rgba(99,102,241,.08)",
              fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
              backdropFilter:"blur(8px)",color:text,cursor:"none",transition:"all .2s"}}>
            {isDark?"☀️":"🌙"}
          </button>
          <Mag onClick={goToAuth} style={{padding:isMobile?"10px 18px":"10px 26px",borderRadius:14,fontWeight:800,fontSize:13,
            background:`linear-gradient(135deg,${T.indigo},${T.rose})`,color:"#fff",border:"none",
            boxShadow:`0 4px 28px ${T.indigo}55`}}>Get Started →</Mag>
        </div>
      </nav>

      {/* ══ HERO ═══════════════════════════════════════ */}
      <section ref={heroRef} style={{minHeight:"100vh",display:"flex",alignItems:"center",
        paddingTop:72,position:"relative",zIndex:2}}>

        <Particles count={28} isDark={isDark}/>

        {/* Watermark text – ultra-slow parallax */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",willChange:"transform"}}>
          {[
            {text:"AI",x:"62%",top:"12%",rot:-8,speed:.05,color:isDark?"rgba(99,102,241,.08)":"rgba(99,102,241,.1)"},
            {text:"3D",x:"-4%",bot:"8%",rot:5,speed:.11,color:isDark?"rgba(244,63,94,.06)":"rgba(244,63,94,.09)"},
            {text:"∞",x:"85%",top:"55%",rot:0,speed:.08,color:isDark?"rgba(168,85,247,.07)":"rgba(168,85,247,.1)"},
          ].map((w,i)=>(
            <div key={i} style={{
              position:"absolute",left:w.x,top:w.top,bottom:w.bot,
              fontSize:"clamp(120px,20vw,260px)",
              fontFamily:SYSTEM_FONT_STACK,fontWeight:900,letterSpacing:"-.05em",lineHeight:1,
              color:"transparent",WebkitTextStroke:`1.5px ${w.color}`,
              transform:`translateY(${scrollY*w.speed}px) rotate(${w.rot}deg)`,
              userSelect:"none",willChange:"transform",transition:"transform .04s"}}>
              {w.text}
            </div>
          ))}
        </div>

        {/* Floating dots – medium speed */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",transform:`translateY(${scrollY*.1}px)`,willChange:"transform",transition:"transform .04s"}}>
          {[...Array(18)].map((_,i)=>(
            <div key={i} style={{
              position:"absolute",
              left:`${(i*67+12)%100}%`,top:`${(i*53+7)%100}%`,
              width:3+i%3,height:3+i%3,borderRadius:"50%",
              background:[T.indigo,T.rose,T.blue,T.purple,T.cyan,T.amber][i%6],
              opacity:isDark?.4:.3,
              animation:`float ${2.5+i*.4}s ease-in-out infinite`,
              animationDelay:`${i*.28}s`}}/>
          ))}
        </div>

        <div style={{width:"100%",maxWidth:1440,margin:"0 auto",
          padding:isMobile?"48px 16px 80px":isTablet?"64px 24px 88px":"80px clamp(20px,4vw,52px)",
          display:"grid",gridTemplateColumns:heroGridColumns,gap:isCompact?40:70,alignItems:"center"}}>

          {/* Hero text – slow parallax */}
          <div style={{transform:`translateY(${scrollY*.12}px)`,transition:"transform .04s",willChange:"transform"}}>
             <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 18px",borderRadius:999,marginBottom:28,
              background:isDark?`${T.indigo}1a`:`${T.indigo}12`,border:`1px solid ${T.indigo}45`,
              fontSize:12,color:T.indigoL,fontWeight:700,letterSpacing:".15em",textTransform:"uppercase",
              animation:"fadeUp .8s ease forwards"}}>
              <span style={{animation:"badgePulse 2.5s infinite"}}>🚀</span>
              Neural-Powered Education Platform
            </div>

            <h1 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:"clamp(38px,6vw,86px)",
              fontWeight:900,lineHeight:1.04,letterSpacing:"-.04em",marginBottom:26,
              animation:"fadeUp .9s .1s ease both"}}>
              <span style={{display:"block"}}>The Complete</span>
              <span style={{
                background:`linear-gradient(135deg,${T.indigoL},${T.purple},${T.rose},${T.amber})`,
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                backgroundSize:"300%",animation:"shimmer 5s linear infinite"}}>AI Learning</span>
              <span style={{display:"block"}}>Platform.</span>
            </h1>

            <p style={{fontSize:17,color:muted,lineHeight:1.78,maxWidth:480,marginBottom:42,animation:"fadeUp 1s .2s ease both"}}>
              12 student tools + 7 teacher tools in one neural-adaptive platform. From AI tutoring and debates to live meetings and exam prep — everything students and educators need to excel.
            </p>

            <div style={{display:"flex",gap:16,flexWrap:"wrap",animation:"fadeUp 1s .3s ease both"}}>
              <Mag onClick={goToAuth} style={{padding:isMobile?"16px 26px":"17px 40px",borderRadius:18,fontWeight:800,fontSize:16,
                background:`linear-gradient(135deg,${T.indigo},${T.rose})`,color:"#fff",border:"none",
                boxShadow:`0 8px 48px ${T.indigo}65,0 4px 24px ${T.rose}35`}}>
                Start Free ✦
              </Mag>
              <Mag style={{padding:"17px 32px",borderRadius:18,fontWeight:800,fontSize:16,
                background:isDark?"rgba(255,255,255,.06)":"rgba(99,102,241,.08)",
                color:text,border:`1.5px solid ${border}`,backdropFilter:"blur(10px)",
                display:"flex",alignItems:"center",gap:10}}>
                <span style={{width:32,height:32,borderRadius:"50%",background:`${T.rose}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>▶</span>
                Watch Demo
              </Mag>
            </div>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,minmax(0,1fr))",gap:isMobile?18:32,marginTop:56,animation:"fadeUp 1s .45s ease both"}}>
              {[
                {v:500,s:"K+",l:"Active Learners",g:`${T.indigoL},${T.purple}`},
                {v:98,s:"%",l:"Success Rate",g:`${T.rose},${T.pink}`},
                {v:50,s:"+",l:"Countries",g:`${T.blue},${T.cyan}`},
              ].map((st,i)=>(
                <div key={i}>
                  <div style={{fontSize:36,fontWeight:900,fontFamily:SYSTEM_FONT_STACK,
                    background:`linear-gradient(135deg,${st.g})`,
                    WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                    letterSpacing:"-.03em"}}>
                    <Counter end={st.v} suffix={st.s}/>
                  </div>
                  <div style={{fontSize:11,color:muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",marginTop:2}}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3D Brain – faster parallax */}
          <div style={{display:"flex",justifyContent:"center",
            transform:`translateY(${scrollY*-.14}px)`,transition:"transform .04s"}}>
            <HeroBrain3D mouse={mouse} scrollY={scrollY} isDark={isDark}/>
          </div>
        </div>
 
        {/* Scroll indicator */}
        <div style={{position:"absolute",bottom:32,left:"50%",transform:"translateX(-50%)",
          display:"flex",flexDirection:"column",alignItems:"center",gap:8,
          animation:"float 2.5s ease-in-out infinite"}}>
          <span style={{fontSize:10,color:muted,letterSpacing:".2em",textTransform:"uppercase",fontWeight:600}}>Scroll to explore</span>
          <div style={{width:1,height:50,background:`linear-gradient(${T.indigoL},transparent)`}}/>
        </div>
      </section>

      {/* ── MARQUEE STRIP ─────────────────────────────── */}
      <div style={{position:"relative",zIndex:2,borderTop:`1px solid ${border}`,borderBottom:`1px solid ${border}`,
        background:isDark?"rgba(5,2,18,.6)":"rgba(248,246,255,.7)",backdropFilter:"blur(12px)"}}>
        <Marquee items={marqueeItems1} speed={35} isDark={isDark}/>
        <Marquee items={marqueeItems2} speed={28} isDark={isDark} reverse/>
      </div>

      
      {/* ══ BENEFITS ════════════════════════════════════ */}
      <section id="benefits" ref={benefRef} style={{padding:sectionPadding,maxWidth:1440,margin:"0 auto",position:"relative",zIndex:2}}>
        {/* Section parallax orbs */}
        <div style={{position:"absolute",right:-100,top:"5%",width:450,height:450,borderRadius:"50%",
          background:`radial-gradient(circle,${T.rose}${isDark?"12":"28"},transparent)`,
          filter:"blur(70px)",transform:`translateY(${-benefDepth*140}px)`,pointerEvents:"none"}}/>
        <div style={{position:"absolute",left:-80,bottom:"15%",width:380,height:380,borderRadius:"50%",
          background:`radial-gradient(circle,${T.blue}${isDark?"10":"22"},transparent)`,
          filter:"blur(60px)",transform:`translateY(${benefDepth*90}px)`,pointerEvents:"none"}}/>

        <Reveal dir="up">
          <div style={{textAlign:"center",marginBottom:88}}>
            <div style={{color:T.rose,fontSize:11,fontWeight:800,letterSpacing:".22em",textTransform:"uppercase",marginBottom:18}}>Why GradeUp</div>
            <h2 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:"clamp(36px,5vw,68px)",fontWeight:900,letterSpacing:"-.03em",marginBottom:20}}>
              Unmatched{" "}
              <span style={{background:`linear-gradient(135deg,${T.indigo},${T.rose})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Intelligence</span>
            </h2>
            <p style={{color:muted,fontSize:17,maxWidth:520,margin:"0 auto",lineHeight:1.7}}>Purpose-built for how your brain actually learns — not how textbooks assume it does.</p>
          </div>
        </Reveal>

        {/* Bento grid */}
        <div style={{display:"grid",gridTemplateColumns:benefitsTopGrid,gap:24,marginBottom:24}}>
          {/* Large card – parallax offset */}
          <Reveal dir="left" delay={.1}>
            <div style={{transform:`translateY(${-benefDepth*40}px)`,transition:"transform .12s"}}>
              <Tilt glow={T.indigo} style={{borderRadius:32,padding:52,minHeight:360,
                background:isDark?`linear-gradient(150deg,${T.indigo}22,${T.purple}10,rgba(10,5,30,.85))`:`linear-gradient(150deg,${T.indigo}14,${T.purple}06,rgba(255,255,255,.95))`,
                border:`1.5px solid ${T.indigo}${isDark?"28":"32"}`,
                boxShadow:isDark?`0 20px 80px ${T.indigo}12`:`0 20px 80px ${T.indigo}18`,
                display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:48,marginBottom:22,animation:"float 4s ease-in-out infinite"}}>🧠</div>
                  <h3 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:30,fontWeight:900,marginBottom:16,letterSpacing:"-.02em"}}>Neural-Adaptive AI Engine</h3>
                  <p style={{color:muted,fontSize:16,lineHeight:1.75}}>42+ cognitive signal tracking. Real-time curriculum morphing. The AI understands your learning velocity, attention patterns, and optimal difficulty curve — adjusting every 30 seconds.</p>
                </div>
                <div style={{marginTop:32,padding:"14px 22px",borderRadius:16,
                  background:`${T.indigo}15`,border:`1px solid ${T.indigo}30`,
                  display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:T.emerald,animation:"pulse2 1.4s infinite"}}/>
                  <span style={{fontSize:13,color:muted,fontWeight:500}}>Adapting for 500,000+ learners right now</span>
                </div>
              </Tilt>
            </div>
          </Reveal>

          {/* Stack of 2 cards with staggered parallax */}
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {[
              {icon:"🌐",t:"3D Study Spaces",d:"Spatial memory anchoring. Immersive virtual classrooms that make concepts stick 40% longer with proven neuroscience.",c:T.blue,para:20},
              {icon:"⚡",t:"Instant AI Feedback",d:"Sub-second analysis on every answer. Targeted micro-explanations that pinpoint exactly where your thinking went.",c:T.rose,para:55},
            ].map((b,i)=>(
              <Reveal key={i} dir="right" delay={.2+i*.12}>
                <div style={{transform:`translateY(${-benefDepth*b.para}px)`,transition:"transform .12s"}}>
                  <Tilt glow={b.c} style={{borderRadius:24,padding:34,
                    background:isDark?`linear-gradient(135deg,${b.c}14,rgba(10,5,30,.8))`:`linear-gradient(135deg,${b.c}12,rgba(255,255,255,.94))`,
                    border:`1.5px solid ${b.c}${isDark?"22":"28"}`,
                    boxShadow:isDark?`0 12px 40px ${b.c}10`:`0 12px 40px ${b.c}16`}}>
                    <div style={{fontSize:34,marginBottom:14,animation:`float ${3+i}s ease-in-out infinite`}}>{b.icon}</div>
                    <h3 style={{fontSize:21,fontWeight:800,marginBottom:10,letterSpacing:"-.01em"}}>{b.t}</h3>
                    <p style={{color:muted,fontSize:14.5,lineHeight:1.68}}>{b.d}</p>
                  </Tilt>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Bottom 3-col with varied parallax */}
        <div style={{display:"grid",gridTemplateColumns:benefitsBottomGrid,gap:24}}>
          {[
            {icon:"🛡️",t:"Enterprise Security",d:"AES-256 encryption. GDPR & FERPA compliant. SOC 2 Type II certified.",c:T.emerald,para:15},
            {icon:"📊",t:"Predictive Analytics",d:"Visual learning trajectories, weakness heatmaps, and grade forecasting.",c:T.cyan,para:35},
            {icon:"🎮",t:"Gamification Science",d:"Streaks, XP, leaderboards — behavioural-science-backed motivation loops.",c:T.purple,para:55},
          ].map((b,i)=>(
            <Reveal key={i} dir="scale" delay={.1+i*.1}>
              <div style={{transform:`translateY(${-benefDepth*b.para}px)`,transition:"transform .12s"}}>
                <Tilt glow={b.c} style={{borderRadius:24,padding:34,
                  background:isDark?`linear-gradient(135deg,${b.c}12,rgba(10,5,30,.78))`:`linear-gradient(135deg,${b.c}10,rgba(255,255,255,.92))`,
                  border:`1.5px solid ${b.c}${isDark?"20":"26"}`}}>
                  <div style={{fontSize:32,marginBottom:14,animation:`float ${3.5+i*.5}s ease-in-out infinite`,animationDelay:`${i*.3}s`}}>{b.icon}</div>
                  <h3 style={{fontSize:19,fontWeight:800,marginBottom:10}}>{b.t}</h3>
                  <p style={{color:muted,fontSize:14,lineHeight:1.65}}>{b.d}</p>
                  <div style={{marginTop:18,height:2,borderRadius:1,background:`linear-gradient(90deg,${b.c},transparent)`,width:"65%"}}/>
                </Tilt>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Neural Adapt Performance + Card stack + Radar chart */}
        <Reveal dir="up" delay={.1}>
          <div style={{marginBottom:64,textAlign:"center"}}>
            <div style={{color:T.purple,fontSize:11,fontWeight:800,letterSpacing:".22em",textTransform:"uppercase",marginBottom:12}}>Core Metrics</div>
            <h3 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:"clamp(28px,3vw,40px)",fontWeight:900,letterSpacing:"-.02em"}}>
              Real-time <span style={{background:`linear-gradient(135deg,${T.purple},${T.indigo})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Performance Tracking</span>
            </h3>
          </div>
        </Reveal>
        
        <div style={{display:"grid",gridTemplateColumns:"1fr",marginBottom:80}}>
          <Reveal dir="up" delay={.15}>
            <NeuralAdaptPerformance depth={benefDepth} isDark={isDark}/>
          </Reveal>
        </div>

        {/* Card stack + Radar chart */}
        <div style={{display:"grid",gridTemplateColumns:splitGridColumns,gap:48,marginTop:20,alignItems:"flex-start",minHeight:550}}>
          <Reveal dir="left" delay={.1}>
            <div style={{transform:`translateY(${-benefDepth*18}px)`,transition:"transform .15s",willChange:"transform"}}>
              <CardStack scrollY={scrollY} isDark={isDark} sectionDepth={benefDepth}/>
            </div>
          </Reveal>
          <Reveal dir="right" delay={.2}>
            <div style={{transform:`translateY(${-benefDepth*28}px)`,transition:"transform .15s",willChange:"transform"}}>
              <RadarViz depth={benefDepth} isDark={isDark}/>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ PLANET INTERLUDE ════════════════════════════ */}
      <div style={{position:"relative",zIndex:2,display:"flex",justifyContent:"center",
        padding:"100px 20px 120px",overflow:"hidden",minHeight:"600px"}}>
        {/* Multi-speed text layers */}
        {[
          {word:"LEARN",spd:.04,size:"clamp(90px,16vw,200px)",c:T.indigo,rot:-5,x:"5%"},
          {word:"ADAPT",spd:.08,size:"clamp(70px,12vw,160px)",c:T.rose,rot:3,x:"55%"},
          {word:"MASTER",spd:.06,size:"clamp(60px,10vw,140px)",c:T.blue,rot:-2,x:"30%"},
        ].map((w,i)=>(
          <div key={i} style={{
            position:"absolute",left:w.x,top:`${15+i*25}%`,
            fontSize:w.size,fontFamily:SYSTEM_FONT_STACK,fontWeight:900,letterSpacing:"-.05em",lineHeight:1,
            color:"transparent",
            WebkitTextStroke:isDark?`1.5px ${w.c}22`:`1.5px ${w.c}28`,
            transform:`translateY(${-scrollY*w.spd}px) rotate(${w.rot}deg)`,
            pointerEvents:"none",userSelect:"none"}}>
            {w.word}
          </div>
        ))}

        {/* Planet – enhanced parallax and depth */}
        <div style={{transform:`translateY(${-scrollY*.05}px) scale(${.88+featDepth*.14})`,transition:"transform .12s",willChange:"transform"}}>
          <Planet3D scrollY={scrollY} isDark={isDark} mouse={mouse}/>
        </div>

        {/* Orbiting text labels - premium stats */}
        {[
          {label:"500K+ Students",angle:0,dist:240,icon:"👥",color:T.indigo},
          {label:"50+ Countries",angle:120,dist:230,icon:"🌍",color:T.rose},
          {label:"98% Success",angle:240,dist:250,icon:"⭐",color:T.blue},
        ].map((lb,i)=>{
          const ang=(lb.angle+scrollY*.04)*Math.PI/180;
          const x=220+Math.cos(ang)*lb.dist;
          const y=220+Math.sin(ang)*lb.dist*.4;
          return(
            <div key={i} style={{
              position:"absolute",left:`calc(50% + ${x-220}px)`,top:`calc(50% + ${y-220}px)`,
              transform:"translate(-50%,-50%)",
              pointerEvents:"none"
            }}>
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                padding:"12px 20px",borderRadius:999,
                background:isDark
                  ?`linear-gradient(135deg,${lb.color}24,rgba(12,8,28,.92))`
                  :`linear-gradient(135deg,${lb.color}18,rgba(255,255,255,.96))`,
                border:`1.5px solid ${lb.color}55`,
                fontSize:13,fontWeight:800,
                color:isDark?"#f1f5f9":"#111827",
                boxShadow:`0 12px 40px ${lb.color}35, inset 0 1px 0 ${lb.color}${isDark?"20":"30"}`,
                backdropFilter:"blur(20px)",
                WebkitBackdropFilter:"blur(20px)",
                whiteSpace:"nowrap",
                transition:"all .3s cubic-bezier(.23,1,.32,1)"
              }}>
                <span style={{fontSize:18}}>{lb.icon}</span>
                <span style={{letterSpacing:"-.01em"}}>{lb.label}</span>
              </div>
            </div>
          );
        })}

        {/* Animated orbiting particles/rings around stats */}
        {[0,120,240].map((angle,i)=>(
          <div key={`ring-${i}`} style={{
            position:"absolute",left:"50%",top:"50%",
            width:480,height:480,
            transform:`translate(-50%,-50%) rotate(${angle}deg)`,
            pointerEvents:"none",
            animation:`spin ${60+i*30}s linear infinite`,
            animationDirection:i%2===0?"normal":"reverse"
          }}>
            <div style={{
              position:"absolute",left:"50%",top:0,
              width:3,height:40,
              background:`linear-gradient(to bottom,${[T.indigo,T.rose,T.blue][i]},transparent)`,
              transformOrigin:"center 240px",
              opacity:isDark?.3:.4,
              filter:"blur(.5px)"
            }}/>
          </div>
        ))}
      </div>

<div id="features" style={{position:"relative",zIndex:2}}>
        <ParallaxFeatureSlider isDark={isDark} scrollY={scrollY}/>
      </div>
      {/* ══ FEATURES ════════════════════════════════════ */}
      <section id="features" ref={featRef} style={{padding:sectionPadding,position:"relative",zIndex:2}}>
        {/* Floating section BG orb */}
        <div style={{position:"absolute",top:"15%",left:"50%",
          width:700,height:700,borderRadius:"50%",
          background:isDark?`radial-gradient(circle,${T.purple}06,transparent)`:`radial-gradient(circle,${T.purple}10,${T.rose}05,transparent)`,
          filter:"blur(90px)",pointerEvents:"none",
          transform:`translateX(-50%) translateY(${-featDepth*200}px)`}}/>

        <div style={{maxWidth:1440,margin:"0 auto"}}>
          <Reveal dir="up">
            <div style={{textAlign:"center",marginBottom:80}}>
              <div style={{color:T.blue,fontSize:11,fontWeight:800,letterSpacing:".22em",textTransform:"uppercase",marginBottom:16,opacity:.8}}>Advanced Features</div>
              <h2 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:"clamp(40px,5.5vw,72px)",fontWeight:900,letterSpacing:"-.05em",lineHeight:1.1,marginBottom:8}}>
                <span style={{display:"block",color:text}}>Adaptively</span>
                <span style={{background:`linear-gradient(135deg,${T.blue},${T.cyan},${T.emerald})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",display:"block"}}>Intelligent Learning</span>
              </h2>
              <p style={{color:muted,fontSize:16,marginTop:16}}>Every interaction teaches us how you learn best</p>
            </div>
          </Reveal>

          {/* Feature grid – enhanced parallax with scale and rotation */}
          <div style={{display:"grid",gridTemplateColumns:featureGridColumns,gap:20}}>
            {featureCards.map((f,i)=>{
              const yParallax=-featDepth*(i%3===0?16:i%3===1?32:48);
              const scaleVal=1+(featDepth*(i%2===0?.06:.04));
              const rotVal=featDepth*(i%2===0?1:-1);
              return(
                <Reveal key={`${f.t}-${i}`} dir={["up","left","right","scale","up","right","left","scale","up"][i%9]} delay={i*.05}>
                  <div style={{transform:`translateY(${yParallax}px) scale(${scaleVal}) rotateZ(${rotVal}deg)`,transition:"transform .14s cubic-bezier(.25,.46,.45,.94)",willChange:"transform"}}>
                    <Tilt glow={f.c} style={{borderRadius:24,padding:isMobile?24:32,height:"100%",minHeight:isMobile?250:(winW>1399?280:260),
                      background:isDark?`linear-gradient(135deg,${f.c}12,rgba(10,5,30,.65))`:`linear-gradient(135deg,${f.c}10,rgba(255,255,255,.93))`,
                      border:`1.5px solid ${f.c}${isDark?"22":"28"}`,
                      boxShadow:isDark?`0 12px 40px ${f.c}12, inset 0 1px 0 ${f.c}15`:`0 12px 40px ${f.c}16, inset 0 1px 0 ${f.c}20`,
                      backdropFilter:"blur(24px)",
                      display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:36,marginBottom:16,display:"inline-block",
                        animation:`float${i%2?2:""} ${2.5+i*.35}s ease-in-out infinite`,
                        animationDelay:`${i*.22}s`}}>{f.icon}</div>
                        <h3 style={{fontSize:17,fontWeight:800,marginBottom:10,letterSpacing:"-.01em"}}>{f.t}</h3>
                        <p style={{color:muted,fontSize:13.5,lineHeight:1.68}}>{f.d}</p>
                      </div>
                      <div>
                        <div style={{marginTop:18,height:2.5,borderRadius:1.5,background:`linear-gradient(90deg,${f.c},transparent)`,
                          width:`${52+i*4}%`,boxShadow:`0 0 12px ${f.c}40`}}/>
                        <div style={{marginTop:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                          <span style={{padding:"8px 12px",borderRadius:999,fontSize:11,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",background:`${f.c}20`,color:f.c,border:`1px solid ${f.c}35`}}>
                            {f.tag}
                          </span>
                          <span style={{fontSize:11,fontWeight:700,color:muted}}>Explore</span>
                        </div>
                      </div>
                    </Tilt>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Learning path */}
          <div style={{marginTop:96,display:"grid",gridTemplateColumns:splitGridColumns,gap:52,alignItems:"center"}}>
            <Reveal dir="left">
              <div style={{transform:`translateY(${-featDepth*25}px)`,transition:"transform .12s"}}>
                <div style={{color:T.rose,fontSize:11,fontWeight:800,letterSpacing:".22em",textTransform:"uppercase",marginBottom:18}}>Your Journey</div>
                <h3 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:38,fontWeight:900,marginBottom:18,letterSpacing:"-.02em",lineHeight:1.1}}>
                  A Clear Path to{" "}
                  <span style={{background:`linear-gradient(135deg,${T.rose},${T.pink})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Mastery</span>
                </h3>
                <p style={{color:muted,fontSize:16,lineHeight:1.78,marginBottom:28}}>From your first assessment to full mastery — GradeUp maps every step, adapts to every stumble, and celebrates every breakthrough with personalised milestones.</p>
                {["Personalised assessment baseline","Daily adaptive practice sessions","Real-time difficulty calibration","Milestone-based achievement system"].map((item,ii)=>(
                  <div key={ii} style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
                    <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
                      background:`${T.rose}18`,border:`1px solid ${T.rose}45`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:11,color:T.rose,fontWeight:700}}>✓</div>
                    <span style={{color:muted,fontSize:14}}>{item}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal dir="right" delay={.2}>
              <LPathViz depth={featDepth} isDark={isDark}/>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ STATS ═══════════════════════════════════════ */}
      <section ref={statsRef} style={{padding:isMobile?"104px 16px":isTablet?"112px 24px":"120px clamp(20px,4vw,52px)",position:"relative",zIndex:2,
        borderTop:`1px solid ${border}`,borderBottom:`1px solid ${border}`,
        background:isDark?"rgba(99,102,241,.025)":undefined}}>
        {!isDark&&<div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${T.indigo}06,${T.rose}04,${T.blue}05)`,pointerEvents:"none"}}/>}

        {/* Expanding BG orb on scroll */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",
          background:isDark?`radial-gradient(ellipse at 50% 50%,${T.indigo}07,transparent 65%)`:`radial-gradient(ellipse at 50% 50%,${T.indigo}12,${T.rose}06,transparent 65%)`,
          transform:`scale(${.88+statsDepth*.15})`,transition:"transform .12s"}}/>

        <div style={{maxWidth:1300,margin:"0 auto",position:"relative"}}>
          <Reveal dir="up">
            <div style={{textAlign:"center",marginBottom:72}}>
              <h2 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:"clamp(34px,4.5vw,62px)",fontWeight:900,letterSpacing:"-.03em"}}>
                Results that{" "}
                <span style={{background:`linear-gradient(135deg,${T.indigo},${T.purple},${T.rose})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Speak for Themselves</span>
              </h2>
            </div>
          </Reveal>

          {/* Counters – staggered vertical parallax */}
          <div style={{display:"grid",gridTemplateColumns:statsGridColumns,gap:isMobile?24:32,textAlign:"center",marginBottom:96}}>
            {[
              {v:500000,s:"+",l:"Active Learners",g:`${T.indigo},${T.purple}`,para:0},
              {v:99,s:"%",l:"Satisfaction Rate",g:`${T.purple},${T.rose}`,para:18},
              {v:50,s:"+",l:"Countries",g:`${T.rose},${T.amber}`,para:36},
              {v:24,s:"h",l:"AI Support",g:`${T.blue},${T.cyan}`,para:54},
            ].map((st,i)=>(
              <Reveal key={i} dir="scale" delay={i*.1}>
                <div style={{transform:`translateY(${-statsDepth*st.para}px)`,transition:"transform .12s"}}>
                  <div style={{fontSize:"clamp(38px,4.5vw,60px)",fontWeight:900,fontFamily:SYSTEM_FONT_STACK,
                    background:`linear-gradient(135deg,${st.g})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                    marginBottom:8,letterSpacing:"-.03em"}}>
                    <Counter end={st.v} suffix={st.s}/>
                  </div>
                  <div style={{fontSize:11,color:muted,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase"}}>{st.l}</div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Dashboard + text */}
          <div style={{display:"grid",gridTemplateColumns:splitGridColumns,gap:"clamp(32px,6vw,56px)",alignItems:"center"}}>
            <Reveal dir="left">
              <div style={{transform:`translateY(${-statsDepth*28}px)`,transition:"transform .14s cubic-bezier(.23,1,.32,1)",willChange:"transform"}}>
                <div style={{color:T.cyan,fontSize:11,fontWeight:800,letterSpacing:".22em",textTransform:"uppercase",marginBottom:16,opacity:.85}}>Live Dashboard</div>
                <h3 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:"clamp(32px,3.5vw,44px)",fontWeight:900,marginBottom:18,letterSpacing:"-.04em",lineHeight:1.15}}>
                  Every metric,{" "}
                  <span style={{background:`linear-gradient(135deg,${T.cyan},${T.blue})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>visualised.</span>
                </h3>
                <p style={{color:muted,fontSize:16,lineHeight:1.78,marginBottom:28}}>Real-time analytics with performance tracking, streak monitoring, and predictive grade forecasting. Know exactly where you stand — always.</p>
                {["Performance scoring & percentile rank","Weakness heatmaps by topic","Grade prediction AI (92% accuracy)","Peer benchmarking & global leaderboards"].map((f,ii)=>(
                  <div key={ii} style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
                    <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
                      background:`${T.cyan}18`,border:`1px solid ${T.cyan}45`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:11,color:T.cyan,fontWeight:700}}>✓</div>
                    <span style={{color:muted,fontSize:14}}>{f}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal dir="right" delay={.2}>
              <div style={{transform:`translateY(${-statsDepth*32}px)`,transition:"transform .14s cubic-bezier(.23,1,.32,1)",willChange:"transform"}}>
                <DashViz depth={statsDepth} isDark={isDark} scrollY={scrollY}/>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ════════════════════════════════ */}
      <section ref={testiRef} style={{padding:sectionPadding,maxWidth:1440,margin:"0 auto",position:"relative",zIndex:2}}>
        <div style={{position:"absolute",top:"15%",left:"50%",
          width:800,height:600,borderRadius:"50%",
          background:isDark?`radial-gradient(ellipse,${T.rose}04,transparent)`:`radial-gradient(ellipse,${T.rose}12,${T.purple}06,transparent)`,
          filter:"blur(90px)",pointerEvents:"none",
          transform:`translateX(-50%) translateY(${-testiDepth*100}px)`}}/>

        <Reveal dir="up">
          <div style={{textAlign:"center",marginBottom:80}}>
            <div style={{color:T.amber,fontSize:11,fontWeight:800,letterSpacing:".22em",textTransform:"uppercase",marginBottom:18}}>Success Stories</div>
            <h2 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:"clamp(36px,5vw,64px)",fontWeight:900,letterSpacing:"-.03em"}}>
              Loved by Students &{" "}
              <span style={{background:`linear-gradient(135deg,${T.amber},${T.rose})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Educators</span>
            </h2>
          </div>
        </Reveal>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24}}>
          {testimonials.map((t,i)=>(
            <Reveal key={i} delay={i*.12} dir={["left","up","right","up"][i%4]}>
              <div style={{transform:`translateY(${-testiDepth*(i%2===0?20:40)}px)`,transition:"transform .12s"}}>
                <Tilt glow={t.c} style={{borderRadius:28,padding:38,height:"100%",
                  background:isDark?`linear-gradient(150deg,${t.c}14,${cardBg})`:`linear-gradient(150deg,${t.c}10,rgba(255,255,255,.95))`,
                  border:`1.5px solid ${t.c}${isDark?"28":"30"}`,
                  backdropFilter:"blur(20px)",
                  boxShadow:isDark?`0 12px 50px ${t.c}12`:`0 12px 50px ${t.c}16`}}>
                  {/* Stars */}
                  <div style={{display:"flex",gap:4,marginBottom:18}}>
                    {[...Array(5)].map((_,s)=>(
                      <span key={s} style={{color:T.amber,fontSize:15,animation:`pulse2 ${1.4+s*.2}s ease-in-out infinite`,animationDelay:`${s*.15}s`}}>★</span>
                    ))}
                  </div>
                  <p style={{color:isDark?"#cbd5e1":"#374151",fontSize:15,lineHeight:1.78,marginBottom:28,fontStyle:"italic"}}>
                    "{t.text}"
                  </p>
                  <div style={{display:"flex",alignItems:"center",gap:16}}>
                    <div style={{width:50,height:50,borderRadius:"50%",flexShrink:0,
                      background:`linear-gradient(135deg,${t.c},${T.purple})`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:800,fontSize:15,color:"#fff",
                      boxShadow:`0 4px 24px ${t.c}55`}}>{t.av}</div>
                    <div>
                      <div style={{fontWeight:800,fontSize:15,color:isDark?"#f1f5f9":"#111827"}}>{t.name}</div>
                      <div style={{fontSize:12,color:t.c,fontWeight:700,marginTop:2}}>{t.role}</div>
                    </div>
                  </div>
                </Tilt>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ PRICING ═════════════════════════════════════ */}
      <section id="pricing" ref={pricingRef} style={{padding:sectionPadding,position:"relative",zIndex:2}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",
          background:isDark?`radial-gradient(ellipse at 50% 0%,${T.indigo}09,transparent 55%)`:`radial-gradient(ellipse at 50% 0%,${T.indigo}14,${T.rose}06,transparent 55%)`,
          transform:`translateY(${-pricingDepth*120}px)`,transition:"transform .08s"}}/>
        <div style={{maxWidth:1280,margin:"0 auto",position:"relative",transform:`translateY(${-pricingDepth*40}px)`,transition:"transform .08s"}}>
          <Reveal dir="up">
            <div style={{textAlign:"center",marginBottom:64}}>
              <div style={{color:T.amber,fontSize:11,fontWeight:800,letterSpacing:".22em",textTransform:"uppercase",marginBottom:18}}>Transparent Pricing</div>
              <h2 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:"clamp(36px,5vw,64px)",fontWeight:900,letterSpacing:"-.03em",marginBottom:18}}>
                Choose Your{" "}
                <span style={{background:`linear-gradient(135deg,${T.indigo},${T.rose})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Learning Path</span>
              </h2>
              <p style={{color:muted,fontSize:17}}>Start free. Upgrade when ready. All paid plans include a 14-day free trial.</p>
            </div>
          </Reveal>
          <PricingSection theme={theme} onGetStarted={goToAuth}/>
        </div>
      </section>

      {/* ══ FAQ ═════════════════════════════════════════ */}
      <section id="faq" ref={faqRef} style={{padding:"130px clamp(20px,4vw,52px)",maxWidth:860,margin:"0 auto",position:"relative",zIndex:2}}>
        <Reveal dir="up">
          <div style={{transform:`translateY(${-faqDepth*35}px)`,transition:"transform .08s",willChange:"transform"}}>
            <h2 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:"clamp(36px,4.5vw,56px)",fontWeight:900,letterSpacing:"-.03em",textAlign:"center",marginBottom:72}}>
              Frequently Asked{" "}
              <span style={{background:`linear-gradient(135deg,${T.indigo},${T.rose})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Questions</span>
            </h2>
          </div>
        </Reveal>
        <div style={{transform:`translateY(${-faqDepth*25}px)`,transition:"transform .08s",willChange:"transform"}}>
          {faqs.map((f,i)=><FAQ key={i} q={f.q} a={f.a} isDark={isDark} i={i}/>)}
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════ */}
      <section ref={ctaRef} style={{padding:"80px clamp(20px,4vw,52px) 130px",position:"relative",zIndex:2}}>
        <Reveal dir="scale">
          <div style={{maxWidth:1160,margin:"0 auto",borderRadius:isMobile?32:48,overflow:"hidden",padding:isMobile?"72px 22px":isTablet?"88px 40px":"100px 64px",textAlign:"center",position:"relative",
            background:`linear-gradient(145deg,${T.indigoD},${T.purpleD},${T.roseD})`,
            boxShadow:`0 40px 120px ${T.indigo}60,0 12px 48px ${T.rose}35`}}>

            {/* Grid overlay */}
            <div style={{position:"absolute",inset:0,pointerEvents:"none",opacity:.06,
              backgroundImage:`linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)`,
              backgroundSize:"44px 44px"}}/>

            {/* Floating orbs inside CTA */}
            <div style={{position:"absolute",top:"-35%",left:"-8%",width:"55%",height:"170%",borderRadius:"50%",
              background:"rgba(255,255,255,.07)",animation:"float 7s ease-in-out infinite",pointerEvents:"none"}}/>
            <div style={{position:"absolute",bottom:"-25%",right:"-5%",width:"42%",height:"150%",borderRadius:"50%",
              background:"rgba(255,255,255,.05)",animation:"float2 9s ease-in-out infinite",pointerEvents:"none"}}/>

            <div style={{position:"relative",zIndex:1}}>
              <h2 style={{fontFamily:SYSTEM_FONT_STACK,fontSize:"clamp(40px,6vw,76px)",fontWeight:900,
                letterSpacing:"-.04em",lineHeight:1.04,marginBottom:22,color:"#fff"}}>
                Stop Memorizing.<br/>
                Start <span style={{color:T.amberL}}>Mastering.</span>
              </h2>
              <p style={{color:"rgba(255,255,255,.72)",fontSize:18,maxWidth:560,margin:"0 auto 48px",lineHeight:1.75}}>
                Join 500,000+ students who've transformed their education with GradeUp AI's neural-powered 3D learning platform.
              </p>
              <Mag onClick={goToAuth} style={{padding:isMobile?"18px 28px":"22px 60px",borderRadius:20,fontWeight:900,fontSize:isMobile?16:18,
                background:"#fff",color:T.indigoD,border:"none",
                boxShadow:"0 16px 60px rgba(0,0,0,.35)",letterSpacing:"-.01em"}}>
                Start Learning Now →
              </Mag>
              <div style={{marginTop:22,color:"rgba(255,255,255,.45)",fontSize:13,fontWeight:500}}>
                No credit card required · Free forever plan available
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════ */}
      <footer style={{borderTop:`1px solid ${border}`,padding:"64px clamp(20px,4vw,52px) 44px",position:"relative",zIndex:2,
        background:isDark?"rgba(5,2,18,.94)":undefined}}>
        {!isDark&&<div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${T.indigo}05,${T.rose}03,rgba(248,246,255,.98))`,pointerEvents:"none"}}/>}
        <div style={{maxWidth:1280,margin:"0 auto",position:"relative"}}>
          <div style={{display:"grid",gridTemplateColumns:footerGridColumns,gap:isMobile?28:44,marginBottom:56}}>
            <div>
              <div style={{fontFamily:SYSTEM_FONT_STACK,fontWeight:900,fontSize:22,marginBottom:14,letterSpacing:"-.02em"}}>
                GradeUp{" "}
                <span style={{background:`linear-gradient(90deg,${T.indigo},${T.rose})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>AI</span>
              </div>
              <p style={{color:muted,fontSize:14,lineHeight:1.75,maxWidth:265}}>Revolutionising education through neural-adaptive AI and immersive 3D learning environments for students everywhere.</p>
              <div style={{display:"flex",gap:10,marginTop:22}}>
                {["𝕏","in","gh","yt"].map((icon,i)=>(
                  <div key={i} data-hover style={{width:38,height:38,borderRadius:"50%",border:`1px solid ${border}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:muted,cursor:"none",fontSize:13,transition:"all .22s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.indigoL;e.currentTarget.style.color=T.indigoL;e.currentTarget.style.background=`${T.indigo}12`;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=border;e.currentTarget.style.color=muted;e.currentTarget.style.background="transparent";}}>
                    {icon}
                  </div>
                ))}
              </div>
            </div>
            {[
              {title:"Product",links:["Features","Pricing","Security","Changelog","API Docs"]},
              {title:"Company",links:["About","Blog","Careers","Press","Partners"]},
              {title:"Legal",links:["Privacy","Terms","GDPR","Cookies","Accessibility"]},
            ].map(col=>(
              <div key={col.title}>
                <div style={{fontWeight:800,fontSize:11,letterSpacing:".14em",textTransform:"uppercase",marginBottom:22,color:text}}>{col.title}</div>
                {col.links.map(l=>(
                  <a key={l} href="#" data-hover style={{display:"block",color:muted,fontSize:14,marginBottom:13,textDecoration:"none",transition:"color .2s",fontWeight:500}}
                    onMouseEnter={e=>e.target.style.color=T.roseL}
                    onMouseLeave={e=>e.target.style.color=muted}>{l}</a>
                ))}
              </div>
            ))}
          </div>
          <div style={{borderTop:`1px solid ${border}`,paddingTop:26,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <span style={{color:muted,fontSize:13}}>© 2026 GradeUp AI. All rights reserved.</span>
            <span style={{color:muted,fontSize:13}}>Built with 💜 for students everywhere</span>
          </div>
        </div>
      </footer>
    </div>
  );
}



