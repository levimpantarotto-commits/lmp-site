// Referência informada no anúncio, não levantamento cadastral. O frame XZ
// calibra uma hipótese fotográfica; Y, olhos, portas e alturas não são inflados.
import {proportionStudy,planX,planZ,planRect,derivative} from './proportion-study.js';
export const areaReference={target:120,unit:'m²',source:'https://imobiliariapraiadorosa.com.br/property/linda-casa-no-rosa-com-matricula~202',classification:proportionStudy?'120 m² internos: premissa solicitada por Levi; anúncio informa área construída, não útil':'área construída informada; distribuição e cotas estimadas',basis:proportionStudy?'internal':'gross',wallThickness:.18};
const inside=(x,z,r)=>x>r[0]&&x<r[2]&&z>r[1]&&z<r[3];
export function unionArea(areas,wallRects=[],subtract=[]){
 const rects=[...areas.flatMap(a=>[a.rect,...(a.holes||[])]),...wallRects,...subtract];
 const xs=[...new Set(rects.flatMap(r=>[r[0],r[2]]))].sort((a,b)=>a-b),zs=[...new Set(rects.flatMap(r=>[r[1],r[3]]))].sort((a,b)=>a-b);let area=0;
 for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){const x=(xs[i-1]+xs[i])/2,z=(zs[j-1]+zs[j])/2;
  if((areas.some(a=>inside(x,z,a.rect)&&!(a.holes||[]).some(h=>inside(x,z,h)))||wallRects.some(r=>inside(x,z,r)))&&!subtract.some(r=>inside(x,z,r)))area+=(xs[i]-xs[i-1])*(zs[j]-zs[j-1]);
 }return area;
}
export function createPlanCalibration(floors,walls,target=areaReference.target){
 const internal=floors.filter(f=>['tile','wood','floorGlass'].includes(f.material)).map(f=>({...f,rect:planRect(f.rect),holes:(f.holes||[]).map(planRect)}));
 const rows=[...new Set(internal.map(f=>f.level))].map(level=>{
  const parts=internal.filter(f=>f.level===level),half=areaReference.wallThickness/2;
  // Muros/deck não integram o perímetro construído do estudo.
  const boundary=walls.filter(w=>w.base===level&&w.a[0]>=0&&w.b[0]>=0&&w.a[1]>=0&&w.b[1]>=0).map(w=>[Math.min(w.a[0],w.b[0])-half,Math.min(w.a[1],w.b[1])-half,Math.max(w.a[0],w.b[0])+half,Math.max(w.a[1],w.b[1])+half]);
  const solids=walls.filter(w=>w.base===level&&w.a[0]>=0&&w.b[0]>=0&&w.a[1]>=0&&w.b[1]>=0).flatMap(w=>{
   const length=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]),dx=(w.b[0]-w.a[0])/length,dz=(w.b[1]-w.a[1])/length;
   const doors=(w.openings||[]).filter(o=>o.type==='door'&&o.bottom===0).sort((a,b)=>a.from-b.from),out=[];let start=0;
   for(const o of [...doors,{from:length,to:length}]){if(o.from>start){const a=[w.a[0]+dx*start,w.a[1]+dz*start],b=[w.a[0]+dx*o.from,w.a[1]+dz*o.from];out.push([Math.min(a[0],b[0])-(dx===0?half:0),Math.min(a[1],b[1])-(dz===0?half:0),Math.max(a[0],b[0])+(dx===0?half:0),Math.max(a[1],b[1])+(dz===0?half:0)]);}start=Math.max(start,o.to);}return out.map(planRect);
  });
  return {level,netDesign:unionArea(parts,[],proportionStudy?solids:[]),floorDesign:unionArea(parts),grossDesign:unionArea(parts,boundary.map(planRect))};
 });
 const grossDesign=rows.reduce((n,r)=>n+r.grossDesign,0),netDesign=rows.reduce((n,r)=>n+r.netDesign,0),basis=areaReference.basis,scale=Math.sqrt(target/(basis==='internal'?netDesign:grossDesign));
 if(!Number.isFinite(scale)||scale<=0)throw Error('Área inválida para calibrar');
 return {scale,target,basis,grossDesign,netDesign,gross:grossDesign*scale*scale,net:netDesign*scale*scale,levels:rows.map(r=>({...r,net:r.netDesign*scale*scale,gross:r.grossDesign*scale*scale})),convention:basis==='internal'?'120 m² de piso interno livre de paredes; portas transitáveis incluídas; vão da escada, deck, pátio e jardim excluídos. Área construída bruta informada separadamente. Premissa do estudo, não levantamento.':'união dos pisos internos + projeção das paredes; vazio da escada descontado; deck/pátio/jardim excluídos',reference:areaReference};
}
export function calibrateNode(node,scale){
 if(node.userData?.metricFrameApplied)throw Error('Calibração repetida');
 if(node.isMesh&&!node.isInstancedMesh&&!node.isReflector){
  // Escala em eixos do MUNDO: escala local deformaria Y de um telhado
  // inclinado. Clonar também preserva geometrias compartilhadas das telhas.
  node.updateMatrix();const transform=new node.matrix.constructor().makeScale(scale,1,scale).multiply(node.matrix);
  node.geometry=node.geometry.clone().applyMatrix4(transform);
  if(proportionStudy){const p=node.geometry.attributes.position,n=node.geometry.attributes.normal;for(let i=0;i<p.count;i++){const x=p.getX(i)/scale,z=p.getZ(i)/scale;p.setX(i,planX(x)*scale);p.setZ(i,planZ(z)*scale);const nx=n.getX(i)/derivative('x',x),ny=n.getY(i),nz=n.getZ(i)/derivative('z',z),len=Math.hypot(nx,ny,nz)||1;n.setXYZ(i,nx/len,ny/len,nz/len);}p.needsUpdate=n.needsUpdate=true;node.geometry.computeBoundingSphere();}
  node.position.set(0,0,0);node.quaternion.identity();node.scale.set(1,1,1);
 }else{
  if(Math.abs(node.rotation.x)+Math.abs(node.rotation.z)>1e-8)throw Error('Frame dinâmico inclinado não suportado');
  const x=node.position.x,z=node.position.z;node.position.x=planX(x)*scale;node.position.z=planZ(z)*scale;if(node.isPointLight&&node.distance>0)node.distance*=scale;
  if(!node.isLight){node.scale.x*=scale*derivative('x',x);node.scale.z*=scale*derivative('z',z);}
 }
 node.userData.metricFrameApplied=true;
}
export const metricPosition=(p,scale)=>({x:planX(p.x)*scale,y:p.y,z:planZ(p.z)*scale});
