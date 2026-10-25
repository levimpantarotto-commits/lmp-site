// Small, anchored changes to the existing photographed leaves. UVs and the
// attachment vertex are preserved; pots and woody branches never pass here.
export function varyLeafGeometry(T,geometry,seed=1){
 const g=geometry.clone(),p=g.attributes.position,n=p.count,parent=Int32Array.from({length:n},(_,i)=>i);
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
 const indices=g.index?.array||Uint32Array.from({length:n},(_,i)=>i);
 for(let i=0;i<indices.length;i+=3){join(indices[i],indices[i+1]);join(indices[i],indices[i+2]);}
 const groups=new Map();for(let i=0;i<n;i++){const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(i);}
 const rand=i=>{const v=Math.sin((i+seed*971)*12.9898)*43758.5453;return v-Math.floor(v);};
 const anchor=new T.Vector3(),v=new T.Vector3(),long=new T.Vector3(),axis=new T.Vector3(),q=new T.Quaternion(),up=new T.Vector3(0,1,0);
 let components=0,maxMovement=0;
 for(const [id,vertices]of groups){
  if(vertices.length<3||vertices.length>1000)continue;
  let root=vertices[0],radius=Infinity;
  for(const i of vertices){const r=p.getX(i)**2+p.getZ(i)**2;if(r<radius){root=i;radius=r;}}
  anchor.fromBufferAttribute(p,root);let far=0;
  for(const i of vertices){v.fromBufferAttribute(p,i).sub(anchor);if(v.lengthSq()>far){far=v.lengthSq();long.copy(v);}}
  if(far<1e-12)continue;
  long.normalize();axis.crossVectors(long,up);if(axis.lengthSq()<.001)axis.set(1,0,0);else axis.normalize();
  q.setFromAxisAngle(axis,(rand(id+7)-.35)*.28);
  const length=.92+rand(id+13)*.16,width=.80+rand(id+17)*.37;
  for(const i of vertices){
   v.fromBufferAttribute(p,i).sub(anchor);const along=v.dot(long),old=v.clone();
   v.multiplyScalar(width).addScaledVector(long,along*(length-width)).applyQuaternion(q);
   maxMovement=Math.max(maxMovement,v.distanceTo(old));v.add(anchor);p.setXYZ(i,v.x,v.y,v.z);
  }
  components++;
 }
 p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.leafVariation={seed,components,maxMovement,anchored:true};return g;
}
