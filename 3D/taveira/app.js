const $ = s => document.querySelector(s);
let viewer, starting = false, attempt = 0, reloadRequired = false;
const cover = $('#cover'), start = $('#start'), message = $('#load-message');
const photoTitles = {varanda:'A varanda real.',entrada:'A entrada real.',escada:'A escada real.'};
function showPhoto(name='varanda') {
  $('#real-photo').src = `./assets/${name}.jpeg`;
  $('#real-photo').alt = `Fotografia real: ${name}`;
  $('#photo-title').textContent = photoTitles[name];
  document.querySelectorAll('[data-photo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.photo===name)));
  if (!$('#photo-dialog').open) $('#photo-dialog').showModal();
  viewer?.pause();
}
$('#compare').addEventListener('click',()=>showPhoto());
$('#other-photos').addEventListener('click',()=>showPhoto('entrada'));
document.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>showPhoto(b.dataset.photo)));
$('#about').addEventListener('click',()=>{$('#about-dialog').showModal();viewer?.pause();});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>viewer?.refresh()));
function setMode(walking) {
  $('#walk').setAttribute('aria-pressed',String(walking));
  $('#walk').innerHTML = walking?'Sair da caminhada <span aria-hidden="true">↗</span>':'Caminhar <span aria-hidden="true">↗</span>';
  $('#walk-pad').hidden = !walking;
  $('#mode-hint').textContent = walking?'Arraste para olhar · setas para caminhar':'Arraste para olhar ao redor';
  if (walking) document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));
}
function failed(error) {
  viewer?.dispose();viewer = null;starting=false;
  reloadRequired=true;cover.hidden=false;start.disabled=false;start.innerHTML='Recarregar a experiência ↗';
  message.textContent='O 3D não abriu neste navegador. As fotos continuam disponíveis; você pode tentar novamente.';
  $('#scene-label').hidden=true;$('#mode-hint').hidden=true;setMode(false);
  document.querySelectorAll('[data-view], #walk').forEach(b=>b.disabled=true);
  console.warn('Varanda: carregamento interrompido',error?.message||error);
}
start.addEventListener('click',async()=>{
  if(starting||viewer)return;
  if(reloadRequired){location.reload();return;}
  const currentAttempt=++attempt;
  starting=true;start.disabled=true;message.textContent='Preparando a varanda…';
  try {
    const {createViewer} = await import('./viewer.js');
    const created=await createViewer($('#canvas-wrap'),{onError:error=>{if(currentAttempt===attempt){attempt++;failed(error);}},onProgress:value=>{if(currentAttempt===attempt)message.textContent=value;}});
    if(currentAttempt!==attempt){created.dispose();return;}
    viewer=created;
    cover.hidden=true;$('#scene-label').hidden=false;$('#mode-hint').hidden=false;
    document.querySelectorAll('[data-view], #walk').forEach(b=>b.disabled=false);
    $('#quality-label').textContent='Exterior parcial · paisagem ilustrativa';
    starting=false;
    viewer.refresh();
  }catch(error){if(currentAttempt===attempt){attempt++;failed(error);}}
});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{
  if(!viewer)return;viewer.view(Number(b.dataset.view));setMode(false);
  document.querySelectorAll('[data-view]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));
  $('#scene-state').textContent=b.textContent.trim();
}));
$('#walk').addEventListener('click',()=>{
  if(!viewer)return;const walking=$('#walk').getAttribute('aria-pressed')!=='true';viewer.walk(walking);setMode(walking);
  $('#scene-state').textContent=walking?'↗ Caminhando na varanda':'01 Varanda';
  if(!walking)document.querySelector('[data-view="0"]').setAttribute('aria-pressed','true');
});
document.querySelectorAll('[data-move]').forEach(b=>{
  function stop(){b.classList.remove('pressed');viewer?.move(b.dataset.move,false);}
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('pressed');viewer?.move(b.dataset.move,true);});
  ['pointerup','pointercancel','lostpointercapture','blur'].forEach(type=>b.addEventListener(type,stop));
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)viewer?.pause();else viewer?.refresh();});
window.addEventListener('blur',()=>viewer?.pause());
window.__varandaQA=()=>viewer?viewer.inspect():{ready:false,loading:starting};
