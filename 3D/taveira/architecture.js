// Tipologias inspiradas nas perspectivas oficiais. Implantação amostral, não
// cadastro de construções, projeto executivo ou promessa de casa incluída.
import {lots,toWorld,isRoadPoint} from './layout.js';
import {forestAreas,insidePolygon} from './vegetation.js';
export const houseTypes=['terrea-telha','sobrado-telha','contemporanea-platibanda','escalonada-garagem','casa-pergolado'];
const margin=.25;
export function generateHousePlacements(sourceLots=lots){
 return sourceLots.filter((l,i)=>(i*7+3)%17<3&&!forestAreas.some(a=>insidePolygon(l.x+l.w/2,l.y+l.d/2,a.polygon))).map((l,i)=>{
  const [x,z]=toWorld(l.x+l.w/2,l.y+l.d/2),envelope={x,z,w:l.w*.45,d:l.d*.45},front=l.side===0?-1:1;
  return {id:`ilustrativa-${l.key}`,lotKey:l.key,type:houseTypes[(i*3+l.row+l.col)%5],front,orientation:front<0?'-z':'+z',x,z,width:envelope.w-.7,depth:envelope.d-.7,envelope,margin,classification:'ilustrativo',variant:(l.col+2*l.row)%4};
 }).filter(p=>p.width>.7&&p.depth>1&&!isRoadPoint(p.x,p.z,2.65));
}
// Peças explícitas permitem auditar o volume real, não apenas o centro da casa.
export function buildHouseParts(p){
 const out=[],w=p.width,d=p.depth,h=Math.min(2.15,w*.76),front=-d*.5+.08;
 // Coordenadas locais: -z é sempre a frente. Girar 180° no lado oposto da rua.
 const add=(category,material,x,y,z,sx,sy,sz,geometry='box',extra={})=>{
  const sign=p.front<0?1:-1;out.push({category,material,geometry,x:p.x+x*sign,y:y+.12,z:p.z+z*sign,sx,sy,sz,turn:p.front<0?0:Math.PI,...extra});return out.at(-1);
 };
 const plaster=['cream','white','sand','sage'][p.variant],bodyZ=d*.13,bodyD=d*.57;
 const volume=(cx,cy,cz,bw,bh,bd,mat=plaster)=>{add('wall',mat,cx,cy,cz,bw,bh,bd);return {x:cx,y:cy,z:cz,w:bw,h:bh,d:bd};};
 const opening=(v,x,y,ww,hh,door=false)=>{
  const z=v.z-v.d/2-.018,kind=door?'door':'window',material=door?'timber':'glass';
  const face=(p.front<0?1:-1)*(v.z-v.d/2)+p.z;
  const o=add(kind,material,x,y,z,ww,hh,.035,'box',{wallFaceZ:face,wallBounds:{minX:p.x+(p.front<0?1:-1)*v.x-v.w/2,maxX:p.x+(p.front<0?1:-1)*v.x+v.w/2,minY:v.y-v.h/2+.12,maxY:v.y+v.h/2+.12}});
  if(!door){for(const xx of[x-ww/2,x+ww/2])add('frame','metal',xx,y,z-.024,.028,hh+.055,.03);for(const yy of[y-hh/2,y+hh/2])add('frame','metal',x,yy,z-.024,ww+.055,.028,.035);add('sill','white',x,y-hh/2-.025,z-.045,ww+.11,.045,.12);if(ww>.65)add('mullion','metal',x,y,z-.03,.025,hh,.035);}
  return o;
 };
 const roof=(v,bw=v.w+.18,bd=v.d+.2)=>{add('roof','tile',v.x,v.y+v.h/2,v.z,bw,h*.32,bd,'gable');add('eave','white',v.x,v.y+v.h/2-.035,v.z,bw,.07,bd);};
 const slab=v=>{add('roof','slate',v.x,v.y+v.h/2+.04,v.z,v.w+.15,.1,v.d+.15);for(const x of[v.x-v.w/2,v.x+v.w/2])add('parapet',plaster,x,v.y+v.h/2+.14,v.z,.08,.28,v.d+.16);};
 // Lote com recuo verde, faixa de acesso e laterais; a frente fica vazada.
 add('garden',p.variant%2?'grass2':'grass',0,-.04,0,w,.08,d);
 add('path','paving',w*.25,.012,(front+bodyZ-bodyD/2)/2,w*.17,.025,bodyZ-bodyD/2-front);
 for(const x of[-w*.49,w*.49])add('boundary',plaster,x,h*.23,0,.055,h*.46,d*.94);
 add('boundary',plaster,0,h*.23,d*.485,w,.46*h,.055);
 if(p.type==='terrea-telha'){
  const v=volume(0,h/2,bodyZ,w*.82,h,bodyD);roof(v);opening(v,-w*.19,h*.6,w*.27,h*.33);opening(v,w*.25,h*.4,w*.14,h*.8,true);
 }else if(p.type==='sobrado-telha'){
  const v=volume(-w*.04,h*.85,bodyZ,w*.79,h*1.7,bodyD);roof(v);opening(v,-w*.23,h*.54,w*.2,h*.32);opening(v,w*.22,h*.42,w*.15,h*.84,true);opening(v,-w*.2,h*1.3,w*.22,h*.38);opening(v,w*.15,h*1.3,w*.22,h*.38);
  const bz=v.z-v.d/2-.13;add('balcony','white',0,h*.94,bz,w*.71,.09,.35);add('balcony-rail','metal',0,h*1.14,bz-.16,w*.69,.035,.035);for(const x of[-w*.33,w*.33])add('balcony-rail','metal',x,h*1.04,bz-.16,.035,.24*h,.035);
 }else if(p.type==='contemporanea-platibanda'){
  const v=volume(w*.13,h*.53,bodyZ,w*.64,h*1.06,bodyD);slab(v);opening(v,w*.15,h*.62,w*.29,h*.37);opening(v,-w*.11,h*.42,w*.14,h*.84,true);
  add('entry-canopy','white',-w*.15,h*.91,bodyZ-bodyD/2-.23,w*.48,.13,.5);add('feature','timber',w*.37,h*.53,bodyZ-bodyD/2-.03,w*.07,h*1.06,.05);
 }else if(p.type==='escalonada-garagem'){
  const v=volume(-w*.16,h*.51,bodyZ,w*.49,h*1.02,bodyD);slab(v);opening(v,-w*.17,h*.61,w*.24,h*.34);opening(v,-w*.31,h*.41,w*.12,h*.82,true);
  const upper=volume(-w*.16,h*1.26,bodyZ+d*.1,w*.49,h*.48,bodyD*.63);slab(upper);opening(upper,-w*.16,h*1.28,w*.25,h*.23);
  // Garagem: laje e pilares, espaço vazio sob a cobertura.
  const gz=bodyZ-d*.09;add('garage-roof','white',w*.28,h*.87,gz,w*.35,.12,d*.47);add('garage-floor','paving',w*.28,.015,gz,w*.35,.03,d*.47);for(const z of[gz-d*.21,gz+d*.21])add('garage-post',plaster,w*.44,h*.44,z,.065,h*.88,.065);
 }else{
  const v=volume(0,h*.47,bodyZ+d*.06,w*.78,h*.94,bodyD*.81);roof(v);opening(v,-w*.19,h*.55,w*.24,h*.33);opening(v,w*.22,h*.39,w*.15,h*.78,true);
  const gz=bodyZ-bodyD/2-d*.06;for(const x of[-w*.34,w*.34])add('pergola-post','timber',x,h*.43,gz,.065,h*.86,.065);for(let i=0;i<6;i++)add('pergola-slat','timber',-w*.35+i*w*.14,h*.87,gz,.045,.06,d*.25);
  for(const z of[gz-d*.115,gz+d*.115])add('pergola-beam','timber',0,h*.83,z,w*.75,.07,.05);
 }
 // Portões ripados e nichos frontais, sem grades repetidas em cada janela.
 const gateWidth=w*.5;for(let j=0;j<5;j++)add('gate-slat','metal',-w*.2,h*(.12+j*.09),front,gateWidth,.05,.055);
 for(const x of[-w*.47,w*.06,w*.45])add('gate-pier',plaster,x,h*.29,front,.09,h*.58,.09);
 add('mailbox','metal',w*.08,h*.38,front-.03,.09,.08,.06);
 // Vãos laterais nos corpos altos: ajudam a ler o uso também fora da frente.
 for(const v of out.filter(a=>a.category==='wall'&&a.sy>h*.7))for(const side of[-1,1]){
  const xx=v.x+side*(v.sx/2+.018),yy=v.y+Math.min(.18,v.sy*.1),zz=v.z;
  out.push({category:'side-window',material:'glass',geometry:'box',x:xx,y:yy,z:zz,sx:.035,sy:h*.3,sz:Math.min(.8,v.sz*.24),turn:0});
 }
 return out;
}
export function generateParkMetadata(){
 const pixel={x:635,y:1306,w:52,d:60},[x,z]=toWorld(pixel.x,pixel.y);
 return {classification:'ilustrativo',source:'área de lazer sudeste da implantação; detalhe aproximado',pixel,bounds:{minX:x-pixel.w*.225,maxX:x+pixel.w*.225,minZ:z-pixel.d*.225,maxZ:z+pixel.d*.225},components:['quadra','caminho','bancos']};
}
function buildParkParts(){
 const parts=[],[x,z]=toWorld(625,1309),angle=-.54,transform=(a,b)=>[x+Math.cos(angle)*a+Math.sin(angle)*b,z-Math.sin(angle)*a+Math.cos(angle)*b];
 const court=(material,a,y,b,sx,sy,sz)=>{const [xx,zz]=transform(a,b);parts.push({category:'park',material,geometry:'box',x:xx,y,z:zz,sx,sy,sz,turn:angle});};
 court('court',0,.13,0,5.7,.12,10.8);
 for(const a of[-2.65,2.65])court('white',a,.2,0,.055,.018,10.3);
 for(const b of[-5.15,0,5.15])court('white',0,.2,b,5.35,.018,.055);
 for(const b of[-3.6,3.6]){court('white',0,.2,b,2.5,.018,.055);for(const a of[-1.25,1.25])court('white',a,.2,b+Math.sign(b)*.75,.055,.018,1.5);}
 for(const a of[-2.95,2.95])for(const b of[-5.5,-2.75,0,2.75,5.5])court('metal',a,1.1,b,.035,2,.035);
 for(const a of[-2.95,2.95])for(const y of[.4,1,1.8])court('metal',a,y,0,.025,.025,11);
 const [px,pz]=toWorld(642,1328);parts.push({category:'park',material:'paving',geometry:'box',x:px,y:.12,z:pz,sx:5,sy:.09,sz:8,turn:-.3});
 for(const side of[-1,1]){parts.push({category:'bench',material:'timber',geometry:'box',x:px+side*1.7,y:.52,z:pz,sx:.45,sy:.12,sz:1.8,turn:0});parts.push({category:'bench',material:'timber',geometry:'box',x:px+side*1.9,y:.82,z:pz,sx:.07,sy:.5,sz:1.8,turn:0});for(const zz of[-.65,.65])parts.push({category:'bench',material:'metal',geometry:'box',x:px+side*1.7,y:.3,z:pz+zz,sx:.25,sy:.42,sz:.08,turn:0});}
 return parts;
}
export function createArchitecture(THREE){
 const homes=new THREE.Group(),park=new THREE.Group(),placements=generateHousePlacements();homes.name='casas-ilustrativas';park.name='parque-ilustrativo';
 const colors={cream:0xe5dbcc,white:0xefede4,sand:0xc2b6a1,sage:0x9fa99e,tile:0xa55333,slate:0x626963,glass:0x7c9fa9,timber:0x72533b,metal:0x757c79,grass:0x708950,grass2:0x81975e,paving:0xb4b4a3,court:0x418879};
 const materials=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:k==='glass'?.24:.86,metalness:k==='glass'?.14:0})]));
 // Texturas discretas reaproveitadas por material; não carregam imagens externas.
 if(typeof document!=='undefined')for(const kind of['tile','cream','sand','white','sage','paving','grass','grass2']){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,128,128);
  for(let i=0;i<650;i++){ctx.fillStyle=`rgba(40,35,24,${kind==='tile'?.16:.045})`;ctx.fillRect((i*37)%128,(i*73)%128,kind==='tile'?2:1,kind==='tile'?9:1);}
  if(kind==='tile'){ctx.strokeStyle='#73452c';ctx.globalAlpha=.25;for(let j=0;j<128;j+=8){ctx.beginPath();ctx.moveTo(j,0);ctx.lineTo(j,128);ctx.stroke();}for(let j=0;j<128;j+=16)ctx.fillRect(0,j,128,1);}
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;materials[kind].map=map;
 }
 const shape=new THREE.Shape([new THREE.Vector2(-.5,0),new THREE.Vector2(.5,0),new THREE.Vector2(0,1)]),gable=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});gable.translate(0,0,-.5);
 const geometries={box:new THREE.BoxGeometry(1,1,1),gable};let triangles=0,drawCalls=0;
 const install=(group,parts)=>{const batches=new Map();parts.forEach(a=>{const key=a.material+':'+a.geometry;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(a);});for(const items of batches.values()){const a=items[0],geo=geometries[a.geometry],mesh=new THREE.InstancedMesh(geo,materials[a.material],items.length),m=new THREE.Matrix4(),q=new THREE.Quaternion();items.forEach((a,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),a.turn);m.compose(new THREE.Vector3(a.x,a.y,a.z),q,new THREE.Vector3(a.sx,a.sy,a.sz));mesh.setMatrixAt(i,m);});mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;group.add(mesh);drawCalls++;triangles+=(geo.index?geo.index.count:geo.attributes.position.count)/3*items.length;}};
 install(homes,placements.flatMap(buildHouseParts));install(park,buildParkParts());
 return {homes,park,placements,metadata:{classification:'ilustrativo',park:generateParkMetadata()},stats:{homes:placements.length,types:houseTypes.length,triangles,drawCalls,budget:{triangles:40000,drawCalls:35}}};
}
