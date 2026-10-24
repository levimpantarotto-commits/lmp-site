// Vegetação da chegada: grama curta e irregular observada nas fotos 03/05.
// É uma aproximação de implantação; não representa medição botânica ou lote cadastral.
import {proportionStudy,planX,planZ} from './proportion-study.js';
import {exteriorReference} from './exterior-reference.js';

const study=proportionStudy;
export const naturalGrassField=study?{minX:-2.55,maxX:11.05,minZ:-18,maxZ:0}:{minX:-6,maxX:14,minZ:-18,maxZ:0};
export const naturalGrassBudgets={desktop:{instances:2700,triangles:97200,drawCalls:1},mobile:{instances:900,triangles:32400,drawCalls:1}};
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
  tufts.push({x,z,rotation:random()*Math.PI*2,scale:.62+random()*.55,tone:random(),lean:(random()-.5)*.38});
 }
 return tufts;
}

function curvedTuftGeometry(T){
 // Seis lâminas aparadas por tufo: 2–5 mm de largura, ponta convergente
 // e curvatura longitudinal. 36 triângulos em uma única malha instanciada.
 const positions=[],uv=[],index=[];
 for(let blade=0;blade<6;blade++){
  const angle=blade*Math.PI/3+(blade%2)*.16,dx=Math.cos(angle),dz=Math.sin(angle),sideX=-dz,sideZ=dx;
  const start=positions.length/3,bend=.008+(blade%3)*.003,base=.0020+(blade%2)*.00045;
  for(const [y,forward,width]of[[0,0,base],[.48,.14,base*.72],[.84,.55,base*.30],[1,1,0]])for(const side of[-1,1]){
   positions.push(sideX*width*side+dx*forward*bend,y,sideZ*width*side+dz*forward*bend);
   uv.push(side<0?0:1,y);
  }
  for(let row=0;row<3;row++){const a=start+row*2,b=a+2;index.push(a,b,a+1,a+1,b,b+1);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(index);geometry.computeVertexNormals();
 return geometry;
}

export function buildNaturalGrass(THREE,scene,M,{mobile=false}={}){
 const tufts=placeNaturalGrassTufts({mobile}),geometry=curvedTuftGeometry(THREE),material=new THREE.MeshStandardMaterial({color:0x93a56e,roughness:1,metalness:0,side:THREE.DoubleSide});
 // O PBR CC0 permanece no solo; cartões finos sem bitmap evitam os toquinhos escuros.
 material.customProgramCacheKey=()=> 'igor-curved-grass-r2';
 const mesh=new THREE.InstancedMesh(geometry,material,tufts.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3(),color=new THREE.Color(),dark=new THREE.Color(0x63734f),light=new THREE.Color(0xb7c394);
 tufts.forEach((tuft,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),tuft.rotation);position.set(study?planX(tuft.x):tuft.x,.006,study?planZ(tuft.z):tuft.z);scale.set(tuft.scale,.020+tuft.tone*.020,tuft.scale);matrix.compose(position,q,scale);mesh.setMatrixAt(i,matrix);color.lerpColors(dark,light,.30+tuft.tone*.45);mesh.setColorAt(i,color);});
 mesh.name='front-lawn-curved-tufts';mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;scene.add(mesh);
 return {mesh,tufts,instances:tufts.length,triangles:tufts.length*36,drawCalls:1,budget:naturalGrassBudgets[mobile?'mobile':'desktop']};
}
