(()=>{'use strict';
if('scrollRestoration' in history)history.scrollRestoration='manual';
const nodes=[...document.querySelectorAll('.node')],world=document.querySelector('#world'),viewport=document.querySelector('#viewport'),play=document.querySelector('#play'),buttons=[...document.querySelectorAll('[data-go]')];
const labels=['INTRODUÇÃO','FLUXO','ENTREGAS','VALIDAÇÃO','INVESTIMENTO','CONDIÇÕES'],last=nodes.length-1;
nodes.forEach(n=>{n.style.left=(Number(n.dataset.x)-500)+'px';n.style.top=(Number(n.dataset.y)-285)+'px';});
const full=new URLSearchParams(location.search).get('motion')==='full',preference=matchMedia('(prefers-reduced-motion:reduce)'),mobile=matchMedia('(max-width:760px)'),frame=document.querySelector('#real-terrain-frame');
const reduced=()=>mobile.matches||document.body.classList.contains('motion-reduced');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*t*(t*(t*6-15)+10);
let raf=0,previousTime=0,targetProgress=0,progress=0,flight=null,pose=null,lastSelected=-1,autoplay=null,playing=false,frameVisible=true,frameActive=null,hiddenAt=null;
const extent=()=>Math.max(1,document.documentElement.scrollHeight-innerHeight);
const scrollProgress=()=>clamp(scrollY/extent()*last,0,last);
function at(index){const n=nodes[index].dataset;return{x:Number(n.x),y:Number(n.y),z:1};}
function along(p){const i=Math.min(last-1,Math.floor(p)),t=p-i,a=at(i),b=at(i+1),s=smooth(t),arc=Math.sin(Math.PI*t)**2;return{x:mix(a.x,b.x,s),y:mix(a.y,b.y,s)-110*arc,z:1-.48*arc};}
function signalFrame(){const active=!reduced()?frameVisible&&!flight&&lastSelected===0:frameVisible;if(active!==frameActive){frameActive=active;frame?.contentWindow?.postMessage({terrainActive:active},location.origin);}}
function select(index){if(lastSelected===index)return;lastSelected=index;buttons.forEach((b,j)=>b.setAttribute('aria-current',String(index===j)));document.querySelector('#location').textContent=String(index+1).padStart(2,'0')+' / '+labels[index];}
function paint(next){pose=next;const base=Math.min((innerWidth-70)/1000,(innerHeight-170)/570),zoom=base*pose.z;world.style.transform=`translate(${innerWidth/2-pose.x*zoom}px,${viewport.clientHeight/2-pose.y*zoom-10}px) scale(${zoom})`;}
function request(){if(!raf&&!reduced()&&!document.hidden)raf=requestAnimationFrame(tick);}
function tick(now){raf=0;if(reduced())return;const dt=Math.min(64,previousTime?now-previousTime:16);previousTime=now;
 if(flight){const f=flight;if(f.start===null)f.start=now;const t=clamp((now-f.start)/f.duration),s=smooth(t),arc=Math.sin(Math.PI*t)**2;progress=mix(f.origin,f.index,s);paint({x:mix(f.from.x,f.to.x,s),y:mix(f.from.y,f.to.y,s)-f.arc*arc,z:mix(f.from.z,f.to.z,s)*(1-f.depth*arc)});select(t<.5?Math.round(f.origin):f.index);
  if(t===1){progress=targetProgress=f.index;flight=null;paint(at(f.index));select(f.index);}else request();
 }else{progress=mix(progress,targetProgress,1-Math.exp(-dt/115));if(Math.abs(progress-targetProgress)<.00005)progress=targetProgress;paint(along(progress));select(Math.round(progress));if(progress!==targetProgress)request();}
 signalFrame();
}
function go(index){index=clamp(Math.round(index),0,last);if(reduced()){nodes[index].scrollIntoView({behavior:'instant',block:'start'});return;}
 const from=pose||at(Math.round(progress)),to=at(index),distance=Math.hypot(to.x-from.x,to.y-from.y);targetProgress=index;
 // The camera owns timing: native smooth scrolling may become instant under OS preferences.
 flight=distance>1?{from:{...from},to,index,origin:progress,start:null,duration:1900+Math.min(650,distance*.12),depth:distance>1700?.57:.48,arc:distance>1700?150:100}:null;
 scrollTo({top:extent()*index/last,behavior:'instant'});if(!flight){progress=index;paint(to);select(index);}signalFrame();request();
}
function stop(){if(autoplay)clearTimeout(autoplay);autoplay=null;playing=false;play.textContent=document.body.classList.contains('motion-reduced')?'Ativar apresentação animada':'▶ Apresentar';}
function advance(index){go(index);if(index<last)autoplay=setTimeout(()=>advance(index+1),11000);else autoplay=setTimeout(stop,11000);}
play.addEventListener('click',()=>{if(document.body.classList.contains('motion-reduced')){location.assign(location.pathname+'?motion=full');return;}if(playing){stop();return;}playing=true;play.textContent='Ⅱ Pausar';advance(0);});
buttons.forEach(b=>b.addEventListener('click',()=>{stop();go(Number(b.dataset.go));}));
addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft'].includes(e.key)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();stop();go(clamp(Math.round(targetProgress)+(e.key==='ArrowRight'?1:-1),0,last));}});
function interrupt(){stop();if(flight){flight=null;targetProgress=scrollProgress();request();}}
addEventListener('wheel',interrupt,{passive:true});addEventListener('touchstart',interrupt,{passive:true});
addEventListener('scroll',()=>{if(reduced())return;const next=scrollProgress();if(flight&&Math.abs(next-flight.index)<.002)return;flight=null;targetProgress=next;request();},{passive:true});
function reset(){stop();if(raf)cancelAnimationFrame(raf);raf=0;flight=null;previousTime=0;targetProgress=progress=0;scrollTo({top:0,behavior:'instant'});select(0);if(!reduced())paint(at(0));signalFrame();}
function preferenceChanged(){document.body.classList.toggle('motion-reduced',preference.matches&&!full);reset();}
preference.addEventListener('change',preferenceChanged);mobile.addEventListener('change',reset);
addEventListener('resize',()=>{if(!reduced())paint(pose||at(Math.round(progress)));});
addEventListener('pageshow',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();hiddenAt=performance.now();if(raf)cancelAnimationFrame(raf);raf=0;}else{if(hiddenAt!==null&&flight?.start!==null&&flight)flight.start+=performance.now()-hiddenAt;hiddenAt=null;previousTime=0;request();}});
document.querySelector('.brand')?.addEventListener('click',event=>{event.preventDefault();stop();go(0);});
if(full&&frame)frame.src='terrain.html?embed=1&motion=full';
if(frame){new IntersectionObserver(entries=>{frameVisible=entries[0].isIntersecting;signalFrame();}).observe(frame);frame.addEventListener('load',()=>{frameActive=null;signalFrame();});}
preferenceChanged();
window.AeropixelPresentation={sections:nodes.length,source:'public_swisstopo_terrain',price:12000,entry:4000,balance:8000,go};
})();
