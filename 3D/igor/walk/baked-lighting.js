// Atlas gerado offline no Blender. Geometria, UVs e cobertura são validados antes do uso.
const excludedBakeMaterials=new Set(['grass','paving','roof','light']);
const update=(h,bytes)=>{for(const b of bytes){h^=b;h=Math.imul(h,16777619);}return h;};
const textBytes=text=>new TextEncoder().encode(text);
const finish=h=>(h>>>0).toString(16);
export function geometryKey(geometry){
 const attributes=geometry?.attributes?[['position',geometry.attributes.position],['normal',geometry.attributes.normal],['uv',geometry.attributes.uv]]:[['position',{array:geometry,itemSize:3}]];let h=2166136261;
 for(const [name,attribute] of attributes){if(!attribute?.array)throw Error(`Geometria sem ${name}`);h=update(h,textBytes(`${name}:${attribute.itemSize}:${attribute.array.byteLength}:`));h=update(h,new Uint8Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));}
 return finish(h);
}
const sourceGeometryKey=meshes=>{let h=2166136261;for(const mesh of meshes)h=update(h,textBytes(`${geometryKey(mesh.geometry)}:`));return finish(h);};
export function exportBakeSource(scene,M){
 const names=new Map(Object.entries(M).map(([name,m])=>[m,name])),sourceMeshes=scene.children.filter(o=>o.isMesh&&!o.material.transparent),meshes=sourceMeshes.map((mesh,index)=>{
  const g=mesh.geometry,m=mesh.material,name=names.get(m)||'detail',bakeEligible=!excludedBakeMaterials.has(name),map=t=>t?{url:t.image?.currentSrc||t.image?.src||'',repeat:t.repeat.toArray()}:null;
  return {index,key:geometryKey(g),bakeEligible,position:Array.from(g.attributes.position.array),normal:Array.from(g.attributes.normal.array),uv:Array.from(g.attributes.uv.array),material:{name,color:m.color.toArray(),roughness:m.roughness,metalness:m.metalness,emissive:m.emissive?.toArray(),emissiveIntensity:m.emissiveIntensity,map:map(m.map),normalMap:map(m.normalMap),roughnessMap:map(m.roughnessMap)}};
 });
 return {version:2,coordinateSystem:'three-y-up-before-facade-reflection',sceneMeshCount:sourceMeshes.length,geometrySourceKey:sourceGeometryKey(sourceMeshes),eligibleMeshIndices:meshes.filter(mesh=>mesh.bakeEligible).map(mesh=>mesh.index),meshes};
}
export async function applyBakedLighting(THREE,scene,{mobile=false,enabled=true}={}){
 if(!enabled)return {enabled:false,reason:'comparison-baseline'};
 const base=new URL('./assets/baked/',import.meta.url),asset=name=>new URL(`${name}?v=scale-r1`,base),response=await fetch(asset('atlas.json'));
 if(!response.ok)return{enabled:false,reason:'atlas-unavailable'};
 const atlas=await response.json(),meshes=scene.children.filter(o=>o.isMesh&&!o.material.transparent),expectedIndices=atlas.eligibleMeshIndices;
 if(atlas.version!==2||!Array.isArray(atlas.meshes)||!atlas.meshes.length||!Number.isFinite(atlas.indirectScale)||atlas.indirectScale<=0||!Number.isInteger(atlas.resolution)||atlas.resolution<1||atlas.resolution>2048||!Number.isInteger(atlas.mobileResolution)||atlas.mobileResolution<1||atlas.mobileResolution>1024||!Number.isInteger(atlas.sceneMeshCount)||atlas.sceneMeshCount!==meshes.length||typeof atlas.geometrySourceKey!=='string'||atlas.geometrySourceKey!==sourceGeometryKey(meshes)||!Array.isArray(expectedIndices)||expectedIndices.length!==atlas.meshes.length||new Set(expectedIndices).size!==expectedIndices.length||new Set(atlas.meshes.map(e=>e.index)).size!==atlas.meshes.length||expectedIndices.some(index=>!Number.isInteger(index)||index<0||index>=meshes.length)||atlas.meshes.some((entry,index)=>entry.index!==expectedIndices[index]))throw Error('Atlas inválido');
 for(const entry of atlas.meshes){const mesh=meshes[entry.index];if(!mesh||geometryKey(mesh.geometry)!==entry.key||entry.uv.length!==mesh.geometry.attributes.position.count*2||entry.uv.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('Atlas e geometria divergentes');}
 const loader=new THREE.TextureLoader(),ao=await loader.loadAsync(asset(mobile?'ao-mobile.jpg':'ao.jpg').href);
 ao.colorSpace=THREE.NoColorSpace;ao.channel=1;ao.anisotropy=2;
 let light;try{light=await loader.loadAsync(asset(mobile?'indirect-mobile.png':'indirect.png').href);}catch(error){ao.dispose();throw error;}
 light.colorSpace=THREE.SRGBColorSpace;light.channel=1;light.anisotropy=2;
 for(const entry of atlas.meshes){const mesh=meshes[entry.index];mesh.geometry.setAttribute('uv1',new THREE.Float32BufferAttribute(entry.uv,2));const m=mesh.material.clone();m.aoMap=ao;m.aoMapIntensity=.85;m.lightMap=light;m.lightMapIntensity=atlas.indirectScale*Math.PI;m.envMapIntensity=.18;mesh.material=m;}
 return{enabled:true,meshes:atlas.meshes.length,resolution:mobile?atlas.mobileResolution:atlas.resolution,extraTextureMiB:(mobile?atlas.mobileResolution:atlas.resolution)**2*4*2*4/3/1024/1024};
}
