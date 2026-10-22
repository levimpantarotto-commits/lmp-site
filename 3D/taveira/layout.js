// Coordenadas em pixels da implantação ilustrada oficial (750 × 1500).
// NÃO são metros, cadastro, cotas de terreno, IDs de quadras ou lotes oficiais.
export const WIDTH=750, HEIGHT=1500;
export const toWorld=(x,y)=>[(x-375)*0.45, (y-750)*0.45];
export const roads=[
 [[92,43],[160,86],[231,105],[310,110],[343,280],[335,285],[329,300],[335,315],[340,330],[304,430],[272,529],[237,647],[218,731],[214,816],[221,897],[213,974],[198,1050],[200,1135],[212,1210],[220,1295],[232,1382],[232,1434]],
 Array.from({length:25},(_,i)=>[350+21*Math.cos(i*Math.PI/12),300+21*Math.sin(i*Math.PI/12)]),
 [[371,300],[377,313],[409,320],[421,346],[399,415],[374,497],[349,574],[328,650],[307,724]],
 [[407,423],[590,423]], [[384,502],[588,502]], [[355,579],[585,579]], [[336,653],[582,653]],
 [[220,731],[565,731],[588,748],[592,784],[599,849],[605,924],[609,1003],[613,1081],[618,1164],[622,1257],[612,1308],[579,1337],[529,1358],[455,1371],[374,1389],[346,1391],[323,1377],[315,1356],[310,1283],[300,1215]],
 [[216,810],[594,810]],[[222,887],[601,887]],[[220,962],[606,962]],[[202,1038],[612,1038]],[[199,1114],[615,1114]],[[209,1193],[620,1193]],
 [[308,1308],[395,1291],[472,1279],[548,1270],[618,1260]],
 [[383,1210],[397,1288]],[[462,1207],[474,1278]],[[535,1205],[548,1267]]
];
// Uma amostra de linhas internas derivadas visualmente, não inventário cadastral.
const rows=[
 [397,575,440,492,15],[375,573,519,568,16],[352,571,594,643,18],[330,544,670,718,18],
 [250,548,748,796,25],[258,568,827,872,26],[267,574,903,948,26],[251,576,978,1022,28],
 [232,582,1053,1099,29],[234,590,1130,1176,30]
];
export const lots=rows.flatMap(([x0,x1,y0,y1,n],row)=>Array.from({length:n*2},(_,i)=>{
 const col=Math.floor(i/2), side=i%2, w=(x1-x0)/n, d=(y1-y0)/2;
 return {key:`amostra-${row}-${col}-${side}`,x:x0+col*w+.5,y:y0+side*d+.5,w:w-1,d:d-1,row,col,side,kind:'residencial',classification:'ilustrativo'};
}));
export const stops=[
 {id:'geral',title:'O bairro por inteiro',description:'Implantação derivada da imagem de divulgação. Veja os lotes, as ruas e a faixa verde.',pixel:[405,845],camera:[470,520,470],target:[10,0,38]},
 {id:'acesso',title:'Pelo acesso principal',description:'A rotatória conecta a avenida ao eixo do loteamento.',pixel:[350,300],camera:[15,18,-160],target:[-6,0,-197]},
 {id:'ruas',title:'Na frente dos lotes',description:'Percorra o trecho residencial. As divisões destacadas são uma amostra visual, sem numeração cadastral.',pixel:[430,810],camera:[20,13,32],target:[-55,0,27]},
 {id:'verde',title:'Ao lado da faixa verde',description:'Veja a relação entre a vegetação e as quadras, conforme a implantação ilustrada.',pixel:[215,1080],camera:[-10,55,150],target:[-105,0,130]},
 {id:'parque',title:'Até a área de lazer',description:'Localização indicada na implantação de divulgação. Consulte o projeto e o estágio atual das obras.',pixel:[635,1306],camera:[160,70,280],target:[110,0,245]}
];
export function distanceToSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy;const t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
export function isRoadPoint(x,z,margin=2.1){if(!Number.isFinite(x)||!Number.isFinite(z))return false;return roads.some(r=>r.slice(1).some((b,i)=>distanceToSegment([x,z],toWorld(...r[i]),toWorld(...b))<margin));}
export function moveAlongRoad(p,dx,dz){if(!Array.isArray(p)||!p.every(Number.isFinite)||!Number.isFinite(dx)||!Number.isFinite(dz))return Array.isArray(p)?[p[0],p[1]]:[0,0];const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.5));let [x,z]=p;for(let i=0;i<n;i++){if(isRoadPoint(x+dx/n,z+dz/n)){x+=dx/n;z+=dz/n;}else if(isRoadPoint(x+dx/n,z)){x+=dx/n;}else if(isRoadPoint(x,z+dz/n)){z+=dz/n;}}return [x,z];}
