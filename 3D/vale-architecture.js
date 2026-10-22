import * as THREE from 'three';
import {addHomeDetails} from './vale-home-details.js';
import {addArchitecturalFacades} from './vale-facade-design.js';

// This module only changes material slots/index order. It never moves a surveyed vertex.
const AS='./assets/maquete/';
const TEXTURES={
 plaster:['reboco-diff.jpg','reboco-normal.jpg','reboco-rough.jpg'],
 tile:['telha-diff.jpg','telha-normal.jpg','telha-rough.jpg'],
 slate:['telha-cinza-diff.jpg','telha-cinza-normal.jpg','telha-cinza-rough.jpg'],
 wood:['fachada-madeira-diff.jpg','fachada-madeira-normal.jpg','fachada-madeira-rough.jpg'],
 brick:['fachada-tijolo-diff.jpg','fachada-tijolo-normal.jpg','fachada-tijolo-rough.jpg']
};
const EMPTY={meshes:0,triangles:0,wall:0,pitched:0,flat:0,components:0};

function materialList(value){return Array.isArray(value)?value:[value];}
function loadTexture(loader,url,color,anisotropy){
 return loader.loadAsync(AS+url).then(texture=>{
  texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.anisotropy=anisotropy;
  // The source shell UVs are measured in metres. One texture tile covers about 4.5 m.
  texture.repeat.set(.22,.22);
  return texture;
 });
}
async function loadSet(loader,files,anisotropy){
 const [map,normalMap,roughnessMap]=await Promise.all(files.map((file,index)=>loadTexture(loader,file,index===0,anisotropy)));
 return {map,normalMap,roughnessMap};
}
function pbr(name,textures,color,roughness=1){
 return new THREE.MeshStandardMaterial({name,color,map:textures.map,normalMap:textures.normalMap,roughnessMap:textures.roughnessMap,roughness,metalness:0,normalScale:new THREE.Vector2(.62,.62)});
}
function buildingCandidate(mesh){
 if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return false;
 // Only the measured swissBUILDINGS shell is recoloured. Detail meshes keep their
 // authored glass, metal, lamps, equipment and facade finishes untouched.
 return /^swissBUILDINGS3D_Building_solid_2021(?:_|$)/i.test(mesh.name||'');
}
function triNormal(position,a,b,c,normalMatrix,target){
 const pa=new THREE.Vector3().fromBufferAttribute(position,a),pb=new THREE.Vector3().fromBufferAttribute(position,b),pc=new THREE.Vector3().fromBufferAttribute(position,c);
 return target.copy(pb).sub(pa).cross(pc.sub(pa)).applyMatrix3(normalMatrix).normalize();
}
function category(normal){
 // Horizontal upward faces are a flat roof; shallow upward faces are pitched roofs.
 if(normal.y>.90)return 'flat';
 if(normal.y>.18)return 'pitched';
 return 'wall';
}
function componentIds(index,position,triangleCount){
 const parent=Int32Array.from({length:triangleCount},(_,i)=>i),first=new Map();
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent[b]=a;};
 for(let tri=0;tri<triangleCount;tri++)for(let corner=0;corner<3;corner++){
  const vertex=index?index.getX(tri*3+corner):tri*3+corner;
  // GLTF exports sometimes expand indices. Exact millimetre keys reconnect those
  // duplicate vertices without changing any coordinates or merging nearby houses.
  const key=`${Math.round(position.getX(vertex)*1000)},${Math.round(position.getY(vertex)*1000)},${Math.round(position.getZ(vertex)*1000)}`;
  const previous=first.get(key);
  if(previous===undefined)first.set(key,tri);else join(tri,previous);
 }
 const ids=new Int32Array(triangleCount);const remap=new Map();let next=0;
 for(let tri=0;tri<triangleCount;tri++){const key=root(tri);if(!remap.has(key))remap.set(key,next++);ids[tri]=remap.get(key);}
 return ids;
}
function variationFor(x,z,count){
 // A 32 m cadastral cell avoids per-triangle colour noise on expanded GLTF meshes.
 // The same geographic cell gives a whole building/conjunto one restrained finish.
 const h=Math.sin(Math.floor(x/32)*12.9898+Math.floor(z/32)*78.233)*43758.5453;
 return Math.floor((h-Math.floor(h))*count);
}
function regroup(mesh,materials,stats){
 const source=mesh.geometry,position=source.attributes.position,index=source.index;
 const triangleCount=Math.floor((index?.count||position.count)/3);if(!triangleCount)return;
 const finishCount=materials.length/3,buckets=Array.from({length:materials.length},()=>[]),normal=new THREE.Vector3(),ids=componentIds(index,position,triangleCount),used=new Set(),componentCount=new Set(ids).size;
 const normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld),anchors=Array.from({length:componentCount},()=>({x:0,z:0,n:0}));
 const point=new THREE.Vector3();
 for(let tri=0;tri<triangleCount;tri++){
  const a=index?index.getX(tri*3):tri*3,b=index?index.getX(tri*3+1):tri*3+1,c=index?index.getX(tri*3+2):tri*3+2,anchor=anchors[ids[tri]];
  point.fromBufferAttribute(position,a).add(new THREE.Vector3().fromBufferAttribute(position,b)).add(new THREE.Vector3().fromBufferAttribute(position,c)).multiplyScalar(1/3).applyMatrix4(mesh.matrixWorld);
  anchor.x+=point.x;anchor.z+=point.z;anchor.n++;
 }
 for(let tri=0;tri<triangleCount;tri++){
  const a=index?index.getX(tri*3):tri*3,b=index?index.getX(tri*3+1):tri*3+1,c=index?index.getX(tri*3+2):tri*3+2;
  const kind=category(triNormal(position,a,b,c,normalMatrix,normal)),anchor=anchors[ids[tri]];
  const offset=kind==='wall'?0:kind==='pitched'?finishCount:finishCount*2,slot=offset+variationFor(anchor.x/anchor.n,anchor.z/anchor.n,finishCount);
  buckets[slot].push(a,b,c);used.add(slot);stats[kind]++;stats.triangles++;
 }
 const next=source.clone(),ordered=[];next.clearGroups();
 for(let slot=0;slot<buckets.length;slot++)if(buckets[slot].length){const start=ordered.length;ordered.push(...buckets[slot]);next.addGroup(start,buckets[slot].length,slot);}
 next.setIndex(ordered);next.computeBoundingSphere();mesh.geometry=next;source.dispose();mesh.material=materials;mesh.castShadow=true;mesh.receiveShadow=true;
 stats.meshes++;stats.components+=componentCount;return used;
}
function buildingBounds(root){
 const box=new THREE.Box3();root.updateMatrixWorld(true);root.traverse(o=>{if(buildingCandidate(o))box.expandByObject(o);});
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.z,20);
 return {center,size,view:{p:[center.x+radius*.92,center.y+radius*.62,center.z+radius*1.15],t:[center.x,center.y+size.y*.22,center.z],f:47}};
}
function spatialVariation(mesh,palette,cell){
 const source=mesh.geometry,position=source.attributes.position,colors=new Float32Array(position.count*3),world=new THREE.Vector3(),keys=new Set();
 for(let i=0;i<position.count;i++){
  world.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
  const key=`${Math.floor(world.x/cell)},${Math.floor(world.y/cell)},${Math.floor(world.z/cell)}`;
  keys.add(key);const h=Math.sin(Math.floor(world.x/cell)*17.31+Math.floor(world.y/cell)*43.19+Math.floor(world.z/cell)*91.73)*43758.5453;
  const color=palette[Math.floor((h-Math.floor(h))*palette.length)];colors.set(color,i*3);
 }
 const geometry=source.clone();geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));mesh.geometry=geometry;source.dispose();
 return {vertices:position.count,clusters:keys.size,hasUV:!!geometry.attributes.uv};
}
function locationHash(x,z){const h=Math.sin(Math.floor(x/20)*12.9898+Math.floor(z/20)*78.233)*43758.5453;return h-Math.floor(h);}
function extractWindowPanels(mesh){
 const position=mesh.geometry.attributes.position,index=mesh.geometry.index,count=Math.floor((index?.count||position.count)/3),ids=componentIds(index,position,count),total=Math.max(...ids)+1;
 const panels=Array.from({length:total},()=>({vertices:new Set(),normal:new THREE.Vector3()})),normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 for(let tri=0;tri<count;tri++){
  const group=panels[ids[tri]],ia=index?index.getX(tri*3):tri*3,ib=index?index.getX(tri*3+1):tri*3+1,ic=index?index.getX(tri*3+2):tri*3+2;
  group.vertices.add(ia);group.vertices.add(ib);group.vertices.add(ic);a.fromBufferAttribute(position,ia);b.fromBufferAttribute(position,ib);c.fromBufferAttribute(position,ic);group.normal.add(b.sub(a).cross(c.sub(a)).applyMatrix3(normalMatrix).normalize());
 }
 const up=new THREE.Vector3(0,1,0),point=new THREE.Vector3();
 return panels.map(panel=>{
  const normal=panel.normal.normalize();if(normal.lengthSq()<.5)return null;
  const horizontal=new THREE.Vector3().crossVectors(up,normal).normalize();let minU=Infinity,maxU=-Infinity,minY=Infinity,maxY=-Infinity,minN=Infinity,maxN=-Infinity;
  for(const vertex of panel.vertices){point.fromBufferAttribute(position,vertex).applyMatrix4(mesh.matrixWorld);const u=point.dot(horizontal),n=point.dot(normal);minU=Math.min(minU,u);maxU=Math.max(maxU,u);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);minN=Math.min(minN,n);maxN=Math.max(maxN,n);}
  const center=horizontal.clone().multiplyScalar((minU+maxU)/2).addScaledVector(up,(minY+maxY)/2).addScaledVector(normal,(minN+maxN)/2);
  return {center,normal,horizontal,width:maxU-minU,height:maxY-minY,depth:maxN-minN};
 }).filter(Boolean);
}
function addResidentialShutters(root){
 const stats={windowsDetected:0,windowsShuttered:0,windowsOpen:0,instances:0,primitives:0};let glass;
 root.traverse(mesh=>{if(mesh.isMesh&&mesh.name==='Glass__dark_reflective_details')glass=mesh;});if(!glass)return stats;
 root.updateMatrixWorld(true);const panels=extractWindowPanels(glass),unit=new THREE.BoxGeometry(1,1,1),wood=new THREE.MeshStandardMaterial({name:'PBR veneziana madeira/verde profundo',color:0x34412b,roughness:.64,metalness:0,vertexColors:true}),slatMaterial=new THREE.MeshStandardMaterial({name:'PBR lâmina veneziana sombreada',color:0x28331f,roughness:.58,metalness:0,vertexColors:true});
 const valid=panels.filter(p=>p.center.x>=195&&p.center.x<=345&&p.center.z>=245&&p.center.z<=410&&Math.abs(p.normal.y)<.18&&p.width>=.45&&p.width<=2.1&&p.height>=.9&&p.height<=1.8&&p.depth<.28);
 stats.windowsDetected=valid.length;const selected=valid.filter(p=>locationHash(p.center.x,p.center.z)>.48);stats.windowsShuttered=selected.length;stats.windowsOpen=valid.length-selected.length;if(!selected.length)return stats;
 // Rails and slats use instancing: real cuboid geometry, but only two draw primitives.
 const perWindow=56,rails=new THREE.InstancedMesh(unit,wood,selected.length*8),slats=new THREE.InstancedMesh(unit,slatMaterial,selected.length*perWindow),matrix=new THREE.Matrix4(),basis=new THREE.Matrix4(),color=new THREE.Color(),up=new THREE.Vector3(0,1,0);let railCount=0,slatCount=0;
 for(const panel of selected){
  const variant=locationHash(panel.center.x,panel.center.z),tone=variant>.74?0x4a3828:0x31412b,normal=panel.normal.clone(),u=panel.horizontal.clone(),out=normal.clone().multiplyScalar(.055),leafW=Math.min(.38,panel.width*.29),height=panel.height*.92,edge=panel.width*.5+leafW*.52;
  basis.makeBasis(u,up,normal);color.setHex(tone);
  for(const sign of [-1,1]){
   const leafCenter=panel.center.clone().addScaledVector(u,sign*edge).add(out),add=(position,size,target,isSlat=false)=>{const slot=isSlat?slatCount++:railCount++,rotation=new THREE.Quaternion().setFromRotationMatrix(basis);if(isSlat)rotation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-.42));matrix.compose(position,rotation,size);target.setMatrixAt(slot,matrix);target.setColorAt(slot,color);};
   add(leafCenter.clone().addScaledVector(u,-leafW*.45),new THREE.Vector3(.055,height,.055),rails);add(leafCenter.clone().addScaledVector(u,leafW*.45),new THREE.Vector3(.055,height,.055),rails);add(leafCenter.clone().addScaledVector(up,height*.46),new THREE.Vector3(leafW,.055,.055),rails);add(leafCenter.clone().addScaledVector(up,-height*.46),new THREE.Vector3(leafW,.055,.055),rails);
   const rows=Math.ceil(height/.07),pitch=height*.84/rows;
   for(let row=0;row<rows;row++){const y=height*.42-(row+.5)*pitch;add(leafCenter.clone().addScaledVector(up,y).addScaledVector(normal,.025),new THREE.Vector3(leafW*.88,pitch*.82,.052),slats,true);}
  }
 }
 rails.count=railCount;slats.count=slatCount;rails.instanceMatrix.needsUpdate=true;slats.instanceMatrix.needsUpdate=true;rails.instanceColor.needsUpdate=true;slats.instanceColor.needsUpdate=true;rails.castShadow=slats.castShadow=true;rails.receiveShadow=slats.receiveShadow=true;
 const group=new THREE.Group();group.name='Venezianas residenciais ilustrativas (derivadas de janelas)';group.add(rails,slats);root.add(group);stats.instances=railCount+slatCount;stats.primitives=2;return stats;
}
function addWindowIllustrationAttributes(mesh){
 const source=mesh.geometry,position=source.attributes.position,index=source.index,count=Math.floor((index?.count||position.count)/3),ids=componentIds(index,position,count),componentCount=Math.max(...ids)+1;
 const components=Array.from({length:componentCount},()=>({vertices:new Set(),min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]})),world=new THREE.Vector3();
 for(let tri=0;tri<count;tri++)for(let corner=0;corner<3;corner++)components[ids[tri]].vertices.add(index?index.getX(tri*3+corner):tri*3+corner);
 for(const component of components)for(const vertex of component.vertices){world.fromBufferAttribute(position,vertex).applyMatrix4(mesh.matrixWorld);for(let axis=0;axis<3;axis++){component.min[axis]=Math.min(component.min[axis],world.getComponent(axis));component.max[axis]=Math.max(component.max[axis],world.getComponent(axis));}}
 const uv=new Float32Array(position.count*2),state=new Float32Array(position.count),stats={windows:0,reflected:0,linen:0,shadow:0,slatted:0};
 for(const component of components){
  const size=component.max.map((v,axis)=>v-component.min[axis]),horizontalAxis=size[0]>size[2]?0:2,thinAxis=horizontalAxis===0?2:0;
  // Components, rather than sampled vertices, are stable individual glazing panels in the cadastral mesh.
  const valid=size[1]>=.55&&size[1]<=3&&size[horizontalAxis]>=.28&&size[horizontalAxis]<=3.5&&size[thinAxis]<=.38;
  if(!valid)continue;
  const centerX=(component.min[0]+component.max[0])/2,centerZ=(component.min[2]+component.max[2])/2,h=locationHash(centerX,centerZ),kind=h<.30?0:h<.57?1:h<.84?2:3;
  stats.windows++;stats[['reflected','linen','shadow','slatted'][kind]]++;
  for(const vertex of component.vertices){world.fromBufferAttribute(position,vertex).applyMatrix4(mesh.matrixWorld);uv[vertex*2]=(world.getComponent(horizontalAxis)-component.min[horizontalAxis])/size[horizontalAxis];uv[vertex*2+1]=(world.y-component.min[1])/size[1];state[vertex]=kind;}
 }
 const geometry=source.clone();geometry.deleteAttribute('color');geometry.setAttribute('windowUV',new THREE.BufferAttribute(uv,2));geometry.setAttribute('windowState',new THREE.BufferAttribute(state,1));mesh.geometry=geometry;source.dispose();return {vertices:position.count,hasUV:!!geometry.attributes.uv,...stats};
}
function illustratedGlassMaterial(){
 const material=new THREE.MeshPhysicalMaterial({name:'PBR vidro solar com cortina ilustrativa local',color:0x9aafb1,roughness:.18,metalness:.08,clearcoat:.42,clearcoatRoughness:.14,ior:1.48,envMapIntensity:1.15,transparent:true,opacity:.84,depthWrite:false});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 windowUV; attribute float windowState; varying vec2 vWindowUV; varying float vWindowState;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWindowUV=windowUV; vWindowState=windowState;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vWindowUV; varying float vWindowState;').replace('#include <color_fragment>',`#include <color_fragment>
   float linenFold=.72+.28*sin(vWindowUV.x*34.0); float slat=step(.44,fract(vWindowUV.y*15.0));
   float linenCover=step(.18,vWindowUV.x)*step(.5,vWindowState)*step(vWindowState,1.5);
   float shadeCover=step(1.5,vWindowState)*step(vWindowState,2.5); float slatCover=step(2.5,vWindowState);
   vec3 linen=vec3(.78,.74,.64)*linenFold; vec3 shade=vec3(.28,.36,.39); vec3 blind=mix(vec3(.30,.34,.31),vec3(.67,.64,.54),slat);
   diffuseColor.rgb=mix(diffuseColor.rgb,linen,.46*linenCover); diffuseColor.rgb=mix(diffuseColor.rgb,shade,.34*shadeCover); diffuseColor.rgb=mix(diffuseColor.rgb,blind,.38*slatCover);`);
 };
 material.customProgramCacheKey=()=> 'illustrated-window-glass-v2';return material;
}
function finishFenestration(root){
 const stats={glass:0,frames:0,sills:0,vertices:0,clusters:0,uvMeshes:0,windows:0,reflected:0,linen:0,shadow:0,slatted:0};root.updateMatrixWorld(true);
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  if(mesh.name==='Glass__dark_reflective_details'){
   const result=addWindowIllustrationAttributes(mesh);
   mesh.material=illustratedGlassMaterial();
   mesh.castShadow=false;mesh.receiveShadow=true;stats.glass++;stats.vertices+=result.vertices;stats.windows+=result.windows;stats.reflected+=result.reflected;stats.linen+=result.linen;stats.shadow+=result.shadow;stats.slatted+=result.slatted;if(result.hasUV)stats.uvMeshes++;
  }else if(mesh.name==='Window_frames__charcoal_aluminium_details'){
   const result=spatialVariation(mesh,[[.82,.84,.82],[.70,.73,.71],[.91,.91,.87]],3.2);
   mesh.material=new THREE.MeshStandardMaterial({name:'PBR caixilho alumínio grafite',color:0x343937,vertexColors:true,roughness:.43,metalness:.72,envMapIntensity:.65});
   mesh.castShadow=true;mesh.receiveShadow=true;stats.frames++;stats.vertices+=result.vertices;stats.clusters+=result.clusters;if(result.hasUV)stats.uvMeshes++;
  }else if(mesh.name==='Sills__light_limestone_details'){
   const result=spatialVariation(mesh,[[.90,.89,.84],[.81,.80,.75],[.96,.94,.88]],4.6);
   mesh.material=new THREE.MeshStandardMaterial({name:'PBR peitoril calcário',color:0xcac6b7,vertexColors:true,roughness:.76,metalness:0,envMapIntensity:.25});
   mesh.castShadow=true;mesh.receiveShadow=true;stats.sills++;stats.vertices+=result.vertices;stats.clusters+=result.clusters;if(result.hasUV)stats.uvMeshes++;
  }
 });return stats;
}

/** Apply photographic PBR finishes to the cadastral shell without changing measured coordinates. */
export async function finishArchitecture({gltf,renderer,facadeManifest,sample,roadExclusion}){
 if(!gltf?.scene)throw new Error('finishArchitecture requires the loaded architecture GLTF.');
 const anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||1),loader=new THREE.TextureLoader();
 const [plaster,tile,slate,wood,brick]=await Promise.all(['plaster','tile','slate','wood','brick'].map(k=>loadSet(loader,TEXTURES[k],anisotropy)));
 for(const texture of Object.values(wood))texture.repeat.set(.5,.5);
 for(const texture of Object.values(brick))texture.repeat.set(.3,.3);
 const walls=[pbr('PBR reboco marfim',plaster,0xe2d4bc),pbr('PBR reboco areia clara',plaster,0xd4bd95),pbr('PBR reboco sálvia suave',plaster,0xb8c1a2),pbr('PBR reboco ocre pálido',plaster,0xd1aa70),pbr('PBR reboco terracota lavada',plaster,0xc98f75)];
 const pitched=[pbr('PBR telha terracota',tile,0xa87959,.82),pbr('PBR telha terracota clara',tile,0xb78865,.82),pbr('PBR telha terracota escura',tile,0x8f654e,.84),pbr('PBR telha argila envelhecida',tile,0x9c7057,.84),pbr('PBR telha castanha clara',tile,0xb18163,.82)];
 const flat=[pbr('PBR cobertura mineral',slate,0x626565,.9),pbr('PBR cobertura mineral clara',slate,0x747574,.9),pbr('PBR cobertura mineral envelhecida',slate,0x575a59,.92),pbr('PBR cobertura ardósia azulada',slate,0x596366,.91),pbr('PBR cobertura zinco fosco',slate,0x6d706b,.9)];
 const materials=[...walls,...pitched,...flat],stats={...EMPTY},touched=[];
 gltf.scene.traverse(mesh=>{if(!buildingCandidate(mesh))return;const before=stats.triangles;const used=regroup(mesh,materials,stats);if(used)touched.push({name:mesh.name||'malha sem nome',triangles:stats.triangles-before,slots:[...used]});});
 const redesigned=facadeManifest?addArchitecturalFacades({root:gltf.scene,manifest:facadeManifest,sample,roadExclusion,textures:{plaster,wood,brick}}):null;
 const shutters=redesigned?null:addResidentialShutters(gltf.scene);
 const fenestration=redesigned?null:finishFenestration(gltf.scene);
 const homeDetails=redesigned?null:addHomeDetails(gltf.scene);
 const bounds=buildingBounds(gltf.scene);
 return {materials:materials.map(m=>m.name),stats,fenestration,shutters,homeDetails,redesigned,touched,cityView:bounds.view,bounds:{center:bounds.center.toArray(),size:bounds.size.toArray()}};
}
