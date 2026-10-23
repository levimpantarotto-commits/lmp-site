import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {loadRealTerrain} from './real-terrain.js';
const query=new URLSearchParams(location.search),embed=query.has('embed');document.body.classList.toggle('embed',embed);
const full=query.get('motion')==='full',reduced=matchMedia('(prefers-reduced-motion:reduce)').matches&&!full;
const stage=document.querySelector('#terrain-canvas'),status=document.querySelector('#terrain-status');let renderer,terrain,controls,camera,scene,raf=0,active=true,rotating=!reduced,failed=false,last=0;
const motion=document.querySelector('#terrain-motion');
function updateMotion(){motion.textContent=rotating?'Pausar movimento':'Iniciar movimento';motion.setAttribute('aria-pressed',String(rotating));if(controls)controls.autoRotate=rotating;request();}
function request(){if(!raf&&active&&!failed)raf=requestAnimationFrame(render);}
function render(time){raf=0;if(!active||failed||!renderer)return;if(time-last<32){request();return;}last=time;controls.update();renderer.render(scene,camera);if(rotating)request();}
function resize(){if(!renderer)return;const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);request();}
function fallback(error){failed=true;if(raf)cancelAnimationFrame(raf);raf=0;stage.hidden=true;document.querySelector('#terrain-fallback').hidden=false;status.textContent='Visor 3D indisponível: mostrando a prancha real. '+(error?.message||'');document.querySelectorAll('button').forEach(b=>b.disabled=true);}
try{
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power',preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.5));renderer.setClearColor(0x163e38,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;stage.append(renderer.domElement);
 scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xe7f2e5,0x1c372a,2.3));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-400,800,500);scene.add(sun);
 camera=new THREE.PerspectiveCamera(42,1,1,12000);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.autoRotateSpeed=.45;controls.minDistance=260;controls.maxDistance=2400;controls.maxPolarAngle=Math.PI*.46;controls.enablePan=false;controls.addEventListener('change',request);
 terrain=await loadRealTerrain(renderer);scene.add(terrain.group);controls.target.set(0,terrain.middle,0);camera.position.set(520,430+terrain.middle,650);controls.update();terrain.mode(query.get('view')||'photo');terrain.vectors(query.get('view')==='height');status.textContent='';
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback(new Error('Contexto gráfico interrompido. Reabra o visor para tentar novamente.'));});
 document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{terrain.mode(button.dataset.mode);terrain.vectors(button.dataset.mode==='height');document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));request();}));
 motion.addEventListener('click',()=>{rotating=!rotating;updateMotion();});
 new ResizeObserver(resize).observe(stage);document.addEventListener('visibilitychange',()=>{active=!document.hidden;request();});window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;if(typeof event.data?.terrainActive==='boolean'){active=event.data.terrainActive&&!document.hidden;request();}});resize();updateMotion();
}catch(error){console.error('Falha no terreno real:',error);fallback(error);}
