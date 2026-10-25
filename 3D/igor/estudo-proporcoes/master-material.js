// Preserve the authored surface response while evaluating the existing GI once.
// RNM stores direction, not another additive light contribution.
export function createMasterMaterial(T,d,{lighting,scale,atlasScale=scale,vertexIrradiance=false,directional=[]}={}){
 const p=d.physical||{},parameters={
  color:new T.Color(...(d.colorMap?[1,1,1]:d.color)),
  roughness:d.roughnessMap?1:d.roughness,metalness:d.metalness||0,
  lightMap:lighting,lightMapIntensity:atlasScale,vertexColors:vertexIrradiance,
  envMapIntensity:.55
 };
 const mat=d.physical?new T.MeshPhysicalMaterial({...parameters,
  ior:p.ior,specularIntensity:p.specularIntensity,specularColor:new T.Color(...p.specularColor),
  sheen:p.sheen,sheenRoughness:p.sheenRoughness,sheenColor:new T.Color(...p.sheenColor),
  clearcoat:p.clearcoat,clearcoatRoughness:p.clearcoatRoughness
 }):new T.MeshStandardMaterial(parameters);
 mat.name='Master_'+d.name;
 mat.userData.masterWalk=true;
 mat.userData.sourceMaterial=d.sourceMaterial;
 mat.userData.directionalGI=directional.length===3&&!!d.normalMap;
 const original=vertexIrradiance?
  `max(vColor.rgb*${Number(scale).toFixed(8)},texture2D(lightMap,vLightMapUv).rgb*lightMapIntensity)`:
  'texture2D(lightMap,vLightMapUv).rgb*lightMapIntensity';
 mat.onBeforeCompile=shader=>{
  if(vertexIrradiance)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','');
  let response=`vec3 masterIrradiance=${original};`;
  if(directional.length===3){
   shader.fragmentShader='uniform sampler2D masterRNM0;\nuniform sampler2D masterRNM1;\nuniform sampler2D masterRNM2;\n'+shader.fragmentShader;
   directional.forEach((map,i)=>{shader.uniforms['masterRNM'+i]={value:map};});
   response+=`
    #ifdef USE_NORMALMAP_TANGENTSPACE
     vec3 rnmNormal=texture2D(normalMap,vNormalMapUv).xyz*2.0-1.0;
     rnmNormal.xy*=normalScale;
     rnmNormal=normalize(rnmNormal);
     vec3 rnmWeights=max(vec3(
      dot(rnmNormal,vec3(.8164965809,0.0,.5773502692)),
      dot(rnmNormal,vec3(-.4082482905,.7071067812,.5773502692)),
      dot(rnmNormal,vec3(-.4082482905,-.7071067812,.5773502692))),vec3(0.0));
     rnmWeights*=rnmWeights;
     rnmWeights/=max(dot(rnmWeights,vec3(1.0)),.00001);
     vec3 rnm0=texture2D(masterRNM0,vLightMapUv).rgb;
     vec3 rnm1=texture2D(masterRNM1,vLightMapUv).rgb;
     vec3 rnm2=texture2D(masterRNM2,vLightMapUv).rgb;
     vec3 rnmFlat=(rnm0+rnm1+rnm2)/3.0;
     vec3 rnmValue=rnm0*rnmWeights.x+rnm1*rnmWeights.y+rnm2*rnmWeights.z;
     // Neutral normal is exactly the original scalar GI. In unlit atlas
     // pixels the epsilon falls back to unity instead of amplifying noise.
     masterIrradiance*= (rnmValue+vec3(.0001))/(rnmFlat+vec3(.0001));
    #endif
   `;
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',
   '#include <lights_fragment_end>\n'+response+'\nreflectedLight.directDiffuse=vec3(0.0);\nreflectedLight.indirectDiffuse=diffuseColor.rgb*(1.0-metalnessFactor)*masterIrradiance;');
 };
 mat.customProgramCacheKey=()=>`master-directional-v1-${vertexIrradiance?scale:'atlas'}-${directional.length===3}`;
 return mat;
}
