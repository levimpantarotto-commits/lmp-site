// Fotos06/10/11: placas alinhadas, rejunte fino e discreto. Passo de60cm é
// hipótese visual, não medida do imóvel. Reusa o mesmo PBR CC0 interior_tiles,
// amostrando o miolo de uma placa; não carrega/edita outro bitmap.
import {planX,planZ,planRect,derivative} from './proportion-study.js';
export function buildTileFloor(T,scene,M,floors,scale){
 const tileSize=.60,joint=.0025,bevel=.001,positions=[],normals=[],uvs=[];
 const inverse=(value,fn)=>{let a=-100,b=100;for(let k=0;k<45;k++){const m=(a+b)/2;if(fn(m)<value)a=m;else b=m;}return(a+b)/2;};
 const invUV=M.tile.map?(M.tile.map.updateMatrix(),M.tile.map.matrix.clone().invert()):new T.Matrix3();
 const emit=(v,n,uv)=>{const x=inverse(v[0]/scale,planX),z=inverse(v[2]/scale,planZ);positions.push(x,v[1],z);const nn=new T.Vector3(n[0]*scale*derivative('x',x),n[1],n[2]*scale*derivative('z',z)).normalize();normals.push(nn.x,nn.y,nn.z);const q=new T.Vector2(...uv).applyMatrix3(invUV);uvs.push(q.x,q.y);};
 let tiles=0;
 for(const f of floors.filter(f=>f.material==='tile')){
  if(f.holes?.length)throw Error('Cerâmica com vão exige recorte específico; não descartar placas inteiras.');
  const r=planRect(f.rect).map(v=>v*scale),holes=(f.holes||[]).map(h=>planRect(h).map(v=>v*scale));
  for(let iz=Math.floor(r[1]/tileSize);iz<Math.ceil(r[3]/tileSize);iz++)for(let ix=Math.floor(r[0]/tileSize);ix<Math.ceil(r[2]/tileSize);ix++){
   const x0=Math.max(r[0],ix*tileSize+joint/2),x1=Math.min(r[2],(ix+1)*tileSize-joint/2),z0=Math.max(r[1],iz*tileSize+joint/2),z1=Math.min(r[3],(iz+1)*tileSize-joint/2);
   if(x1-x0<.003||z1-z0<.003||holes.some(h=>x0<h[2]&&x1>h[0]&&z0<h[3]&&z1>h[1]))continue;
   const angle=((ix*13+iz*7)%4)*Math.PI/2,uv=(x,z)=>{const a=(x-ix*tileSize)/tileSize-.5,b=(z-iz*tileSize)/tileSize-.5,u=a*Math.cos(angle)-b*Math.sin(angle),v=a*Math.sin(angle)+b*Math.cos(angle);return[.5+(u-v)*.28,.5+(u+v)*.28];};
   const edge=[[x0,z0],[x0,z1],[x1,z1],[x1,z0]],inner=[[x0+bevel,z0+bevel],[x0+bevel,z1-bevel],[x1-bevel,z1-bevel],[x1-bevel,z0+bevel]];
   const triangle=(a,b,c)=>{const n=new T.Vector3().subVectors(new T.Vector3(...b),new T.Vector3(...a)).cross(new T.Vector3().subVectors(new T.Vector3(...c),new T.Vector3(...a))).normalize().toArray();for(const p of[a,b,c])emit(p,n,uv(p[0],p[2]));};
   const top=inner.map(([x,z])=>[x,f.level+.002,z]);triangle(top[0],top[1],top[2]);triangle(top[0],top[2],top[3]);
   for(let k=0;k<4;k++){const j=(k+1)%4,a=[edge[k][0],f.level+.0005,edge[k][1]],b=[edge[j][0],f.level+.0005,edge[j][1]];triangle(a,b,top[j]);triangle(a,top[j],top[k]);}
   tiles++;
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeBoundingBox();g.computeBoundingSphere();
 const mesh=new T.Mesh(g,M.tile);mesh.name='ceramic-fine-joints';mesh.receiveShadow=true;mesh.castShadow=false;scene.add(mesh);
 return{mesh,tiles,triangles:positions.length/9,tileSize,joint,classification:'passo e rejunte estimados pelas fotos, não aferidos'};
}
