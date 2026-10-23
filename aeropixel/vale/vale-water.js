import * as THREE from 'three';
import {Reflector} from './vendor/Reflector.js';

// The same manually interpreted corridor as the prior viewer. This is a visual
// water finish, not a measured water level, flood study or bathymetric surface.
const OUTLINE=[[.747,0],[.701,.08],[.658,.16],[.612,.23],[.565,.28],[.533,.32],[.502,.36],[.478,.398],[.463,.43],[.477,.46],[.498,.49],[.511,.54],[.514,.60],[.517,.65],[.502,.71],[.478,.76],[.458,.81],[.449,.86],[.453,.9],[.483,.95],[.51,1],[.493,1],[.469,.96],[.438,.91],[.429,.86],[.439,.80],[.46,.75],[.481,.70],[.49,.65],[.492,.60],[.485,.55],[.476,.51],[.449,.47],[.436,.44],[.444,.405],[.468,.369],[.496,.33],[.532,.29],[.571,.25],[.612,.205],[.646,.155],[.681,.09],[.719,0]];
// The prior final pair incorrectly climbs a 10.9 m bank, while the nearby
// riverbed is ~0.4–0.8 m. Shift only that interpreted outlet, never the DEM.
const CORRIDOR=OUTLINE.map(([x,z],i)=>[i===20?.478:i===21?.456:x,z]);
const STEP=2,HALF=500,N=501;

function extent(z){
 const v=THREE.MathUtils.clamp((z+HALF)/1000,1e-8,1-1e-8),crossings=[];
 for(let i=0,j=CORRIDOR.length-1;i<CORRIDOR.length;j=i++){
  const [x1,z1]=CORRIDOR[i],[x2,z2]=CORRIDOR[j];
  if((z1>v)!==(z2>v))crossings.push((x1+(v-z1)*(x2-x1)/(z2-z1))*1000-HALF);
 }
 return crossings.sort((a,b)=>a-b);
}

function clip(poly,value){
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],va=value(a),vb=value(b);
  if(va>=0)out.push(a);
  if((va>=0)!==(vb>=0)){const t=va/(va-vb);out.push(a.map((n,k)=>n+(b[k]-n)*t));}
 }
 return out;
}

export function buildValleyWater({scene,data,ground,sample}){
 const height=(x,z)=>sample.length>=3?sample(ground,x,z):sample(x,z);
 const rows=[];
 for(let r=0;r<N;r++){
  const z=r*STEP-HALF,[left,right]=extent(z),values=[];
  for(let x=Math.ceil(left);x<=right;x++)values.push(height(x,z));
  values.sort((a,b)=>a-b);
  rows.push({z,left,right,min:values[0],q15:values[Math.floor(values.length*.15)],q35:values[Math.floor(values.length*.35)],q75:values[Math.floor(values.length*.75)]});
 }
 // A local low-channel quantile, not the whole corridor's maximum: high banks
 // are excluded again geometrically below. Averaging alone can sink beneath a
 // local DEM hump, so use a monotone upstream envelope with a bounded grade.
 const profile=rows.map((row,i)=>{
  let sum=0,weight=0;
  for(let j=Math.max(0,i-5);j<=Math.min(N-1,i+5);j++){const w=6-Math.abs(i-j);sum+=(rows[j].q35+.26)*w;weight+=w;}
  return Math.max(row.min+.26,sum/weight);
 });
 const minimumFall=.00015*STEP,maximumFall=.025*STEP;
 for(let i=N-2;i>=0;i--)profile[i]=Math.max(profile[i],profile[i+1]+minimumFall);
 // Raising upstream instead of cutting a steep drop preserves the measured DEM.
 for(let i=1;i<N;i++)profile[i]=Math.max(profile[i],profile[i-1]-maximumFall);
 const level=z=>{const f=THREE.MathUtils.clamp((z+HALF)/STEP,0,N-1),i=Math.min(N-2,Math.floor(f));return THREE.MathUtils.lerp(profile[i],profile[i+1],f-i);};

 const positions=[],uvs=[],depths=[],indices=[];
 let corridorArea=0,wetArea=0,wetSamples=0,allSamples=0,oldWetSamples=0,maxDepth=0,maxDepthPoint=null;
 const rowWet=[],wetKeys=new Set();
 const waterClearance=.012;
 function vertex(x,z){const [left,right]=extent(z),y=level(z),bed=height(x,z);return [x,y,z,bed,x-left,right-x];}
 function addTriangle(triangle){
  let poly=clip(triangle,v=>v[4]);poly=clip(poly,v=>v[5]);
  if(poly.length<3)return;
  const areaOf=p=>{let area=0;for(let i=1;i<p.length-1;i++)area+=Math.abs((p[i][0]-p[0][0])*(p[i+1][2]-p[0][2])-(p[i][2]-p[0][2])*(p[i+1][0]-p[0][0]))*.5;return area;};
  corridorArea+=areaOf(poly);
  poly=clip(poly,v=>v[1]-v[3]-waterClearance);
  if(poly.length<3)return;wetArea+=areaOf(poly);
  for(let i=1;i<poly.length-1;i++){
   const triangle=[poly[0],poly[i],poly[i+1]];if(areaOf(triangle)<1e-8)continue;
   for(const v of triangle){indices.push(positions.length/3);positions.push(v[0],v[1],v[2]);uvs.push(v[0]/2.4,v[2]/2.4);depths.push(Math.max(0,v[1]-v[3]));}
  }
 }
 // Same 2 m triangles as the ground, clipped against the water/ground
 // intersection. No buried triangles are left to create rectangular rips.
 for(let r=0;r<N-1;r++){
  const z=r*STEP-HALF,left=Math.min(rows[r].left,rows[r+1].left),right=Math.max(rows[r].right,rows[r+1].right);
  let rowCount=0;
  for(let c=Math.floor((left+HALF)/STEP);c<Math.ceil((right+HALF)/STEP);c++){
   const x=c*STEP-HALF,a=vertex(x,z),b=vertex(x,z+STEP),c1=vertex(x+STEP,z),d=vertex(x+STEP,z+STEP);
   addTriangle([a,b,c1]);addTriangle([c1,b,d]);
   const sx=x+STEP/2,sz=z+STEP/2,[lo,hi]=extent(sz);
   if(sx<lo||sx>hi)continue;allSamples++;
   const depth=level(sz)-height(sx,sz);
   if(depth>waterClearance){wetSamples++;rowCount++;wetKeys.add(r*N+c);if(depth>maxDepth){maxDepth=depth;maxDepthPoint=[sx,sz];}}
   // Low-quantile reference: the prior q15 + 22 cm method, evaluated on
   // this corrected corridor (not a pixel-exact reproduction of the old mesh).
   let old=0,count=0;for(let k=Math.max(0,r-3);k<=Math.min(N-1,r+3);k++){old+=rows[k].q15+.22;count++;}
   if(old/count>height(sx,sz))oldWetSamples++;
  }
  rowWet.push(rowCount);
 }
 // Connected wetted samples expose isolated pools/holes rather than hiding
 // those defects behind a successful geometry build.
 let largest=0,fullLengthComponents=0,componentCount=0;
 const pending=new Set(wetKeys);
 while(pending.size){
  const first=pending.values().next().value,queue=[first];pending.delete(first);let firstRow=N,lastRow=0;
  for(let at=0;at<queue.length;at++){
   const key=queue[at],r=Math.floor(key/N),c=key%N;firstRow=Math.min(firstRow,r);lastRow=Math.max(lastRow,r);
   for(const [dz,dx] of [[-1,0],[1,0],[0,-1],[0,1]]){const next=(r+dz)*N+c+dx;if(pending.delete(next))queue.push(next);}
  }
  componentCount++;largest=Math.max(largest,queue.length);if(firstRow===0&&lastRow===N-2)fullLengthComponents++;
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('waterDepth',new THREE.Float32BufferAttribute(depths,1));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();

 // Periodic, physically small ripples: three directions avoid stripe artifacts.
 const resolution=256,pixels=new Uint8Array(resolution*resolution*4);
 for(let z=0;z<resolution;z++)for(let x=0;x<resolution;x++){
  const u=x/resolution*Math.PI*2,v=z/resolution*Math.PI*2;
  let nx=0,ny=0;for(let k=0;k<24;k++){const a=(k*7)%23-11,b=(k*13+5)%29-14,w=Math.sin(a*u+b*v+k*2.39996)*.016;nx+=w*a/14;ny+=w*b/14;}
  const nz=Math.sqrt(Math.max(0,1-nx*nx-ny*ny)),i=(z*resolution+x)*4;
  pixels[i]=Math.round((nx*.5+.5)*255);pixels[i+1]=Math.round((ny*.5+.5)*255);pixels[i+2]=Math.round((nz*.5+.5)*255);pixels[i+3]=255;
 }
 const normal=new THREE.DataTexture(pixels,resolution,resolution,THREE.RGBAFormat);normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.magFilter=THREE.LinearFilter;normal.minFilter=THREE.LinearMipmapLinearFilter;normal.generateMipmaps=true;normal.needsUpdate=true;
 // A near-camera planar reflection approximates this gently sloped stream.
 // Geometry and inferred levels remain unchanged. The bed is visible through
 // the shallow water; Fresnel increases reflection at grazing angles.
 const reflection={map:{value:null},matrix:{value:new THREE.Matrix4()},strength:{value:0}};
 const material=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.16,metalness:0,normalMap:normal,normalScale:new THREE.Vector2(.38,.38),clearcoat:.4,clearcoatRoughness:.16,ior:1.333,envMapIntensity:.65,transparent:true,opacity:1,depthWrite:false});
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{riverReflection:reflection.map,riverReflectionMatrix:reflection.matrix,riverReflectionStrength:reflection.strength});
  shader.vertexShader='attribute float waterDepth; varying float vWaterDepth; varying vec3 vRiverWorld; varying vec4 vRiverReflection; uniform mat4 riverReflectionMatrix;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWaterDepth=waterDepth;vRiverWorld=(modelMatrix*vec4(position,1.0)).xyz;vRiverReflection=riverReflectionMatrix*vec4(vRiverWorld,1.0);');
  shader.fragmentShader='varying float vWaterDepth; varying vec3 vRiverWorld; varying vec4 vRiverReflection; uniform sampler2D riverReflection; uniform float riverReflectionStrength;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float d=1.0-exp(-vWaterDepth*.8);
   diffuseColor.rgb*=mix(vec3(.10,.18,.13),vec3(.025,.075,.065),d);
   diffuseColor.a=(.12+.65*d)*smoothstep(.012,.09,vWaterDepth);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec3 riverN=inverseTransformDirection(normal,viewMatrix);
   vec3 riverV=normalize(cameraPosition-vRiverWorld);
   float riverF=.0204+.9796*pow(1.0-clamp(dot(riverV,riverN),0.0,1.0),5.0);
   vec2 riverUV=vRiverReflection.xy/max(.001,vRiverReflection.w);
   riverUV+=riverN.xz*.012;
   float inReflection=step(.002,riverUV.x)*step(riverUV.x,.998)*step(.002,riverUV.y)*step(riverUV.y,.998)*step(0.0,vRiverReflection.w);
   vec3 reflected=texture2D(riverReflection,clamp(riverUV,.002,.998)).rgb;
   float reflectionMix=riverReflectionStrength*inReflection*riverF;
   outgoingLight=mix(outgoingLight,reflected,reflectionMix);
   diffuseColor.a=mix(diffuseColor.a,1.0,riverF)*smoothstep(.012,.09,vWaterDepth);
   #include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=> 'valley-water-depth-reflection-v2';
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Rio contínuo / nível e acabamento ilustrativos / DEM preservado';mesh.receiveShadow=true;mesh.renderOrder=1;scene.add(mesh);
 const qa={illustrative:true,demModified:false,interpretedOutletCorrection:{original:[OUTLINE[20],OUTLINE[21]],corrected:[CORRIDOR[20],CORRIDOR[21]],reason:'O contorno antigo terminava sobre um talude ~10 m acima do leito; saída reposicionada sobre o corredor baixo do DEM.'},sectionCount:N,sectionStepM:STEP,profileUpstreamM:profile[0],profileDownstreamM:profile[N-1],maxProfileGrade:Math.max(...profile.slice(1).map((h,i)=>(profile[i]-h)/STEP)),waterAreaM2:wetArea,corridorAreaM2:corridorArea,wetAreaFraction:wetArea/corridorArea,wetSampleFraction:wetSamples/allSamples,formerWetSampleFraction:oldWetSamples/allSamples,dryCrossSections:rowWet.filter(n=>!n).length,minimumWetWidthSampleM:Math.min(...rowWet)*STEP,connectedComponents:componentCount,fullLengthComponents,largestComponentFraction:largest/wetSamples,maxIllustrativeDepthM:maxDepth,maxIllustrativeDepthPoint:maxDepthPoint,triangles:indices.length/3,vertices:positions.length/3,warning:'Nível visual inferido; não é levantamento de nível d’água, inundação ou batimetria.'};
 mesh.userData.qa=qa;
 qa.shading={shallowBedVisible:true,reflection:'512px near-camera planar approximation; HDR fallback farther away',reflectionPasses:0};
 let mirror=null,lastPosition=new THREE.Vector3(Infinity,Infinity,Infinity),lastQuaternion=new THREE.Quaternion(),lastFov=0;
 return {mesh,qa,levelAt:level,extentAt:extent,depthAt:(x,z)=>{const [l,r]=extent(z);return x>=l&&x<=r?Math.max(0,level(z)-height(x,z)):0;},update:(seconds,renderer,camera)=>{
  normal.offset.set(seconds*.003,seconds*.007);
  if(!renderer||!camera)return;
  const [l,r]=extent(camera.position.z),distance=Math.max(l-camera.position.x,0,camera.position.x-r),near=distance<100&&camera.position.y-level(camera.position.z)<100&&Math.abs(camera.position.z)<500;
  reflection.strength.value=near?1:0;if(!near)return;
  if(mirror&&camera.position.distanceToSquared(lastPosition)<.0001&&1-Math.abs(camera.quaternion.dot(lastQuaternion))<1e-7&&camera.fov===lastFov)return;
  if(!mirror){mirror=new Reflector(new THREE.PlaneGeometry(1,1),{textureWidth:512,textureHeight:512,clipBias:.001,multisample:0});mirror.rotation.x=-Math.PI/2;reflection.map.value=mirror.getRenderTarget().texture;}
  mirror.position.set(camera.position.x,level(camera.position.z),camera.position.z);mirror.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const visible=mesh.visible;mesh.visible=false;
  try{mirror.onBeforeRender(renderer,scene,camera);reflection.matrix.value.copy(mirror.material.uniforms.textureMatrix.value).multiply(new THREE.Matrix4().copy(mirror.matrixWorld).invert());qa.shading.reflectionPasses++;}finally{mesh.visible=visible;}
  lastPosition.copy(camera.position);lastQuaternion.copy(camera.quaternion);lastFov=camera.fov;
 }};
}
