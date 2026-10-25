// Malhas do mestre Blender e iluminação difusa calculada sobre suas superfícies.
// As câmeras, portas e colisões continuam sendo controladas pela caminhada.
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {geometryKey} from './baked-lighting.js';
import {createMasterMaterial} from './master-material.js?v=physical-r1';
const expectedMaster='01cddbb20575e7de342801ec206a272cbdface16059518e0da1a9f34570428ec';
const safe=name=>typeof name==='string'&&/^[a-zA-Z0-9_.-]+$/.test(name)&&!name.includes('..');
// source-editable.json preserves all Float32 values but JSON canonicalizes -0.
// Compare the same canonical representation, without rounding coordinates.
const sourceKey=g=>geometryKey({attributes:Object.fromEntries(['position','normal','uv'].map(name=>[name,{itemSize:g.attributes[name].itemSize,array:Float32Array.from(g.attributes[name].array,v=>v===0?0:v)}]))});
export async function loadMasterWalk(THREE,scene,{mobile=false}={}){
 const base=new URL('./assets/walk-master/',import.meta.url),asset=name=>{if(!safe(name))throw Error('Nome de ativo inválido');return new URL(name,base).href;};
 const response=await fetch(asset('runtime-manifest.json')+'?v=physical-rnm-r1',{cache:'no-cache'});if(!response.ok)throw Error('Ativos da caminhada indisponíveis');const manifest=await response.json();
 if(manifest.masterSHA256!==expectedMaster||manifest.bakeStatus!=='complete'||manifest.coordinateSystem!=='three-y-up-final-world'||!Array.isArray(manifest.groups)||!manifest.groups.length)throw Error('Mestre/iluminação incompatíveis');
 const meshes=[];scene.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});
 if(meshes.length!==manifest.sourceMeshCount)throw Error('Índices da cena alterados');
 const ids=manifest.removedSourceIds;
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('Substituições inválidas');
 for(const id of ids){if(!Number.isInteger(id)||id<0||id>=meshes.length||sourceKey(meshes[id].geometry)!==manifest.sourceSignatures[id])throw Error('Geometria de origem alterada: '+id);}
 const root=new THREE.Group();root.name='Mestre_Blender_Caminhavel';const gltf=new GLTFLoader(),textures=new THREE.TextureLoader(),createdTextures=[],createdMaterials=[];
 const files=new Map(manifest.assets.map(a=>[a.file,a])),textureCache=new Map();
 const requested=new Set();for(const g of [...manifest.groups,...(manifest.native?[manifest.native]:[])]){requested.add(g.file);if(g.diffuse)requested.add(mobile&&g.mobileDiffuse?g.mobileDiffuse:g.diffuse);for(const name of (mobile&&g.mobileDirectional?g.mobileDirectional:g.directional)||[])requested.add(name);}for(const d of Object.values(manifest.materials||{}))for(const key of ['colorMap','normalMap','roughnessMap'])if(d[key]){const small='mobile'+key[0].toUpperCase()+key.slice(1);requested.add(mobile&&d[small]?d[small]:d[key]);}const totalBytes=[...requested].reduce((n,name)=>n+(files.get(name)?.bytes||0),0),completed=new Set();let completedBytes=0;
 async function verified(name){const spec=files.get(name);if(!spec)throw Error('Ativo sem hash: '+name);const r=await fetch(asset(name)+'?v='+spec.sha256);if(!r.ok)throw Error('Falha no ativo '+name);const bytes=await r.arrayBuffer();const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(actual!==spec.sha256)throw Error('Ativo alterado: '+name);if(!completed.has(name)){completed.add(name);completedBytes+=spec.bytes;const button=document.getElementById('enter');if(button?.disabled)button.textContent='Carregando detalhes… '+Math.min(100,Math.round(completedBytes/totalBytes*100))+'%';}return bytes;}
 const model=name=>verified(name).then(bytes=>gltf.parseAsync(bytes,base.href));
 function texture(name,srgb){const key=name+':'+srgb;if(!textureCache.has(key))textureCache.set(key,(async()=>{const bytes=await verified(name),blob=URL.createObjectURL(new Blob([bytes]));try{const t=await textures.loadAsync(blob);t.flipY=false;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=mobile?2:8;t.wrapS=t.wrapT=THREE.RepeatWrapping;createdTextures.push(t);return t;}finally{URL.revokeObjectURL(blob);}})());return textureCache.get(key);}
 async function pbrMaterial(name,lighting,scale,vertexIrradiance=false,atlasScale=scale,directional=[]){const d=manifest.materials[name];if(!d)throw Error('Material não identificado: '+name);const mat=createMasterMaterial(THREE,d,{lighting,scale,atlasScale,vertexIrradiance,directional});
  for(const [field,key,srgb]of [['map','colorMap',true],['normalMap','normalMap',false],['roughnessMap','roughnessMap',false]])if(d[key]){const small='mobile'+key[0].toUpperCase()+key.slice(1);mat[field]=await texture(mobile&&d[small]?d[small]:d[key],srgb);}
  createdMaterials.push(mat);return mat;}
 try{
  for(const spec of manifest.groups){
   if(!Number.isFinite(spec.radianceScale)||spec.radianceScale<=0||spec.radianceScale>100||!Number.isInteger(spec.triangles)||spec.triangles<1)throw Error('Grupo inválido');
   const [loaded,diffuse]=await Promise.all([model(spec.file),spec.diffuse?texture(mobile&&spec.mobileDiffuse?spec.mobileDiffuse:spec.diffuse,true):null]);
   if(manifest.materialMode==='pbr-plus-irradiance'){
    if(diffuse){diffuse.channel=1;diffuse.wrapS=diffuse.wrapT=THREE.ClampToEdgeWrapping;}const directional=await Promise.all(((mobile&&spec.mobileDirectional?spec.mobileDirectional:spec.directional)||[]).map(name=>texture(name,true)));for(const map of directional)map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;let triangles=0;const meshes=[];loaded.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});const cache=new Map();
    for(const o of meshes){if(!o.geometry.attributes.uv1||spec.vertexIrradiance&&!o.geometry.attributes.color)throw Error('Coordenadas de iluminação ausentes');const name=o.material.name;if(!cache.has(name))cache.set(name,await pbrMaterial(name,diffuse,spec.radianceScale,!!spec.vertexIrradiance,spec.atlasRadianceScale||spec.radianceScale,directional));o.material.dispose();o.material=cache.get(name);o.castShadow=o.receiveShadow=true;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}
    if(triangles!==spec.triangles)throw Error('Contagem PBR divergente '+spec.name);root.add(loaded.scene);continue;
   }
   diffuse.flipY=false;diffuse.colorSpace=THREE.SRGBColorSpace;diffuse.anisotropy=mobile?2:8;createdTextures.push(diffuse);
   let normal=null;if(spec.normal){normal=await textures.loadAsync(asset(mobile&&spec.mobileNormal?spec.mobileNormal:spec.normal));normal.flipY=false;normal.colorSpace=THREE.NoColorSpace;normal.anisotropy=mobile?2:8;createdTextures.push(normal);}
   const material=new THREE.MeshStandardMaterial({color:0x000000,emissive:0xffffff,emissiveMap:diffuse,emissiveIntensity:spec.radianceScale,roughness:spec.roughness??.78,metalness:0,normalMap:normal,envMapIntensity:.55});
   material.name='Cycles_difuso_'+spec.name;material.userData.masterWalk=true;createdMaterials.push(material);
   let triangles=0;
   loaded.scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;if(!g.attributes.position||!g.attributes.normal||!g.attributes.uv)throw Error('Malha sem atributos');const n=(g.index?.count||g.attributes.position.count)/3;if(!Number.isInteger(n))throw Error('Índice inválido');triangles+=n;g.computeBoundingBox();if(!Number.isFinite(g.boundingBox.min.x)||!Number.isFinite(g.boundingBox.max.z))throw Error('Bounds inválidos');if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();o.material=material;o.castShadow=true;o.receiveShadow=true;});
   if(triangles!==spec.triangles)throw Error('Contagem de triângulos divergente');root.add(loaded.scene);
  }
  if(manifest.native){const loaded=await model(manifest.native.file);loaded.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});root.add(loaded.scene);}
  // Só troca depois de todos os arquivos/atributos serem conferidos; falhas
  // anteriores preservam integralmente o passeio e seu atlas de iluminação.
  const retired=new Set();for(const id of ids){const object=meshes[id];for(const m of Array.isArray(object.material)?object.material:[object.material])retired.add(m);object.parent.remove(object);object.geometry.dispose();}
  const releaseUnused=wholeScene=>{const usedMaterials=new Set(),usedTextures=new Set();wholeScene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){usedMaterials.add(m);for(const v of Object.values(m))if(v?.isTexture)usedTextures.add(v);}});let freedTextures=0,freedMaterials=0;const freed=new Set();for(const m of retired){if(usedMaterials.has(m))continue;for(const t of Object.values(m))if(t?.isTexture&&!usedTextures.has(t)&&!freed.has(t)){t.dispose();t.image=null;freed.add(t);freedTextures++;}m.dispose();freedMaterials++;}retired.clear();return{freedTextures,freedMaterials};};
  return {root,manifest,releaseUnused,stats:{enabled:true,mode:'blender-surface-diffuse',materialMode:manifest.materialMode,lightingRevision:manifest.lightingRevision,materialRevision:manifest.materialRevision,directionalGroups:manifest.groups.filter(g=>g.directional?.length===3).map(g=>g.name),masterSHA256:manifest.masterSHA256,meshes:manifest.groups.length,replacedSources:ids.length,triangles:manifest.groups.reduce((n,g)=>n+g.triangles,0),resolution:mobile?manifest.mobileResolution:manifest.resolution,source:'Blender/Cycles; caminhada livre',estimatedInternalArea:120}};
 }catch(error){root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const t of createdTextures)t.dispose();for(const m of createdMaterials)m.dispose();throw error;}
}
