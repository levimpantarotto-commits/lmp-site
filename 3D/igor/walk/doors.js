// Portas independentes de nav.js: recebem a geometria já resolvida pelo chamador.
const R=.245,THICK=.09,SWEEP=THICK/2+.02,EPS=.001;
const distanceToSegment=(x,z,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,d=dx*dx+dz*dz,t=d?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/d)):0;return Math.hypot(x-(a.x+dx*t),z-(a.z+dz*t));};
const inside=(x,z,r,pad=0)=>x>r[0]-pad&&x<r[2]+pad&&z>r[1]-pad&&z<r[3]+pad;
const finitePlayer=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.y);
const point=(hinge,angle,length)=>({x:hinge.x+Math.cos(angle)*length,z:hinge.z+Math.sin(angle)*length});

function leafSegment(leaf,open){return{a:leaf.hinge,b:point(leaf.hinge,leaf.closedAngle+(open?leaf.direction*Math.PI/2:0),leaf.length)};}
function wallBlocks(wall,x,z,base,height){const a={x:wall.a[0],z:wall.a[1]},b={x:wall.b[0],z:wall.b[1]},dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(length*length)));if(distanceToSegment(x,z,a,b)>=SWEEP)return false;const along=t*length;return !(wall.openings||[]).some(opening=>opening.type==='door'&&along>=opening.from-EPS&&along<=opening.to+EPS&&base<wall.base+(opening.top??wall.height)-EPS&&base+height>wall.base+(opening.bottom||0)+EPS);}
function leafBlocked(leaf,open,player,walls,furniture,exteriorObstacles,ownWall){
 const segment=leafSegment(leaf,open);const samples=8;
 for(let i=0;i<=samples;i++){const t=i/samples,x=segment.a.x+(segment.b.x-segment.a.x)*t,z=segment.a.z+(segment.b.z-segment.a.z)*t;
  if(player&&Math.hypot(player.x-x,player.z-z)<R+.16&&Math.abs(player.y-leaf.base)<2.7)return true;
  if(furniture.some(f=>Math.abs((f.level||0)-leaf.base)<.35&&inside(x,z,f.rect,SWEEP)))return true;
  if(leaf.base<.35&&exteriorObstacles.some(rect=>inside(x,z,rect,SWEEP)))return true;
  // Uma parede perpendicular pode terminar exatamente no pino: é o batente,
  // não um obstáculo à rotação. O restante da folha continua sendo amostrado.
  if(Math.hypot(x-leaf.hinge.x,z-leaf.hinge.z)>=SWEEP+EPS&&walls.some((wall,index)=>index!==ownWall&&leaf.base<wall.base+wall.height-EPS&&leaf.base+leaf.height>wall.base+EPS&&wallBlocks(wall,x,z,leaf.base,leaf.height)))return true;
 }
 return false;
}
function sweepBlocked(leaf,fromOpen,toOpen,player,walls,furniture,exteriorObstacles,ownWall){for(let step=0;step<=12;step++){const amount=fromOpen+(toOpen-fromOpen)*step/12,fake={...leaf,closedAngle:leaf.closedAngle+leaf.direction*Math.PI/2*amount};if(amount===0){if(leafBlocked(fake,false,player,[],[],[],ownWall))return true;continue;}if(leafBlocked(fake,false,player,walls,furniture,exteriorObstacles,ownWall))return true;}return false;}

export function createDoors(walls=[],furniture=[],exteriorObstacles=[]){
 const specs=[];let sequence=0,refreshMeshes=()=>{};
 walls.forEach((wall,wallIndex)=>{const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz)||1,angle=Math.atan2(dz,dx);
  (wall.openings||[]).filter(opening=>opening.type==='door').forEach(opening=>{
   const width=opening.to-opening.from,base=wall.base+(opening.bottom||0),height=(opening.top??wall.height)-(opening.bottom||0),id=`door-${sequence++}`;
   const makeLeaf=(from,to,hingeAtStart)=>{const hingeDistance=hingeAtStart?from:to;const hinge={x:wall.a[0]+Math.cos(angle)*hingeDistance,z:wall.a[1]+Math.sin(angle)*hingeDistance};return{hinge,length:to-from,closedAngle:hingeAtStart?angle:angle+Math.PI,direction:1,base,height};};
   const leaves=width<=1.4?[makeLeaf(opening.from,opening.to,true)]:[makeLeaf(opening.from,(opening.from+opening.to)/2,true),makeLeaf((opening.from+opening.to)/2,opening.to,false)];
   // Escolhe a abertura de 90° com varredura livre; se ambas falharem, mantém
   // a alternativa menos surpreendente e deixa a porta fechada (segura).
   const spec={id,wallIndex,opening:{...opening},base,height,width,leaves,open:false,status:'fechada'};
   for(const [li,leaf] of leaves.entries()){const candidates=opening.style==='glazed-timber'&&li===1?[-1,1]:[1,-1];const usable=candidates.find(direction=>{leaf.direction=direction;return !sweepBlocked(leaf,0,1,null,walls,furniture,exteriorObstacles,wallIndex);});if(usable===undefined){leaf.direction=1;spec.status='bloqueada';}else leaf.direction=usable;}
   if(spec.status==='bloqueada')spec.open=false;
   else if(opening.initialOpen===false){spec.open=false;spec.status='fechada';}
   else{spec.open=true;spec.status='aberta';}
   specs.push(spec);
  });
 });
 const collides=(x,z,y=0)=>specs.some(spec=>spec.leaves.some(leaf=>y>=leaf.base-EPS&&y<=leaf.base+leaf.height+EPS&&distanceToSegment(x,z,...Object.values(leafSegment(leaf,spec.open)))<R));
 const snapshot=()=>specs.map(spec=>({id:spec.id,wallIndex:spec.wallIndex,opening:{...spec.opening},open:spec.open,status:spec.status,width:spec.width,leaves:spec.leaves.map(leaf=>({hinge:{...leaf.hinge},length:leaf.length,direction:leaf.direction}))}));
 const nearest=player=>{if(!finitePlayer(player))return null;let found=null;for(const spec of specs){if(Math.abs(player.y-spec.base)>.35)continue;const middle=spec.opening.from+spec.width/2,wall=walls[spec.wallIndex],angle=Math.atan2(wall.b[1]-wall.a[1],wall.b[0]-wall.a[0]),x=wall.a[0]+Math.cos(angle)*middle,z=wall.a[1]+Math.sin(angle)*middle,distance=Math.hypot(player.x-x,player.z-z);if((!found||distance<found.distance)&&distance<=1.6)found={id:spec.id,distance,open:spec.open,status:spec.status};}return found;};
 const toggle=(id,player)=>{const spec=specs.find(door=>door.id===id);if(!spec)return{ok:false,status:'porta_inexistente',id};if(!finitePlayer(player))return{ok:false,status:'jogador_invalido',id};
  if(Math.abs(player.y-spec.base)>.35)return{ok:false,status:'andar_incorreto',id,open:spec.open};const wall=walls[spec.wallIndex],length=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]),u=(spec.opening.from+spec.opening.to)/2,cx=wall.a[0]+u*(wall.b[0]-wall.a[0])/length,cz=wall.a[1]+u*(wall.b[1]-wall.a[1])/length;if(Math.hypot(player.x-cx,player.z-cz)>1.6)return{ok:false,status:'fora_de_alcance',id,open:spec.open};
  const target=!spec.open;
  // Varre a mudança instantânea para não atravessar jogador, móveis ou paredes.
  for(const leaf of spec.leaves)if(sweepBlocked(leaf,spec.open?1:0,target?1:0,player,walls,furniture,exteriorObstacles,spec.wallIndex))return{ok:false,status:'passagem_obstruida',id,open:spec.open};
  spec.open=target;spec.status=target?'aberta':'fechada';refreshMeshes();return{ok:true,status:spec.status,id,open:spec.open};
 };
 const build=(THREE,parent,materials={})=>{const built=buildDoorMeshes(THREE,parent,materials,specs);refreshMeshes=built.update;return built;};
 return {specs,collides,toggle,nearest,build,snapshot};
}

export function buildDoorMeshes(THREE,parent,materials={},specs=[],setRefresh){
 const root=THREE.Group?new THREE.Group():new THREE.Object3D();parent?.add?.(root);const entries=[];
 for(const spec of specs)for(const leaf of spec.leaves){const pivot=THREE.Group?new THREE.Group():new THREE.Object3D(),wood=materials.door||materials.wood||materials.woodDark,metal=materials.metal||materials.woodDark;
  root.add(pivot);const mesh=(geometry,material,name)=>{const node=new THREE.Mesh(geometry,material);node.name=name||'';node.castShadow=node.receiveShadow=true;const uv=geometry.attributes?.uv,n=geometry.attributes?.normal,p=geometry.parameters;if(uv&&n&&p?.width){for(let i=0;i<uv.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,uv.getX(i)*(nx>.5?p.depth:p.width)/2,uv.getY(i)*(ny>.5?p.depth:p.height)/2);}uv.needsUpdate=true;}return node;};
  if(spec.opening.style==='glazed-timber'){
   // Foto 05 inspira a divisão; dimensões e número de faixas são derivados para o estudo.
   const frame=materials.woodDark||wood,glass=materials.glass||frame,rail=.09,inside=Math.max(.04,leaf.length-rail*2),addFrame=(width,height,x,y,name='door-glazed-frame')=>{const part=mesh(new THREE.BoxGeometry(width,height,THICK),frame,name);part.position.set(x,y,0);pivot.add(part);};
   addFrame(rail,leaf.height,rail/2,leaf.base+leaf.height/2);addFrame(rail,leaf.height,leaf.length-rail/2,leaf.base+leaf.height/2);
   addFrame(inside,.10,leaf.length/2,leaf.base+leaf.height-.05);addFrame(inside,.10,leaf.length/2,leaf.base+.05);
   // Faixa baixa de madeira e soleira deixam o vidro começar a 65 cm do piso.
   addFrame(inside,.45,leaf.length/2,leaf.base+.325,'door-glazed-lower-band');addFrame(inside,.10,leaf.length/2,leaf.base+.60);
   const paneBottom=leaf.base+.65,paneTop=Math.min(leaf.base+2.10,leaf.base+leaf.height-.12),gap=.055,paneHeight=Math.max(.04,(paneTop-paneBottom-gap*3)/4);
   const upperBand=leaf.base+leaf.height-.10-paneTop;if(upperBand>0)addFrame(inside,upperBand,leaf.length/2,paneTop+upperBand/2,'door-glazed-upper-band');
   for(let i=0;i<4;i++){const pane=mesh(new THREE.BoxGeometry(inside-.025,paneHeight,.018),glass,'door-glazed-pane');pane.position.set(leaf.length/2,paneBottom+paneHeight/2+i*(paneHeight+gap),0);pivot.add(pane);if(i<3)addFrame(inside,.055,leaf.length/2,paneBottom+paneHeight+i*(paneHeight+gap));}
  }else{
   const slab=mesh(new THREE.BoxGeometry(leaf.length,leaf.height,THICK),wood,'door-leaf-slab');slab.position.set(leaf.length/2,leaf.base+leaf.height/2,0);pivot.add(slab);
   for(const side of[-1,1]){const panel=mesh(new THREE.BoxGeometry(Math.max(.04,leaf.length-.16),Math.max(.04,leaf.height-.32),.018),materials.doorPanel||wood,'door-panel');panel.position.set(leaf.length/2,leaf.base+leaf.height/2,side*(THICK/2+.012));pivot.add(panel);}
  }
  for(const side of[-1,1]){const handle=mesh(new THREE.CylinderGeometry(.027,.027,.12,8),metal,'door-handle');handle.rotation.z=Math.PI/2;handle.position.set(Math.max(.13,leaf.length-.16),leaf.base+leaf.height*.48,side*(THICK/2+.04));pivot.add(handle);}
  for(const fraction of[.2,.8]){const hinge=mesh(new THREE.CylinderGeometry(.018,.018,.12,8),metal);hinge.position.set(.03,leaf.base+leaf.height*fraction,0);pivot.add(hinge);}entries.push({spec,leaf,pivot});
 }
 const update=()=>entries.forEach(({spec,leaf,pivot})=>{pivot.position.set(leaf.hinge.x,0,leaf.hinge.z);pivot.rotation.y=-(leaf.closedAngle+(spec.open?leaf.direction*Math.PI/2:0));});update();
 if(setRefresh)setRefresh(update);return{root,update};
}
