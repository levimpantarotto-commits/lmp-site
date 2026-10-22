import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {finishTerrain,buildStreets,buildStreetProps,buildRiverRocks,createUnderstory} from './vale-environment.js';
import {addFacadeDetails} from './vale-facades.js';
import {finishArchitecture} from './vale-architecture.js';
import {buildValleyWater} from './vale-water.js';
import {createTerrainSampler,createRoadExclusion} from './vale-spatial.js';
import {treeVariation} from './vale-tree-variation.js';
import {collectGardenAnchors} from './vale-gardens.js';
import {keepBuildingsWithinTerrain,addTerrainSkirt} from './vale-boundary.js';
import {quality,lite,budget,installAssetBudget} from './vale-quality.js';
installAssetBudget(THREE);

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],AS='./assets/maquete/';
const preferences=matchMedia('(prefers-reduced-motion: reduce)'),query=new URLSearchParams(location.search);
let reduced=preferences.matches&&query.get('motion')!=='full',renderer,scene,camera,controls,data,ground,surface,mask,photo,buildings,ready=false;
let architectureStats=null;
let stage='início',fatal=false,contextLost=false,gpu=null;
const warnings=[];
function checkpoint(name){if(fatal)throw Error('Carregamento interrompido');stage=name;$('#load-text').textContent=name;}
async function optional(name,work,fallback){checkpoint(name);try{return await work();}catch(error){warnings.push(name);console.warn('Detalhe indisponível:',name,error);return fallback;}}
const buildingFootprintCells=new Set();
function registerBuildingFootprints(root){
 root.updateMatrixWorld(true);const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),n=new THREE.Vector3();
 root.traverse(mesh=>{if(!mesh.isMesh||!/^swissBUILDINGS3D_Building_solid_2021/.test(mesh.name))return;const p=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?.count||p.count;
  for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);n.copy(b).sub(a).cross(new THREE.Vector3().copy(c).sub(a)).normalize();if(n.y<.18)continue;
   // Conservative 2 m roof bounds also keep grass away from eaves/foundations.
   for(let x=Math.floor((Math.min(a.x,b.x,c.x)-.6)/2);x<=Math.floor((Math.max(a.x,b.x,c.x)+.6)/2);x++)for(let z=Math.floor((Math.min(a.z,b.z,c.z)-.6)/2);z<=Math.floor((Math.max(a.z,b.z,c.z)+.6)/2);z++)buildingFootprintCells.add(`${x},${z}`);
  }
 });
}
let raf=0,frames=0,active=true,current=0,transition=null,playing=false,timer,navigation=0,walk=false,look=null,last=0;
const keys=new Set(),vec=a=>new THREE.Vector3(...a),prototypes=[],instances=[],dummy=new THREE.Object3D();
const lastForest=new THREE.Vector3(1e9,1e9,1e9),closeCenter={value:new THREE.Vector3(9999,0,9999)},closeRadius={value:0};
let renderedTrees=0,stops=[],forestTriangles=0,ray=new THREE.Raycaster();
let sun,understory=()=>{},streetStats={},streets,terrainTextures,forestLods=[],displayCrowns=[],facadeDetails,water,roadExclusion,excludedRoadTrees=0,rockStats={};
const copy=[
 ['01 / VALE REAL','Um vale inteiro.<br><em>Em três dimensões.</em>','Copas, relevo e edifícios da mesma área. Explore o conjunto, depois desça até a floresta e o rio.','1 KM² / DADOS PÚBLICOS SUÍÇOS'],
 ['02 / FLORESTA','Da copa<br><em>até a folha.</em>','Vegetação modelada em três dimensões: troncos, galhos, folhas e sub-bosque. Distribuição baseada na cobertura do vale.','FLORESTA MODELADA / ACABAMENTO ILUSTRATIVO'],
 ['03 / RIO','O rio organiza<br><em>a paisagem.</em>','O canal acompanha o vale, entre a mata e a área construída. Margens e relevo pertencem ao mesmo recorte.','LEITO E MARGENS / VISTA DO VALE'],
 ['04 / EDIFICAÇÕES','Do território<br><em>à rua.</em>','Os volumes do cadastro recebem fachadas modeladas, ruas, veículos e iluminação. Os acabamentos são ilustrativos.','GEOMETRIA PÚBLICA / DETALHES MODELADOS'],
 ['05 / POVOADO','Paredes, janelas.<br><em>Escala humana.</em>','Um conjunto de edifícios, e não uma casa solta. A base geográfica é pública; fachadas e objetos próximos são completados artisticamente.','BASE PÚBLICA / DETALHAMENTO ILUSTRATIVO']
];
function request(){if(!fatal&&!raf&&active&&renderer)raf=requestAnimationFrame(render);}
function sample(a,x,z){const n=data.n,u=THREE.MathUtils.clamp(x+500,0,999.999),v=THREE.MathUtils.clamp(z+500,0,999.999),c=Math.floor(u),r=Math.floor(v),tx=u-c,tz=v-r;return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a[r*n+c],a[r*n+c+1],tx),THREE.MathUtils.lerp(a[(r+1)*n+c],a[(r+1)*n+c+1],tx),tz);}
function makeStops(){
 let forestView={p:[-325,sample(ground,-325,-190)+1.8,-190],t:[-345,sample(ground,-345,-210)+6,-210]},best=-Infinity;
 for(let z=-208;z<=-182;z+=2)for(let x=-334;x<=-308;x+=2){
  let nearest=null,dist=Infinity;for(const t of displayCrowns){const d=Math.hypot(x-t[0],z-t[2]);if(d<dist){dist=d;nearest=t;}}
  const y=sample(ground,x,z),slope=Math.abs(sample(ground,x+1,z)-sample(ground,x-1,z))+Math.abs(sample(ground,x,z+1)-sample(ground,x,z-1));
  const score=Math.min(dist,8)-slope*4;if(nearest&&dist>4.5&&score>best){best=score;forestView={p:[x,y+1.8,z],t:[nearest[0],nearest[1]+5,nearest[2]]};}
 }
 // Keep the village camera outside both the building envelope and tree crowns.
 // A surveyed ground clearance alone does not keep leaves out of the lens.
 const cityTarget=new THREE.Vector3(269,31.5,318);let cityView={p:[183,21.8,365],t:cityTarget.toArray(),f:52},cityBest=-Infinity;
 for(let z=350;z<=406;z+=7)for(let x=158;x<=193;x+=7){
  const p=new THREE.Vector3(x,sample(ground,x,z)+4.5,z),end=p.clone().lerp(cityTarget,.35),line=new THREE.Line3(p,end);let clearance=40;
  for(const t of displayCrowns){if(Math.abs(t[0]-x)>60||Math.abs(t[2]-z)>60)continue;const crown=new THREE.Vector3(t[0],t[1]+t[3]*.68,t[2]),near=line.closestPointToPoint(crown,true,new THREE.Vector3());clearance=Math.min(clearance,near.distanceTo(crown)-Math.min(10,t[3]*.35));}
  const score=Math.min(10,clearance)-Math.abs(z-375)*.025-Math.abs(x-183)*.015;if(score>cityBest){cityBest=score;cityView={p:p.toArray(),t:cityTarget.toArray(),f:52};}
 }
 const iy=sample(ground,158,-240);stops=[
 {p:[690,640,1000],t:[-35,170,-20],f:43},
 {...forestView,f:57},
 {p:[-58,sample(ground,-58,-68)+1.7,-68],t:[-32,4.2,-95],f:56},
 {p:[158,iy+4,-240],t:[183,iy+4,-257],f:56},
 cityView
 ];}
function setCopy(index){const c=copy[index];$('#chapter').textContent=c[0];$('#title').innerHTML=c[1];$('#description').textContent=c[2];$('#scale-text').textContent=c[3];document.body.classList.toggle('closeup',index>0);$$('[data-stop]').forEach(b=>{if(+b.dataset.stop===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});}
function stopTour(){playing=false;clearTimeout(timer);$('#visit').innerHTML='Explorar o vale <span>↗</span>';}
function cancel(){navigation++;stopTour();if(transition){transition.resolve(false);transition=null;}}
function animateTo(s,duration=3200){return new Promise(resolve=>{if(transition)transition.resolve(false);if(reduced){camera.position.fromArray(s.p);controls.target.fromArray(s.t);camera.fov=s.f;camera.updateProjectionMatrix();controls.update();request();resolve(true);return;}
 const from=camera.position.clone(),to=vec(s.p),mid=from.clone().add(to).multiplyScalar(.5),distance=from.distanceTo(to);mid.y+=Math.min(180,distance*.17);
 // A gently elevated passage preserves spatial continuity instead of clipping
 // through the hillside on the straight line between two ground-level stops.
 if(ground&&Math.abs(mid.x)<498&&Math.abs(mid.z)<498)mid.y=Math.max(mid.y,sample(ground,mid.x,mid.z)+65);
 transition={p:from,mid,t:controls.target.clone(),f:camera.fov,to:s,start:performance.now(),duration,resolve};request();});}
async function go(index,manual=true){if(!ready)return;if(manual)cancel();setWalk(false);const token=++navigation;current=index;setCopy(index);const s=stops[index];await animateTo(s,index===0?3600:3000);if(token!==navigation)return;request();}
async function tour(){if(playing){cancel();return;}playing=true;$('#visit').textContent='Pausar percurso Ⅱ';let i=0;async function next(){if(!playing)return;await go(i,false);if(!playing)return;if(++i===5){stopTour();return;}timer=setTimeout(next,2200);}next();}
function setWalk(value){if(!ready)return;walk=value;keys.clear();controls.enabled=!walk;$('#walk-hud').hidden=!walk;document.body.classList.toggle('walking',walk);$('#walk').textContent=walk?'Sair da caminhada ×':'Explorar a pé ↗';if(walk){cancel();const d=camera.getWorldDirection(new THREE.Vector3());camera.position.y=sample(ground,camera.position.x,camera.position.z)+1.7;controls.target.copy(camera.position).add(d);request();}}
function walkFrame(dt){if(!walk||!keys.size)return;const forward=camera.getWorldDirection(new THREE.Vector3());forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize(),move=new THREE.Vector3();if(keys.has('w')||keys.has('ArrowUp'))move.add(forward);if(keys.has('s')||keys.has('ArrowDown'))move.sub(forward);if(keys.has('a')||keys.has('ArrowLeft'))move.sub(right);if(keys.has('d')||keys.has('ArrowRight'))move.add(right);if(!move.lengthSq())return;move.normalize().multiplyScalar(dt*3.5);ray.set(camera.position,move.clone().normalize());ray.far=move.length()+.6;if(buildings&&ray.intersectObject(buildings,true).length)return;const p=camera.position.clone().add(move);p.x=THREE.MathUtils.clamp(p.x,-495,495);p.z=THREE.MathUtils.clamp(p.z,-495,495);p.y=sample(ground,p.x,p.z)+1.7;if(Math.abs(p.y-camera.position.y)>2)return;const delta=p.clone().sub(camera.position);camera.position.copy(p);controls.target.add(delta);camera.lookAt(controls.target);}
function render(now){
 try{
 raf=0;if(fatal||!active)return;const dt=Math.min(.05,(now-last)/1000||.016);last=now;
 if(transition){const t=transition,p=Math.min(1,(now-t.start)/t.duration),s=p*p*(3-2*p);camera.position.copy(t.p).multiplyScalar((1-s)**2).addScaledVector(t.mid,2*(1-s)*s).addScaledVector(vec(t.to.p),s*s);controls.target.lerpVectors(t.t,vec(t.to.t),s);camera.fov=THREE.MathUtils.lerp(t.f,t.to.f,s);camera.updateProjectionMatrix();if(p===1){transition=null;t.resolve(true);}}
 walkFrame(dt);
 if(!walk){camera.position.x=THREE.MathUtils.clamp(camera.position.x,-2000,2000);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-2000,2000);if(ground&&Math.abs(camera.position.x)<498&&Math.abs(camera.position.z)<498)camera.position.y=Math.max(camera.position.y,sample(ground,camera.position.x,camera.position.z)+1.7);controls.update();}
 updateForest();understory(camera);streetStats.update?.(camera);rockStats.update?.(camera);updateSun();water?.update(now/1000,renderer,camera);renderer.render(scene,camera);frames++;if(transition||(walk&&keys.size))request();
 }catch(error){unavailable(error);}
}
// Match the brightest source of ceu.hdr (measured by analisar_luz.mjs).
// This is illustrative lighting, not a date/location solar simulation.
function updateSun(){if(!sun||!ground)return;const focus=controls.target.clone();const extent=THREE.MathUtils.clamp(camera.position.distanceTo(focus)*.6,45,620);sun.target.position.copy(focus);sun.position.copy(focus).add(new THREE.Vector3(.5530423,.743008,.3769395).multiplyScalar(700));Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:1,far:2000});sun.shadow.camera.updateProjectionMatrix();}
async function texture(url){const t=await new THREE.TextureLoader().loadAsync(url);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}

function gridGeometry(values,step=1,onlyForest=false){const n=data.n,m=(n-1)/step+1,positions=new Float32Array(m*m*3),uv=new Float32Array(m*m*2),indices=[];for(let r=0;r<m;r++)for(let c=0;c<m;c++){const i=r*m+c,k=r*step*n+c*step;positions.set([c*step-500,values[k],r*step-500],i*3);uv.set([c*step/1000,1-r*step/1000],i*2);if(r<m-1&&c<m-1){if(onlyForest&&!(mask[k]||mask[k+step]||mask[k+n*step]||mask[k+n*step+step]))continue;indices.push(i,i+m,i+1,i+1,i+m,i+m+1);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
async function buildGround(){data=await fetch(AS+'vale.json').then(r=>r.json());[ground,mask]=await Promise.all([fetch(AS+data.ground).then(r=>r.arrayBuffer()).then(b=>new Float32Array(b)),fetch(AS+data.forest).then(r=>r.arrayBuffer()).then(b=>new Uint8Array(b))]);
 terrainTextures=await finishTerrain({scene,renderer,data,ground,mask,geometry:gridGeometry(ground,2)});
 addTerrainSkirt(scene,ground,data.n);
 // The DSM is used to estimate crown height, never rendered as stretched trees.
 forestTriangles=0;
 // Illustrative infill within the derived forest mask, not a measured tree count.
 // Local maxima locate the upper canopy but miss subordinate crowns between peaks.
 displayCrowns=data.crowns.slice();const cell=12,bins=new Map();
 for(const t of data.crowns){const key=`${Math.floor(t[0]/cell)},${Math.floor(t[2]/cell)}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(t);}
 const noise=k=>{const h=Math.sin(k*91.17+33.7)*43758.5453;return h-Math.floor(h);};
 let seed=0;
 for(let z=-493;z<493;z+=8.5)for(let x=-493;x<493;x+=8.5){seed++;const px=x+(noise(seed)-.5)*6,pz=z+(noise(seed+1000)-.5)*6;
  const k=Math.round(pz+500)*data.n+Math.round(px+500);if(!mask[k])continue;
  let nearest=null,dist=1e9;const bx=Math.floor(px/cell),bz=Math.floor(pz/cell);
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)for(const t of bins.get(`${bx+dx},${bz+dz}`)||[]){const d=Math.hypot(px-t[0],pz-t[2]);if(d<dist){dist=d;nearest=t;}}
  if(dist<5||!nearest)continue;
  const y=sample(ground,px,pz),h=THREE.MathUtils.clamp(nearest[3]*(.65+noise(seed+2000)*.3),9,25);
  displayCrowns.push([px,y,pz,h]);
 }
 makeStops();camera.position.fromArray(stops[0].p);controls.target.fromArray(stops[0].t);controls.update();request();
}
async function buildBuildings(){const [g,facadeManifest]=await Promise.all([new GLTFLoader().loadAsync(AS+'arquitetura-detalhada.glb'),fetch(AS+'fachadas-planos.json').then(r=>r.json())]);buildings=g.scene;const boundary=keepBuildingsWithinTerrain(buildings,{buildings:facadeManifest.buildings});architectureStats=await finishArchitecture({gltf:g,renderer,facadeManifest,sample:createTerrainSampler(ground,data.n,2),roadExclusion});architectureStats.boundary=boundary;buildings.traverse(o=>{if(!o.isMesh)return;o.castShadow=!/Glass|interior/.test(o.name);o.receiveShadow=true;for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(!m.name.startsWith('PBR '))m.envMapIntensity=.6;for(const key of ['map','normalMap','roughnessMap'])if(m[key])m[key].anisotropy=8;}});scene.add(buildings);}
async function buildForest(){
 const [g,meta]=await Promise.all([new GLTFLoader().loadAsync(AS+(lite?'floresta-lods-mobile.glb':'floresta-lods.glb')),fetch(AS+'floresta-lods.json').then(r=>r.json())]);g.scene.updateMatrixWorld(true);
 for(let v=0;v<meta.variants.length;v++){
  prototypes.push(meta.variants[v]);const levels=[];
  for(const [li,lod] of ['near','mid','far'].entries()){
   if(lite&&li===0){levels.push([]);instances.push([]);continue;}
   const prefix=`v${v}_${lod}`,node=g.scene.getObjectByName(prefix),group=[];if(!node)throw new Error('LOD ausente: '+prefix);
   node.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);const ms=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
    for(const m of (Array.isArray(ms)?ms:[ms])){m.side=THREE.DoubleSide;m.envMapIntensity=.5;if(m.isMeshBasicMaterial)m.color.setRGB(.68,.71,.65);if(m.map)m.map.anisotropy=8;if(m.transparent||m.alphaTest>0){m.transparent=false;m.depthWrite=true;m.alphaTest=.42;m.alphaToCoverage=true;}m.needsUpdate=true;}
    const inst=new THREE.InstancedMesh(geo,ms,li===0?45:li===1?220:10000);inst.count=0;inst.frustumCulled=false;inst.castShadow=true;inst.receiveShadow=true;scene.add(inst);group.push(inst);
   });levels.push(group);instances.push(group);
  }forestLods.push(levels);
 }updateForest(true);
}
function updateForest(force=false){
 if(!forestLods.length||!ground)return;if(!force&&camera.position.distanceToSquared(lastForest)<9)return;lastForest.copy(camera.position);
 const cs=forestLods.map(()=>[0,0,0]);renderedTrees=0;let nearTotal=0,midTotal=0;
 const ranked=displayCrowns.map((t,i)=>({t,i,d:Math.hypot(t[0]-camera.position.x,t[1]+t[3]*.65-camera.position.y,t[2]-camera.position.z)})).sort((a,b)=>a.d-b.d);
 for(const {t,d} of ranked){const variation=treeVariation(t[0],t[2],forestLods.length),v=variation.variant,p=prototypes[v];let li=2;if(d<60&&nearTotal<budget.treesNear){li=0;nearTotal++;}else if(d<budget.treeDistance&&midTotal<budget.treesMid){li=1;midTotal++;}const group=forestLods[v][li],k=cs[v][li];
  const h=THREE.MathUtils.clamp(t[3],5,33),sy=h/(p.height_m||p.height||5),base=THREE.MathUtils.clamp(h*.88,6,23)/(p.width_m||p.width||5),sx=base*variation.scaleX,sz=base*variation.scaleZ;
  dummy.position.set(t[0],t[1]-.45*Math.max(sx,sz),t[2]);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,variation.yaw,0);dummy.updateMatrix();
  for(const m of group){m.setMatrixAt(k,dummy.matrix);m.setColorAt(k,new THREE.Color().setRGB(...variation.color));}cs[v][li]++;renderedTrees++;
 }
 forestLods.forEach((levels,v)=>levels.forEach((group,l)=>group.forEach(m=>{m.count=cs[v][l];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;})));
}
function unavailable(error){if(fatal)return;fatal=true;ready=false;active=false;keys.clear();if(raf)cancelAnimationFrame(raf);raf=0;console.error('Vale:',stage,error);document.body.classList.add('unavailable');$('#loading').hidden=true;$('#fallback').hidden=false;$$('footer button,.tools button,#visit').forEach(b=>b.disabled=true);
 const code=contextLost?'GPU_CONTEXT_LOST':stage==='Preparando o visor'?'WEBGL_INIT':error?.name==='RangeError'?'MEMORY_OR_STACK':'LOAD_OR_RENDER';
 const details={version:'mobile-2',quality,stage,code,message:String(error?.message||error).slice(0,240),gpu};window.__maqueteFailure=details;
 $('#failure-details').textContent=`Código: ${code} · modo ${quality} · etapa: ${stage}\n${details.message}`;
 $('#fallback-copy').textContent=code==='WEBGL_INIT'?'O navegador não conseguiu iniciar a aceleração 3D. Tente abrir este mesmo link no Chrome atualizado, fora do navegador de outro aplicativo.':code==='GPU_CONTEXT_LOST'?'O celular interrompeu o processamento gráfico. Feche outras abas e tente o modo leve abaixo.':'O carregamento parou antes de completar. Tente novamente no modo leve; o código abaixo ajuda a identificar a falha.';
}
async function init(){try{
 if(query.get('webgl')==='off')throw Error('Fallback solicitado');
 checkpoint('Preparando o visor');renderer=new THREE.WebGLRenderer({antialias:!lite,powerPreference:lite?'default':'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,lite?1:1.5));renderer.setSize($('#world').clientWidth,$('#world').clientHeight);renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('#world').appendChild(renderer.domElement);
 const gl=renderer.getContext();gpu={textureUnits:gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE)};
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;unavailable(Error('Contexto gráfico interrompido pelo dispositivo.'));});
 renderer.debug.onShaderError=()=>{throw Error('Não foi possível compilar um material para esta GPU.');};
 scene=new THREE.Scene();scene.background=new THREE.Color(0xb9c8cd);scene.fog=new THREE.Fog(0xbac5c6,950,3200);camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.15,6000);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.5;controls.maxDistance=2500;controls.maxPolarAngle=Math.PI*.9;controls.zoomSpeed=.7;controls.addEventListener('change',request);controls.addEventListener('start',cancel);
 scene.add(new THREE.HemisphereLight(0xe3f1ff,0x433e2c,lite?.9:.45));sun=new THREE.DirectionalLight(0xffedce,3.3);sun.castShadow=true;sun.shadow.mapSize.set(budget.shadows,budget.shadows);sun.shadow.normalBias=.05;sun.shadow.bias=-.00006;sun.shadow.radius=2;scene.add(sun,sun.target);
 await optional('Preparando a luz',async()=>{const t=await new HDRLoader().loadAsync(AS+'ceu.hdr');t.mapping=THREE.EquirectangularReflectionMapping;scene.environment=t;scene.environmentIntensity=.65;scene.background=t;scene.backgroundBlurriness=.025;scene.backgroundIntensity=.85;},null);
 checkpoint('Preparando terreno e materiais');await buildGround();const sampleGround=(x,z)=>sample(ground,x,z);
 const displayedGround=createTerrainSampler(ground,data.n,2);
 checkpoint('Preparando o rio');water=buildValleyWater({scene,data,ground,sample:sampleGround});rockStats=await optional('Preparando as rochas',()=>buildRiverRocks({scene,sample:displayedGround,water}),{});
 checkpoint('Preparando as ruas');
 streets=await buildStreets({scene,renderer,sample:displayedGround,textures:terrainTextures});
 roadExclusion=createRoadExclusion(streets.routes.map(r=>({halfWidth:r.width/2+.35,points:r.curve.getSpacedPoints(Math.ceil(r.len)).map(p=>[p.x,p.z])})));
 const beforeRoadFilter=displayCrowns.length;
 displayCrowns=displayCrowns.filter(t=>!roadExclusion(t[0],t[2],Math.max(1.5,Math.min(3.5,t[3]*.1))));
 excludedRoadTrees=beforeRoadFilter-displayCrowns.length;makeStops();
 checkpoint('Preparando as edificações');await buildBuildings();registerBuildingFootprints(buildings);
 await optional('Preparando as árvores',buildForest,null);
 const gardenAnchors=collectGardenAnchors(buildings),gardenProfile=terrainTextures.setGardens(gardenAnchors);
 architectureStats.gardens={anchors:gardenAnchors.length,...gardenProfile.stats,illustrative:true};
 understory=await optional('Preparando a vegetação próxima',()=>createUnderstory({scene,ground,mask,data,sample:displayedGround,gardenProfile,exclude:(x,z)=>roadExclusion(x,z,.25)||buildingFootprintCells.has(`${Math.floor(x/2)},${Math.floor(z/2)}`)}),()=>{});
 streetStats=await optional('Preparando os veículos',()=>buildStreetProps({scene,sample:displayedGround,streets}),{});
 facadeDetails=await optional('Preparando os acabamentos',()=>addFacadeDetails({scene,buildings,renderer}),null);
 if(facadeDetails?.view)stops[3]=facadeDetails.view;
 if(fatal)return;checkpoint('Finalizando a cena');$('#status').textContent=warnings.length?'Alguns detalhes não carregaram: '+warnings.join(', ')+'.':lite?'Modo leve para celular':'';
 ready=true;$('#loading').hidden=true;$('#walk').disabled=false;$('#visit').disabled=false;setCopy(0);request();new ResizeObserver(()=>{camera.aspect=$('#world').clientWidth/$('#world').clientHeight;camera.updateProjectionMatrix();renderer.setSize($('#world').clientWidth,$('#world').clientHeight);request();}).observe($('#world'));if(query.has('stop'))await go(THREE.MathUtils.clamp(Number(query.get('stop'))||0,0,4));if(query.get('walk')==='1')setWalk(true);window.dispatchEvent(new CustomEvent('maquete:ready'));
 }catch(e){unavailable(e);}}
$$('[data-stop]').forEach(b=>b.onclick=()=>go(+b.dataset.stop));$('#visit').onclick=tour;$('#home').onclick=()=>go(0);$('#walk').onclick=async()=>{if(!ready)return;if(current===0)await go(1);setWalk(!walk);};$('#house-pin').hidden=true;
function zoom(f){if(!ready)return;cancel();const d=camera.position.clone().sub(controls.target).multiplyScalar(f);d.setLength(Math.max(1,d.length()));camera.position.copy(controls.target).add(d);request();}$('#closer').onclick=()=>zoom(.74);$('#farther').onclick=()=>zoom(1.35);$('#full').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await $('#experience').requestFullscreen?.();};
$('#info-open').onclick=()=>{$('#info').showModal();cancel();};$('#info-close').onclick=()=>$('#info').close();$('#info').onclick=e=>{if(e.target===$('#info'))$('#info').close();};function syncMotion(){$('#motion-option').setAttribute('aria-pressed',String(!reduced));$('#motion-option').textContent=reduced?'Ativar voo de câmera':'Voo de câmera ligado';}$('#motion-option').onclick=()=>{reduced=!reduced;syncMotion();};preferences.addEventListener('change',e=>{reduced=e.matches;syncMotion();});syncMotion();
document.addEventListener('visibilitychange',()=>{active=!document.hidden;if(!active){keys.clear();cancel();if(raf){cancelAnimationFrame(raf);raf=0;}}else request();});window.addEventListener('keydown',e=>{if(e.key==='Escape'){cancel();setWalk(false);}if(walk&&['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();keys.add(e.key);request();}});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();look=null;});const mount=$('#world');mount.addEventListener('pointerdown',e=>{if(walk){look={x:e.clientX,y:e.clientY};mount.setPointerCapture(e.pointerId);}});mount.addEventListener('pointermove',e=>{if(!walk||!look)return;const dx=e.clientX-look.x,dy=e.clientY-look.y;look={x:e.clientX,y:e.clientY};const s=new THREE.Spherical().setFromVector3(controls.target.clone().sub(camera.position));s.theta-=dx*.004;s.phi=THREE.MathUtils.clamp(s.phi+dy*.004,.1,Math.PI-.1);s.radius=1;controls.target.copy(camera.position).add(new THREE.Vector3().setFromSpherical(s));camera.lookAt(controls.target);request();});mount.addEventListener('pointerup',()=>look=null);mount.addEventListener('pointercancel',()=>look=null);$$('[data-walk]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();keys.add(b.dataset.walk);b.setPointerCapture(e.pointerId);request();};for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(b.dataset.walk));});
window.__maqueteQA=()=>({ready,current,walk,playing,reduced,frames,pending:raf,transition:!!transition,triangles:renderer?.info.render.triangles,calls:renderer?.info.render.calls,forestTriangles,renderedTrees,treeVariants:instances.map(g=>g.length),streetStats:{...streetStats,update:undefined},facadePlanes:facadeDetails?.meta.planes.length,river:water?.qa,shadows:!!sun?.castShadow,crowns:data?.crowns.length,forestArea:data?.forest_area_m2,position:camera?.position.toArray(),target:controls?.target.toArray(),resources:performance.getEntriesByType('resource').length,provenance:{dsm:2020,buildings:2021,landscape:'3D finishes illustrative; no orthophoto ground projection',nearVegetation:'illustrative, heights derived plus canopy infill',interiors:false}});
window.__maqueteSpatialQA=()=>({ready,excludedRoadTrees,displayedTreeCount:displayCrowns.length,roadSegments:roadExclusion?.segmentCount,remainingRoadCollisions:roadExclusion?displayCrowns.filter(t=>roadExclusion(t[0],t[2],Math.max(1.5,Math.min(3.5,t[3]*.1)))).length:null,rocks:{...rockStats,update:undefined}});
window.__maqueteArchitectureQA=()=>({...architectureStats,industrialReplacedTriangles:facadeDetails?.removedTriangles});
// Local QA hook: deterministic architectural inspection from any side of the recorte.
window.__maqueteView=(p,t)=>{cancel();setWalk(false);camera.position.fromArray(p);controls.target.fromArray(t);camera.updateProjectionMatrix();controls.update();request();};
if(matchMedia('(pointer:coarse)').matches)$('#walk-hud p').textContent='Segure as setas para andar · arraste a cena para olhar';
window.__maqueteDeviceQA=()=>({version:'mobile-2',quality,stage,ready,fatal,contextLost,gpu,warnings:[...warnings],textures:renderer?.info.memory.textures,geometries:renderer?.info.memory.geometries,budget});
init();
