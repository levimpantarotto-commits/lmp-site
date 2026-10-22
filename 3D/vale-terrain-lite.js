import * as THREE from 'three';
import {gardenProfileFor} from './vale-gardens.js';

// Lighter terrain finish: keeps the measured mesh untouched and reduces the
// terrain shader to six explicit texture samplers.  Road materials are kept
// separate from this shader so buildStreets can use the same public contract.
const AS='./assets/maquete/';
const FALLBACK_RIVER=[[.714,0],[.647,.102],[.59,.14],[.529,.145],[.498,.21],[.453,.255],[.42,.333],[.394,.395],[.416,.45],[.445,.487],[.456,.572],[.464,.64],[.438,.7],[.393,.711],[.391,.785],[.365,.865],[.386,.946],[.42,1],[.519,1],[.478,.908],[.476,.817],[.51,.72],[.529,.635],[.523,.56],[.51,.498],[.488,.446],[.5,.402],[.556,.327],[.616,.248],[.671,.194],[.719,.105],[.781,0]];
const FALLBACK_YARD=[[.776,.157],[.699,.168],[.672,.212],[.655,.252],[.649,.298],[.63,.338],[.646,.361],[.703,.357],[.715,.29],[.747,.212]];
const FALLBACK_YARD_2=[[.543,.405],[.581,.414],[.628,.444],[.602,.553],[.583,.602],[.532,.59],[.508,.492],[.504,.432]];

function inside(x,z,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[c,d]=poly[j];if(((b>z)!==(d>z))&&(x<(c-a)*(z-b)/(d-b)+a))yes=!yes;}return yes;}

function dip512(texture,color=true){
 const image=texture.image;
 if(typeof document==='undefined'||!image?.width||!image?.height)return texture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(image,0,0,512,512);
 texture.image=canvas;texture.needsUpdate=true;
 if(color)texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}

async function tx(name,renderer,color=true){
 // Explicitly retain the application's DefaultLoadingManager URL modifier
 // (the root router), rather than creating a detached loading manager.
 const texture=await new THREE.TextureLoader(THREE.DefaultLoadingManager).loadAsync(AS+name);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.anisotropy=Math.min(4,renderer?.capabilities?.getMaxAnisotropy?.()||1);
 return dip512(texture,color);
}

function paintClasses(data,mask,riverbed,yard,yard2){
 const types=new Uint8Array(data.n*data.n*4);
 for(let r=0;r<data.n;r++)for(let c=0;c<data.n;c++){
  const i=r*data.n+c,u=c/1000,v=r/1000;
  types[i*4]=mask?.[i]?255:0;
  types[i*4+1]=inside(u,v,riverbed)?255:0;
  types[i*4+2]=(inside(u,v,yard)||inside(u,v,yard2))?255:0;
 }
 const classes=new THREE.DataTexture(types,data.n,data.n,THREE.RGBAFormat);
 classes.magFilter=classes.minFilter=THREE.LinearFilter;classes.needsUpdate=true;
 return {types,classes};
}

export async function finishTerrainLite({scene,renderer,data,ground,mask,geometry,riverbed=FALLBACK_RIVER,yard=FALLBACK_YARD,yard2=FALLBACK_YARD_2}){
 const [grass,soil,rock,gravel,asphalt,concrete]=await Promise.all([
  tx('prado-diff.jpg',renderer),tx('floresta-solo.jpg',renderer),tx('rocha-diff.jpg',renderer),
  tx('cascalho-diff.jpg',renderer),tx('asfalto-diff.jpg',renderer),tx('concreto-diff.jpg',renderer)
 ]);
 const {types,classes}=paintClasses(data,mask,riverbed,yard,yard2);
 const material=new THREE.MeshStandardMaterial({roughness:.88,metalness:0});
 material.onBeforeCompile=shader=>{
  // Exactly six terrain sampler uniforms: grass, soil, rock, gravel, asphalt
  // and the class/paint texture. No normal, roughness or bump maps are added.
  Object.assign(shader.uniforms,{grassTex:{value:grass},soilTex:{value:soil},rockTex:{value:rock},gravelTex:{value:gravel},asphaltTex:{value:asphalt},classTex:{value:classes}});
  shader.vertexShader='varying vec3 vLiteLand; varying vec3 vLiteNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLiteLand=position;vLiteNormal=normal;');
  shader.fragmentShader=`varying vec3 vLiteLand; varying vec3 vLiteNormal;
uniform sampler2D grassTex,soilTex,rockTex,gravelTex,asphaltTex,classTex;
float liteNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453),b=fract(sin(dot(i+vec2(1.,0.),vec2(127.1,311.7)))*43758.5453),c=fract(sin(dot(i+vec2(0.,1.),vec2(127.1,311.7)))*43758.5453),d=fract(sin(dot(i+1.,vec2(127.1,311.7)))*43758.5453);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
vec3 liteTile(sampler2D t,vec2 uv){float k=smoothstep(.27,.73,liteNoise(uv*.11));return mix(texture2D(t,uv).rgb,texture2D(t,uv*vec2(.81,.93)+vec2(17.3,5.1)).rgb,k);}
vec3 liteRock(vec3 p,vec3 n){vec3 w=pow(abs(n),vec3(5.0));w/=w.x+w.y+w.z;return texture2D(rockTex,p.zy).rgb*w.x+texture2D(rockTex,p.xz).rgb*w.y+texture2D(rockTex,p.xy).rgb*w.z;}
`+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 n=normalize(vLiteNormal);vec4 cls=texture2D(classTex,(vLiteLand.xz+500.0)/1000.0);
float macro=liteNoise(vLiteLand.xz/38.0),slope=1.0-abs(n.y),exposed=smoothstep(.31,.73,slope+(.45-macro)*.22);
vec3 meadow=liteTile(grassTex,vLiteLand.xz/2.6)*mix(vec3(.49,.68,.32),vec3(.83,.78,.55),macro);
vec3 earth=liteTile(soilTex,vLiteLand.xz/3.7)*vec3(.76,.69,.54);
meadow=mix(meadow,earth,smoothstep(.57,.88,liteNoise(vLiteLand.xz/17.0+4.7))*.38);
vec3 stone=liteRock(vLiteLand/9.5,n);float mineral=dot(stone,vec3(.2126,.7152,.0722));stone=mix(stone,vec3(mineral)*vec3(.94,.98,1.04),.68);stone*=mix(.40,.91,liteNoise(vec2(vLiteLand.x+vLiteLand.z*.43,vLiteLand.y*.87+vLiteLand.z*.18)/9.0));
vec3 land=mix(meadow,earth,cls.r);land=mix(land,stone,exposed);land=mix(land,liteTile(gravelTex,vLiteLand.xz/3.0),cls.g);land=mix(land,liteTile(asphaltTex,vLiteLand.xz/5.0)*1.18,cls.b);land=mix(land,liteTile(grassTex,vLiteLand.xz/1.8)*vec3(.50,.80,.34),cls.a*.82);diffuseColor.rgb*=land;`);
 };
 material.customProgramCacheKey=()=> 'vale-terrain-lite-six-samplers-v1';
 // The incoming DEM BufferGeometry is intentionally used as-is: no vertex
 // positions, normals, indices or bounds are changed by this module.
 const terrain=new THREE.Mesh(geometry,material);terrain.name='Terreno leve / materiais ilustrativos';terrain.receiveShadow=true;scene.add(terrain);
 const setGardens=anchors=>{
  const profile=gardenProfileFor(anchors),stats={paintedSamples:0,maxStrength:0};
  for(let r=730;r<=925&&r<data.n;r++)for(let c=680;c<=860&&c<data.n;c++){
   const i=r*data.n+c;if(types[i*4]||types[i*4+1]||types[i*4+2])continue;
   const slope=Math.hypot((ground?.[i+1]??0)-(ground?.[i-1]??0),(ground?.[i+data.n]??0)-(ground?.[i-data.n]??0))*.5;
   types[i*4+3]=Math.round(profile(c-500,r-500)*(1-THREE.MathUtils.smoothstep(slope,.25,.65))*255);
   if(types[i*4+3])stats.paintedSamples++;stats.maxStrength=Math.max(stats.maxStrength,types[i*4+3]/255);
  }
  profile.stats=stats;classes.needsUpdate=true;return profile;
 };
 return {asphalt,concrete,setGardens};
}
