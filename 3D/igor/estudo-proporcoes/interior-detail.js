// Conjunto de jantar observado nas fotos 06/11: madeira espessa, pés torneados e cadeiras leves.
// As peças entram diretamente na scene para o static batcher, sem carregar assets adicionais.
export function buildDiningSet(THREE,scene,M){
 const meshes=[];
 const solidWood=M.furnitureWood||M.wood,chairWood=solidWood.clone?.()||solidWood;
 if(chairWood!==solidWood&&chairWood.color)chairWood.color.set(0x9c7a5b);
 const add=(geometry,material,x,y,z,rotationY=0,name='dining-detail')=>{
  // Geometrias Three nativas já possuem UVs; esta guarda torna a exigência explícita para o batcher.
  if(!geometry.attributes.position||!geometry.attributes.normal||!geometry.attributes.uv)throw new Error(`Geometria sem atributos PNU: ${name}`);
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.rotation.y=rotationY;
  mesh.castShadow=mesh.receiveShadow=true;mesh.userData.staticDetail='dining';scene.add(mesh);meshes.push(mesh);return mesh;
 };
 const lathe=(profile,segments=20)=>new THREE.LatheGeometry(profile,segments);
 const planarUV=(geometry,u='x',v='z')=>{
  const p=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,p.getComponent(i,u==='x'?0:u==='y'?1:2)/2,p.getComponent(i,v==='x'?0:v==='y'?1:2)/2);
  uv.needsUpdate=true;return geometry;
 };
 const cylindricalUV=geometry=>{
  const p=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++){const x=p.getX(i),z=p.getZ(i),radius=Math.hypot(x,z);let angle=Math.atan2(z,x);if(angle<0)angle+=Math.PI*2;uv.setXY(i,angle*radius/2,p.getY(i)/2);}
  uv.needsUpdate=true;return geometry;
 };
 const roundedRect=(width,depth,radius,height)=>{
  // O bevel expande .018 m para cada lado; o contorno recua para manter o footprint físico informado.
  const bevel=.018,w=width-bevel*2,d=depth-bevel*2,r=Math.min(radius,w/2,d/2),s=new THREE.Shape();
  s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);
  s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);
  s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
  return new THREE.ExtrudeGeometry(s,{depth:height,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:5});
 };
 // Foto06: mesa oval feita de tábuas, não um disco espesso. O maior eixo ainda
 // cabe no raio do colisor existente, que continua sendo a fonte de navegação.
 const oval=new THREE.Shape(),tableRx=.64,tableRz=.57;
 for(let i=0;i<=28;i++){const a=i/28*Math.PI*2,x=Math.cos(a)*tableRx,z=Math.sin(a)*tableRz;i?oval.lineTo(x,z):oval.moveTo(x,z);}
 const tabletop=new THREE.ExtrudeGeometry(oval,{depth:.04,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,curveSegments:14});
 tabletop.rotateX(Math.PI/2);tabletop.translate(0,.02,0);
 // O extrude possui duas leituras: tampo com projeção planar e cinta lateral
 // por arco. Projetar a lateral em X/Z colapsava sua altura numa faixa vertical.
 const tablePosition=tabletop.attributes.position,tableNormal=tabletop.attributes.normal,tableUV=tabletop.attributes.uv;
 for(let i=0;i<tableUV.count;i++){const x=tablePosition.getX(i),y=tablePosition.getY(i),z=tablePosition.getZ(i),ny=tableNormal.getY(i);if(Math.abs(ny)>.7)tableUV.setXY(i,x/2,z/2);else{let a=Math.atan2(z/tableRz,x/tableRx);if(a<0)a+=Math.PI*2;tableUV.setXY(i,a*(tableRx+tableRz)/4,y/2);}}tableUV.needsUpdate=true;
 add(tabletop,solidWood,3.6,.77,6.7,0,'dining-tabletop');
 // Juntas rasas sugerem as tábuas longitudinais sem separar o tampo em peças flutuantes.
 const plankSeam=x=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x,0,-.49),new THREE.Vector3(x*.985,0,0),new THREE.Vector3(x,0,.49)]),8,.0012,4,false);
 for(const x of[-.23,0,.23])add(plankSeam(x),M.woodDark,3.6,.7961,6.7,0,'dining-table-plank-seam');
 // Saia discreta e quatro pés torneados esbeltos, afastados do centro como na mesa fotografada.
 add(cylindricalUV(lathe([new THREE.Vector2(.24,-.028),new THREE.Vector2(.27,-.014),new THREE.Vector2(.27,.014),new THREE.Vector2(.24,.028)],18)),chairWood,3.6,.727,6.7,0,'dining-apron');
 const legProfile=[new THREE.Vector2(.058,-.37),new THREE.Vector2(.068,-.34),new THREE.Vector2(.046,-.17),new THREE.Vector2(.061,-.08),new THREE.Vector2(.044,.05),new THREE.Vector2(.052,.24),new THREE.Vector2(.038,.31),new THREE.Vector2(.047,.38)];
 for(const[a,b]of[[-.27,-.25],[.27,-.25],[-.27,.25],[.27,.25]])add(cylindricalUV(lathe(legProfile,8)),chairWood,3.6+a,.365,6.7+b,0,'dining-table-leg');
 // Foto06/11: cadeira com painel vertical largo e curvado, estreito embaixo;
 // não se trata de encosto feito de ripas horizontais.
 const chairCenters=[[2.65,6.7,-Math.PI/2],[3.6,5.7,Math.PI],[3.6,7.7,0]];
 const seat=roundedRect(.42,.44,.055,.055);seat.rotateX(Math.PI/2);planarUV(seat); // plano XZ e espessura vertical
 const backShape=new THREE.Shape();
 backShape.moveTo(-.095,.47);backShape.quadraticCurveTo(-.15,.53,-.15,.72);backShape.quadraticCurveTo(-.15,.89,-.105,.91);backShape.quadraticCurveTo(0,.935,.105,.91);backShape.quadraticCurveTo(.15,.89,.15,.72);backShape.quadraticCurveTo(.15,.53,.095,.47);backShape.quadraticCurveTo(0,.445,-.095,.47);
 const backPanel=planarUV(new THREE.ExtrudeGeometry(backShape,{depth:.028,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:1,curveSegments:4}),'x','y');
 // A tampa do Extrude é não indexada: computeVertexNormals depois da curva
 // cria reflexos triangulares enormes. Transformar as normais originais pela
 // derivada da deformação preserva a curvatura contínua e as bordas do bevel.
 const backPositions=backPanel.attributes.position,backNormals=backPanel.attributes.normal;
 for(let i=0;i<backPositions.count;i++){
  const x=backPositions.getX(i),z=backPositions.getZ(i),slope=Math.abs(x)<.15?-.048*x/(.15*.15):0;
  backPositions.setZ(i,z+.024*(1-Math.min(1,Math.abs(x)/.15)**2));
  const nx=backNormals.getX(i)-slope*backNormals.getZ(i),ny=backNormals.getY(i),nz=backNormals.getZ(i),length=Math.hypot(nx,ny,nz);
  backNormals.setXYZ(i,nx/length,ny/length,nz/length);
 }
 const chairLeg=cylindricalUV(lathe([new THREE.Vector2(.024,-.22),new THREE.Vector2(.031,-.18),new THREE.Vector2(.024,.16),new THREE.Vector2(.030,.20)],8));
 const chairPost=cylindricalUV(lathe([new THREE.Vector2(.026,-.24),new THREE.Vector2(.031,-.20),new THREE.Vector2(.024,.22),new THREE.Vector2(.029,.27)],8));
 for(const[x,z,turn]of chairCenters){
  add(seat,chairWood,x,.44,z,turn,'dining-chair-seat');
  // Encosto e pernas são colocados diretamente no mundo, preservando a orientação da cadeira.
  const tx=Math.sin(turn),tz=Math.cos(turn),sx=Math.cos(turn),sz=-Math.sin(turn);
  for(const lateral of[-.155,.155])add(chairPost,chairWood,x+sx*lateral+tx*.185,.67,z+sz*lateral+tz*.185,turn,'dining-chair-back-post');
  add(backPanel,chairWood,x+tx*.185,0,z+tz*.185,turn,'dining-chair-back');
  for(const lateral of[-.165,.165])for(const frente of[-.17,.17]){const leg=add(chairLeg,chairWood,x+sx*lateral+tx*frente,.225,z+sz*lateral+tz*frente,0,'dining-chair-leg');leg.rotation.z=frente>.0?.055:-.055;}
 }
 const triangles=meshes.reduce((sum,mesh)=>sum+(mesh.geometry.index?mesh.geometry.index.count:mesh.geometry.attributes.position.count)/3,0);
 return {meshes,triangles,table:{x:3.6,z:6.7,radius:.64},chairs:chairCenters.map(([x,z,rotation])=>({x,z,rotation,width:.42,depth:.44}))};
}
