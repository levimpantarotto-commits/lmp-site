// Falhas de dependência também devem ter saída acessível, não um botão inerte.
const retry=document.getElementById('retry');
retry.onclick=()=>location.reload();
import('./walk.js').then(()=>{
 const enter=document.getElementById('enter');enter.disabled=false;enter.removeAttribute('aria-busy');enter.innerHTML='Caminhar pela casa <span>↗</span>';
}).catch(()=>{
 document.getElementById('cover').hidden=true;
 document.getElementById('fallback').hidden=false;
 document.getElementById('failure-reason').textContent='Não foi possível carregar a experiência. Tente novamente ou consulte as fotos originais.';
});
