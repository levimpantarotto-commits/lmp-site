const entry=document.querySelector('#entry'),experience=document.querySelector('#experience'),info=document.querySelector('#info');
document.querySelector('#entry-info').onclick=()=>info.showModal();document.querySelector('#info-close').onclick=()=>info.close();info.onclick=e=>{if(e.target===info)info.close();};
let started=false;
for(const button of document.querySelectorAll('[data-start]'))button.addEventListener('click',async()=>{
 if(started)return;started=true;document.querySelectorAll('[data-start]').forEach(b=>b.disabled=true);
 const url=new URL(location.href);if(button.dataset.start==='walk'){url.searchParams.set('stop','4');url.searchParams.set('walk','1');}else{url.searchParams.delete('walk');if(!url.searchParams.has('stop'))url.searchParams.set('stop','0');}history.replaceState(null,'',url);
 experience.hidden=false;entry.hidden=true;
 try{await import('./vale.js');}catch(error){console.error('Falha ao abrir experiência3D',error);experience.hidden=true;entry.hidden=false;document.querySelector('#entry-error').textContent='Não foi possível iniciar o3D. A imagem continua disponível; tente recarregar em outro navegador.';}
});
window.addEventListener('maquete:ready',()=>document.querySelector('#world').focus({preventScroll:true}),{once:true});
