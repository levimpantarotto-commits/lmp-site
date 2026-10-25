// Vegetação da chegada: grama curta e irregular observada nas fotos 03/05.
// É uma aproximação de implantação; não representa medição botânica ou lote cadastral.
import {proportionStudy,planX,planZ} from './proportion-study.js';
import {exteriorReference} from './exterior-reference.js?v=nature-r1';

const study=proportionStudy;
export const naturalGrassField=study?{minX:-2.55,maxX:11.05,minZ:-18,maxZ:0}:{minX:-6,maxX:14,minZ:-18,maxZ:0};
export const naturalGrassBudgets={desktop:{instances:9000,triangles:135000,drawCalls:6},mobile:{instances:3700,triangles:55500,drawCalls:6}};
export const naturalGrassPaths=Array.from({length:12},(_,i)=>({x:2.2-i*.18,z:-16+i*.83,halfX:.44,halfZ:.265}));
export const naturalGrassPatio=study?exteriorReference.patio:[[-6,0],[-6,-8.4],[-.8,-7],[5.5,-3.9],[10.3,-3.9],[10.3,0]];

const randomFor=seed=>()=>{let n=seed+=0x6D2B79F5;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
const inside=(x,z,polygon)=>{let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [ax,az]=polygon[i],[bx,bz]=polygon[j];if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)hit=!hit;}return hit;};

export function isNaturalGrassAllowed(x,z){
 // Mantém juntas de pedra, placas, pátio, muros e a escada livres.
 if(x<naturalGrassField.minX+.10||x>naturalGrassField.maxX-.17||z<naturalGrassField.minZ+.18||z>naturalGrassField.maxZ-.18)return false;
 if(inside(x,z,naturalGrassPatio))return false;
 return !naturalGrassPaths.some(p=>Math.abs(x-p.x)<=p.halfX&&Math.abs(z-p.z)<=p.halfZ);
}

export function placeNaturalGrassTufts({mobile=false,seed=0x13052026,count}={}){
 const budget=naturalGrassBudgets[mobile?'mobile':'desktop'],target=Math.min(count??budget.instances,budget.instances),random=randomFor(seed>>>0),tufts=[];
 for(let attempts=0;tufts.length<target&&attempts<target*90;attempts++){
  const x=naturalGrassField.minX+(naturalGrassField.maxX-naturalGrassField.minX)*random(),z=naturalGrassField.minZ+(naturalGrassField.maxZ-naturalGrassField.minZ)*random();
  if(!isNaturalGrassAllowed(x,z))continue;
  const patch=.5+.25*Math.sin(x*1.3+Math.sin(z*.55))+.25*Math.sin(z*.87-x*.3);
  if(random()>.52+patch*.48)continue;
  const tone=random(),height=.016+.026*(patch*.42+tone*.58)+(random()>.94?.012:0);
  tufts.push({x,z,rotation:random()*Math.PI*2,scale:.8+random()*.35,tone,
   height,variant:Math.floor(random()*6),lean:(random()-.5)*.5,
   leanZ:Math.sin(x*.8+z*.37)*.15+(random()-.5)*.25});
 }
 return tufts;
}

export function curvedTuftGeometry(T,variant=0){
 // Five bowed blades, three triangles each. Unit lengths are scaled to cm.
 // Six distinct forms include upright, bowed and laid-over tips. The crease
 // changes the actual normal: one green albedo receives different light.
 const positions=[],uv=[],index=[],random=randomFor(0x517ab+variant*1709);
 for(let blade=0;blade<5;blade++){
  const angle=blade*2.399+random()*.65,dx=Math.cos(angle),dz=Math.sin(angle),sx=-dz,sz=dx;
  const start=positions.length/3,h=.62+random()*.38,w=.032+random()*.022;
  const fold=(variant+blade)%4===0,bend=fold?.65+random()*.35:.13+random()*.4;
  for(const [y,forward,width] of [[0,0,w],[h*.56,bend*.18,w*.74]])for(const side of[-1,1]){
   positions.push(sx*width*side+dx*forward,y,sz*width*side+dz*forward);
   uv.push((side+1)/2,y/h);
  }
  positions.push(dx*bend,fold?h*(.40+random()*.25):h,dz*bend);uv.push(.5,1);
  index.push(start,start+2,start+1,start+1,start+2,start+3,start+2,start+4,start+3);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(index);geometry.computeVertexNormals();geometry.computeBoundingBox();
 return geometry;
}

export function buildNaturalGrass(THREE,scene,M,{mobile=false}={}){
 const budget=naturalGrassBudgets[mobile?'mobile':'desktop'],material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.93,metalness:0,side:THREE.DoubleSide});
 const meshes=[],matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),position=new THREE.Vector3(),scale=new THREE.Vector3(),color=new THREE.Color(),base=new THREE.Color(0x788d49);
 let tufts=[],lastCell='',lastLevel=false,updates=0;
 for(let variant=0;variant<6;variant++){
  const geometry=curvedTuftGeometry(THREE,variant),mesh=new THREE.InstancedMesh(geometry,material,Math.ceil(budget.instances/6*1.2));mesh.count=0;
  mesh.name='front-lawn-curved-tufts-'+variant;mesh.userData.natureRevision='near-grass-r1';mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);meshes.push(mesh);
 }
 // World-anchored cells keep the same blades when the visitor moves. Only
 // the close patch is geometric; the photographed-style PBR covers distance.
 // The patch changes on movement/turn, never on an idle timer.
 function update({x,z,y=0,yaw=0}){
  const cx=x-Math.sin(yaw)*1.15,cz=z-Math.cos(yaw)*1.15,visible=y<.5&&cx>naturalGrassField.minX-2&&cx<naturalGrassField.maxX+2&&cz>-20&&cz<2;
  const cellKey=`${Math.floor(cx/.3)}:${Math.floor(cz/.3)}`;
  if(cellKey===lastCell&&visible===lastLevel)return {instances:tufts.length,triangles:tufts.length*15};
  lastCell=cellKey;lastLevel=visible;updates++;tufts=[];const counts=Array(6).fill(0),cell=mobile?.066:.043;
  if(visible){
   const centerX=(Math.floor(cx/.3)+.5)*.3,centerZ=(Math.floor(cz/.3)+.5)*.3;
   for(let iz=Math.floor((centerZ-2)/cell);iz<=Math.ceil((centerZ+2)/cell)&&tufts.length<budget.instances;iz++)for(let ix=Math.floor((centerX-2)/cell);ix<=Math.ceil((centerX+2)/cell)&&tufts.length<budget.instances;ix++){
    const random=randomFor((Math.imul(ix,73856093)^Math.imul(iz,19349663))>>>0),px=(ix+.15+random()*.7)*cell,pz=(iz+.15+random()*.7)*cell;
    if(!isNaturalGrassAllowed(px,pz))continue;
    const edge=Math.max(Math.abs(px-centerX),Math.abs(pz-centerZ));if(edge>2)continue;
    const patch=.5+.25*Math.sin(px*1.3+Math.sin(pz*.55))+.25*Math.sin(pz*.87-px*.3);if(random()>.68+patch*.32)continue;
    const tone=random(),height=(.019+.026*(patch*.42+tone*.58))*(1-Math.max(0,edge-1.35)/.8),variant=Math.floor(random()*6);
    const i=counts[variant]++;if(i>=meshes[variant].instanceMatrix.count){counts[variant]--;continue;}
    const tuft={x:px,z:pz,height,tone,variant,lean:(random()-.5)*.5,leanZ:Math.sin(px*.8+pz*.37)*.15+(random()-.5)*.25,rotation:random()*Math.PI*2,scale:.8+random()*.35};tufts.push(tuft);
    e.set(tuft.lean,tuft.rotation,tuft.leanZ,'YXZ');q.setFromEuler(e);position.set(study?planX(px):px,.006,study?planZ(pz):pz);scale.set(height*tuft.scale,height,height*tuft.scale);matrix.compose(position,q,scale);meshes[variant].setMatrixAt(i,matrix);color.copy(base).multiplyScalar(.94+tone*.09);meshes[variant].setColorAt(i,color);
   }
  }
  meshes.forEach((mesh,i)=>{mesh.count=counts[i];mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;});
  return {instances:tufts.length,triangles:tufts.length*15};
 }
 update({...exteriorReference.arrival});
 return {mesh:meshes[0],meshes,get tufts(){return tufts;},get instances(){return tufts.length;},get triangles(){return tufts.length*15;},get updates(){return updates;},drawCalls:meshes.length,variants:6,budget,update,lod:'world-anchored near field; PBR at distance'};
}
