import * as THREE from './vendor/three.module.js';
import {createMaterials} from './materials.js';
import {buildExterior,addReferenceTrees} from './exterior.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {createFootsteps} from './footsteps.js';
import {exportBakeSource,applyBakedLighting} from './baked-lighting.js';
import {facadeAxis,worldX,worldYaw,movement} from './view-transform.js';
import {rooms,floorAreas,walls,furniture,stairs,move,roomAt,isWalkable,doorSystem} from './nav.js';
const $=id=>document.getElementById(id),canvas=$('cena'),mobile=matchMedia('(pointer:coarse)').matches;
let renderer,stopped=false,frame=0;
const footsteps=createFootsteps();
function fallback(reason){stopped=true;footsteps.stop();cancelAnimationFrame(frame);$('fallback').hidden=false;$('failure-reason').textContent=reason;$('cover').hidden=true;$('ui').hidden=true;}
$('retry').onclick=()=>location.reload();
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch{fallback('Este navegador não conseguiu iniciar o 3D. As fotos originais continuam disponíveis.');}
if(renderer) await startScene();
async function startScene(){
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#a3cae8');scene.fog=new THREE.Fog('#c8d9d2',55,130);
 const camera=new THREE.PerspectiveCamera(mobile?78:60,1,.05,120);camera.rotation.order='YXZ';const ambientFill=new THREE.HemisphereLight(0xd8e8ff,0x8b805c,1.55);scene.add(ambientFill);
 const sun=new THREE.DirectionalLight(0xffefd9,3.15);sun.position.set(-9,18,-12);sun.target.position.set(4,0,5);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:55});sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;scene.add(sun,sun.target);
 const random=n=>{const v=Math.sin(n*97.13+11.5)*43958.27;return v-Math.floor(v);};
 const started=performance.now(),M=await createMaterials(THREE,renderer,{mobile});M.wood.normalScale.set(.35,.35);M.deck.normalScale.set(.35,.35);M.stone.normalScale.set(.65,.65);
 M.plaster.color.set(0xeadfc9);M.plaster.normalScale.set(.16,.16);M.tile.normalScale.set(.22,.22);M.tile.roughness=.58;M.woodDark.map=M.wood.map;M.woodDark.normalMap=M.wood.normalMap;M.woodDark.normalScale.set(.25,.25);M.woodDark.roughness=.8;
 // HDR da base do Vale para reflexos. O bake guarda luz indireta em mapas
 // separados do albedo; as fotos do imóvel continuam sendo referência.
 const hdr=await new HDRLoader().loadAsync(new URL('./assets/ceu.hdr',import.meta.url).href);
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(hdr);
 scene.environment=environment.texture;scene.environmentIntensity=.55;hdr.dispose();pmrem.dispose();
 const material=(color,roughness=.8,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
 function box(x,y,z,w,h,d,mat=M.plaster,rotation=0){const geo=new THREE.BoxGeometry(w,h,d),uv=geo.attributes.uv,norm=geo.attributes.normal;for(let i=0;i<uv.count;i++){const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i));uv.setXY(i,uv.getX(i)*(nx>.5?d:w)/2,uv.getY(i)*(ny>.5?d:h)/2);}const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);return mesh;}
 function cylinder(x,y,z,r,h,mat,segments=18){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);return mesh;}
 function softBox(x,y,z,w,h,d,mat=M.linen){const r=Math.min(.09,w*.1,h*.2),s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const geo=new THREE.ExtrudeGeometry(s,{depth:d,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.025,curveSegments:3});geo.translate(0,0,-d/2);const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);return mesh;}
 // Pisos e vãos: geometria e colisão compartilham a mesma fonte.
 floorAreas.forEach(f=>{const holes=f.holes||[],xs=[f.rect[0],f.rect[2],...holes.flatMap(h=>[h[0],h[2]])].sort((a,b)=>a-b),zs=[f.rect[1],f.rect[3],...holes.flatMap(h=>[h[1],h[3]])].sort((a,b)=>a-b);for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){const x=(xs[i-1]+xs[i])/2,z=(zs[j-1]+zs[j])/2;if(xs[i]-xs[i-1]<.001||zs[j]-zs[j-1]<.001||holes.some(h=>x>h[0]&&x<h[2]&&z>h[1]&&z<h[3]))continue;box(x,f.level-.08,z,xs[i]-xs[i-1],.16,zs[j]-zs[j-1],M[f.material]||M.wood);}});
 walls.forEach(w=>{const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],length=Math.hypot(dx,dz),rot=-Math.atan2(dz,dx),nx=dx/length,nz=dz/length,open=w.openings||[],xs=[0,length,...open.flatMap(o=>[o.from,o.to])].sort((a,b)=>a-b),ys=[0,w.height,...open.flatMap(o=>[o.bottom,o.top])].sort((a,b)=>a-b),place=(u,v,width,height,depth,mat)=>box(w.a[0]+nx*u,w.base+v,w.a[1]+nz*u,width,height,depth,mat,rot);
  for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const u=(xs[i-1]+xs[i])/2,v=(ys[j-1]+ys[j])/2;if(xs[i]-xs[i-1]<.001||ys[j]-ys[j-1]<.001||open.some(o=>u>o.from&&u<o.to&&v>o.bottom&&v<o.top))continue;place(u,v,xs[i]-xs[i-1],ys[j]-ys[j-1],.18,M[w.material]||M.plaster);}
  for(const o of open){const width=o.to-o.from,h=o.top-o.bottom,mid=(o.from+o.to)/2,cy=(o.top+o.bottom)/2;place(o.from,cy,.055,h+.08,.22,M.woodDark);place(o.to,cy,.055,h+.08,.22,M.woodDark);place(mid,o.top,width,.06,.22,M.woodDark);if(o.type==='window'){place(mid,o.bottom,width,.06,.24,M.woodDark);place(mid,cy,width-.07,h-.07,.026,M.glass);if(width>1.2)place(mid,cy,.035,h,.09,M.woodDark);}else place(mid,.02,width,.04,.25,M.wood);}
 });
 // Juntas finas do porcelanato observado nas fotos06/11, sem alterar colisão.
 const grout=material(0xb8b2a5,.92);
 for(const f of floorAreas.filter(f=>f.material==='tile'&&f.level===0)){const[a,b,c,d]=f.rect;for(let x=a+.6;x<c-.01;x+=.6)box(x,.002,(b+d)/2,.004,.003,d-b,grout).castShadow=false;for(let z=b+.6;z<d-.01;z+=.6)box((a+c)/2,.002,z,c-a,.003,.004,grout).castShadow=false;}
 const count=18,[sx,sz,ex,ez]=stairs.rect,run=(ez-sz)/count,rise=(stairs.to-stairs.from)/count;
 for(let i=0;i<count;i++)box((sx+ex)/2,stairs.from+(i+1)*rise-.035,sz+(i+.5)*run,ex-sx,.07,run+.015,M.wood);
 for(const x of[sx+.04,ex-.04]){for(let i=1;i<count;i+=3)box(x,(i+1)*rise+.45,sz+(i+.5)*run,.035,.9,.035,M.woodDark);const rail=box(x,1.5+.9,(sz+ez)/2,.045,.045,Math.hypot(ez-sz,stairs.to),M.woodDark);rail.rotation.x=-Math.atan2(stairs.to,ez-sz);}
 [[1.85,3,5.3,.05,.9,3.6],[.9,3,3.45,1.85,.9,.05]].forEach(([x,y,z,w,h,d])=>{box(x,y+h/2,z,w,h,d,M.glass);box(x,y+h,z,w+.03,.045,d+.03,M.woodDark);});
 for(let z=.6;z<9;z+=1.35)box(2.9,5.65,z,6.3,.16,.17,M.woodDark);
 buildExterior(THREE,scene,M,box,cylinder);
 for(const r of rooms.filter(r=>['banheiro1','banheiro2','hall','quarto15'].includes(r.id))){const[a,b,c,d]=r.rect;box((a+c)/2,2.93,(b+d)/2,c-a,.1,d-b,M.wood);const roof=box((a+c)/2,3.3,(b+d)/2,c-a+.4,.14,d-b+.4,M.roof);roof.rotation.x=-.07;}
 for(let z=.8;z<9;z+=1.7){const opening=z>3.5&&z<7.1;box(opening?3.8:2.9,2.86,z,opening?4:5.8,.13,.16,M.woodDark);}
 furniture.filter(f=>f.id!=='mesa').forEach(f=>{const firstMesh=scene.children.length,rect=f.turn?[0,0,f.rect[3]-f.rect[1],f.rect[2]-f.rect[0]]:f.rect,[a,b,c,d]=rect,x=(a+c)/2,z=(b+d)/2,w=c-a,depth=d-b,y=f.level||0;
  if(f.kind==='sofa'){softBox(x,y+.28,z,w,.32,depth);const n=Math.max(2,Math.round(w/.65));for(let i=0;i<n;i++){softBox(a+(i+.5)*w/n,y+.53,z,w/n-.03,.17,depth*.92);softBox(a+(i+.5)*w/n,y+.88,d-.16,w/n-.035,.58,.22);}softBox(a+.09,y+.65,z,.18,.5,depth);softBox(c-.09,y+.65,z,.18,.5,depth);}
  else if(f.kind==='bed'){box(x,y+.2,z,w,.3,depth,M.woodDark);softBox(x,y+.47,z,w-.05,.25,depth-.05,M.white);softBox(x,y+.63,d-.35,w*.7,.16,.48,M.linen);box(x,y+.75,d-.06,w,.9,.12,M.wood);}
  else if(f.kind==='table'){box(x,y+.78,z,w,.08,depth,M.wood);for(const xx of[a+.12,c-.12])for(const zz of[b+.12,d-.12])box(xx,y+.38,zz,.06,.72,.06,M.woodDark);}
  else if(f.kind==='counter'||f.kind==='vanity'){
   box(x,y+.44,z,w,.88,depth,M.plaster);box(x,y+.12,b-.025,w-.13,.15,.06,M.woodDark);
   const n=Math.ceil(w/.5);for(let i=0;i<n;i++){const center=a+(i+.5)*w/n,panelWidth=w/n-.075;box(center,y+.48,b-.023,panelWidth,.68,.045,M.wood);for(const xx of[center-panelWidth/2+.035,center+panelWidth/2-.035])box(xx,y+.48,b-.05,.045,.66,.025,M.woodDark);for(const yy of[.18,.78])box(center,y+yy,b-.05,panelWidth,.04,.025,M.woodDark);box(center+panelWidth*.25,y+.65,b-.075,.025,.12,.045,M.metal);}
   box(x,y+.92,z,w+.04,.09,depth+.04,M.plaster);box(x,y+1.02,d-.03,w,.16,.08,M.plaster);
   if(f.kind==='vanity'){cylinder(x,y+1.0,z,Math.min(w*.26,.25),.13,M.white);box(x,y+1.75,d-.06,w*.82,.8,.035,M.mirror);}
   else{const sink=c-.43;box(sink,y+.973,z,.6,.018,depth*.63,M.metal);box(sink,y+.984,z,.48,.015,depth*.48,M.black);cylinder(sink,y+1.13,z+.19,.018,.30,M.metal,14);box(sink,y+1.27,z+.12,.035,.035,.16,M.metal);}
  }
  else if(f.kind==='fridge'){const steel=material(0xb0b5b1,.32,{metalness:.7});softBox(x,y+1.02,z,w,2,depth,steel);box(x,y+1.41,b-.04,w-.05,.025,.02,M.black);for(const cy of[.9,1.7])box(c-.12,y+cy,b-.075,.028,.36,.06,M.metal);}
  else if(f.kind==='toilet'){cylinder(x,y+.23,z,Math.min(w,depth)*.32,.4,M.white);softBox(x,y+.43,z,w*.8,.12,depth*.8,M.white);box(x,y+.65,d-.12,w*.7,.42,.18,M.white);}
  else box(x,y+(f.height||2.1)/2,z,w,f.height||2.1,depth,M.wood);if(f.turn){const transform=new THREE.Matrix4().makeTranslation((f.rect[0]+f.rect[2])/2,0,(f.rect[1]+f.rect[3])/2).multiply(new THREE.Matrix4().makeRotationY(f.turn)).multiply(new THREE.Matrix4().makeTranslation(-x,0,-z));for(const mesh of scene.children.slice(firstMesh))mesh.applyMatrix4(transform);}
 });
 // Prateleiras e utensílios da foto06, restritos à área sobre a bancada.
 for(const h of[1.65,2.15]){box(5.55,h,8.15,.34,.055,1.18,M.wood);for(let i=0;i<4;i++){const z=7.73+i*.27;cylinder(5.48,h+.12,z,.055,.20,M.white,16);cylinder(5.48,h+.225,z,.058,.02,M.woodDark,16);}}
 for(const [x,z,y] of[[2.8,3.1,2.62],[4.1,7.1,2.65],[2.9,2.2,5.55]]){cylinder(x,y,z,.16,.25,M.woodDark);cylinder(x,y-.14,z,.11,.025,M.light);const light=new THREE.PointLight(0xffd4a1,3.2,6,2);light.position.set(x,y-.25,z);scene.add(light);}
 box(2.9,.09,9,5.8,.17,.045,M.woodDark);
 box(2.9,2.86,4.2,.2,.25,8.7,M.woodDark);
 const planter=material(0x76634d,.92),leaf=material(0x425b32,.94);
 for(const [x,z] of[[3.6,-1.4],[5.5,-1.4],[-3,3],[-3,7]]){const pot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.15,.44,24),planter);pot.position.set(x,.22,z);pot.castShadow=pot.receiveShadow=true;scene.add(pot);cylinder(x,.44,z,.19,.025,M.grass);const vertices=[],uvs=[];for(let i=0;i<26;i++){const angle=i*2.399,stretch=.4+random(i)*.42;for(let j=0;j<7;j++){const points=[];for(const t of[j/7,(j+1)/7]){const radius=.04+.43*t*t,height=.45+stretch*Math.sin(t*2.0),half=.026*Math.pow(Math.sin(Math.PI*t),.6);for(const side of[-1,1])points.push([x+Math.sin(angle)*radius+Math.cos(angle)*half*side,height,z+Math.cos(angle)*radius-Math.sin(angle)*half*side]);}for(const k of[0,1,2,2,1,3])vertices.push(...points[k]);uvs.push(0,j/7,1,j/7,0,(j+1)/7,0,(j+1)/7,1,j/7,1,(j+1)/7);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();leaf.side=THREE.DoubleSide;const plant=new THREE.Mesh(geo,leaf);plant.castShadow=plant.receiveShadow=true;scene.add(plant);}
 box(6,-.25,4,60,.25,60,M.grass);
 // A casa é estática: agrupar superfícies opacas reduz chamadas sem alterar
 // o contrato de colisão. Vidros permanecem separados para ordenação correta.
 const batches=new Map();scene.updateMatrixWorld(true);
 for(const mesh of [...scene.children]){if(!mesh.isMesh||mesh.material.transparent)continue;const key=`${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}`;if(!batches.has(key))batches.set(key,{material:mesh.material,cast:mesh.castShadow,receive:mesh.receiveShadow,items:[]});const clone=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),flat=clone.index?clone.toNonIndexed():clone;batches.get(key).items.push(flat);if(flat!==clone)clone.dispose();scene.remove(mesh);mesh.geometry.dispose();}
 for(const batch of batches.values()){const geometry=new THREE.BufferGeometry();for(const name of ['position','normal','uv']){const size=batch.items[0].attributes[name].itemSize,length=batch.items.reduce((n,g)=>n+g.attributes[name].array.length,0),values=new Float32Array(length);let offset=0;for(const g of batch.items){values.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}geometry.setAttribute(name,new THREE.BufferAttribute(values,size));}geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,batch.material);mesh.castShadow=batch.cast;mesh.receiveShadow=batch.receive;scene.add(mesh);batch.items.forEach(g=>g.dispose());}
 const exportBake=()=>exportBakeSource(scene,M);
 let bakedStats={enabled:false};
 const lightQuery=new URLSearchParams(location.search);
 if(lightQuery.get('lighting')!=='baseline'&&!lightQuery.has('bake-export'))bakedStats=await applyBakedLighting(THREE,scene,{mobile}).catch(error=>({enabled:false,reason:error.message}));
 if(bakedStats.enabled)ambientFill.intensity=.28;
 // Folhas móveis ficam fora do agrupamento estático. A mesma instância
 // alimenta a geometria, a interação e a colisão de nav.js.
 doorSystem.build(THREE,scene,M);
 const bakeSnapshot=new URLSearchParams(location.search).has('bake-export')?exportBake():null;
 const vegetationStats=await addReferenceTrees(THREE,scene,{mobile});
 const visualRoot=new THREE.Group();for(const child of [...scene.children])visualRoot.add(child);visualRoot.scale.x=-1;visualRoot.position.x=facadeAxis;scene.add(visualRoot);
 let state={x:11,z:-14,y:0},yaw=2.69,pitch=.035,walking=false,drag=false,lastX=0,lastY=0,lastTime=0,activeRoom=null;
 const keys=new Set(),keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
 const stairRoom={id:'escada',name:'Escada',note:'Ligação observada; altura e inclinação estimadas.',kind:'CONEXÃO ENTRE PAVIMENTOS',photo:11};
 function syncRoom(){const r=(state.y>.15&&state.y<2.85)?stairRoom:roomAt(state.x,state.z,state.y)||rooms.find(r=>r.id==='jardim')||rooms[0];if(r!==activeRoom){activeRoom=r;$('room').textContent=r.name;$('roomNote').textContent=r.note||'Ligação e proporção estimadas a partir das fotos.';$('kind').textContent=r.kind;document.querySelectorAll('#places button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===r.id)));}const marker=$('you');marker.setAttribute('cx',String((worldX(state.x)+11)*5));marker.setAttribute('cy',String((state.z+19)*5));marker.setAttribute('fill',state.y>1.5?'#edaf74':'#fff');}
 function updateDoorControl(){const near=doorSystem.nearest(state),button=$('door-toggle');button.hidden=!near||!walking;button.dataset.id=near?.id||'';if(near)button.textContent=(near.open?'Fechar porta':'Abrir porta')+' · E';}
 function toggleDoor(){const id=$('door-toggle').dataset.id;if(!id)return;stopMoving();const result=doorSystem.toggle(id,state);$('door-message').textContent=result.ok?'':result.status==='passagem_obstruida'?'Afaste-se um passo para liberar a abertura da porta.':'Aproxime-se da porta.';requestRender();}
 $('door-toggle').onclick=toggleDoor;
 addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat&&walking&&!$('photoDialog').open&&$('cover').hidden){e.preventDefault();toggleDoor();}});
 function render(){camera.position.set(worldX(state.x),state.y+1.65,state.z);camera.rotation.set(pitch,worldYaw(yaw),0);syncRoom();updateDoorControl();renderer.render(scene,camera);}
 function footSurface(){if(state.y>.15&&state.y<2.85)return 'wood';const a=floorAreas.find(a=>Math.abs(a.level-state.y)<.2&&state.x>a.rect[0]&&state.x<a.rect[2]&&state.z>a.rect[1]&&state.z<a.rect[3]);if(a?.material==='grass'&&state.z<0){const p=[[-6,0],[-6,-8.4],[-.8,-7],[5.5,-3.9],[10.3,-3.9],[10.3,0]];let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>state.z)!==(p[j][1]>state.z)&&state.x<(p[j][0]-p[i][0])*(state.z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])inside=!inside;}if(inside)return 'stone';}return a?.material||'stone';}
 function tick(t){frame=0;if(stopped)return;const dt=Math.min(.04,(t-(lastTime||t))/1000);lastTime=t;if(walking&&keys.size&&!$('photoDialog').open){let f=(keys.has('forward')?1:0)-(keys.has('back')?1:0),s=(keys.has('right')?1:0)-(keys.has('left')?1:0),n=Math.hypot(f,s)||1;f/=n;s/=n;const delta=movement(yaw,f,s),before=state;state=move(state,delta.x*dt*2.3,delta.z*dt*2.3);footsteps.moved(before,state,footSurface());}render();if(walking&&keys.size&&!$('photoDialog').open)frame=requestAnimationFrame(tick);else{lastTime=0;void footsteps.stop();}}
 function requestRender(){if(!stopped&&!frame)frame=requestAnimationFrame(tick);}
 function stopMoving(){keys.clear();drag=false;lastTime=0;footsteps.stop();requestRender();}
 function setWalking(value){walking=value;$('walk-toggle').setAttribute('aria-pressed',String(value));$('walk-toggle').textContent=value?'Pausar caminhada':'Caminhar';$('touch').hidden=!value;if(!value)stopMoving();requestRender();}
 function jump(r){stopMoving();state={x:r.spawn[0],y:r.spawn[1],z:r.spawn[2]};yaw=r.yaw??Math.PI;pitch=0;requestRender();}
 async function unlockSound(){if(!footsteps.diagnostics().enabled)return;try{const ok=await footsteps.unlock();$('sound-toggle').textContent=ok?'Som dos passos: ligado':'Ativar som dos passos';$('sound-toggle').setAttribute('aria-pressed',String(ok));if(!keys.size)void footsteps.stop();}catch{$('sound-toggle').textContent='Tentar ativar som';}}
 $('enter').onclick=()=>{unlockSound();$('cover').hidden=true;$('ui').hidden=false;setWalking(true);canvas.focus();};$('walk-toggle').onclick=()=>{if(!walking&&footsteps.diagnostics().enabled)unlockSound();setWalking(!walking);};
 $('sound-toggle').onclick=()=>{const d=footsteps.diagnostics();if(d.enabled){void footsteps.setEnabled(false);$('sound-toggle').textContent='Som dos passos: desligado';$('sound-toggle').setAttribute('aria-pressed','false');}else{footsteps.setEnabled(true);unlockSound();}};
 const visibleRooms=rooms.filter(r=>!['hall','quintalDireito'].includes(r.id)),nav=$('places');visibleRooms.forEach(r=>{const button=document.createElement('button');button.textContent=r.name;button.dataset.id=r.id;button.dataset.estimate=String(r.estimate);button.onclick=()=>jump(r);nav.append(button);});
 function nextRoom(delta){const i=Math.max(0,visibleRooms.indexOf(activeRoom));jump(visibleRooms[Math.max(0,Math.min(visibleRooms.length-1,i+delta))]);}$('back').onclick=()=>nextRoom(-1);$('forward').onclick=()=>nextRoom(1);
 addEventListener('keydown',e=>{if(e.key==='Escape'){stopMoving();setWalking(false);return;}if(!walking||$('photoDialog').open||e.target.closest?.('dialog')||e.target.matches?.('input,textarea,select'))return;const k=keyMap[e.code];if(k){e.preventDefault();keys.add(k);if(!e.repeat)unlockSound();requestRender();}});addEventListener('keyup',e=>{if(keyMap[e.code])keys.delete(keyMap[e.code]);});addEventListener('blur',stopMoving);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMoving();});
 canvas.addEventListener('pointerdown',e=>{if($('photoDialog').open)return;drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.focus();});canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-lastX)*.0035;pitch=Math.max(-1.15,Math.min(1.15,pitch-(e.clientY-lastY)*.0035));lastX=e.clientX;lastY=e.clientY;requestRender();});for(const type of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>drag=false);
 document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();if(!walking)return;b.setPointerCapture(e.pointerId);keys.add(b.dataset.move);unlockSound();requestRender();});for(const type of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>keys.delete(b.dataset.move));});
 const dialog=$('photoDialog');$('photos').onclick=()=>{stopMoving();const r=activeRoom||rooms[0];$('photo').src=`../assets/${String(r.photo).padStart(2,'0')}.jpg`;$('photoTitle').textContent=r.name;$('photoText').textContent=r.note||'Posição e ligação deste ambiente estimadas.';dialog.showModal();};dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('close',requestRender);
 function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();requestRender();}addEventListener('resize',resize);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback('O navegador interrompeu o 3D. Você pode tentar novamente ou consultar as fotos.');});$('retry').onclick=()=>location.reload();
 const map=$('map-shapes');rooms.filter(r=>r.level===0).forEach(r=>{const node=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v]of Object.entries({x:(worldX(r.rect[2])+11)*5,y:(r.rect[1]+19)*5,width:(r.rect[2]-r.rect[0])*5,height:(r.rect[3]-r.rect[1])*5,fill:r.estimate?'#8d68424d':'#dbd2b22e',stroke:'#d8c8aa','stroke-width':.6}))node.setAttribute(k,String(v));map.append(node);});
 const readyMs=Math.round(performance.now()-started);window.__igorWalk={exportBake:()=>bakeSnapshot,getState:()=>({...state,yaw,pitch,walking,room:activeRoom?.id,idle:!frame,baked:bakedStats,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,vegetation:vegetationStats,mobile,readyMs,pixelRatio:renderer.getPixelRatio(),memory:{...renderer.info.memory},sound:footsteps.diagnostics(),doors:doorSystem.snapshot()}),jumpTo:id=>{const r=rooms.find(r=>r.id===id);if(r)jump(r);},reset:()=>{state={x:11,z:-14,y:0};yaw=2.69;pitch=.035;stopMoving();},step:(dx,dz)=>{state=move(state,dx,dz);requestRender();},inspectPose:p=>{if(isWalkable(p.x,p.z,p.y)){stopMoving();state={x:p.x,y:p.y,z:p.z};yaw=p.yaw??yaw;pitch=p.pitch??0;requestRender();return true;}return false;},isWalkable};resize();
}
