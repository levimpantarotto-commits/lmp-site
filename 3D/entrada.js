import {lite} from './vale-quality.js';
const entry=document.querySelector('#entry'),experience=document.querySelector('#experience'),info=document.querySelector('#info');
if(lite)document.querySelector('.entry-note').textContent='Modo leve ativado para este dispositivo. O passeio ainda carrega modelos 3D: prefira Wi-Fi e aguarde a preparação.';
document.querySelector('#entry-info').onclick=()=>info.showModal();document.querySelector('#info-close').onclick=()=>info.close();info.onclick=e=>{if(e.target===info)info.close();};
let started=false;
for(const button of document.querySelectorAll('[data-start]'))button.addEventListener('click',async()=>{
 if(started)return;started=true;document.querySelectorAll('[data-start]').forEach(b=>b.disabled=true);
 const url=new URL(location.href);if(button.dataset.start==='walk'){url.searchParams.set('stop','4');url.searchParams.set('walk','1');}else{url.searchParams.delete('walk');if(!url.searchParams.has('stop'))url.searchParams.set('stop','0');}history.replaceState(null,'',url);
 experience.hidden=false;entry.hidden=true;
 try{await import('./vale.js');}catch(error){console.error('Falha ao abrir experiência 3D',error);experience.hidden=true;entry.hidden=false;document.querySelector('#entry-error').textContent='Não foi possível baixar o visor 3D. Confira a conexão e recarregue a página para tentar novamente.';}
});
window.addEventListener('maquete:ready',()=>document.querySelector('#world').focus({preventScroll:true}),{once:true});
