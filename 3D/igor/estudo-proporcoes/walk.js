import * as THREE from './vendor/three.module.js';
import {createMaterials} from './materials.js?v=scale-r1';
import {buildInteriorAssets} from './interior-assets.js?v=scale-r1';
import {buildDeckDetails} from './deck-details.js';
import {buildObservedDetails} from './observed-details.js?v=scale-r1';
import {buildKitchenReference} from './kitchen-reference.js?v=scale-r1';
import {buildMasonryReference} from './masonry-reference.js?v=scale-r1';
import {calibrateNode,metricPosition} from './spatial-calibration.js?v=scale-r1';
import {buildBathDetails} from './bath-details.js';
import {takeMirrorSurfaces,buildMirrors} from './mirror-detail.js';
import {secondaryRoofs,roofPlanes} from './roof-layout.js?v=scale-r1';
import {proportionStudy,planX,planZ,derivative,terrace,upperWidth,buildStudyStructure} from './proportion-study.js';
import {addPottedPlants} from './plant-detail.js?v=scale-r1';
import {buildExterior,addReferenceTrees} from './exterior.js?v=scale-r1';
import {addGrassClusters,buildGrassDetail} from './grass-detail.js?v=scale-r1';
import {buildNaturalGrass} from './exterior-natural.js';
import {exteriorReference} from './exterior-reference.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {createFootsteps} from './footsteps.js';
import {exportBakeSource,applyBakedLighting} from './baked-lighting.js?v=scale-r1';
import {facadeAxis,worldX,worldYaw,movement as baseMovement} from './view-transform.js';
import {rooms,floorAreas,walls,furniture,stairs,move,roomAt,isWalkable,doorSystem,calibration} from './nav.js?v=scale-r1';
import {buildTileFloor} from './tile-floor-reference.js';
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
 const sun=new THREE.DirectionalLight(0xffefd9,proportionStudy?.8:3.15);sun.position.set(-9,18,-12);sun.target.position.set(4,0,5);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:55});sun.shadow.normalBias=proportionStudy?.005:.025;sun.shadow.bias=-.0002;scene.add(sun,sun.target);
 const random=n=>{const v=Math.sin(n*97.13+11.5)*43958.27;return v-Math.floor(v);};
 const started=performance.now(),M=await createMaterials(THREE,renderer,{mobile});M.wood.normalScale.set(.35,.35);M.deck.normalScale.set(.35,.35);M.stone.normalScale.set(.65,.65);
 M.grass.normalScale.set(.12,.12); // grama curta: relevo sutil, não solo ondulado
 if(proportionStudy){M.roof.map.repeat.set(.26,.65);M.roof.normalMap.repeat.set(.26,.65);M.roof.normalScale.set(.40,.40);M.grass.color.set(0xc4ccae);M.glass.color.set(0xc4d0ce);M.glass.opacity=.22;M.glass.metalness=.03;}
 M.plaster.color.set(0xeadfc9);M.plaster.normalScale.set(.16,.16);M.tile.normalScale.set(.15,.15);M.tile.roughness=.48;M.woodDark.normalScale.set(.25,.25);M.woodDark.color.set(0x9b7860);M.woodDark.roughness=.8;
 // Fotos01/11 distinguem vigas de madeira mel e esquadrias escuras. Usar o
 // mesmo marrom quase preto em ambas apagava o veio e alterava essa leitura.
 M.timber.roughness=.70;
 // Luz difusa de floresta no estudo: a referência10 não tem o facho solar
 // duro do antigo HDR. Fonte CC0 registrada; não é captura deste imóvel.
 const environmentName=proportionStudy?'ceu-difuso.hdr':'ceu.hdr';
 scene.userData.environmentFile='dist/walk/assets/'+environmentName;
 const hdr=await new HDRLoader().loadAsync(new URL('./assets/'+environmentName,import.meta.url).href);
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(hdr);
 scene.environment=environment.texture;scene.environmentIntensity=.55;hdr.dispose();pmrem.dispose();
 const material=(color,roughness=.8,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
 const planScale=calibration.scale;
 M.floorGlass=material(0x9ac1c0,.08,{transparent:true,opacity:.24,metalness:.18,depthWrite:false});
 const metricBuild=fn=>{const previous=new Set(scene.children);const result=fn();for(const node of scene.children)if(!previous.has(node))calibrateNode(node,planScale);return result;};
 function box(x,y,z,w,h,d,mat=M.plaster,rotation=0){const geo=new THREE.BoxGeometry(w,h,d),uv=geo.attributes.uv,norm=geo.attributes.normal;for(let i=0;i<uv.count;i++){const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i));uv.setXY(i,uv.getX(i)*(nx>.5?d:w)/2,uv.getY(i)*(ny>.5?d:h)/2);}const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);return mesh;}
 function cylinder(x,y,z,r,h,mat,segments=18){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);return mesh;}
 // Pisos e vãos: geometria e colisão compartilham a mesma fonte.
 const grout=M.tile.clone();grout.map=grout.normalMap=grout.roughnessMap=null;grout.color.set(0xb9b5a9);grout.roughness=.88;
 floorAreas.forEach(f=>{const holes=f.holes||[],xs=[f.rect[0],f.rect[2],...holes.flatMap(h=>[h[0],h[2]])].sort((a,b)=>a-b),zs=[f.rect[1],f.rect[3],...holes.flatMap(h=>[h[1],h[3]])].sort((a,b)=>a-b);for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){const x=(xs[i-1]+xs[i])/2,z=(zs[j-1]+zs[j])/2;if(xs[i]-xs[i-1]<.001||zs[j]-zs[j-1]<.001||holes.some(h=>x>h[0]&&x<h[2]&&z>h[1]&&z<h[3]))continue;box(x,f.level-(f.material==='floorGlass'?.0175:.08),z,xs[i]-xs[i-1],f.material==='floorGlass'?.035:.16,zs[j]-zs[j-1],proportionStudy&&f.material==='tile'?grout:M[f.material]||M.wood);}});
 if(proportionStudy)buildTileFloor(THREE,scene,M,floorAreas,planScale);
 walls.forEach(w=>{const dx=w.b[0]-w.a[0],dz=w.b[1]-w.a[1],length=Math.hypot(dx,dz),rot=-Math.atan2(dz,dx),nx=dx/length,nz=dz/length,open=w.openings||[],xs=[0,length,...open.flatMap(o=>[o.from,o.to]),...(w.materialRanges||[]).flatMap(r=>[r.from,r.to])].sort((a,b)=>a-b),ys=[0,w.height,...open.flatMap(o=>[o.bottom,o.top])].sort((a,b)=>a-b),place=(u,v,width,height,depth,mat)=>box(w.a[0]+nx*u,w.base+v,w.a[1]+nz*u,width,height,depth,mat,rot);
  for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const u=(xs[i-1]+xs[i])/2,v=(ys[j-1]+ys[j])/2;if(xs[i]-xs[i-1]<.001||ys[j]-ys[j-1]<.001||open.some(o=>u>o.from&&u<o.to&&v>o.bottom&&v<o.top))continue;const range=(w.materialRanges||[]).find(r=>u>=r.from&&u<=r.to);place(u,v,xs[i]-xs[i-1],ys[j]-ys[j-1],.18,M[range?.material||w.material]||M.plaster);}
  for(const o of open){const width=o.to-o.from,h=o.top-o.bottom,mid=(o.from+o.to)/2,cy=(o.top+o.bottom)/2,frame=o.frameWidth||.055;place(o.from,cy,frame,h+.08,.22,M.woodDark);place(o.to,cy,frame,h+.08,.22,M.woodDark);place(mid,o.top,width,frame,.22,M.woodDark);if(o.type==='window'){place(mid,o.bottom,width,frame,.24,M.woodDark);const panels=o.panels??(width>1.2?2:1);for(let p=0;p<panels;p++){place(o.from+(p+.5)*width/panels,cy,width/panels-frame,h-frame,.026,M.glass);if(p>0)place(o.from+p*width/panels,cy,frame,h,.13,M.woodDark);}}else place(mid,.02,width,.04,.25,M.wood);}
 });
 // A cerâmica do estudo amostra só o miolo do PBR; as juntas finas são físicas,
 // evitando a grade escura larga da captura original sobreposta ao piso.
 const masonryStats=buildMasonryReference(THREE,scene,M,walls);
 const count=18,[sx,sz,ex,ez]=stairs.rect,run=(ez-sz)/count,rise=(stairs.to-stairs.from)/count;
 // Fotos06/11: degraus abertos entre duas longarinas, sem corrimãos nem
 // postinhos seriados. O estudo ganha apenas um micro-bevel físico nas quinas.
 const studyStep=i=>{const b=.008,w=ex-sx-b*2,h=.07-b*2,d=run+.015-b*2,s=new THREE.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:1,curveSegments:1});g.translate(0,0,-d/2);
 // Mesma escala física de madeira das caixas: UV em metros/2, também nas bordas.
 const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;for(let j=0;j<u.count;j++)u.setXY(j,(Math.abs(n.getX(j))>.5?p.getZ(j):p.getX(j))/2,(Math.abs(n.getY(j))>.5?p.getZ(j):p.getY(j))/2);
 const step=new THREE.Mesh(g,M.furnitureWood);step.position.set((sx+ex)/2,stairs.from+(i+1)*rise-.035,sz+(i+.5)*run);step.castShadow=step.receiveShadow=true;step.userData.stairPart='beveled-open-tread';scene.add(step);};
 for(let i=0;i<count;i++)proportionStudy?studyStep(i):box((sx+ex)/2,stairs.from+(i+1)*rise-.035,sz+(i+.5)*run,ex-sx,.07,run+.015,M.furnitureWood);
 if(proportionStudy){const slope=-Math.atan2(stairs.to,ez-sz);for(const x of[sx+.04,ex-.04]){const stringer=box(x,1.50,(sz+ez)/2,.10,.22,Math.hypot(ez-sz,stairs.to),M.furnitureWood);stringer.rotation.x=slope;stringer.userData.stairPart='open-stair-stringer';}const support=box(ex-.06,1.50,sz+.14,.13,3,.13,M.furnitureWood);support.userData.stairPart='visible-side-structural-post';}else for(const x of[sx+.04,ex-.04]){for(let i=1;i<count;i+=3)box(x,(i+1)*rise+.45,sz+(i+.5)*run,.035,.9,.035,M.woodDark);const rail=box(x,2.4,(sz+ez)/2,.045,.045,Math.hypot(ez-sz,stairs.to),M.woodDark);rail.rotation.x=-Math.atan2(stairs.to,ez-sz);}
 // Guarda-corpo de madeira das fotos01/02, não uma placa de vidro inventada.
 for(const z of[3.9,5.25,6.6,8.0])box(1.85,3.48,z,.075,.96,.075,M.furnitureWood);
 for(const y of[3.28,3.58,3.93]){box(1.85,y,5.95,.065,.075,4.1,M.furnitureWood);box(.9,y,3.85,1.85,.075,.065,M.furnitureWood);}
 for(const x of[.04,.9])box(x,3.48,3.85,.075,.96,.075,M.furnitureWood);
 // Moldura do painel de vidro fotografado, separada do vão da escada.
 for(const x of[2.45,3.95])box(x,2.96,4.825,.07,.10,1.52,M.woodDark);
 for(const z of[4.1,5.55])box(3.20,2.96,z,1.57,.10,.07,M.woodDark);
 // Tapete claro visível na foto01; escala/posição dentro do estudo estimadas.
 box(3.15,3.006,3.12,1.9,.012,1.45,M.fabricWhite).castShadow=false;
 for(let z=.6;z<9;z+=1.35)box(upperWidth/2,5.65,z,upperWidth+.5,.16,.17,proportionStudy?M.timber:M.woodDark);
 buildExterior(THREE,scene,M,box,cylinder,walls);
 for(const r of rooms.filter(r=>['banheiro1','banheiro2','hall','quarto15'].includes(r.id))){const[a,b,c,d]=r.rect;box((a+c)/2,2.88,(b+d)/2,c-a,.08,d-b,M.wood);}
 for(const r of secondaryRoofs(rooms,floorAreas)){const roof=box(r.x,(r.front+r.back)/2,r.z,r.w,.12,Math.hypot(r.d,r.back-r.front),M.roof);roof.rotation.x=-Math.atan2(r.back-r.front,r.d);}
 for(let z=.8;z<9;z+=1.7){const opening=z>3.9&&z<8.0;box(opening?3.8:2.9,2.86,z,opening?4:5.8,.13,.16,proportionStudy?M.timber:M.woodDark);}
 const interiorStats=buildInteriorAssets(THREE,scene,M,furniture.filter(f=>f.id!=='mesa'),{mobile});
 const deckStats=buildDeckDetails(THREE,scene,M,{mobile});
 if(proportionStudy)for(const mesh of deckStats.meshes){mesh.position.y+=terrace.level;mesh.position.z+=2.5;}
 buildStudyStructure(THREE,scene,M,walls,roofPlanes,box);
 const observedStats=buildObservedDetails(THREE,scene,M);
 const kitchenStats=buildKitchenReference(THREE,scene,M);
 const bathStats=buildBathDetails(THREE,scene,M);
 const mirrorSpecs=takeMirrorSurfaces(THREE,scene);
 const practicalPositions=[[2.5,2.2,2.38],[4.1,7.1,2.65],...(proportionStudy?[[1.9,2.4,5.25],[4.3,5.9,5.25]]:[[2.9,2.2,5.18]])];
 for(const [x,z,y] of practicalPositions){const light=new THREE.PointLight(0xffd4a1,2.2,5,2);light.position.set(x,y-.12,z);scene.add(light);}
 box(2.9,.09,9,5.8,.17,.045,M.woodDark);
 box(2.9,2.86,4.2,.2,.25,8.7,proportionStudy?M.timber:M.woodDark);
 box(6,-.25,4,60,.25,60,M.grass);
 // A casa é estática: agrupar superfícies opacas reduz chamadas sem alterar
 // o contrato de colisão. Vidros permanecem separados para ordenação correta.
 // Uma conversão única do plano lógico em metros para a cena, bake, luzes e
 // materiais dinâmicos. Colisões usam o mesmo fator no raio/velocidade/câmera.
 for(const node of scene.children)calibrateNode(node,planScale);
 const batches=new Map();scene.updateMatrixWorld(true);
 for(const mesh of scene.children.filter(n=>n.isMesh&&!n.material.transparent))for(const attr of ['position','normal','uv'])if(!mesh.geometry.attributes[attr])throw Error(`Atributo ${attr} ausente: ${mesh.name||JSON.stringify(mesh.userData)}`);
 for(const mesh of [...scene.children]){if(!mesh.isMesh||mesh.material.transparent)continue;const key=`${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}`;if(!batches.has(key))batches.set(key,{material:mesh.material,cast:mesh.castShadow,receive:mesh.receiveShadow,items:[]});const clone=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),flat=clone.index?clone.toNonIndexed():clone;batches.get(key).items.push(flat);if(flat!==clone)clone.dispose();scene.remove(mesh);mesh.geometry.dispose();}
 for(const batch of batches.values()){const geometry=new THREE.BufferGeometry();for(const name of ['position','normal','uv']){const size=batch.items[0].attributes[name].itemSize,length=batch.items.reduce((n,g)=>n+g.attributes[name].array.length,0),values=new Float32Array(length);let offset=0;for(const g of batch.items){values.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}geometry.setAttribute(name,new THREE.BufferAttribute(values,size));}geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,batch.material);mesh.castShadow=batch.cast;mesh.receiveShadow=batch.receive;scene.add(mesh);batch.items.forEach(g=>g.dispose());}
 const exportBake=()=>({...exportBakeSource(scene,M),planScale,areaCalibration:calibration,study:proportionStudy,lighting:{environmentFile:scene.userData.environmentFile,environmentIntensity:scene.environmentIntensity,lights:scene.children.filter(o=>o.isDirectionalLight||o.isPointLight).map(o=>({type:o.type,color:o.color.toArray(),intensity:o.intensity,position:o.position.toArray(),target:o.target?.position.toArray()}))},lightPositions:practicalPositions.map(([x,z,y])=>[planX(x)*planScale,y-.12,planZ(z)*planScale])});
 let bakedStats={enabled:false};
 const lightQuery=new URLSearchParams(location.search);
 if(lightQuery.get('lighting')!=='baseline'&&!lightQuery.has('bake-export'))bakedStats=await applyBakedLighting(THREE,scene,{mobile,basePath:proportionStudy?'./assets/baked-study/':'./assets/baked/'}).catch(error=>({enabled:false,reason:error.message}));
 if(bakedStats.enabled)ambientFill.intensity=.28;
 // Folhas móveis ficam fora do agrupamento estático. A mesma instância
 // alimenta a geometria, a interação e a colisão de nav.js.
 metricBuild(()=>doorSystem.build(THREE,scene,M));
 const bakeSnapshot=new URLSearchParams(location.search).has('bake-export')?exportBake():null;
 const mirrorSystem=metricBuild(()=>buildMirrors(THREE,scene,mirrorSpecs,{mobile}));
 window.__igorDetails={stats:()=>({area:calibration,kitchen:{triangles:kitchenStats.triangles,budget:kitchenStats.budget},masonry:{triangles:masonryStats.triangles,budget:masonryStats.budget},deck:{triangles:deckStats.triangles,budget:deckStats.budget},bath:{triangles:bathStats.triangles,budget:bathStats.budget},observed:{triangles:observedStats.triangles,budget:observedStats.budget},mirrors:mirrorSystem.diagnostics()})};
 const vegetationBefore=new Set(scene.children);
 const vegetationStats=await addReferenceTrees(THREE,scene,{mobile});
 const grassStats=proportionStudy?buildNaturalGrass(THREE,scene,M,{mobile}):await addGrassClusters(THREE,scene,{mobile});vegetationStats.grassTriangles=grassStats.triangles;vegetationStats.grass={instances:grassStats.instances,triangles:grassStats.triangles,drawCalls:grassStats.drawCalls,budget:grassStats.budget};
 const plantStats=await addPottedPlants(THREE,scene,M);vegetationStats.potted=plantStats;
 for(const node of scene.children)if(!vegetationBefore.has(node))calibrateNode(node,planScale);
 const visualRoot=new THREE.Group();for(const child of [...scene.children])visualRoot.add(child);visualRoot.scale.x=-1;visualRoot.position.x=planX(facadeAxis)*planScale;scene.add(visualRoot);
 let doorMessageId=null;
 const arrival=proportionStudy?exteriorReference.arrival:{x:11,z:-14,y:0,yaw:2.69,pitch:.035};
 let state={x:arrival.x,z:arrival.z,y:0},yaw=arrival.yaw,pitch=arrival.pitch,walking=false,drag=false,lastX=0,lastY=0,lastTime=0,activeRoom=null;
 function movement(angle,forward,side){const d=baseMovement(angle,forward,side);return{x:d.x/derivative('x',state.x),z:d.z/derivative('z',state.z)};}
 if(proportionStudy){document.querySelector('.prototype').textContent='REVISÃO 3D · 120 m² INTERNOS ESTIMADOS';document.querySelector('#cover .limit').textContent='Estudo solicitado: 120 m² internos, sem paredes, vazio da escada, deck ou jardim. O anúncio informa área construída; a distribuição interna é estimada pelas fotos, não medida. Não é reprodução fiel do imóvel.';document.querySelector('footer small').textContent='120 m² internos no modelo · térreo 80,6 + superior 39,4 m². Cotas e ligações estimadas; fotos 23–26 sem localização confirmada.';}
 const keys=new Set(),keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
 const stairRoom={id:'escada',name:'Escada',note:'Ligação observada; altura e inclinação estimadas.',kind:'CONEXÃO ENTRE PAVIMENTOS',photo:11};
 function syncRoom(){const r=roomAt(state.x,state.z,state.y)||((state.y>.15&&state.y<2.85)?stairRoom:rooms.find(r=>r.id==='jardim'))||rooms[0];if(r!==activeRoom){activeRoom=r;$('room').textContent=r.name;$('roomNote').textContent=r.note||'Ligação e proporção estimadas a partir das fotos.';$('kind').textContent=r.kind;document.querySelectorAll('#places button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===r.id)));}const marker=$('you');marker.setAttribute('cx',String((worldX(state.x)+11)*5));marker.setAttribute('cy',String((state.z+19)*5));marker.setAttribute('fill',state.y>1.5?'#edaf74':'#fff');}
 function updateDoorControl(){const near=doorSystem.nearest(state),button=$('door-toggle');button.hidden=!near||!walking;button.dataset.id=near?.id||'';if(doorMessageId&&near?.id!==doorMessageId){$('door-message').textContent='';doorMessageId=null;}if(near){button.textContent=(near.moving?'Inverter movimento':near.open?'Fechar porta':'Abrir porta')+' · E';if(near.status==='interrompida'){$('door-message').textContent='Movimento interrompido. Afaste-se e toque novamente.';doorMessageId=near.id;}}}
 function toggleDoor(){const id=doorSystem.nearest(state)?.id;if(!id)return;stopMoving();const result=doorSystem.toggle(id,state);doorMessageId=result.ok?null:id;$('door-message').textContent=result.ok?'':result.status==='passagem_obstruida'?'Afaste-se um passo para liberar a abertura da porta.':'Aproxime-se da porta.';requestRender();}
 $('door-toggle').onclick=toggleDoor;
 addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat&&walking&&!$('photoDialog').open&&$('cover').hidden){e.preventDefault();toggleDoor();}});
 function render(){camera.position.set((planX(facadeAxis)-planX(state.x))*planScale,state.y+1.65,planZ(state.z)*planScale);camera.rotation.set(pitch,worldYaw(yaw),0);syncRoom();updateDoorControl();mirrorSystem.update(state);renderer.render(scene,camera);}
 function footSurface(){if(state.y>.15&&state.y<2.85)return proportionStudy&&state.x<0?'stone':'wood';const a=floorAreas.find(a=>Math.abs(a.level-state.y)<.2&&state.x>a.rect[0]&&state.x<a.rect[2]&&state.z>a.rect[1]&&state.z<a.rect[3]);if(a?.material==='grass'&&state.z<0){const p=proportionStudy?exteriorReference.patio:[[-6,0],[-6,-8.4],[-.8,-7],[5.5,-3.9],[10.3,-3.9],[10.3,0]];let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>state.z)!==(p[j][1]>state.z)&&state.x<(p[j][0]-p[i][0])*(state.z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])inside=!inside;}if(inside)return 'stone';}return a?.material||'stone';}
 function tick(t){frame=0;if(stopped)return;const dt=Math.min(.04,(t-(lastTime||t))/1000);lastTime=t;if(walking&&keys.size&&!$('photoDialog').open){let f=(keys.has('forward')?1:0)-(keys.has('back')?1:0),s=(keys.has('right')?1:0)-(keys.has('left')?1:0),n=Math.hypot(f,s)||1;f/=n;s/=n;const delta=movement(yaw,f,s),before=state;state=move(state,delta.x*dt*2.3/planScale,delta.z*dt*2.3/planScale);footsteps.moved(metricPosition(before,planScale),metricPosition(state,planScale),footSurface());}if(!$('photoDialog').open)doorSystem.advance(dt,state);render();if((walking&&keys.size&&!$('photoDialog').open)||(doorSystem.isAnimating()&&!$('photoDialog').open))frame=requestAnimationFrame(tick);else{lastTime=0;void footsteps.stop();}}
 function requestRender(){if(!stopped&&!frame)frame=requestAnimationFrame(tick);}
 function stopMoving(){keys.clear();drag=false;lastTime=0;footsteps.stop();requestRender();}
 function setWalking(value){walking=value;$('walk-toggle').setAttribute('aria-pressed',String(value));$('walk-toggle').textContent=value?'Pausar caminhada':'Caminhar';$('touch').hidden=!value;if(!value)stopMoving();requestRender();}
 function jump(r){stopMoving();state={x:r.spawn[0],y:r.spawn[1],z:r.spawn[2]};yaw=r.yaw??Math.PI;pitch=r.pitch??0;requestRender();}
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
 const readyMs=Math.round(performance.now()-started);window.__igorWalk={exportBake:()=>bakeSnapshot,getState:()=>({...state,metric:metricPosition(state,planScale),area:calibration,yaw,pitch,walking,room:activeRoom?.id,idle:!frame,baked:bakedStats,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,vegetation:vegetationStats,interior:{triangles:interiorStats.triangles,withinBudget:interiorStats.withinBudget,byId:interiorStats.byId},mobile,readyMs,pixelRatio:renderer.getPixelRatio(),memory:{...renderer.info.memory},sound:footsteps.diagnostics(),doors:doorSystem.snapshot()}),jumpTo:id=>{const r=rooms.find(r=>r.id===id);if(r)jump(r);},reset:()=>{state={x:arrival.x,z:arrival.z,y:0};yaw=arrival.yaw;pitch=arrival.pitch;stopMoving();requestRender();},step:(dx,dz)=>{state=move(state,dx,dz);requestRender();},inspectPose:p=>{if(isWalkable(p.x,p.z,p.y)){stopMoving();state={x:p.x,y:p.y,z:p.z};yaw=p.yaw??yaw;pitch=p.pitch??0;requestRender();return true;}return false;},isWalkable};resize();
}
