import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';

/** Illustrated industrial retrofit only. Keeps measured shells and roofs intact. */
export async function addFacadeDetails({scene,buildings,renderer}) {
 const AS='./assets/maquete/';
 const [asset,meta]=await Promise.all([
  new GLTFLoader().loadAsync(AS+'fachadas-detalhadas.glb'),
  fetch(AS+'fachadas-detalhadas.json').then(r=>{if(!r.ok)throw Error('Facade manifest');return r.json();})
 ]);
 const planes=meta.planes.map(p=>({...p,n:new THREE.Vector3(...p.normal),t:new THREE.Vector3(...p.tangent)}));
 let removedTriangles=0;
 buildings?.updateMatrixWorld(true);
 buildings?.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const materialName=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(m=>m.name).join(' ');
  // Material names are localized by finishArchitecture; mesh names retain the
  // original semantic identity. Otherwise old windows survive behind the retrofit.
  if(!/Glass|Frame|Sill|Door|Gutter|Wheel alloys/i.test(`${mesh.name} ${materialName}`))return;
  const source=mesh.geometry,positions=source.attributes.position,index=source.index,keep=[];
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),centre=new THREE.Vector3();
  const count=index?.count||positions.count;
  for(let i=0;i<count;i+=3){
   const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2;
   a.fromBufferAttribute(positions,ia).applyMatrix4(mesh.matrixWorld);
   b.fromBufferAttribute(positions,ib).applyMatrix4(mesh.matrixWorld);
   c.fromBufferAttribute(positions,ic).applyMatrix4(mesh.matrixWorld);
   centre.copy(a).add(b).add(c).multiplyScalar(1/3);
   const replace=planes.some(p=>{
    const depth=centre.dot(p.n)-p.distance,along=centre.dot(p.t);
    return depth>=p.hide_legacy_depth_m[0]&&depth<=p.hide_legacy_depth_m[1]&&along>=p.left-.3&&along<=p.right+.3&&centre.y>=p.bottom-.3&&centre.y<=p.top+.3;
   });
   if(replace)removedTriangles++;else keep.push(ia,ib,ic);
  }
  if(keep.length<count){const replacement=source.clone();replacement.setIndex(keep);replacement.computeBoundingSphere();mesh.geometry=replacement;source.dispose();}
 });
 asset.scene.name='Industrial finishes / illustrative Poly Haven modules';
 asset.scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
  for(const m of (Array.isArray(o.material)?o.material:[o.material])){
   m.envMapIntensity=.65;
   for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key])m[key].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  }
 });
 scene.add(asset.scene);
 const p=planes[0],base=new THREE.Vector3(...p.base_center),centre=base.clone().add(new THREE.Vector3(0,Math.min(1.7,p.height*.48),0));
 const eye=base.clone().addScaledVector(p.n,18).addScaledVector(p.t,7).add(new THREE.Vector3(0,1.8,0));
 return {group:asset.scene,meta,removedTriangles,view:{p:eye.toArray(),t:centre.toArray(),f:48}};
}
