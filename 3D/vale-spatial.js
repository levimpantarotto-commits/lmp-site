// Match the two actual triangles of each displayed DEM cell. A bilinear
// height can fall below/above that surface, particularly at roadside banks.
export function createTerrainSampler(values,n,step=2){
 return (x,z)=>{
  const u=Math.max(0,Math.min(n-1-1e-6,x+500)),v=Math.max(0,Math.min(n-1-1e-6,z+500));
  const c=Math.floor(u/step)*step,r=Math.floor(v/step)*step,tx=(u-c)/step,tz=(v-r)/step;
  const a=values[r*n+c],b=values[r*n+c+step],c0=values[(r+step)*n+c],d=values[(r+step)*n+c+step];
  return tx+tz<=1?a+(b-a)*tx+(c0-a)*tz:d+(c0-d)*(1-tx)+(b-d)*(1-tz);
 };
}

// Split a surface against every intersected DEM cell and its diagonal.
// Every output triangle then lies on one terrain plane instead of cutting
// through a ridge between its sampled corners. UVs are interpolated as well.
export function conformRibbon(positions,uvs,indices,sample,height,step=2){
 const out=[],uv=[],index=[],vertices=new Map();
 function clip(poly,distance){
  const result=[];if(!poly.length)return result;
  let a=poly[poly.length-1],da=distance(a);
  for(const b of poly){const db=distance(b),ina=da>=-1e-9,inb=db>=-1e-9;
   if(ina!==inb){const t=da/(da-db);result.push(a.map((v,k)=>v+(b[k]-v)*t));}
   if(inb)result.push(b);a=b;da=db;
  }return result;
 }
 function vertex(p){const key=p.map(v=>Math.round(v*1e6)).join(',');if(vertices.has(key))return vertices.get(key);const id=out.length/3;out.push(p[0],sample(p[0],p[1])+height,p[1]);uv.push(p[2],p[3]);vertices.set(key,id);return id;}
 function fan(poly){for(let j=1;j<poly.length-1;j++){
  const a=poly[0],b=poly[j],c=poly[j+1],area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  if(Math.abs(area)>1e-9)index.push(vertex(a),vertex(b),vertex(c));
 }}
 for(let i=0;i<indices.length;i+=3){
  const tri=indices.slice(i,i+3).map(k=>[positions[k*3],positions[k*3+2],uvs[k*2],uvs[k*2+1]]);
  const minX=Math.floor((Math.min(...tri.map(p=>p[0]))+500)/step),maxX=Math.floor((Math.max(...tri.map(p=>p[0]))+500-1e-9)/step);
  const minZ=Math.floor((Math.min(...tri.map(p=>p[1]))+500)/step),maxZ=Math.floor((Math.max(...tri.map(p=>p[1]))+500-1e-9)/step);
  for(let rz=minZ;rz<=maxZ;rz++)for(let cx=minX;cx<=maxX;cx++){
   const x=cx*step-500,z=rz*step-500;
   let poly=clip(tri,p=>p[0]-x);poly=clip(poly,p=>x+step-p[0]);poly=clip(poly,p=>p[1]-z);poly=clip(poly,p=>z+step-p[1]);
   if(poly.length<3)continue;
   fan(clip(poly,p=>x+z+step-p[0]-p[1]));fan(clip(poly,p=>p[0]+p[1]-x-z-step));
  }
 }
 return {positions:out,uvs:uv,indices:index};
}

// Geometry-driven clearance: never infer the road from a color in the photo.
// The input polylines are sampled from the same curves used for the road mesh.
export function createRoadExclusion(routes,cellSize=16){
 const bins=new Map();let maxHalfWidth=0,segmentCount=0;
 for(const route of routes){
  maxHalfWidth=Math.max(maxHalfWidth,route.halfWidth);
  for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i],segment={a,b,halfWidth:route.halfWidth};segmentCount++;
   const x0=Math.floor(Math.min(a[0],b[0])/cellSize),x1=Math.floor(Math.max(a[0],b[0])/cellSize);
   const z0=Math.floor(Math.min(a[1],b[1])/cellSize),z1=Math.floor(Math.max(a[1],b[1])/cellSize);
   for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
    const key=`${x},${z}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(segment);
   }
  }
 }
 const intersects=(x,z,margin=0)=>{
  const radius=maxHalfWidth+margin,x0=Math.floor((x-radius)/cellSize),x1=Math.floor((x+radius)/cellSize),z0=Math.floor((z-radius)/cellSize),z1=Math.floor((z+radius)/cellSize);
  for(let gz=z0;gz<=z1;gz++)for(let gx=x0;gx<=x1;gx++)for(const s of bins.get(`${gx},${gz}`)||[]){
   const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],length2=dx*dx+dz*dz;
   const t=length2?Math.max(0,Math.min(1,((x-s.a[0])*dx+(z-s.a[1])*dz)/length2)):0;
   const px=x-s.a[0]-t*dx,pz=z-s.a[1]-t*dz;if(px*px+pz*pz<=(s.halfWidth+margin)**2)return true;
  }
  return false;
 };
 intersects.segmentCount=segmentCount;return intersects;
}
