// Alternativa isolada: nunca ativa sem ?study=proportion-v2.
// Relações extraídas das fotos, não levantamento. Mantém o total de120m²,
// redistribuindo-o: núcleo social mais largo; ligações posteriores compactas.
import {exteriorReference as exterior} from './exterior-reference.js';
export const proportionStudy=true; // Rota isolada do estudo, nunca a visita publicada.
const piece=(v,knots)=>{for(let i=1;i<knots.length;i++)if(v<knots[i][0]){const[a,b]=knots[i-1],[c,d]=knots[i];return b+(v-a)*(d-b)/(c-a);}const[a,b]=knots.at(-2),[c,d]=knots.at(-1);return d+(v-c)*(d-b)/(c-a);};
// A largura adicional está no corredor/social, não na profundidade da pia.
const xKnots=[[-40,-40],[0,0],[1.5,1.5],[4.9,6.43],[5.8,7.33],[12.5,13.159],[40,40.659]];
const zKnots=[[-40,-40],[0,0],[3.2,3.2],[8.85,9.528],[9,9.678],[13,12.678],[40,39.678]];
export const planX=x=>proportionStudy?piece(x,xKnots):x;
export const planZ=z=>proportionStudy?piece(z,zKnots):z;
export const planRect=r=>[planX(r[0]),planZ(r[1]),planX(r[2]),planZ(r[3])];
export const derivative=(axis,value)=>proportionStudy?((axis==='x'?planX:planZ)(value+.00001)-(axis==='x'?planX:planZ)(value-.00001))/.00002:1;
export const terrace={level:1.8,rect:[-4,2.5,0,11.5],stairs:{rect:[-2.3,-1.7,-.35,2.5],from:0,to:1.8}};
export function applyProportionStudy(rooms,floors,walls,furniture){
 if(!proportionStudy)return;
 walls[0].openings.find(o=>o.type==='door').style='porch-glass';
 Object.assign(rooms.find(r=>r.id==='jardim'),{rect:[...exterior.garden],spawn:[exterior.arrival.x,0,exterior.arrival.z],yaw:exterior.arrival.yaw});
 Object.assign(rooms.find(r=>r.id==='quintalDireito'),{rect:[...exterior.side],spawn:[10.45,0,4],note:'Faixa junto à cerca verde observada; largura estimada.'});
 for(const f of floors.filter(f=>f.material==='grass'))f.rect=[...(f.rect[1]<0?exterior.garden:exterior.side)];
 const deck=rooms.find(r=>r.id==='deck');Object.assign(deck,{name:'Terraço lateral',rect:[...terrace.rect],level:terrace.level,spawn:[-2,terrace.level,6.5],note:'Escada lateral → terraço: relação visível nas fotos 04/19–22. Desnível de 1,80 m é hipótese, não cota.'});
 const deckFloor=floors.find(f=>f.material==='deck');Object.assign(deckFloor,{rect:[...terrace.rect],level:terrace.level});
 for(const w of walls.filter(w=>w.a[0]<0&&w.b[0]<=0)){w.base=terrace.level;w.a[1]+=2.5;w.b[1]+=2.5;}
 // A porta lateral baixa era uma conexão inventada e dava no vazio do deck.
 walls[1].openings=walls[1].openings.filter(o=>o.type!=='door');
 for(const opening of walls[3].openings){opening.style='leaded-glass';opening.initialOpen=false;}
 // Foto01 mostra parapeito e vidraças laterais; não apenas uma janelinha.
 walls[21].openings[0].bottom=.72;
 walls[22].openings=[{from:.15,to:3.65,bottom:.72,top:2.65,type:'window',panels:3},{from:4.45,to:8.7,bottom:1.9,top:2.65,type:'window',panels:3}];
 // Meia-parede junto ao banco não invade o corredor da porta frontal.
 const divider=walls.at(-1);if(divider.height===1.48)divider.b[1]=3.0;
 Object.assign(rooms.find(r=>r.id==='cozinha'),{rect:[1.8,4.4,5.8,9],spawn:[4.2,0,5.45],note:'Cozinha integrada ampliada pela redistribuição do plano. Fotos 06/07/08/11; sem cotas medidas.'});
 Object.assign(rooms.find(r=>r.id==='hall'),{photo:6,note:'Ligação posterior ainda estimada. A foto12 é banheiro, não evidência de um hall.'});
 // Os detalhes do deck deixam de colidir no chão do jardim.
 furniture.push(...[
  [-2.72,7.72,-1.32,8.92],[-3.23,7.85,-2.73,8.75],[-1.30,7.82,-.80,8.72],
  [-3.68,4.32,-3.42,4.58],[-.98,4.32,-.72,4.58],[-3.68,9.98,-3.42,10.24],[-.98,9.98,-.72,10.24],[-3.35,4.72,-1.05,5.32]
 ].map((rect,i)=>({id:'terrace-obstacle-'+i,rect,level:terrace.level,kind:'kitchen-footprint'})));
}

export function buildStudyStructure(THREE,scene,M,walls,roofPlanes,box){
 if(!proportionStudy)return;
 // Fechamentos sob a cobertura: o modelo antigo terminava emY6 e deixava
 // tiras abertas até a água inclinada. A face continua seguindo o telhado.
 const main=roofPlanes.find(r=>r.id==='cobertura-principal'),rear=roofPlanes.find(r=>r.id==='ala-posterior');
 const top=z=>{const r=z>9?rear:main;return r.front+(r.back-r.front)*(z-(r.z-r.d/2))/r.d-.14;};
 for(const w of walls.filter(w=>w.base===3)){
  const y=w.base+w.height,segments=Math.max(1,Math.ceil(Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])/1.5));
  for(let i=0;i<segments;i++){
   const t=i/segments,u=(i+1)/segments,a=[w.a[0]+(w.b[0]-w.a[0])*t,w.a[1]+(w.b[1]-w.a[1])*t],b=[w.a[0]+(w.b[0]-w.a[0])*u,w.a[1]+(w.b[1]-w.a[1])*u];
   const ha=Math.max(0,top(a[1])-y),hb=Math.max(0,top(b[1])-y);if(Math.max(ha,hb)<.005)continue;
   const len=Math.hypot(b[0]-a[0],b[1]-a[1]),shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(len,0);shape.lineTo(len,hb);shape.lineTo(0,ha);shape.closePath();
   const geometry=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false});geometry.translate(0,0,-.09);
   const n=new THREE.Mesh(geometry,M[w.material]);n.position.set(a[0],y,a[1]);n.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);n.castShadow=n.receiveShadow=true;n.userData.studyPart='roof-closure';scene.add(n);
  }
 }
 // Onze degraus na lateral, observados na foto04. Altura é estimada.
 const s=terrace.stairs,[a,b,c,d]=s.rect,count=11;
 const stairStone=(M.basinStone||M.stone).clone();stairStone.color.set(0xbcb8a5);stairStone.roughness=.95;stairStone.normalScale?.set(.28,.28);
 for(let i=0;i<count;i++){const h=s.to*(i+1)/count,z=b+(i+.5)*(d-b)/count;box((a+c)/2,h/2,z,c-a,h,(d-b)/count+.015,stairStone);}
 // Fechamento sob o terraço elevado; não acrescentar uma casa avulsa.
 box(-3.92,.9,7,.16,1.8,9,M.stone);box(-2,.9,11.48,4,1.8,.16,M.stone);
}
