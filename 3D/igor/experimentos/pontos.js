import * as THREE from '../estudo-proporcoes/vendor/three.module.js';

const canvas = document.querySelector('#cloud');
const select = document.querySelector('#pair');
const modeSelect = document.querySelector('#mode');
const size = document.querySelector('#size');
const status = document.querySelector('#status');
const dialog = document.querySelector('#sourceDialog');
const sourcePhotos = document.querySelector('#sourcePhotos');
let renderer, scene, camera, cloud, points = [], drag, last, currentRadius = 1, denseData;
let activePair;

function setup() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene = new THREE.Scene(); scene.background = new THREE.Color('#151610');
  camera = new THREE.PerspectiveCamera(52, 1, .01, 1000); resetCamera();
  scene.add(new THREE.AmbientLight(0xffffff, 1));
  const axes = new THREE.AxesHelper(1); axes.material.transparent = true; axes.material.opacity = .35; scene.add(axes);
  addEventListener('resize', render); canvas.addEventListener('pointerdown', e => { drag=true; last=[e.clientX,e.clientY]; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!drag) return; const dx=e.clientX-last[0], dy=e.clientY-last[1]; last=[e.clientX,e.clientY]; camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),-dx*.01); camera.position.y += dy*.012; camera.lookAt(0,0,0); render(); });
  canvas.addEventListener('pointerup', () => { drag=false; }); canvas.addEventListener('pointercancel', () => { drag=false; });
  addEventListener('keydown', e => { const tag=e.target?.tagName; if (!camera || ['INPUT','SELECT','TEXTAREA','BUTTON'].includes(tag) || e.target?.isContentEditable || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return; e.preventDefault(); const delta=.13; if(e.key==='ArrowLeft') camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),delta); if(e.key==='ArrowRight') camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),-delta); if(e.key==='ArrowUp') camera.position.y+=delta; if(e.key==='ArrowDown') camera.position.y-=delta; camera.lookAt(0,0,0); render(); });
}
function resetCamera() { camera?.position.set(0, currentRadius*.14, Math.max(2.5, currentRadius*2.7)); camera?.lookAt(0,0,0); render(); }
function render() { if (!renderer) return; const r=canvas.getBoundingClientRect(); renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false); camera.aspect=r.width/r.height; camera.updateProjectionMatrix(); renderer.render(scene,camera); }
function showPair(pair) {
  activePair = pair;
  if (cloud) { scene.remove(cloud); cloud.geometry.dispose(); cloud.material.dispose(); }
  const useDense = modeSelect.value === 'dense' && pair.id === '03-05';
  modeSelect.disabled = pair.id !== '03-05';
  if (pair.id !== '03-05' && modeSelect.value === 'dense') modeSelect.value = 'sparse';
  const data = useDense ? denseData : pair;
  points = data.points || []; const arr = new Float32Array(points.flat()); const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
  if (data.colors?.length === points.length) geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(data.colors.flat()),3)); geo.computeBoundingSphere();
  const sourceSphere = geo.boundingSphere; // Display normalization only; JSON retains pair-local coordinates.
  if (sourceSphere?.radius) { geo.translate(-sourceSphere.center.x,-sourceSphere.center.y,-sourceSphere.center.z); geo.scale(1/sourceSphere.radius,1/sourceSphere.radius,1/sourceSphere.radius); }
  geo.computeBoundingSphere(); currentRadius = Math.max(.2, geo.boundingSphere?.radius || 1); cloud = new THREE.Points(geo,new THREE.PointsMaterial({color:'#f4d878',vertexColors:pair.colors?.length===points.length,size:Math.max(.006,currentRadius*Number(size.value)*.012),sizeAttenuation:true})); scene.add(cloud);
  const meta = report.pairs.find(p => p.id===pair.id); const test = meta?.focal_sensitivity || {};
  status.textContent = useDense ? (denseData.status === 'candidate-dense' ? `Denso experimental · ${points.length} pontos após estéreo SGBM, consistência esquerda-direita e filtro de textura. Escala arbitrária; não é malha.` : `Denso reprovado · ${denseData.reason || 'A nuvem não passou no filtro de coerência.'} As imagens retificadas e a disparidade continuam disponíveis para auditoria.`) : `${pair.status === 'candidate' ? 'Candidato' : 'Rejeitado/instável'} · ${points.length} pontos exportados · matches Lowe: ${meta?.ratio_matches ?? '—'} · f=500/700/900: ${Object.values(test).map(v=>v.point_count ?? 0).join(' / ')}.${pair.reason ? ` ${pair.reason}` : ''}`;
  renderPhotos(); resetCamera();
}
function renderPhotos() { sourcePhotos.innerHTML = activePair.photos.map((photo,i)=>`<figure><img src="../assets/${photo}.jpg" alt="Foto fonte ${photo}"><figcaption>${i ? 'Foto B' : 'Foto A'} · ${photo}.jpg</figcaption></figure>`).join(''); }
function renderDenseAudit() { sourcePhotos.innerHTML = [['dense-03-05-rectified-left.jpg','Foto 03 retificada'],['dense-03-05-rectified-right.jpg','Foto 05 retificada'],['dense-03-05-disparity.jpg','Disparidade após filtros']].map(([file,label])=>`<figure><img src="data/${file}" alt="${label}"><figcaption>${label} · diagnóstico, não textura 3D.</figcaption></figure>`).join(''); }
let report;
async function boot() {
  const [cloudData, reportData, dense] = await Promise.all([fetch('data/point-cloud.json').then(r=>r.json()),fetch('data/point-report.json').then(r=>r.json()),fetch('data/dense-03-05.json').then(r=>r.json())]); report=reportData; denseData=dense; setup();
  cloudData.pairs.forEach(p=>select.add(new Option(`${p.group}: ${p.label}`,p.id))); select.addEventListener('change',()=>showPair(cloudData.pairs.find(p=>p.id===select.value))); modeSelect.addEventListener('change',()=>showPair(cloudData.pairs.find(p=>p.id===select.value)));
  size.addEventListener('input',()=>{ if(cloud) { cloud.material.size=Math.max(.006,currentRadius*Number(size.value)*.012); render(); } }); document.querySelector('#reset').addEventListener('click',resetCamera); document.querySelector('#photos').addEventListener('click',()=>{ renderPhotos(); dialog.showModal(); }); document.querySelector('#matches').addEventListener('click',()=>{ sourcePhotos.innerHTML=`<figure><img src="${activePair.match_image}" alt="Correspondências de ${activePair.label}"><figcaption>Correspondências SIFT após razão de Lowe; ainda não significam uma superfície confirmada.</figcaption></figure>`; dialog.showModal(); }); document.querySelector('#denseAudit').addEventListener('click',()=>{ renderDenseAudit(); dialog.showModal(); }); document.querySelector('.close').addEventListener('click',()=>dialog.close()); const preferred=cloudData.pairs.find(p=>p.status==='candidate') || cloudData.pairs.slice().sort((a,b)=>b.points.length-a.points.length)[0]; select.value=preferred.id; showPair(preferred);
}
boot().catch(err=>{ status.textContent=`Falha ao carregar o teste: ${err.message}`; console.error(err); });
