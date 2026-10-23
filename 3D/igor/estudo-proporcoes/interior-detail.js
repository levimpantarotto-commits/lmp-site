// Conjunto de jantar observado nas fotos 06/11: madeira espessa, pés torneados e cadeiras leves.
// As peças entram diretamente na scene para o static batcher, sem carregar assets adicionais.
export function buildDiningSet(THREE,scene,M){
 const meshes=[];
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
 // Tampo circular (raio preservado para coincidir com o colisor): perfil cria borda chanfrada e espessura visível.
 const tabletop=lathe([new THREE.Vector2(0,-.060),new THREE.Vector2(.55,-.060),new THREE.Vector2(.62,-.052),new THREE.Vector2(.64,-.025),new THREE.Vector2(.64,.018),new THREE.Vector2(.615,.050),new THREE.Vector2(.53,.060),new THREE.Vector2(0,.060)],20);
 // Faces horizontais usam projeção planar; a borda usa metragem de arco, para que a madeira não fique esticada.
 const tp=tabletop.attributes.position,tn=tabletop.attributes.normal,tu=tabletop.attributes.uv;for(let i=0;i<tu.count;i++){const x=tp.getX(i),z=tp.getZ(i),y=tp.getY(i);if(Math.abs(tn.getY(i))>.7)tu.setXY(i,x/2,z/2);else{let a=Math.atan2(z,x);if(a<0)a+=Math.PI*2;tu.setXY(i,a*Math.hypot(x,z)/2,y/2);}}tu.needsUpdate=true;
 add(tabletop,M.wood,3.6,.785,6.7,0,'dining-tabletop');
 // Saia discreta e quatro pés torneados, afastados do centro como na mesa de madeira fotografada.
 add(cylindricalUV(lathe([new THREE.Vector2(.30,-.035),new THREE.Vector2(.34,-.018),new THREE.Vector2(.34,.018),new THREE.Vector2(.30,.035)],20)),M.woodDark,3.6,.695,6.7,0,'dining-apron');
 const legProfile=[new THREE.Vector2(.095,-.37),new THREE.Vector2(.115,-.35),new THREE.Vector2(.075,-.18),new THREE.Vector2(.095,-.09),new THREE.Vector2(.070,.03),new THREE.Vector2(.075,.23),new THREE.Vector2(.055,.30),new THREE.Vector2(.065,.38)];
 for(const[a,b]of[[-.27,-.27],[.27,-.27],[-.27,.27],[.27,.27]])add(cylindricalUV(lathe(legProfile,14)),M.woodDark,3.6+a,.365,6.7+b,0,'dining-table-leg');
 // Cadeiras mantêm centros e footprint .42 x .44. Assento com canto arredondado e encosto curvo em prancha fina.
 const chairCenters=[[2.65,6.7,-Math.PI/2],[3.6,5.7,Math.PI],[3.6,7.7,0]];
 const seat=roundedRect(.42,.44,.055,.055);seat.rotateX(Math.PI/2);planarUV(seat); // plano XZ e espessura vertical
 const backShape=new THREE.Shape();
 backShape.moveTo(-.175,0);backShape.quadraticCurveTo(0,.025,.175,0);backShape.lineTo(.155,.45);backShape.quadraticCurveTo(0,.50,-.155,.45);backShape.lineTo(-.175,0);
 const back=planarUV(new THREE.ExtrudeGeometry(backShape,{depth:.048,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,curveSegments:7}),'x','y');back.translate(0,0,-.024);
 const chairLeg=cylindricalUV(lathe([new THREE.Vector2(.032,-.22),new THREE.Vector2(.040,-.18),new THREE.Vector2(.030,.16),new THREE.Vector2(.040,.20)],12));
 for(const[x,z,turn]of chairCenters){
  add(seat,M.wood,x,.44,z,turn,'dining-chair-seat');
  // Encosto e pernas são colocados diretamente no mundo, preservando a orientação da cadeira.
  const tx=Math.sin(turn),tz=Math.cos(turn),sx=Math.cos(turn),sz=-Math.sin(turn);
  add(back,M.woodDark,x+tx*.185,.43,z+tz*.185,turn,'dining-chair-back');
  for(const lateral of[-.165,.165])for(const frente of[-0.17,0.17])add(chairLeg,M.woodDark,x+sx*lateral+tx*frente,.22,z+sz*lateral+tz*frente,0,'dining-chair-leg');
 }
 const triangles=meshes.reduce((sum,mesh)=>sum+(mesh.geometry.index?mesh.geometry.index.count:mesh.geometry.attributes.position.count)/3,0);
 return {meshes,triangles,table:{x:3.6,z:6.7,radius:.64},chairs:chairCenters.map(([x,z,rotation])=>({x,z,rotation,width:.42,depth:.44}))};
}
