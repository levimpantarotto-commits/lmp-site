// Keep the public 1 km² terrain as an honest finite survey window.  Source
// building meshes are combined, so clipping triangles would leave half a
// house in the river; this removes a complete connected component instead.
import * as THREE from 'three';

const keyFor=(p,i)=>`${Math.round(p.getX(i)*1000)},${Math.round(p.getY(i)*1000)},${Math.round(p.getZ(i)*1000)}`;

function components(geometry){
 const p=geometry.attributes.position,index=geometry.index,count=Math.floor((index?.count||p.count)/3);
 const parent=Int32Array.from({length:count},(_,i)=>i),first=new Map();
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent[b]=a;};
 for(let tri=0;tri<count;tri++)for(let corner=0;corner<3;corner++){
  const vertex=index?index.getX(tri*3+corner):tri*3+corner,key=keyFor(p,vertex),prior=first.get(key);
  if(prior===undefined)first.set(key,tri);else join(tri,prior);
 }
 const ids=new Int32Array(count),remap=new Map();let next=0;
 for(let tri=0;tri<count;tri++){const r=root(tri);if(!remap.has(r))remap.set(r,next++);ids[tri]=remap.get(r);}
 return {ids,count:next};
}

/**
 * Removes only whole connected building/detail components outside the DEM.
 * `root` must be the architecture GLTF root, not the whole scene.
 */
const horizontalDistance=(box,x,z)=>{
 const dx=x<box.min[0]?box.min[0]-x:x>box.max[0]?x-box.max[0]:0;
 const dz=z<box.min[2]?box.min[2]-z:z>box.max[2]?z-box.max[2]:0;
 return dx*dx+dz*dz;
};
function featureIndex(buildings,min,max,epsilon){
 return (buildings||[]).map(feature=>({
  ...feature,
  outside:feature.bounds.min[0]<min-epsilon||feature.bounds.max[0]>max+epsilon||feature.bounds.min[2]<min-epsilon||feature.bounds.max[2]>max+epsilon
 })).filter(feature=>feature.outside);
}
function nearestFeature(features,x,z,margin){
 let match=null,distance=Infinity;
 for(const feature of features){
  const b=feature.bounds,inside=x>=b.min[0]-margin&&x<=b.max[0]+margin&&z>=b.min[2]-margin&&z<=b.max[2]+margin;
  if(!inside)continue;
  const d=horizontalDistance(b,x,z);
  if(d<distance){match=feature;distance=d;}
 }
 return match;
}

export function keepBuildingsWithinTerrain(root,{min=-500,max=500,epsilon=.001,buildings=[]}={}){
 if(!root)throw new Error('Architecture root is required for terrain-boundary filtering.');
 root.updateMatrixWorld(true);
 const allFeatures=(buildings||[]).map(feature=>({...feature,outside:feature.bounds.min[0]<min-epsilon||feature.bounds.max[0]>max+epsilon||feature.bounds.min[2]<min-epsilon||feature.bounds.max[2]>max+epsilon})),removedFeatures=featureIndex(buildings,min,max,epsilon),removedIds=new Set(removedFeatures.map(feature=>feature.id)),result={meshes:0,components:0,kept:0,removed:0,trianglesRemoved:0,bounds:{min,max},featuresRemoved:removedFeatures.length,featureIds:removedFeatures.map(feature=>feature.id),affected:[]};
 const point=new THREE.Vector3();
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;
  const source=mesh.geometry,p=source.attributes.position,index=source.index,triangles=Math.floor((index?.count||p.count)/3);
  if(!triangles)return;
  const {ids,count}=components(source),inside=Array.from({length:count},()=>true),bounds=Array.from({length:count},()=>({minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity}));
  for(let tri=0;tri<triangles;tri++)for(let corner=0;corner<3;corner++){
   const vertex=index?index.getX(tri*3+corner):tri*3+corner;
   point.fromBufferAttribute(p,vertex).applyMatrix4(mesh.matrixWorld);
   const component=bounds[ids[tri]];component.minX=Math.min(component.minX,point.x);component.maxX=Math.max(component.maxX,point.x);component.minZ=Math.min(component.minZ,point.z);component.maxZ=Math.max(component.maxZ,point.z);
   if(point.x<min-epsilon||point.x>max+epsilon||point.z<min-epsilon||point.z>max+epsilon)inside[ids[tri]]=false;
  }
  // Meshes in the source are split into roof, wall and detail primitives.
  // Associate every primitive with an edge feature by its centre and remove the
  // complete feature's parts, even when a particular roof triangle is inside.
  for(let component=0;component<count;component++){
   const box=bounds[component],feature=nearestFeature(allFeatures,(box.minX+box.maxX)/2,(box.minZ+box.maxZ)/2,.65);
   if(feature&&removedIds.has(feature.id))inside[component]=false;
  }
  const slots=Math.max(1,Array.isArray(mesh.material)?mesh.material.length:1),buckets=Array.from({length:slots},()=>[]);let removedTriangles=0;
  for(let tri=0;tri<triangles;tri++){
   if(!inside[ids[tri]]){removedTriangles++;continue;}
   const offset=tri*3,group=source.groups.find(candidate=>offset>=candidate.start&&offset<candidate.start+candidate.count),slot=Math.min(slots-1,group?.materialIndex||0);
   for(let corner=0;corner<3;corner++)buckets[slot].push(index?index.getX(offset+corner):offset+corner);
  }
  result.meshes++;result.components+=count;result.kept+=inside.filter(Boolean).length;result.removed+=count-inside.filter(Boolean).length;result.trianglesRemoved+=removedTriangles;
  if(!removedTriangles)return;
  result.affected.push({name:mesh.name||'sem nome',components:count-inside.filter(Boolean).length,triangles:removedTriangles});
  const next=source.clone(),kept=[];next.clearGroups();
  for(let slot=0;slot<buckets.length;slot++)if(buckets[slot].length){const start=kept.length;for(const vertex of buckets[slot])kept.push(vertex);next.addGroup(start,buckets[slot].length,slot);}
  next.setIndex(kept);
  next.computeBoundingBox();next.computeBoundingSphere();mesh.geometry=next;source.dispose();
 });
 return result;
}

// A thin terrain sheet disappears when the camera goes below its underside.
// This skirt is deliberately vertical and neutral: it only masks the cut of
// the public DEM; it does not add unmeasured land beyond the 1 km² survey.
export function addTerrainSkirt(scene,ground,n,{min=-500,max=500,bottom=-20,step=2}={}){
 if(!scene||!ground||ground.length!==n*n)throw new Error('Terrain skirt requires the complete square DEM.');
 const stride=n>2?Math.max(1,Math.floor(step)):1,edge=[],line=[];
 for(let i=0;i<n;i+=stride)line.push(i);if(line.at(-1)!==n-1)line.push(n-1);
 for(const c of line)edge.push(c);
 for(const r of line.slice(1))edge.push(r*n+n-1);
 for(const c of line.slice(0,-1).reverse())edge.push((n-1)*n+c);
 for(const r of line.slice(1,-1).reverse())edge.push(r*n);
 const positions=new Float32Array(edge.length*6),indices=[];
 for(let i=0;i<edge.length;i++){
  const cell=edge[i],r=Math.floor(cell/n),c=cell%n,x=min+(max-min)*c/(n-1),z=min+(max-min)*r/(n-1),base=i*6;
  positions.set([x,ground[cell],z,x,bottom,z],base);const next=(i+1)%edge.length,a=i*2,b=a+1,d=next*2,e=d+1;
  indices.push(a,b,d,d,b,e);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x39362d,roughness:1,metalness:0,side:THREE.DoubleSide}));
 mesh.name='Saia vertical do recorte do terreno (limite do DEM)';mesh.receiveShadow=true;scene.add(mesh);
 return mesh;
}
