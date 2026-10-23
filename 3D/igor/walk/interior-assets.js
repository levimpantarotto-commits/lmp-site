// Mobiliário observado. As dimensões são limitadas aos footprints de nav.js.
const TAU=Math.PI*2;

export function buildInteriorAssets(THREE,scene,M,furniture,{mobile=false}={}){
 // A malha é deliberadamente a mesma nos dois perfis: mobile só recebe materiais/texturas do chamador.
 const detail=16,meshes=[],byId={};
 const material=(name,fallback='white')=>M[name]||M[fallback]||M.white;
 const add=(geometry,mat,x,y,z,rotation=0,part='')=>{if(!geometry.attributes.normal)geometry.computeVertexNormals();const node=new THREE.Mesh(geometry,mat);node.position.set(x,y,z);node.rotation.y=rotation;node.castShadow=node.receiveShadow=true;if(part)node.userData.interiorPart=part;scene.add(node);meshes.push(node);return node;};
 // Caixa arredondada por projeção analítica do cubo subdividido: bordas compartilham a mesma normal,
 // diferentemente de ExtrudeGeometry, cujas tampas e bevels deixam junções facetadas.
 const roundedGeometry=(w,h,d,r=.04)=>{
  const q=Math.min(r,w*.24,h*.24,d*.24),segments=q<.025?4:8,g=new THREE.BoxGeometry(w,h,d,segments,segments,segments),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  const axis=(v,half)=>{const idx=Math.round((v/half+1)*segments/2);if(segments===4)return[-half,-half+q,0,half-q,half][idx];return[-half,-half+q*.134,-half+q*.5,-half+q,0,half-q,half-q*.5,half-q*.134,half][idx];};
  for(let i=0;i<p.count;i++){
   const x=axis(p.getX(i),w/2),y=axis(p.getY(i),h/2),z=axis(p.getZ(i),d/2);
   const ix=Math.max(-w/2+q,Math.min(w/2-q,x)),iy=Math.max(-h/2+q,Math.min(h/2-q,y)),iz=Math.max(-d/2+q,Math.min(d/2-q,z));
   const dx=x-ix,dy=y-iy,dz=z-iz,l=Math.hypot(dx,dy,dz)||1;
   // UV por face em metro/2; frente vertical não colapsa no plano XZ.
   const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));
   uv.setXY(i,(nx>.5?z:x)/2,(ny>.5?z:y)/2);
   p.setXYZ(i,ix+dx/l*q,iy+dy/l*q,iz+dz/l*q);n.setXYZ(i,dx/l,dy/l,dz/l);
  }return g;
 };
 const ctx=f=>{const rw=f.rect[2]-f.rect[0],rd=f.rect[3]-f.rect[1],rot=f.turn||0,turned=Math.abs(Math.sin(rot))>.5,w=turned?rd:rw,d=turned?rw:rd,cx=(f.rect[0]+f.rect[2])/2,cz=(f.rect[1]+f.rect[3])/2,base=f.level||0;
  const at=(u,v)=>({x:cx+Math.cos(rot)*(u-w/2)+Math.sin(rot)*(v-d/2),z:cz-Math.sin(rot)*(u-w/2)+Math.cos(rot)*(v-d/2)});
  const round=(u,y,v,ww,hh,dd,mat,r=.04,part='')=>{const p=at(u,v);return add(roundedGeometry(ww,hh,dd,r),mat,p.x,base+y,p.z,rot,part);};
  // Almofada cheia: superelipsoide macio com centro convexo e cantos comprimidos.
  // As caixas chanfradas anteriores mantinham uma face grande e plana, como espuma rígida.
  const pillow=(u,y,v,ww,hh,dd,mat,part)=>{const g=new THREE.SphereGeometry(1,32,20),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,e=.34,h=[ww/2,hh/2,dd/2],pow=(v,p)=>Math.sign(v)*Math.pow(Math.abs(v),p);for(let i=0;i<p.count;i++){const s=[p.getX(i),p.getY(i),p.getZ(i)],q=s.map((v,k)=>pow(v,e)*h[k]),normal=new THREE.Vector3(...s.map((v,k)=>pow(v,2-e)/h[k])).normalize();p.setXYZ(i,...q);n.setXYZ(i,normal.x,normal.y,normal.z);uv.setXY(i,q[0]/2,q[1]/2);}const atp=at(u,v);return add(g,mat,atp.x,base+y,atp.z,rot,part);};
  // A deformação é contínua e pequena: tira a rigidez de almofadas sem trocar o volume por balões.
  const puffy=(u,y,v,ww,hh,dd,mat,r=.04,part='',phase=0)=>{const g=roundedGeometry(ww,hh,dd,r),p=g.attributes.position,n=g.attributes.normal,halfX=ww/2,halfY=hh/2,halfZ=dd/2,deform=(x,y,z)=>{const nx=x/halfX,ny=y/halfY,nz=z/halfZ,top=Math.max(0,ny),soft=Math.max(0,1-nx*nx)*Math.max(0,1-nz*nz);return new THREE.Vector3(x,y+top*(.030+.015*Math.sin(phase+nx*3-nz*2))*soft,z+top*.013*Math.sin(phase+nx*4)*soft);};for(let i=0;i<p.count;i++){const point=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)),normal=new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)).normalize(),axis=Math.abs(normal.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),t1=new THREE.Vector3().crossVectors(axis,normal).normalize(),t2=new THREE.Vector3().crossVectors(normal,t1).normalize(),eps=.0005,a=deform(...point.clone().addScaledVector(t1,eps).toArray()).sub(deform(...point.clone().addScaledVector(t1,-eps).toArray())),b=deform(...point.clone().addScaledVector(t2,eps).toArray()).sub(deform(...point.clone().addScaledVector(t2,-eps).toArray())),next=new THREE.Vector3().crossVectors(a,b).normalize();if(next.dot(normal)<0)next.negate();const out=deform(...point.toArray());p.setXYZ(i,out.x,out.y,out.z);n.setXYZ(i,next.x,next.y,next.z);}p.needsUpdate=n.needsUpdate=true;const q=at(u,v);return add(g,mat,q.x,base+y,q.z,rot,part);};
  const box=(u,y,v,ww,hh,dd,mat,part='')=>{const p=at(u,v);return add(new THREE.BoxGeometry(ww,hh,dd),mat,p.x,base+y,p.z,rot,part);};
  const oval=(u,y,v,ww,hh,dd,mat,part='')=>{const p=at(u,v),n=add(new THREE.SphereGeometry(1,detail,10),mat,p.x,base+y,p.z,rot,part);n.scale.set(ww/2,hh/2,dd/2);return n;};
  const cyl=(u,y,v,r,h,mat,part='')=>{const p=at(u,v);return add(new THREE.CylinderGeometry(r,r,h,detail),mat,p.x,base+y,p.z,rot,part);};
  const torus=(u,y,v,rx,rz,t,mat,part='')=>{const p=at(u,v),curve=new THREE.EllipseCurve(0,0,rx,rz,0,TAU,false,0),points=curve.getPoints(48).map(v=>new THREE.Vector3(v.x,0,v.y)),g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),48,t,8,true);return add(g,mat,p.x,base+y,p.z,rot,part);};
  const tube=(u,y,v,points,r,mat,part='')=>{const p=at(u,v),curve=new THREE.CatmullRomCurve3(points.map(([x,yy,z])=>new THREE.Vector3(x,yy,z)),false,'centripetal'),g=new THREE.TubeGeometry(curve,24,r,6,false),n=add(g,mat,p.x,base+y,p.z,rot,part);return n;};
  return {...f,w,d,rot,base,at,round,puffy,pillow,box,oval,cyl,torus,tube};
 };
 const piping=(c,u,y,v,w,d,mat)=>c.tube(u,y,v,[[-w/2,0,-d*.28],[-w*.34,0,-d/2],[w*.34,0,-d/2],[w/2,0,-d*.28],[w/2,0,d*.28],[w*.34,0,d/2],[-w*.34,0,d/2],[-w/2,0,d*.28],[-w/2,0,-d*.28]],.003,mat,'piping');
 function sofa(c,mezanino=false){
  const fabric=material(mezanino?'fabricGrey':'fabricTaupe'),pale=material('fabricWhite'),cloth=material('cloth',mezanino?'fabricGrey':'fabricTaupe'),wood=material('woodDark','wood');
  c.round(c.w/2,.16,c.d/2,c.w-.06,.28,c.d-.06,mezanino?wood:material('plaster'),.045,'sofa-frame');
  c.puffy(c.w/2,.37,c.d*.46,c.w-.10,.20,c.d*.67,cloth,.075,'seat-cushion',mezanino?.4:0);
  // Costura lateral rente à almofada, não uma linha flutuando sobre o assento.
  if(!mezanino)piping(c,c.w/2,.385,c.d*.46,c.w-.11,c.d*.665,fabric);
  // Banco da sala é alvenaria contínua atrás das almofadas; elimina a leitura de encosto flutuante.
  if(!mezanino)c.round(c.w/2,.30,c.d-.065,c.w-.06,.60,.10,material('plaster'),.025,'sofa-back-support');
  else c.round(c.w/2,.68,c.d-.10,c.w-.10,.58,.15,fabric,.055,'futon-grey-back');
  const count=mezanino?2:Math.max(2,Math.round(c.w/.68));
  for(let i=0;i<count;i++){const u=(i+.5)*c.w/count,ww=mezanino?Math.min(.55,c.w*.3):c.w/count-.065,cushion=c.pillow(u,mezanino?.66:.65,c.d-(mezanino?.24:.16),ww,mezanino?.38:.46,.23,mezanino?pale:cloth,'back-cushion');cushion.rotateX(mezanino?[-.075,-.11][i]:(-.085+(i%3)*.018));}
 }
 function bed(c,low=false){
  const white=material('fabricWhite'),linen=material('linen','fabricWhite'),wood=material('woodDark','wood');
  c.round(c.w/2,.12,c.d/2,c.w-.07,.18,c.d-.07,wood,.045,'bed-frame');c.puffy(c.w/2,.31,c.d/2,c.w-.10,.28,c.d-.10,white,.10,'mattress',.4);c.puffy(c.w/2,.47,c.d*.53,c.w-.14,.10,c.d*.78,linen,.045,'sheet',.8);
  c.round(c.w/2,.37,.09,c.w-.18,.22,.055,linen,.025,'sheet-drop');c.round(c.w/2,.37,c.d-.09,c.w-.18,.22,.055,linen,.025,'sheet-drop');c.round(.09,.36,c.d*.52,.055,.20,c.d*.62,linen,.02,'sheet-drop');c.round(c.w-.09,.36,c.d*.52,.055,.20,c.d*.62,linen,.02,'sheet-drop');
  if(!low)for(const [i,u] of[c.w*.34,c.w*.66].entries()){const pillow=c.pillow(u,.58,c.d*.29,c.w*.25,.14,c.d*.27,white,'pillow');pillow.rotation.z=(i?1:-1)*.045;}
 }
 function counter(c){
  const wood=material('wood'),dark=material('woodDark','wood'),stone=material('black','stone'),metal=material('metal'),black=material('black'),sinkU=c.w*.64,sinkV=c.d*.51,rx=Math.min(.17,c.w*.16),rz=Math.min(.16,c.d*.22),topY=.86;
  c.round(.06,.40,c.d/2,.09,.76,c.d-.08,material('plaster'),.02,'counter-side');c.round(c.w-.06,.40,c.d/2,.09,.76,c.d-.08,material('plaster'),.02,'counter-side');c.box(c.w/2,.25,c.d-.045,c.w-.15,.44,.045,material('plaster'),'counter-back');c.round(c.w*.30,.18,c.d*.55,c.w*.43,.06,c.d*.56,wood,.018,'counter-shelf');
  for(let i=0;i<3;i++){const u=(i+.5)*c.w/3;c.round(u,.45,.065,c.w/3-.04,.64,.035,wood,.012,'cabinet-front');c.round(u+.09,.64,.04,.025,.10,.025,black,.008,'cabinet-handle');}
  // Tampo contínuo com furo elíptico: não quatro placas desconexas.
  const edge=.035,shape=new THREE.Shape();shape.moveTo(-c.w/2+edge,-c.d/2+edge);shape.lineTo(c.w/2-edge,-c.d/2+edge);shape.lineTo(c.w/2-edge,c.d/2-edge);shape.lineTo(-c.w/2+edge,c.d/2-edge);shape.closePath();
  const hole=new THREE.Path();hole.absellipse(sinkU-c.w/2,-(sinkV-c.d/2),rx*.95,rz*.95,0,TAU,true);shape.holes.push(hole);
  const topGeo=new THREE.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false,curveSegments:32,steps:1}),uv=topGeo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2,uv.getY(i)/2);
  const center=c.at(c.w/2,c.d/2),top=add(topGeo,stone,center.x,c.base+topY-.04,center.z,c.rot,'countertop');top.rotateX(-Math.PI/2);
  c.torus(sinkU,topY+.052,sinkV,rx,rz,.014,material('stainless','metal'),'sink-rim');const p=c.at(sinkU,sinkV),bowlGeo=new THREE.SphereGeometry(1,detail,10,0,TAU,Math.PI/2,Math.PI/2),indices=bowlGeo.index.array,normals=bowlGeo.attributes.normal;
  for(let i=0;i<indices.length;i+=3){const swap=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=swap;}for(let i=0;i<normals.count;i++)normals.setXYZ(i,-normals.getX(i),-normals.getY(i),-normals.getZ(i));
  const bowl=add(bowlGeo,material('stainless','metal'),p.x,c.base+topY+.035,p.z,c.rot,'sink-bowl');bowl.scale.set(rx*.88,.16,rz*.88);c.cyl(sinkU,topY-.117,sinkV,.019,.012,black,'drain');
  const tapU=Math.max(.14,sinkU-rx*1.6),tapV=sinkV+rz+.035;c.cyl(tapU,topY+.13,tapV,.016,.24,metal,'tap-stem');c.tube(tapU,topY+.245,tapV,[[0,-.115,0],[0,.01,0],[(sinkU-tapU)*.22,.11,(sinkV-tapV)*.22],[(sinkU-tapU)*.8,.10,(sinkV-tapV)*.8],[sinkU-tapU,.04,sinkV-tapV]],.016,metal,'tap-curve');
 }
 function vanity(c,mirror=false){
  const stone=material('basinStone','stone'),wood=material('wood'),black=material('black','metal'),plaster=material('plaster'),topY=.86;c.round(c.w/2,topY,c.d/2,c.w-.035,.08,c.d-.04,plaster,.018,'vanity-top');c.round(.055,.45,c.d*.5,.075,.84,c.d-.05,plaster,.018,'vanity-side');c.round(c.w-.055,.45,c.d*.5,.075,.84,c.d-.05,plaster,.018,'vanity-side');c.box(c.w/2,.45,c.d-.045,c.w-.15,.70,.035,plaster,'vanity-back');c.round(c.w/2,.15,c.d*.54,c.w-.14,.055,c.d*.62,wood,.015,'vanity-shelf');
  // Uma casca contínua, com normais físicas para dentro e para fora. Duas
  // semiesferas sobrepostas com BackSide geravam AO preto no bake do Blender.
  const u=c.w*.52,v=c.d*.50,r=Math.min(c.w,c.d)*.25,p=c.at(u,v);
  const profile=[[0,.045],[r*.35,.045],[r*.62,.055],[r*.84,.10],[r,.16],[r*.98,.175],[r*.90,.17],[r*.84,.15],[r*.70,.105],[r*.48,.075],[0,.07]];
  const bowl=add(new THREE.LatheGeometry(profile.map(q=>new THREE.Vector2(...q)),48),stone,p.x,c.base+topY,p.z,c.rot,'basin-bowl');bowl.scale.z=.74;c.cyl(u,topY+.074,v,.015,.008,black,'drain');
  const tapU=Math.max(.11,u-r*1.45),tapV=v+r*.8;c.cyl(tapU,topY+.19,tapV,.014,.28,black,'tap-stem');c.tube(tapU,topY+.33,tapV,[[0,-.14,0],[0,.01,0],[(u-tapU)*.25,.08,(v-tapV)*.25],[(u-tapU)*.8,.08,(v-tapV)*.8],[u-tapU,.035,v-tapV]],.014,black,'tap-curve');if(mirror){c.round(c.w/2,1.35,c.d-.028,c.w*.72,.58,.03,wood,.012,'mirror-frame');c.box(c.w/2,1.35,c.d-.047,c.w*.58,.45,.012,material('mirror'),'mirror');}
 }
 function toilet(c){
   const ceramic=material('ceramic','white'),r=Math.min(c.w,c.d)*.32;
   const profile=[[r*.48,.02],[r*.58,.08],[r*.65,.22],[r*.96,.34],[r,.42],[r*.94,.45],[r*.77,.43],[r*.62,.32],[r*.30,.22],[r*.12,.18]];
   const g=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),32),p=c.at(c.w/2,c.d*.44),body=add(g,ceramic,p.x,c.base,p.z,c.rot,'toilet-body');body.scale.z=1.12;
   c.torus(c.w/2,.46,c.d*.44,r*.87,r*.98,.024,ceramic,'toilet-open-ring');
   c.round(c.w/2,.67,c.d*.80,c.w*.58,.36,c.d*.24,ceramic,.07,'toilet-tank');
  }
 function fridge(c){const steel=material('metal','black'),black=material('black'),handle=material('woodDark','wood');c.round(c.w/2,.98,c.d/2,c.w-.06,1.92,c.d-.06,steel,.10,'fridge-body');c.round(c.w/2,1.43,.045,c.w-.16,.026,.018,black,.006,'fridge-seam');c.round(c.w*.47,1.78,.035,.026,.48,.035,handle,.008,'fridge-handle');c.round(c.w*.47,.92,.035,.026,.42,.035,handle,.008,'fridge-handle');}
 function table(c,mezanino=false){const wood=material('wood'),dark=material('woodDark','wood');if(mezanino){const shape=new THREE.Shape(),rx=(c.w-.12)/2,rz=(c.d-.12)/2;for(let i=0;i<=16;i++){const a=i/16*TAU,x=Math.cos(a)*rx*(1+.055*Math.sin(a*3)),z=Math.sin(a)*rz*(1+.045*Math.cos(a*5));i?shape.lineTo(x,z):shape.moveTo(x,z);}const g=new THREE.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:false,curveSegments:16});g.translate(0,0,-.0375);g.rotateX(Math.PI/2);const p=c.at(c.w/2,c.d/2);add(g,wood,p.x,c.base+.48,p.z,c.rot,'live-edge-top');for(const [u,v] of[[.18,.20],[c.w-.18,.27],[c.w*.48,c.d-.17]])c.cyl(u,.24,v,.05,.46,dark,'table-leg');}else{c.round(c.w/2,.47,c.d/2,c.w-.11,.10,c.d-.11,wood,.06,'tabletop');for(const u of[.16,c.w-.16])for(const v of[.16,c.d-.16])c.cyl(u,.23,v,.045,.46,dark,'table-leg');}}
 for(const f of furniture){const c=ctx(f),first=meshes.length;if(f.kind==='sofa')sofa(c,f.id==='sofaMezanino');else if(f.kind==='bed')bed(c,f.id==='cama18');else if(f.kind==='counter')counter(c);else if(f.kind==='vanity')vanity(c,true);else if(f.kind==='toilet')toilet(c);else if(f.kind==='fridge')fridge(c);else if(f.kind==='table')table(c,f.id==='mesaMezanino');for(const node of meshes.slice(first))node.userData.interiorId=f.id;byId[f.id]={meshes:meshes.length-first,photo:{sofa:10,sofaDireito:11,sofaFundo:10,sofaMezanino:1,bancada:7,vanity1:13,vanity2:16,cama15:15,cama18:18}[f.id]||null,footprint:[...f.rect]};}
 let triangles=0;for(const node of meshes){const g=node.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3;}const budget=50000;return {meshes,byId,triangles,budget,withinBudget:triangles<=budget};
}
