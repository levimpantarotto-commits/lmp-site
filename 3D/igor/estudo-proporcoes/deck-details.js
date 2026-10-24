// Deck observado nas fotos 19–22. A existência de mesa, cadeiras, rede,
// pergolado e quadros é observada; dimensões e posição no retângulo navegável
// são derivadas/estimadas porque não há planta ou cotas.
import {proportionStudy} from './proportion-study.js';
export const deckEvidence={
 photos:[19,20,21,22],
 observed:['mesa escura retangular','cadeiras ripadas','rede amarela','pergolado de toras','cobertura de madeira mais fechada','lâmpadas em fio','trepadeira nos postes','quadros/vasos na parede de madeira'],
 derived:['distribuição no retângulo lógico [-4,0,0,9]','altura do pergolado','dimensões dos móveis'],
 excluded:['topografia, vista e limites externos não medidos']
};

// Retângulos de colisão no nível 0. A integração pertence ao chamador: este
// módulo não altera a navegação nem presume que os muros existentes são seus.
export const deckObstacles=[
 {id:'deck-table',rect:[-2.72,5.22,-1.32,6.42]},
 {id:'deck-chair-west',rect:[-3.23,5.35,-2.73,6.25]},
 {id:'deck-chair-east',rect:[-1.30,5.32,-.80,6.22]},
 {id:'deck-pergola-sw',rect:[-3.68,1.82,-3.42,2.08]},
 {id:'deck-pergola-se',rect:[-.98,1.82,-.72,2.08]},
 {id:'deck-pergola-nw',rect:[-3.68,7.48,-3.42,7.74]},
 {id:'deck-pergola-ne',rect:[-.98,7.48,-.72,7.74]},
 // A rede ocupa volume corporal: não basta colidir somente com os postes.
 {id:'deck-hammock',rect:[-3.35,2.22,-1.05,2.82]}
];

export function buildDeckDetails(THREE,scene,M,{mobile=false}={}){
 const meshes=[],budget=25000;let triangles=0;
 const woodDark=tint(THREE,M.woodDark,0x4a2d1b),woodWeathered=tint(THREE,M.wood,0x78523b),tableGraphite=tint(THREE,M.wood,0x454442),yellow=tint(THREE,M.fabricTaupe||M.linen,0xd8bd46),rope=tint(THREE,M.linen||M.fabricTaupe,0xd6c59a),frame=tint(THREE,M.woodDark,0x33241a),terra=tint(THREE,M.wood,0x8c6544),soil=tint(THREE,M.woodDark,0x221b16);
 // Folha própria, opaca e áspera: não reutiliza o albedo de tecido das redes.
 const leaf=new THREE.MeshStandardMaterial({color:0x355c28,roughness:.86,metalness:0,side:THREE.DoubleSide});
 const leafLight=leaf.clone(),leafDark=leaf.clone();leafLight.color.setHex(0x416d31);leafDark.color.setHex(0x294b22);
 const leafVariants=[leaf,leafLight,leafDark];
 const leafVein=new THREE.MeshStandardMaterial({color:0x24451d,roughness:.9,metalness:0});
 const vineStem=new THREE.MeshStandardMaterial({color:0x29451f,roughness:.92,metalness:0});
 const lampGlass=new THREE.MeshStandardMaterial({color:0xffc96a,emissive:0x8c4b12,emissiveIntensity:.72,roughness:.42,metalness:0});
 function tint(_THREE,base,color){const mat=base.clone();mat.color?.setHex(color);return mat;}
 // Convenção usada pelo restante da cena: coordenada assinada em metros / 2.
 // A projeção preserva a direção do veio da madeira; abs() aqui espelhava o mapa.
 function uvWorld(geo){const uv=geo.getAttribute('uv'),normal=geo.getAttribute('normal'),p=geo.getAttribute('position');if(!uv||!normal||!p)return geo;for(let i=0;i<uv.count;i++){const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));let u,v;if(nx>.5){u=p.getZ(i)/2;v=p.getY(i)/2;}else if(nz>.5){u=p.getX(i)/2;v=p.getY(i)/2;}else{u=p.getX(i)/2;v=p.getZ(i)/2;}uv.setXY(i,u,v);}uv.needsUpdate=true;return geo;}
 function add(geo,mat,x,y,z,{part='detail',rotateY=0,shadow=true}={}){const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.y=rotateY;mesh.castShadow=mesh.receiveShadow=shadow;mesh.userData.deckPart=part;mesh.userData.classification='derivado';scene.add(mesh);meshes.push(mesh);triangles+=(geo.index?.count||geo.getAttribute('position').count)/3;return mesh;}
 function box(x,y,z,w,h,d,mat,opts={}){return add(uvWorld(new THREE.BoxGeometry(w,h,d)),mat,x,y,z,opts);}
 function cylinder(x,y,z,r,h,mat,opts={}){return add(new THREE.CylinderGeometry(r,r,h,16),mat,x,y,z,opts);}
 function beamBetween(a,b,r,mat,part){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),len=delta.length();const geo=new THREE.CylinderGeometry(r,r,len,12);const mesh=add(geo,mat,...start.clone().add(end).multiplyScalar(.5).toArray(),{part});mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}

 // Mesa escura com tampo espesso e cavaletes em X, como nas fotos 19/20.
 box(-2.02,.77,5.82,1.40,.10,1.20,tableGraphite,{part:'table-top'});
 for(const z of[5.42,6.22]){beamBetween([-2.59,.10,z],[-1.45,.70,z],.052,tableGraphite,'table-trestle');beamBetween([-1.45,.10,z],[-2.59,.70,z],.052,tableGraphite,'table-trestle');box(-2.02,.36,z,1.22,.055,.06,tableGraphite,{part:'table-crossbar'});}

 // Duas cadeiras de madeira: encosto e assento ripados, não blocos lisos.
 function chair(x,z,turn){const seatY=.47;box(x,seatY,z,.48,.055,.48,woodWeathered,{part:'chair-seat',rotateY:turn});for(const localX of[-.19,.19]){for(const localZ of[-.19,.19]){const dx=Math.cos(turn)*localX+Math.sin(turn)*localZ,dz=-Math.sin(turn)*localX+Math.cos(turn)*localZ;cylinder(x+dx,.23,z+dz,.035,.46,woodDark,{part:'chair-leg'});}}
  const backZ=.22,backX=Math.sin(turn)*backZ,backZZ=Math.cos(turn)*backZ;for(const side of[-.19,.19]){const dx=Math.cos(turn)*side+backX,dz=-Math.sin(turn)*side+backZZ;beamBetween([x+dx,.44,z+dz],[x+dx,.92,z+dz],.035,woodDark,'chair-back-post');}
  for(let i=0;i<3;i++){const h=.60+i*.105,slat=box(x,h,z,.40,.055,.035,woodWeathered,{part:'chair-back-slat',rotateY:turn});slat.position.x+=backX;slat.position.z+=backZZ;}
 }
 chair(-2.98,5.80,-Math.PI/2);chair(-1.05,5.80,Math.PI/2);

 // Estrutura de toras: quatro apoios e cobertura aberta. Não fecha a vista nem
 // reproduz os muros existentes; mantém o acesso da sala (x≈0,z<1.45) livre.
 for(const [x,z] of[[-3.55,1.95],[-.85,1.95],[-3.55,7.62],[-.85,7.62]])cylinder(x,1.28,z,.13,2.56,woodDark,{part:'pergola-post'});
 for(const z of[1.95,7.62])beamBetween([-3.55,2.56,z],[-.85,2.56,z],.11,woodDark,'pergola-beam');
 for(const x of[-3.55,-2.65,-1.75,-.85])beamBetween([x,2.56,1.95],[x,2.56,7.62],.065,woodDark,'pergola-rafter');
 for(let z=2.45;z<=7.15;z+=.68)beamBetween([-3.55,2.46,z],[-.85,2.46,z],.032,woodWeathered,'pergola-lathe');
 // Nas fotos 19/22 a cobertura não é só uma grade aberta: tábuas estreitas
 // percorrem o vão e filtram o sol. Elas ficam acima das pessoas e não mudam
 // percurso nem a planta do terraço.
 for(let z=2.14;z<=7.42;z+=.23)box(-2.20,2.525,z,2.61,.040,.135,woodWeathered,{part:'pergola-roof-board'});
 // Cordão de luz em duas curvas discretas sob a cobertura, com lâmpadas
 // espaçadas como na foto19. É estático para continuar compatível com o bake.
 const stringCurve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(-3.37,2.38,2.18),new THREE.Vector3(-2.72,2.21,3.58),
  new THREE.Vector3(-2.10,2.30,5.05),new THREE.Vector3(-1.04,2.38,6.92)
 ]);
 add(new THREE.TubeGeometry(stringCurve,32,.010,6,false),frame,0,0,0,{part:'pergola-light-cable',shadow:false});
 for(let i=0;i<8;i++){const p=stringCurve.getPoint((i+.35)/8);cylinder(p.x,p.y-.07,p.z,.018,.10,frame,{part:'pergola-light-drop',shadow:false});add(new THREE.SphereGeometry(.045,12,8),lampGlass,p.x,p.y-.145,p.z,{part:'pergola-light-bulb',shadow:false});}
 // Trepadeiras observadas nas duas fotos em postes opostos. A folha tem
 // nervura e curvatura transversal, em vez de esfera ou cartão plano.
 // Jiboia: ponta marcada, ombros largos e pequena fenda no pecíolo. A curvatura
 // longitudinal evita os retângulos verdes planos sem transformar a planta em
 // folhagem densa ou cara para o bake.
 const leafGeometry=(length,width,curl=.028)=>{const rows=6,cols=6,pts=[],uv=[],idx=[];
  const point=(t,v)=>{const shoulder=Math.pow(Math.sin(Math.PI*t),.64),baseNotch=(1-t)*.035;return [v*width*shoulder,t*length-baseNotch*(1-v*v),curl*(1-v*v)*shoulder*(.28+.72*t)];};
  // Pontas únicas e anéis intermediários: não gera triângulos degenerados nos polos.
  pts.push(...point(0,0));uv.push(.5,0);
  for(let r=1;r<rows;r++){const t=r/rows;for(let c=0;c<=cols;c++){const v=-1+2*c/cols;pts.push(...point(t,v));uv.push((v+1)*.5,t);}}
  const tip=pts.length/3;pts.push(...point(1,0));uv.push(.5,1);
  for(let c=0;c<cols;c++)idx.push(0,1+c,1+c+1);
  for(let r=0;r<rows-2;r++)for(let c=0;c<cols;c++){const a=1+r*(cols+1)+c,b=a+1,d=a+cols+1,e=d+1;idx.push(a,d,b,b,d,e);}
  const last=1+(rows-2)*(cols+1);for(let c=0;c<cols;c++)idx.push(last+c,tip,last+c+1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;};
 const leafGeo=leafGeometry(.30,.105);
 const leafVeinGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.035,0),new THREE.Vector3(0,.15,.018),new THREE.Vector3(0,.30,0)]),8,.005,5,false);
 function placeLeaf(x,y,z,scale,rotation,part='vine-curved-leaf',variant=0){const l=add(leafGeo,leafVariants[variant%leafVariants.length],x,y,z,{part,shadow:false}),vein=add(leafVeinGeo,leafVein,x,y,z,{part:`${part}-vein`,shadow:false});l.rotation.set(...rotation);vein.rotation.copy(l.rotation);l.scale.setScalar(scale);vein.scale.copy(l.scale);return l;}
 function vine(postX,postZ,phase){const stemPts=[];for(let i=0;i<15;i++){const t=i/14,y=.42+t*1.92,a=phase+t*8.6;stemPts.push([postX+Math.cos(a)*.145,y,postZ+Math.sin(a)*.145]);}add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stemPts.map(p=>new THREE.Vector3(...p))),36,.013,6,false),vineStem,0,0,0,{part:'vine-stem',shadow:false});for(let i=1;i<13;i++){const t=i/13,a=phase+t*8.6,side=i%2?-1:1,x=postX+Math.cos(a)*.165+side*.065,z=postZ+Math.sin(a)*.165,y=.44+t*1.82;placeLeaf(x,y,z,.82+(i%3)*.13,[.15*Math.sin(i),side*.75,side*(.46+.11*(i%3))],'vine-curved-leaf',i);}}
 vine(-3.55,1.95,.32);vine(-.85,7.62,2.26);

 if(!proportionStudy){
  // Baseline preservado literalmente: esta geometria já pertence ao bake
  // publicado e não recebe a hipótese de proporções.
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-3.32,1.78,2.52),new THREE.Vector3(-2.70,.88,2.52),new THREE.Vector3(-2.05,.73,2.52),new THREE.Vector3(-1.08,1.72,2.52)]);
  const hammockGeo=new THREE.TubeGeometry(curve,30,.035,8,false);add(hammockGeo,yellow,0,0,0,{part:'hammock-rope',shadow:false});
  for(let i=0;i<9;i++){const t=i/8,p=curve.getPoint(t),top=new THREE.Vector3(p.x,Math.max(p.y+.08,1.02),p.z+(i%2?.18:-.18));beamBetween([p.x,p.y,p.z],[top.x,top.y,top.z],.012,rope,'hammock-cord');}
  const fabricPts=[],fabricUv=[];for(let i=0;i<20;i++){const t=i/19,p=curve.getPoint(t),nearZ=p.z-.27,farZ=p.z+.27;fabricPts.push(p.x,p.y,nearZ,p.x,p.y,farZ);fabricUv.push(p.x/2,nearZ/2,p.x/2,farZ/2);}const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(fabricPts,3));fg.setAttribute('uv',new THREE.Float32BufferAttribute(fabricUv,2));const idx=[];for(let i=0;i<19;i++)idx.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);fg.setIndex(idx);fg.computeVertexNormals();add(fg,yellow,0,0,0,{part:'hammock-fabric',shadow:false});
 }else{
  // Apenas no estudo: tecido curvo, pontas estreitas e cordas sem sobras.
  const hammockRows=25,hammockCols=7;
  const centerCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-3.32,1.78,2.52),new THREE.Vector3(-2.72,.91,2.52),new THREE.Vector3(-2.03,.76,2.52),new THREE.Vector3(-1.08,1.72,2.52)]);
  const surfacePoint=(t,v)=>{const p=centerCurve.getPoint(t),half=.025+.295*Math.pow(Math.sin(Math.PI*t),.72);return new THREE.Vector3(p.x,p.y+.085*v*v,p.z+half*v);};
  const fabricPts=[],fabricUv=[],idx=[];
  for(let row=0;row<hammockRows;row++){const t=row/(hammockRows-1);for(let col=0;col<hammockCols;col++){const v=-1+2*col/(hammockCols-1),p=surfacePoint(t,v);fabricPts.push(p.x,p.y,p.z);fabricUv.push(t,(v+1)*.5);}}
  for(let row=0;row<hammockRows-1;row++)for(let col=0;col<hammockCols-1;col++){const a=row*hammockCols+col,b=a+1,c=a+hammockCols,d=c+1;idx.push(a,c,b,b,c,d);}
  const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(fabricPts,3));fg.setAttribute('uv',new THREE.Float32BufferAttribute(fabricUv,2));fg.setIndex(idx);fg.computeVertexNormals();const hammockFabric=yellow.clone();hammockFabric.side=THREE.DoubleSide;add(fg,hammockFabric,0,0,0,{part:'hammock-fabric',shadow:false});
  for(const v of[-1,1]){const edge=new THREE.CatmullRomCurve3(Array.from({length:hammockRows},(_,row)=>surfacePoint(row/(hammockRows-1),v)));add(new THREE.TubeGeometry(edge,hammockRows-1,.014,6,false),rope,0,0,0,{part:'hammock-edge-rope',shadow:false});}
  const leftAnchor=surfacePoint(0,0),rightAnchor=surfacePoint(1,0);
  for(const v of[-1,-.5,0,.5,1]){const left=surfacePoint(.14,v),right=surfacePoint(.86,v),leftCord=beamBetween(leftAnchor.toArray(),left.toArray(),.011,rope,'hammock-cord'),rightCord=beamBetween(rightAnchor.toArray(),right.toArray(),.011,rope,'hammock-cord');leftCord.userData.hammockConnection={anchor:leftAnchor.toArray(),surface:left.toArray()};rightCord.userData.hammockConnection={anchor:rightAnchor.toArray(),surface:right.toArray()};}
 }

 // Pequenos vasos em suportes de parede (fotos 19/21), em vez de pictogramas
 // verdes. A folhagem é reduzida e volumétrica, não um disco plano.
 const potProfile=[[.038,0],[.070,.012],[.078,.095],[.095,.11],[.091,.14],[.074,.145],[.068,.12]].map(([x,y])=>new THREE.Vector2(x,y));
 for(const [x,y,w,h] of[[-3.12,1.42,.38,.62],[-2.22,1.55,.42,.76],[-1.28,1.45,.34,.58]]){const z=8.905;
  // Moldura aberta: duas longarinas, travessas e prateleira, sem painel pintado.
  box(x-w/2-.03,y,z,.042,h,.028,frame,{part:'wall-bracket',shadow:false});box(x+w/2+.03,y,z,.042,h,.028,frame,{part:'wall-bracket',shadow:false});box(x,y+h/2-.02,z,w+.10,.042,.028,frame,{part:'wall-bracket',shadow:false});box(x,y-h/2+.02,z,w+.10,.042,.040,frame,{part:'wall-shelf',shadow:false});
  const pot=add(new THREE.LatheGeometry(potProfile,16),terra,x,y-h*.14,8.835,{part:'wall-pot',shadow:false});pot.rotation.y=.18;
  const dirt=add(new THREE.CircleGeometry(.066,16),soil,x,y-h*.14+.123,8.835,{part:'wall-pot-soil',shadow:false});dirt.rotation.x=-Math.PI/2;
  for(const [dx,dz,tilt,scale,variant] of[[-.030,-.014,-.50,.34,1],[.027,.013,.34,.30,2],[.004,.026,.03,.25,0]])placeLeaf(x+dx,y-h*.14+.135,8.807+dz,scale,[.82,0,tilt],'wall-leaf',variant);
 }

 const withinBudget=triangles<=budget;
 if(!withinBudget)throw new Error(`Detalhes do deck excedem orçamento: ${triangles}/${budget}`);
 return {meshes,triangles,budget,withinBudget,evidence:deckEvidence,obstacles:deckObstacles};
}
