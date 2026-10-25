// Static local radiance for the social room. Captured once, with no idle loop.
// Baked diffuse remains unchanged; only the specular environment is localized.
export function buildMasterReflections(T,renderer,scene,masterRoot,{mobile=false}={}){
 const bounds=new T.Box3(new T.Vector3(-.1,-.1,-.1),new T.Vector3(7.5,3.05,8.7));
 const candidates=[],box=new T.Box3();scene.updateMatrixWorld(true);
 masterRoot.traverse(o=>{if(!o.isMesh||!o.material.userData.masterWalk)return;box.setFromObject(o);if(bounds.containsBox(box))candidates.push(o);});
 if(!candidates.length)return {enabled:false,reason:'No enclosed social-room receivers'};
 const resolution=mobile?128:256,target=new T.WebGLCubeRenderTarget(resolution,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
 const camera=new T.CubeCamera(.08,30,target);camera.position.set(3.25,1.45,4.3);
 const previousTarget=renderer.getRenderTarget(),previousAutoClear=renderer.autoClear;
 let filtered;
 try{
  camera.update(renderer,scene);
  const pmrem=new T.PMREMGenerator(renderer);
  try{filtered=pmrem.fromCubemap(target.texture);}finally{pmrem.dispose();}
 }catch(error){target.dispose();return {enabled:false,reason:error.message};}
 finally{renderer.setRenderTarget(previousTarget);renderer.autoClear=previousAutoClear;}
 target.dispose();
 const clones=new Map();
 for(const mesh of candidates){
  const original=mesh.material;
  if(!clones.has(original)){
   const material=original.clone();
   material.onBeforeCompile=original.onBeforeCompile;
   material.customProgramCacheKey=()=>original.customProgramCacheKey()+'-local-radiance';
   material.envMap=filtered.texture;material.envMapIntensity=1;
   material.userData.localRadiance='social';material.needsUpdate=true;
   clones.set(original,material);
  }
  mesh.material=clones.get(original);
 }
 const used=new Set();masterRoot.traverse(o=>{if(o.isMesh)used.add(o.material);});
 for(const original of clones.keys())if(!used.has(original))original.dispose();
 masterRoot.userData.localReflectionTarget=filtered;
 return {enabled:true,kind:'static-local-radiance',resolution,receivers:candidates.length,materials:clones.size,position:camera.position.toArray(),updatesAtRest:0};
}
