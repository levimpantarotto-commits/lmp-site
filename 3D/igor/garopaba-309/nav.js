// y is the floor elevation; camera height is y + eyeHeight.
export function createNavigator(camera, manifest, requestRender) {
  const radius=.18, eyeHeight=1.65, state={x:0,y:0,z:0,yaw:0,pitch:0,paused:false,keys:new Set(),touch:{x:0,z:0},idle:true,room:null,area:null};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)); let blocker=()=>false;
  const inRect=(x,z,r,p=0)=>x>=r[0]+p&&x<=r[2]-p&&z>=r[1]+p&&z<=r[3]-p;
  const floorAt=(x,z,y)=>(manifest.floors||[]).find(f=>inRect(x,z,f.rect,radius)&&!(f.holes||[]).some(h=>inRect(x,z,h,0))&&Math.abs((f.y||0)-y)<.08);
  function stairY(x,z){const s=manifest.stairs;if(!s||x<s.rect[0]+radius||x>s.rect[2]-radius||z<s.rect[1]||z>s.rect[3])return null;const snap=.22;if(z<=s.topZ+snap)return s.upper||0;if(z>=s.bottomZ-snap)return 0;return clamp((s.bottomZ-z)/(s.bottomZ-s.topZ),0,1)*(s.upper||0)}
  function verticalFree(x,z,y){return !(manifest.colliders||[]).some(c=>inRect(x,z,c.rect,-radius)&&y+eyeHeight>(c.level||0)+.02&&y<(c.level||0)+(c.height||0)-.02)}
  function resolveY(x,z,y){const sy=stairY(x,z);return sy===null?y:sy}
  function positionValid(x,z,y){const fy=resolveY(x,z,y);return !!(floorAt(x,z,fy)||stairY(x,z)!==null)&&verticalFree(x,z,fy)&&!blocker(x,z,fy,radius)}
  function walkable(x,z,y=state.y){return positionValid(x,z,y)}
  function updateMeta(){const rooms=manifest.rooms||[];state.room=rooms.reduce((best,r)=>{const [x,y,z]=r.spawn,d=(x-state.x)**2+(z-state.z)**2+((y-state.y)*4)**2;return !best||d<best.d?{id:r.id,d}:best},null)?.id||null;state.area=(manifest.floors||[]).find(f=>inRect(state.x,state.z,f.rect)&&!(f.holes||[]).some(h=>inRect(state.x,state.z,h))&&Math.abs((f.y||0)-state.y)<.1)?.id||(stairY(state.x,state.z)!==null?'stairs':null)}
  function apply(){camera.position.set(state.x,state.y+eyeHeight,state.z);camera.rotation.set(state.pitch,state.yaw,0,'YXZ');requestRender()}
  function pose(p){if(!p?.spawn)return false;const[x,y,z]=p.spawn;if(!positionValid(x,z,y))return false;Object.assign(state,{x,y:resolveY(x,z,y),z,yaw:p.yaw||0,pitch:p.pitch||0});updateMeta();apply();return true}
  function move(dx,dz){let moved=false;const tryMove=(x,z)=>{const y=resolveY(x,z,state.y);if(positionValid(x,z,y)){state.x=x;state.z=z;state.y=y;moved=true}};tryMove(state.x+dx,state.z);tryMove(state.x,state.z+dz);if(moved){updateMeta();apply()}return moved}
  function update(dt){if(state.paused)return false;let f=(state.keys.has('KeyW')||state.keys.has('ArrowUp')?1:0)-(state.keys.has('KeyS')||state.keys.has('ArrowDown')?1:0)+state.touch.z,s=(state.keys.has('KeyD')||state.keys.has('ArrowRight')?1:0)-(state.keys.has('KeyA')||state.keys.has('ArrowLeft')?1:0)+state.touch.x;if(!f&&!s){state.idle=true;return false}const n=Math.hypot(f,s)||1,k=.0019*Math.min(dt,32)/n;state.idle=false;return move((-Math.sin(state.yaw)*f+Math.cos(state.yaw)*s)*k,(-Math.cos(state.yaw)*f-Math.sin(state.yaw)*s)*k)}
  return {state,apply,pose,update,move,walkable,setBlocker:fn=>blocker=fn||(()=>false),look(dx,dy){state.yaw-=dx*.004;state.pitch=clamp(state.pitch-dy*.004,-1.3,1.3);apply()},setTouch(x,z){state.touch={x,z}},getState(){return {x:state.x,y:state.y,z:state.z,cameraY:state.y+eyeHeight,yaw:state.yaw,pitch:state.pitch,paused:state.paused,idle:state.idle,room:state.room,area:state.area}}};
}
