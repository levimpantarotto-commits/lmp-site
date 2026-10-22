// Mobile is a GPU/memory budget, not just a narrower viewport.
export function selectQuality(search='',device={}) {
 const requested=new URLSearchParams(search).get('quality');
 if(requested==='full')return 'full';
 if(requested==='lite')return 'lite';
 return device.coarse||device.mobile||device.width<700||(device.memory&&device.memory<=4)?'lite':'full';
}
const device=typeof window==='undefined'?{}:{width:innerWidth,coarse:matchMedia('(pointer:coarse)').matches,mobile:/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),memory:navigator.deviceMemory};
export const quality=selectQuality(typeof location==='undefined'?'':location.search,device);
export const lite=quality==='lite';
export const budget=lite?{treesNear:0,treesMid:28,treeDistance:110,shadows:1024,anisotropy:2}:{treesNear:18,treesMid:220,treeDistance:300,shadows:4096,anisotropy:8};
export function installAssetBudget(THREE){
 if(!lite)return;
 const glbs=new Set(['arquitetura-detalhada.glb','fachadas-detalhadas.glb','floresta-lods-mobile.glb','props.glb','veiculo-carconcept-realista-distante.glb','veiculo-realista-distante.glb','rochas-escaneadas.glb','subbosque.glb']);
 THREE.DefaultLoadingManager.setURLModifier(url=>{
  if(!url.includes('assets/maquete/')||url.includes('/lite/'))return url;
  const parsed=new URL(url,document.baseURI),name=parsed.pathname.split('/').pop();
  if(parsed.origin===location.origin&&(glbs.has(name)||name.endsWith('.jpg')))parsed.pathname=parsed.pathname.replace(/\/[^/]+$/,'/lite/'+name);
  return parsed.href;
 });
}
