// Passos sintetizados (ruído filtrado), não são gravações de campo.
// O chamador deve invocar unlock() a partir de um gesto explícito do usuário.
const SURFACES={stone:{frequency:680,q:1.2,gain:.09,duration:.075},wood:{frequency:310,q:2.4,gain:.10,duration:.095},grass:{frequency:1500,q:.65,gain:.065,duration:.12}};
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.y);
const normalizedSurface=surface=>({tile:'stone',deck:'wood'}[surface]||surface) in SURFACES?({tile:'stone',deck:'wood'}[surface]||surface):'stone';

export function createFootsteps(options={}){
 const AudioContextClass=options.AudioContext||globalThis.AudioContext||globalThis.webkitAudioContext;
 const stride=options.stride??.72,teleportDistance=options.teleportDistance??1.25,maxActive=options.maxActive??4;
 let context=null,enabled=options.enabled??true,unlocked=false,wantsAudio=false,distance=0,played=0,lastSurface='stone',queue=Promise.resolve();
 const active=new Set();
 const cleanup=node=>{active.delete(node);try{node.disconnect();}catch{}};
 const syncContext=async()=>{if(!context)return false;try{if(wantsAudio&&enabled){if(context.state==='suspended'&&typeof context.resume==='function')await context.resume();unlocked=context.state==='running';}else if(context.state==='running'&&typeof context.suspend==='function'){await context.suspend();}return context.state==='running';}catch{return false;}};
 const schedule=()=>{queue=queue.catch(()=>{}).then(syncContext).catch(()=>false);return queue;};
 const stop=()=>{for(const source of [...active]){try{source.stop();}catch{}cleanup(source);}distance=0;wantsAudio=false;return schedule();};
 const unlock=async()=>{
  if(!enabled||!AudioContextClass)return false;
  try{if(!context)context=new AudioContextClass();}catch{return false;}
  wantsAudio=true;return schedule();
 };
 const play=surface=>{
  if(!enabled||!unlocked||!context||context.state!=='running'||active.size>=maxActive)return false;
  try{const sound=SURFACES[normalizedSurface(surface)],now=context.currentTime;
   const buffer=context.createBuffer(1,Math.max(1,Math.round(context.sampleRate*sound.duration)),context.sampleRate);
   const samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++){const t=i/samples.length;samples[i]=(Math.random()*2-1)*(1-t)*(1-t);}
   const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
   source.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(sound.frequency,now);filter.Q.setValueAtTime(sound.q,now);
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(sound.gain,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+sound.duration);
   source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.onended=()=>{try{filter.disconnect();gain.disconnect();}catch{}cleanup(source);};
   active.add(source);source.start(now);source.stop(now+sound.duration+.01);played++;lastSurface=normalizedSurface(surface);return true;
  }catch{return false;}
 };
 const moved=(before,after,surface='stone')=>{
  if(!finitePoint(before)||!finitePoint(after))return false;
  const walked=Math.hypot(after.x-before.x,after.z-before.z,after.y-before.y);
  if(!walked||walked>teleportDistance)return false;
  distance+=walked;if(distance<stride)return false;
  distance%=stride;return play(surface);
 };
 return {unlock,async setEnabled(value){enabled=Boolean(value);if(!enabled)return stop();return enabled;},moved,reset(){return stop();},stop,diagnostics(){return{enabled,unlocked,hasContext:Boolean(context),contextState:context?.state||'unavailable',activeNodes:active.size,distance,played,lastSurface};}};
}

export const criarFootsteps=createFootsteps;
