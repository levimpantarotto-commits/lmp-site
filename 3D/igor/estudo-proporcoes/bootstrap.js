// Falhas de dependência também devem ter saída acessível, não um botão inerte.
const retry=document.getElementById('retry');
retry.onclick=()=>location.reload();
let timeout;
Promise.race([import('./walk.js?v=physical-rnm-r1'),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Tempo de carregamento esgotado')),120000);})]).then(()=>{
 clearTimeout(timeout);
 const enter=document.getElementById('enter');enter.disabled=false;enter.removeAttribute('aria-busy');enter.innerHTML='Caminhar pela casa <span>↗</span>';
}).catch(error=>{
 console.error('IGOR_LOAD_FAILED',error);
 clearTimeout(timeout);
 document.getElementById('cover').hidden=true;
 document.getElementById('fallback').hidden=false;
 document.getElementById('failure-reason').textContent='Não foi possível carregar a experiência. Tente novamente ou consulte as fotos originais.';
});
