// Única lista de planos, incluindo as coberturas baixas. Não é levantamento.
import {proportionStudy,upperWidth} from './proportion-study.js';
export const roofPlanes=[
 {id:'cobertura-principal',x:upperWidth/2,z:4.5,w:upperWidth+1.2,d:10.1,front:5.95,back:6.55},
 // O alpendre termina ANTES da parede frontal. Antes avançava .9m no mezanino.
 {id:'alpendre-frontal',x:2.9,z:-1.075,w:7,d:1.85,front:2.72,back:3.313},
 {id:'ala-direita',x:8,z:1.5,w:4.3,d:4.2,front:3.05,back:4.45},
 {id:'ala-direita-retorno',x:8,z:5.9,w:4.3,d:4.6,front:4.45,back:3.05},
 {id:'ala-posterior',x:upperWidth/2,z:11,w:upperWidth+.5,d:4.4,front:6.55,back:6.15},
 ...(proportionStudy?[{id:'faixa-terrea-lateral',x:(upperWidth+5.8)/2,z:6.6,w:5.8-upperWidth,d:13.2,front:3.24,back:3.30}]:[])
];
export const overlaps=(a,b)=>Math.min(a[2],b[2])-Math.max(a[0],b[0])>.001&&Math.min(a[3],b[3])-Math.max(a[1],b[1])>.001;
export function secondaryRoofs(rooms,floors){
 return rooms.filter(r=>['banheiro1','banheiro2','hall','quarto15'].includes(r.id)).flatMap(r=>{
  const[a,b,c,d]=r.rect,rect=[a,b,c,d];
  // Teto/laje permanece abaixo do piso; telhado NUNCA dentro do piso superior.
  if(floors.some(f=>f.level>r.level&&overlaps(rect,f.rect)))return [];
  return [{id:`baixa-${r.id}`,x:(a+c)/2,z:(b+d)/2,w:c-a,d:d-b,front:3.3-(d-b)*.035,back:3.3+(d-b)*.035}];
 });
}
export const roofRect=r=>[r.x-r.w/2,r.z-r.d/2,r.x+r.w/2,r.z+r.d/2];
export function roofHeight(r,z){return r.front+(r.back-r.front)*(z-(r.z-r.d/2))/r.d;}
export function roofIntrusions(roofs,floors){
 const issues=[];
 for(const roof of roofs)for(const floor of floors.filter(f=>f.level>0)){
  const rect=roofRect(roof);if(!overlaps(rect,floor.rect))continue;
  const lo=Math.max(rect[1],floor.rect[1]),hi=Math.min(rect[3],floor.rect[3]),height=Math.min(roofHeight(roof,lo),roofHeight(roof,hi))-.13;
  if(height<floor.level+2.05)issues.push({roof:roof.id,level:floor.level,clearance:height-floor.level});
 }
 return issues;
}
