// Alternativa isolada: nunca ativa sem ?study=proportion-v2.
// Relações extraídas das fotos, não levantamento. Premissa atual:120m²
// INTERNOS somando pisos. Paredes/exteriores discriminados, não incluídos.
import {exteriorReference as exterior} from './exterior-reference.js';
export const proportionStudy=true; // Rota isolada do estudo, nunca a visita publicada.
const piece=(v,knots)=>{for(let i=1;i<knots.length;i++)if(v<knots[i][0]){const[a,b]=knots[i-1],[c,d]=knots[i];return b+(v-a)*(d-b)/(c-a);}const[a,b]=knots.at(-2),[c,d]=knots.at(-1);return d+(v-c)*(d-b)/(c-a);};
// A largura adicional está no corredor/social, não na profundidade da pia.
// Fotos06/07/11: alargar a faixa LIVRE entre o jantar e a bancada, não
// engrossar pia, cadeiras ou banco. A ala posterior estimada cede profundidade.
// Manter o lado observado do banco até x4.25 evita inflar o U inteiro.
const xKnots=[[-40,-40],[0,0],[1.5,1.5],[4.25,5.4875],[4.9,7.18],[5.8,8.08],[12.5,13.909],[40,41.409]];
const zKnots=[[-40,-40],[0,0],[3.2,3.2],[8.85,10.0],[9,10.15],[13,13.15],[40,40.15]];
export const planX=x=>proportionStudy?piece(x,xKnots):x;
export const planZ=z=>proportionStudy?piece(z,zKnots):z;
export const planRect=r=>[planX(r[0]),planZ(r[1]),planX(r[2]),planZ(r[3])];
export const derivative=(axis,value)=>proportionStudy?((axis==='x'?planX:planZ)(value+.00001)-(axis==='x'?planX:planZ)(value-.00001))/.00002:1;
export const terrace={level:1.8,rect:[-4,2.5,0,11.5],stairs:{rect:[-2.3,-1.7,-.35,2.5],from:0,to:1.8}};
// Fotos03/04/05: volume alto menor que o conjunto térreo. A base anterior
// repetia toda a largura social no superior. Nova hipótese explicitamente
// separada: ala superior mais estreita, preservando escada e painel de vidro.
export const upperWidth=proportionStudy?4.55:5.8;
export function applyProportionStudy(rooms,floors,walls,furniture){
 if(!proportionStudy)return;
 for(const r of rooms.filter(r=>r.level===3))r.rect[2]=upperWidth;
 for(const f of floors.filter(f=>f.level===3&&f.rect[2]===5.8))f.rect[2]=upperWidth;
 for(const w of walls.filter(w=>w.base===3))for(const p of[w.a,w.b])if(p[0]===5.8)p[0]=upperWidth;
 walls[21].openings[0].to=upperWidth-.12;
 walls[26].openings[0].to=upperWidth-.25;
 walls[0].openings.find(o=>o.type==='door').style='porch-glass';
 Object.assign(rooms.find(r=>r.id==='jardim'),{rect:[...exterior.garden],spawn:[exterior.arrival.x,0,exterior.arrival.z],yaw:exterior.arrival.yaw});
 Object.assign(rooms.find(r=>r.id==='quintalDireito'),{name:'Passagem lateral',photo:5,rect:[...exterior.side],spawn:[10.45,0,4],note:'Passagem estreita junto à cerca verde da foto 05; largura estimada, não medida.'});
 for(const f of floors.filter(f=>f.material==='grass'))f.rect=[...(f.rect[1]<0?exterior.garden:exterior.side)];
 const deck=rooms.find(r=>r.id==='deck');Object.assign(deck,{name:'Terraço lateral',rect:[...terrace.rect],level:terrace.level,spawn:[-2,terrace.level,6.5],note:'Escada lateral → terraço: relação visível nas fotos 04/19–22. Desnível de 1,80 m é hipótese, não cota.'});
 const deckFloor=floors.find(f=>f.material==='deck');Object.assign(deckFloor,{rect:[...terrace.rect],level:terrace.level});
 for(const w of walls.filter(w=>w.a[0]<0&&w.b[0]<=0)){w.base=terrace.level;w.a[1]+=2.5;w.b[1]+=2.5;}
 // A porta lateral baixa era uma conexão inventada e dava no vazio do deck.
 walls[1].openings=walls[1].openings.filter(o=>o.type!=='door');
 for(const opening of walls[3].openings){opening.style='leaded-glass';opening.initialOpen=false;}
 // Foto01 mostra parapeito e vidraças laterais; não apenas uma janelinha.
 walls[21].openings[0].bottom=.72;
 // Fotos00/01: parapeitos claros sob os vidros, não lambris de madeira.
 walls[21].material='plaster';walls[22].material='plaster';
 walls[22].openings=[{from:.15,to:3.65,bottom:.72,top:2.65,type:'window',panels:3},{from:4.45,to:8.7,bottom:1.9,top:2.65,type:'window',panels:3}];
 // Foto10: o banco fica abaixo das duas janelas; altura é hipótese visual, não cota.
 for(const wall of walls.slice(0,2)){
  const window=wall.openings.find(o=>o.type==='window'&&o.from===.2&&o.to===3.3&&o.top===2.85);
  if(window)window.bottom=1.85;
 }
 // A divisória acompanha o peitoril e não invade o corredor da porta frontal.
 const divider=walls.at(-1);if(divider.height===1.48){divider.height=1.85;divider.b[1]=3.0;}
 Object.assign(rooms.find(r=>r.id==='cozinha'),{rect:[1.8,4.4,5.8,9],spawn:[4.2,0,5.45],note:'Cozinha integrada ampliada pela redistribuição do plano. Fotos 06/07/08/11; sem cotas medidas.'});
 Object.assign(rooms.find(r=>r.id==='hall'),{photo:6,note:'Ligação posterior ainda estimada. A foto12 é banheiro, não evidência de um hall.'});
 // Âncoras de escala humana: não permitir cama de casal de 1m de largura
 // resultante do encolhimento X/Z. Medidas estimadas, não medidas do imóvel.
 Object.assign(furniture.find(f=>f.id==='cama15'),{rect:[6.60,9.20,9.53,11.676],turn:Math.PI/2});
 // Dobradiça no outro batente permite abrir para o hall sem cruzar a cama.
 // Continua sujeita à varredura completa; posição de ferragem é estimada.
 Object.assign(rooms.find(r=>r.id==='quarto14'),{rect:[5.8,1.45,9.8,7.5]});
 Object.assign(rooms.find(r=>r.id==='quarto15'),{rect:[5.8,7.5,9.8,12]});
 walls[8].b[1]=7.5;walls[9].a[1]=7.5;
 walls[13].a[1]=7.5;walls[13].b[1]=7.5;
 Object.assign(walls[9].openings[0],{from:1.8,to:2.9,hinge:'end'});
 // Ligações não fotografadas: acesso frontal livre e banheiro pelo pé da cama.
 // A folha abre no trecho anterior à cama (e não varre vaso/cama), mantendo
 // passagem física sem reduzir o leito estimado.
 Object.assign(walls[13].openings[0],{from:.55,to:1.75});
 Object.assign(walls[15].openings[0],{from:.20,to:.95,hinge:'end'});
 Object.assign(furniture.find(f=>f.id==='cama18'),{rect:[.40,10.00,2.55,11.66],turn:Math.PI/2});
 Object.assign(rooms.find(r=>r.id==='quarto18'),{spawn:[3.8,3,11.3]});
 Object.assign(rooms.find(r=>r.id==='quarto15'),{spawn:[7.4,0,8.52],yaw:Math.PI});
 // Fotos00/01: futon ao longo do vidro lateral, e mesinha pequena junto dele.
 Object.assign(furniture.find(f=>f.id==='sofaMezanino'),{rect:[.18,.48,1.30,2.95],turn:-Math.PI/2});
 Object.assign(furniture.find(f=>f.id==='mesaMezanino'),{rect:[1.55,.50,2.35,1.20],height:.46});
 // Destinos voltados para o ambiente, não para a porta/parede atrás do usuário.
 for(const[id,yaw]of[['banheiro1',2.35],['banheiro2',2.45],['quarto15',Math.PI],['quarto18',1.57],['quarto14',3.70],['deck',Math.PI]])rooms.find(r=>r.id===id).yaw=yaw;
 Object.assign(rooms.find(r=>r.id==='quarto14'),{spawn:[6.7,0,4.8],yaw:3.75});
 // Inclinação de inspeção, sem mudar a lente nem a altura física dos olhos.
 for(const[id,pitch]of[['banheiro1',-.42],['banheiro2',-.48],['quarto15',-.58],['quarto18',-.50],['quarto14',-.18],['deck',-.27],['mezanino',-.20]])rooms.find(r=>r.id===id).pitch=pitch;
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
