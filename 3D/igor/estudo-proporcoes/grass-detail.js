// Detalhe ilustrativo: a referência 03 mostra grama curta, irregular e pouco saturada.
// As coordenadas são do estudo, não uma medição georreferenciada do lote.
import {proportionStudy,planX,planZ} from './proportion-study.js';
import {exteriorReference} from './exterior-reference.js';
export const grassField=proportionStudy?{minX:-2.55,maxX:11.05,minZ:-18,maxZ:0}:{minX:-6,maxX:14,minZ:-18,maxZ:0};
export const patioPolygon=proportionStudy?exteriorReference.patio:[[-6,0],[-6,-8.4],[-.8,-7],[5.5,-3.9],[10.3,-3.9],[10.3,0]];
export const grassBudgets={desktop:{instances:5200,triangles:41600},mobile:{instances:1700,triangles:13600}};

const paths=Array.from({length:12},(_,i)=>({x:2.2-i*.18,z:-16+i*.83,halfX:.39,halfZ:.215}));
const mulberry32=seed=>()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
const inPolygon=(x,z,polygon)=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,zi]=polygon[i],[xj,zj]=polygon[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;}return inside;};

export function isGrassPlacementAllowed(x,z){
 // Respiro junto aos muros e pátio; evita lâminas atravessando pedra ou placas.
 if(x<-5.70||x>13.64||z<-17.72||z>-.18||inPolygon(x,z,patioPolygon))return false;
 if(proportionStudy&&(x< -2.45||x>10.88))return false;
 return !paths.some(path=>Math.abs(x-path.x)<=path.halfX+.10&&Math.abs(z-path.z)<=path.halfZ+.10);
}

// Função pura e determinística para QA dos limites, exclusões e orçamento.
export function placeGrassBlades({mobile=false,seed=0x1f0a2026,count}={}){
 const target=Math.min(count??grassBudgets[mobile?'mobile':'desktop'].instances,grassBudgets[mobile?'mobile':'desktop'].instances),random=mulberry32(seed>>>0),placements=[];
 const maxAttempts=target*80;
 for(let attempts=0;placements.length<target&&attempts<maxAttempts;attempts++){
  const x=grassField.minX+(grassField.maxX-grassField.minX)*random(),z=grassField.minZ+(grassField.maxZ-grassField.minZ)*random();
  if(!isGrassPlacementAllowed(x,z))continue;
  placements.push({x,z,height:.020+random()*.015,rotation:random()*Math.PI*2,tone:random(),leanX:(random()-.5)*.15,leanZ:(random()-.5)*.15});
 }
 return placements;
}

function bladeGeometry(THREE){
 // Dois cartões estreitos, cada um com duas dobras: curva sem shader/animação.
 const positions=[],uvs=[],indices=[];
 for(const axis of [0,Math.PI/2]){
  const start=positions.length/3,dx=Math.cos(axis),dz=Math.sin(axis),nx=-dz,nz=dx;
  const profile=[[0,0,0,.12],[.48,.006,.004,.08],[1,.017,.027,0]];
  for(const [y,bendX,bendZ,width] of profile)for(const side of [-1,1]){
   positions.push(nx*width*side+bendX*dx,y,nz*width*side+bendZ*dz);uvs.push(side<0?0:1,y);
  }
  for(let row=0;row<2;row++){const a=start+row*2,b=a+2;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 // Normais de tufo orientadas para cima suavizam o sombreamento de lâminas
 // subpixel; evita cartões escuros que parecem pedras no gramado.
 const normals=geometry.attributes.normal;for(let i=0;i<normals.count;i++){const nx=normals.getX(i)*.25,nz=normals.getZ(i)*.25,len=Math.hypot(nx,.94,nz);normals.setXYZ(i,nx/len,.94/len,nz/len);}
 return geometry;
}

export function buildGrassDetail(THREE,scene,M,{mobile=false}={}){
 const placements=placeGrassBlades({mobile}),geometry=bladeGeometry(THREE);
 const material=new THREE.MeshStandardMaterial({color:0xbfc9b2,roughness:1,metalness:0,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec3 grassWorld=(modelMatrix*instanceMatrix*vec4(position,1.0)).xyz;
 transformed.y *= 1.0-smoothstep(3.0,7.0,distance(cameraPosition.xz,grassWorld.xz));`);
 // Os cartões representam tufos, não chapas opacas: ambos os lados mantêm
 // a normal ascendente. Virá-la no verso deixa metade das lâminas preta.
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;','normal *= 1.0;'));
 };
 material.customProgramCacheKey=()=> 'grass-nearfield-v2';
 const grass=new THREE.InstancedMesh(geometry,material,placements.length),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),quaternion=new THREE.Quaternion(),euler=new THREE.Euler(),dark=new THREE.Color(0x52643d),light=new THREE.Color(0x758759),color=new THREE.Color();
 placements.forEach((blade,i)=>{
  position.set(proportionStudy?planX(blade.x):blade.x,.004,proportionStudy?planZ(blade.z):blade.z);euler.set(blade.leanX,blade.rotation,blade.leanZ,'YXZ');quaternion.setFromEuler(euler);scale.set(.020+blade.tone*.009,blade.height,.020+blade.tone*.009);matrix.compose(position,quaternion,scale);grass.setMatrixAt(i,matrix);
  color.lerpColors(dark,light,blade.tone);grass.setColorAt(i,color);
 });
 grass.name='front-lawn-short-grass';grass.castShadow=false;grass.receiveShadow=true;grass.instanceMatrix.needsUpdate=true;if(grass.instanceColor)grass.instanceColor.needsUpdate=true;scene.add(grass);
 return {mesh:grass,placements,triangles:placements.length*8,drawCalls:1};
}

// Tufos fotográficos da base do Vale. Instâncias limitadas e sem loop ocioso.
export async function addGrassClusters(THREE,scene,{mobile=false}={}){
 const {GLTFLoader}=await import('./vendor/GLTFLoader.js');
 const source=(await new GLTFLoader().loadAsync(new URL('./assets/grass-clusters.glb',import.meta.url).href)).scene;
 source.updateMatrixWorld(true);const variants=[];source.traverse(o=>{if(o.isMesh)variants.push(o);});
 if(!variants.length||variants.length>3)throw Error('Variantes de grama inválidas');
 const positions=placeGrassBlades({mobile,count:mobile?150:420,seed:0x48f6}),stats={instances:positions.length,triangles:0,drawCalls:variants.length,variants:variants.length};
 variants.forEach((o,index)=>{
  const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.computeBoundingBox();const b=geometry.boundingBox,size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());if(![size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>0))throw Error('Geometria de grama inválida');geometry.translate(-c.x,-b.min.y,-c.z);geometry.scale(.42/Math.max(size.x,size.z),.075/size.y,.42/Math.max(size.x,size.z));
  const material=o.material.clone();material.side=THREE.DoubleSide;material.alphaTest=.4;material.transparent=false;material.roughness=1;
  const normals=geometry.attributes.normal;for(let i=0;i<normals.count;i++){const v=new THREE.Vector3(normals.getX(i)*.22,.94,normals.getZ(i)*.22).normalize();normals.setXYZ(i,v.x,v.y,v.z);}
  material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 clusterWorld=(modelMatrix*instanceMatrix*vec4(position,1.0)).xyz;
   transformed.y *= 1.0-smoothstep(5.0,9.0,distance(cameraPosition.xz,clusterWorld.xz));`);shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;','normal *= 1.0;'));};material.customProgramCacheKey=()=> 'grass-clusters-nearfield-v2';
  const chosen=positions.filter((_,i)=>i%variants.length===index),mesh=new THREE.InstancedMesh(geometry,material,chosen.length),m=new THREE.Matrix4(),q=new THREE.Quaternion();
  chosen.forEach((p,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.rotation);const s=.80+p.tone*.4;m.compose(new THREE.Vector3(proportionStudy?planX(p.x):p.x,.002,proportionStudy?planZ(p.z):p.z),q,new THREE.Vector3(s,s,s));mesh.setMatrixAt(i,m);});mesh.receiveShadow=true;mesh.castShadow=false;scene.add(mesh);stats.triangles+=(geometry.index?.count||geometry.attributes.position.count)/3*chosen.length;
 });return stats;
}
