import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {moveVisitor} from './navigation.js';

export async function createViewer(container,{onProgress,onError}){
  const mobile = matchMedia('(pointer:coarse)').matches || innerWidth<700;
  const renderer = new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(mobile?1:Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  container.replaceChildren(renderer.domElement);
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','region');canvas.setAttribute('aria-roledescription','Cena 3D interativa');canvas.setAttribute('aria-label','Estudo navegável da varanda. Arraste para olhar. Ative Caminhar para usar setas ou W A S D.');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b9d4e1');scene.fog=new THREE.Fog('#c7d5cd',35,155);
  const camera=new THREE.PerspectiveCamera(mobile?68:59,1,.05,240);
  const controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.enableDamping=false;controls.enableZoom=true;
  controls.minDistance=1.15;controls.maxDistance=5.8;controls.minPolarAngle=.52;controls.maxPolarAngle=1.57;
  const hemi=new THREE.HemisphereLight('#d7e9ff','#c3b69b',1.5);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff2d3',2.6);sun.position.set(-5,11,-4);sun.castShadow=true;
  sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.5,far:30});sun.shadow.bias=-.00012;sun.shadow.normalBias=.015;sun.shadow.radius=2;scene.add(sun);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(180,32,18),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#5999c5')},bottom:{value:new THREE.Color('#e1e9dc')}},vertexShader:'varying vec3 vWorld; void main(){vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 vWorld;void main(){float t=pow(max(normalize(vWorld).y,0.0),0.45);gl_FragColor=vec4(mix(bottom,top,t),1.0);}'}));scene.add(sky);
  const environmentScene=new THREE.Scene();environmentScene.add(sky.clone());
  const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(environmentScene,.03,.1,250);scene.environment=env.texture;pmrem.dispose();
  landscape(scene);
  let disposed=false,walking=false,frame=0,last=0,yaw=0,pitch=0,pointer=null;
  const aborter=new AbortController();
  let loadTimeout=setTimeout(()=>aborter.abort(new Error('Tempo limite de carregamento excedido')),25000);
  async function loadModel(url){const response=await fetch(url,{signal:aborter.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);const buffer=await response.arrayBuffer();if(disposed)throw new Error('Viewer disposed');return new GLTFLoader().parseAsync(buffer,new URL('.',import.meta.url).href);}
  const inputs=new Set();
  // Mirror the modelling X axis so the wall stays to the right as in the photo.
  const stops=[{p:[-2.45,1.68,-2.2],t:[.75,.92,.65]},{p:[-1.2,1.45,-1.25],t:[.8,.77,.5]},{p:[-1.5,1.65,1.0],t:[2.2,.95,6.0]}];
  const render=()=>{
    frame=0;if(disposed||document.hidden)return;
    const now=performance.now(),dt=Math.min((now-last)/1000,.04);last=now;
    if(walking&&inputs.size&&!document.querySelector('dialog[open]')){
      let forward=(inputs.has('forward')?1:0)-(inputs.has('back')?1:0);
      let right=(inputs.has('right')?1:0)-(inputs.has('left')?1:0);
      const norm=Math.hypot(forward,right)||1;forward/=norm;right/=norm;
      const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*dt*1.25;
      const dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*dt*1.25;
      const next=moveVisitor({x:-camera.position.x,z:camera.position.z},-dx,dz);camera.position.x=-next.x;camera.position.z=next.z;
    }
    renderer.render(scene,camera);
    if(walking&&inputs.size)frame=requestAnimationFrame(render);
  };
  function refresh(){if(!frame&&!disposed){last=performance.now();frame=requestAnimationFrame(render);}}
  function pause(){inputs.clear();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));if(frame)cancelAnimationFrame(frame);frame=0;pointer=null;}
  function view(i=0){walking=false;inputs.clear();controls.enabled=true;camera.position.fromArray(stops[i].p);controls.target.fromArray(stops[i].t);controls.update();refresh();}
  function look(){camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);refresh();}
  function walk(active){pause();walking=active;controls.enabled=!active;if(active){camera.rotation.order='YXZ';camera.position.set(-2.3,1.65,-2.1);camera.lookAt(.8,1.2,.7);yaw=camera.rotation.y;pitch=camera.rotation.x;look();canvas.focus({preventScroll:true});}else view(0);}
  function move(direction,active){if(!walking)return;if(active)inputs.add(direction);else inputs.delete(direction);refresh();}
  const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
  function keydown(e){if(!walking||document.querySelector('dialog[open]')||!keyMap[e.code])return;e.preventDefault();move(keyMap[e.code],true);}
  function keyup(e){if(keyMap[e.code])move(keyMap[e.code],false);}
  function down(e){if(!walking)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}
  function drag(e){if(!walking||!pointer||e.pointerId!==pointer.id)return;yaw-=(e.clientX-pointer.x)*.0035;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-pointer.y)*.0035,-.85,.65);pointer.x=e.clientX;pointer.y=e.clientY;look();}
  function up(){pointer=null;}
  const resize=()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();refresh();};
  const observer=new ResizeObserver(resize);observer.observe(container);
  controls.addEventListener('change',refresh);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',drag);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);
  const contextLost=e=>{e.preventDefault();if(!disposed){dispose();onError(new Error('WebGL context lost'));}};canvas.addEventListener('webglcontextlost',contextLost);
  function dispose(){if(disposed)return;pause();disposed=true;clearTimeout(loadTimeout);aborter.abort();observer.disconnect();controls.dispose();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',drag);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of [].concat(o.material)){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}}});env.dispose();renderer.dispose();canvas.remove();}
  try{
    onProgress('Carregando o modelo da varanda…');
    const model=await loadModel('./assets/varanda.glb');
    if(disposed)throw new Error('Viewer disposed');
    const grain=new Uint8Array(128*128*4);
    for(let i=0;i<128*128;i++){const n=Math.sin(i*78.233)*43758.5453;grain[i*4]=125+Math.floor((n-Math.floor(n))*7);grain[i*4+1]=125+((i*13)%7);grain[i*4+2]=255;grain[i*4+3]=255;}
    const normal=new THREE.DataTexture(grain,128,128);normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.magFilter=THREE.LinearFilter;normal.minFilter=THREE.LinearFilter;normal.needsUpdate=true;
    model.scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const m=o.material;m.envMapIntensity=.5;
      if(m.name.startsWith('Piso')){m.map=null;m.color.set(['#b7ac97','#b9af9b','#b4aa96'][Number(m.name.slice(-1))||0]);m.normalMap=normal;m.normalScale.set(.22,.22);m.roughness=.42;m.needsUpdate=true;}
      if(m.name.includes('Vidro do guarda')){m.opacity=.13;m.transparent=true;m.depthWrite=false;o.castShadow=false;m.side=THREE.DoubleSide;}
      if(m.name.includes('Folhas')){m.side=THREE.DoubleSide;m.color.set('#4f712c');}
      if(m.name.includes('Ferro_Pintura')){m.roughness=.38;m.metalness=.12;}
    });model.scene.scale.x=-1;scene.add(model.scene);
    onProgress('Preparando os detalhes e a paisagem…');
    const trees=await loadModel('./assets/arvore.glb');
    if(disposed)throw new Error('Viewer disposed');
    trees.scene.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(trees.scene),height=bounds.max.y-bounds.min.y;
    const points=[[-19,17,8],[-14,13,6.8],[-9,17,9],[-4,15,6.5],[2,19,9.5],[8,14,7],[14,17,8.5],[21,22,10],[-24,26,9],[28,31,11],[.5,28,9],[-11,29,9.5]];
    trees.scene.traverse(o=>{if(!o.isMesh)return;const inst=new THREE.InstancedMesh(o.geometry,o.material,points.length);o.material.envMapIntensity=.35;const transform=new THREE.Object3D();points.forEach(([x,z,h],i)=>{transform.position.set(x,-5.2,z);transform.rotation.y=i*2.399;transform.scale.setScalar(h/height);transform.updateMatrix();inst.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(transform.matrix,o.matrixWorld));});inst.instanceMatrix.needsUpdate=true;scene.add(inst);});
    clearTimeout(loadTimeout);view(0);resize();renderer.render(scene,camera);
  }catch(error){dispose();throw error;}
  return{view,walk,move,pause,refresh,dispose,inspect:()=>({ready:!disposed,mobile,walking,position:camera.position.toArray(),rotation:[pitch,yaw],calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,dpr:renderer.getPixelRatio(),canvas:[canvas.width,canvas.height],pendingFrame:Boolean(frame)})};
}

function landscape(scene){
  // Context only. Not reconstructed topography, property boundaries or neighbours.
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(220,220),new THREE.MeshStandardMaterial({color:'#70815c',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-5.2;scene.add(ground);
  const geo=new THREE.PlaneGeometry(210,110,95,48);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,colors=[];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i)+72;
    const height=-5+Math.sin(x*.033+1.5)*5+Math.exp(-Math.pow((x-22)/33,2))*17+Math.sin(x*.09+z*.05)*2.5+Math.sin(x*.25)*Math.sin(z*.19)*.6;
    const fade=THREE.MathUtils.smoothstep(z,18,50);pos.setXYZ(i,x,-5+(height+5)*fade,z);
    const c=new THREE.Color().setHSL(.23+Math.sin(x*.08)*.018,.18, .29+Math.sin(x*.17+z*.19)*.03+z*.0010);colors.push(c.r,c.g,c.b);
  }geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();scene.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#4d6645',vertexColors:true,roughness:1})));
  let seed=197;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),new THREE.MeshStandardMaterial({color:'#507146',roughness:1}),180);
  const object=new THREE.Object3D();
  for(let i=0;i<180;i++){const x=(rand()-.5)*105,z=24+rand()*25;const r=.3+rand()*.8;object.position.set(x,-4.5+r,z);object.scale.set(r,r*(.7+rand()*.7),r);object.rotation.set(rand(),rand()*6,rand());object.updateMatrix();crowns.setMatrixAt(i,object.matrix);crowns.setColorAt(i,new THREE.Color().setHSL(.23+rand()*.07,.22+rand()*.14,.22+rand()*.08));}
  crowns.instanceMatrix.needsUpdate=true;scene.add(crowns);
}
