// Detalhe ilustrativo: a referência 03 mostra grama curta, irregular e pouco saturada.
// As coordenadas são do estudo, não uma medição georreferenciada do lote.
export const grassField={minX:-6,maxX:14,minZ:-18,maxZ:0};
export const patioPolygon=[[-6,0],[-6,-8.4],[-.8,-7],[5.5,-3.9],[10.3,-3.9],[10.3,0]];
export const grassBudgets={desktop:{instances:5200,triangles:41600},mobile:{instances:1700,triangles:13600}};

const paths=Array.from({length:12},(_,i)=>({x:2.2-i*.18,z:-16+i*.83,halfX:.39,halfZ:.215}));
const mulberry32=seed=>()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
const inPolygon=(x,z,polygon)=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,zi]=polygon[i],[xj,zj]=polygon[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;}return inside;};

export function isGrassPlacementAllowed(x,z){
 // Respiro junto aos muros e pátio; evita lâminas atravessando pedra ou placas.
 if(x<-5.70||x>13.64||z<-17.72||z>-.18||inPolygon(x,z,patioPolygon))return false;
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
  position.set(blade.x,.004,blade.z);euler.set(blade.leanX,blade.rotation,blade.leanZ,'YXZ');quaternion.setFromEuler(euler);scale.set(.020+blade.tone*.009,blade.height,.020+blade.tone*.009);matrix.compose(position,quaternion,scale);grass.setMatrixAt(i,matrix);
  color.lerpColors(dark,light,blade.tone);grass.setColorAt(i,color);
 });
 grass.name='front-lawn-short-grass';grass.castShadow=false;grass.receiveShadow=true;grass.instanceMatrix.needsUpdate=true;if(grass.instanceColor)grass.instanceColor.needsUpdate=true;scene.add(grass);
 return {mesh:grass,placements,triangles:placements.length*8,drawCalls:1};
}
