import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {conformRibbon} from './vale-spatial.js';
import {gardenProfileFor} from './vale-gardens.js';

// All finishes and street furniture are illustrative. Paths were traced on the
// source orthophoto; they are not cadastral vectors or a vehicle inventory.
const AS='./assets/maquete/';
const local=p=>new THREE.Vector3(p[0]*1000-500,0,p[1]*1000-500);
const rnd=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
export const mainRoad=[[.831,0],[.813,.09],[.793,.21],[.807,.35],[.825,.46],[.818,.51],[.793,.55],[.751,.61],[.724,.65],[.705,.70],[.68,.76],[.654,.82],[.633,.89],[.631,1]];
const serviceRoad=[[.793,.157],[.742,.151],[.696,.164],[.665,.198],[.654,.245],[.65,.284],[.637,.345],[.628,.4],[.615,.48],[.598,.55],[.591,.612],[.607,.651],[.654,.682],[.69,.716]];
const villages=[[[.664,.792],[.71,.804],[.748,.823],[.772,.848],[.751,.883],[.72,.915],[.71,.96],[.719,1]],[[.71,.804],[.747,.76],[.787,.721],[.817,.702],[.83,.725],[.803,.773],[.772,.848]],[[.636,.918],[.68,.928],[.72,.915],[.777,.938],[.789,1]],[[.633,.976],[.684,.964],[.71,.96]]];
export const ROAD_LAYOUT=[{path:mainRoad,w:7.8,lines:true},{path:serviceRoad,w:5.4},...villages.map(path=>({path,w:3.6}))];
const riverbed=[[.714,0],[.647,.102],[.59,.14],[.529,.145],[.498,.21],[.453,.255],[.42,.333],[.394,.395],[.416,.45],[.445,.487],[.456,.572],[.464,.64],[.438,.7],[.393,.711],[.391,.785],[.365,.865],[.386,.946],[.42,1],[.519,1],[.478,.908],[.476,.817],[.51,.72],[.529,.635],[.523,.56],[.51,.498],[.488,.446],[.5,.402],[.556,.327],[.616,.248],[.671,.194],[.719,.105],[.781,0]];
const yard=[[.776,.157],[.699,.168],[.672,.212],[.655,.252],[.649,.298],[.63,.338],[.646,.361],[.703,.357],[.715,.29],[.747,.212]];
const yard2=[[.543,.405],[.581,.414],[.628,.444],[.602,.553],[.583,.602],[.532,.59],[.508,.492],[.504,.432]];
function inside(x,z,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[c,d]=poly[j];if(((b>z)!==(d>z))&&(x<(c-a)*(z-b)/(d-b)+a))yes=!yes;}return yes;}
async function tx(name,renderer,color=true){const t=await new THREE.TextureLoader().loadAsync(AS+name);if(color)t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}

export async function finishTerrain({scene,renderer,data,ground,mask,geometry}){
 const [grass,soil,concrete,asphalt,rock,gravel,rough]=await Promise.all([tx('prado-diff.jpg',renderer),tx('floresta-solo.jpg',renderer),tx('concreto-diff.jpg',renderer),tx('asfalto-diff.jpg',renderer),tx('rocha-diff.jpg',renderer),tx('cascalho-diff.jpg',renderer),tx('prado-rough.jpg',renderer,false)]);
 const [grassN,soilN,rockN,gravelN,asphaltN,rockR,gravelR]=await Promise.all(['prado-normal.jpg','floresta-normal.jpg','rocha-normal.jpg','cascalho-normal.jpg','asfalto-normal.jpg','rocha-rough.jpg','cascalho-rough.jpg'].map(file=>tx(file,renderer,false)));
 const types=new Uint8Array(data.n*data.n*4);
 for(let r=0;r<data.n;r++)for(let c=0;c<data.n;c++){const i=r*data.n+c,u=c/1000,v=r/1000;types[i*4]=mask[i]?255:0;types[i*4+1]=inside(u,v,riverbed)?255:0;types[i*4+2]=(inside(u,v,yard)||inside(u,v,yard2))?255:0;types[i*4+3]=0;}
 const classes=new THREE.DataTexture(types,data.n,data.n,THREE.RGBAFormat);classes.magFilter=THREE.LinearFilter;classes.minFilter=THREE.LinearFilter;classes.needsUpdate=true;
 const m=new THREE.MeshStandardMaterial({roughness:.94,bumpMap:grass,bumpScale:.04});
 m.onBeforeCompile=s=>{Object.assign(s.uniforms,{grassTex:{value:grass},soilTex:{value:soil},stoneTex:{value:rock},gravelTex:{value:gravel},asphaltTex:{value:asphalt},classTex:{value:classes},roughTex:{value:rough},grassNormal:{value:grassN},soilNormal:{value:soilN},stoneNormal:{value:rockN},gravelNormal:{value:gravelN},asphaltNormal:{value:asphaltN},stoneRough:{value:rockR},gravelRough:{value:gravelR}});
 s.vertexShader='varying vec3 vLand; varying vec3 vLandNormal;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLand=position;vLandNormal=normal;');
 s.fragmentShader=`varying vec3 vLand; varying vec3 vLandNormal;
 uniform sampler2D grassTex,soilTex,stoneTex,gravelTex,asphaltTex,classTex,roughTex;
 uniform sampler2D grassNormal,soilNormal,stoneNormal,gravelNormal,asphaltNormal,stoneRough,gravelRough;
 float landNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);vec4 h=fract(sin(vec4(dot(i,vec2(127.1,311.7)),dot(i+vec2(1,0),vec2(127.1,311.7)),dot(i+vec2(0,1),vec2(127.1,311.7)),dot(i+vec2(1,1),vec2(127.1,311.7))))*43758.5453);return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);}
 float landFbm(vec2 p){return .57*landNoise(p)+.28*landNoise(p*2.13+7.3)+.15*landNoise(p*4.57-3.7);}
 vec3 landTex(sampler2D t,vec2 uv){float blend=smoothstep(.2,.8,landNoise(uv*.13));return mix(texture2D(t,uv).rgb,texture2D(t,mat2(.8,-.6,.6,.8)*uv+vec2(13.37,7.31)).rgb,blend);}
 vec3 landTri(sampler2D t,vec3 p,vec3 n){vec3 w=pow(abs(n),vec3(5.0));w/=w.x+w.y+w.z;return texture2D(t,p.zy).rgb*w.x+texture2D(t,p.xz).rgb*w.y+texture2D(t,p.xy).rgb*w.z;}
 float landStrata(vec3 p){vec2 q=vec2(p.x+p.z*.43,p.y*.87+p.z*.18);q+=vec2(landFbm(q/31.0),landFbm(q/39.0+11.7))*9.0;return .7*landFbm(q/9.0)+.3*(1.0-abs(landFbm(q/3.4)*2.0-1.0));}
 vec3 landBump(sampler2D t,vec2 uv,vec3 n,vec3 viewP,float strength){
  vec3 dp1=dFdx(viewP),dp2=dFdy(viewP);vec2 st1=dFdx(uv),st2=dFdy(uv);
  vec3 t1=cross(dp2,n)*st1.x+cross(n,dp1)*st2.x,b1=cross(dp2,n)*st1.y+cross(n,dp1)*st2.y;
  float inv=inversesqrt(max(max(dot(t1,t1),dot(b1,b1)),1e-12));
  vec3 bump=texture2D(t,uv).xyz*2.0-1.0;bump.xy*=strength;
  return normalize((t1*bump.x+b1*bump.y)*inv+n*bump.z);
 }
 vec3 landNormal(sampler2D t,vec2 uv,vec3 n,vec3 p,float strength){float b=smoothstep(.2,.8,landNoise(uv*.13));return normalize(mix(landBump(t,uv,n,p,strength),landBump(t,mat2(.8,-.6,.6,.8)*uv+vec2(13.37,7.31),n,p,strength),b));}
 `+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec4 cls=texture2D(classTex,(vLand.xz+500.0)/1000.0);
 float macro=landFbm(vLand.xz/34.0),slope=1.0-smoothstep(.43,.80,abs(normalize(vLandNormal).y)),yardWeight=cls.b*(1.0-smoothstep(.10,.25,1.0-abs(normalize(vLandNormal).y)));
 vec3 meadow=landTex(grassTex,vLand.xz/2.51)*mix(vec3(.57,.76,.39),vec3(.85,.83,.60),macro);
 vec3 litter=landTex(soilTex,vLand.xz/3.5)*vec3(.66,.63,.53);
 float bareSoil=smoothstep(.46,.70,landFbm(vLand.xz/17.0+vec2(26.1,5.7)))*.72;
 meadow=mix(meadow,litter*vec3(1.08,.91,.77),bareSoil);
 meadow*=.73+.45*macro;meadow=mix(meadow,landTex(grassTex,vLand.xz/1.65)*vec3(.44,.77,.31),cls.a*.84);
 // Geological masses must remain readable beyond the 2.38 m scan tile.
 vec3 stone=landTri(stoneTex,vLand/9.5,normalize(vLandNormal));
 vec3 stoneMacro=landTri(stoneTex,(vLand+vec3(41,23,17))/27.0,normalize(vLandNormal));
 stone=mix(stone,stoneMacro,.36);
 float mineral=dot(stone,vec3(.2126,.7152,.0722));
 stone=mix(stone,vec3(mineral)*vec3(.94,.98,1.04),.68);
 float strata=landStrata(vLand);
 stone*=mix(.33,.95,smoothstep(.19,.82,strata));
 // Soil/grass pockets on gentle ledges, exposed mineral on steep slopes.
 float exposure=clamp(slope+(.48-macro)*.30,0.0,1.0);
 vec3 land=mix(meadow,litter,smoothstep(.18,.83,cls.r));land=mix(land,stone,exposure);
 land=mix(land,landTex(gravelTex,vLand.xz/3.0),cls.g);land=mix(land,texture2D(asphaltTex,vLand.xz/5.0).rgb*1.35,yardWeight);
 float landRelief=dot(land,vec3(.2126,.7152,.0722))*.055;
 diffuseColor.rgb*=land;`);
 s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 float landR=texture2D(roughTex,vLand.xz/2.51).g;
 landR=mix(landR,landTri(stoneRough,vLand/9.5,normalize(vLandNormal)).g,exposure);
 landR=mix(landR,texture2D(gravelRough,vLand.xz/3.0).g,cls.g);
 roughnessFactor*=.58+.42*landR;`);
 s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`
 vec3 baseN=normal,pView=-vViewPosition;
 vec3 meadowN=landNormal(grassNormal,vLand.xz/2.51,baseN,pView,.7),litterN=landNormal(soilNormal,vLand.xz/3.5,baseN,pView,.65);
 vec3 weights=pow(abs(normalize(vLandNormal)),vec3(5.0));weights/=weights.x+weights.y+weights.z;
 vec3 cliffN=normalize(landBump(stoneNormal,vLand.zy/9.5,baseN,pView,1.05)*weights.x+landBump(stoneNormal,vLand.xz/9.5,baseN,pView,1.05)*weights.y+landBump(stoneNormal,vLand.xy/9.5,baseN,pView,1.05)*weights.z);
 normal=normalize(mix(mix(meadowN,litterN,max(smoothstep(.18,.83,cls.r),bareSoil)),cliffN,exposure));
 // Shading-scale fractures only: no vertex/DEM displacement or false survey detail.
 vec3 dx=dFdx(pView),dy=dFdy(pView),r1=cross(dy,normal),r2=cross(normal,dx);float det=dot(dx,r1);
 vec3 grad=sign(det)*(dFdx(strata)*r1+dFdy(strata)*r2);
 normal=normalize(abs(det)*normal-grad*.75*exposure);
 normal=normalize(mix(normal,landNormal(gravelNormal,vLand.xz/3.0,baseN,pView,.75),cls.g));
 normal=normalize(mix(normal,landBump(asphaltNormal,vLand.xz/5.0,baseN,pView,.35),yardWeight));`);
 };
 m.customProgramCacheKey=()=> 'valley-terrain-geological-scales-v3';
 const terrain=new THREE.Mesh(geometry,m);terrain.name='Terreno real / materiais físicos ilustrativos';terrain.receiveShadow=true;scene.add(terrain);
 const setGardens=anchors=>{const profile=gardenProfileFor(anchors),stats={paintedSamples:0,maxStrength:0};for(let r=730;r<=925&&r<data.n;r++)for(let c=680;c<=860&&c<data.n;c++){const i=r*data.n+c;if(types[i*4]||types[i*4+1]||types[i*4+2])continue;const slope=Math.hypot(ground[i+1]-ground[i-1],ground[i+data.n]-ground[i-data.n])*.5;types[i*4+3]=Math.round(profile(c-500,r-500)*(1-THREE.MathUtils.smoothstep(slope,.25,.65))*255);if(types[i*4+3])stats.paintedSamples++;stats.maxStrength=Math.max(stats.maxStrength,types[i*4+3]/255);}profile.stats=stats;classes.needsUpdate=true;return profile;};return {asphalt,concrete,setGardens};
}

export function ribbon(path,width,sample,material,offset=0,height=.14){
 const controls=path.map(local),curve=path.linear?new THREE.CurvePath():new THREE.CatmullRomCurve3(controls,false,'centripetal');if(path.linear)for(let i=1;i<controls.length;i++)curve.add(new THREE.LineCurve3(controls[i-1],controls[i]));const len=curve.getLength(),steps=Math.ceil(len/1.4),across=Math.max(1,Math.ceil(width/4)),row=across+1,p=[],uv=[],idx=[];
 // Split the pavement against the DEM planes below. A coarse quad spanning
 // the width cut through convex ground and exposed brown triangles in it.
 for(let i=0;i<=steps;i++){
  const t=i/steps,a=curve.getPointAt(t),d=curve.getTangentAt(t),side=new THREE.Vector3(-d.z,0,d.x).normalize();
  for(let j=0;j<=across;j++){const q=a.clone().addScaledVector(side,offset+(j/across-.5)*width);p.push(q.x,sample(q.x,q.z)+height,q.z);uv.push(j/across*width/3,t*len/3);}
  if(i<steps)for(let j=0;j<across;j++){const k=i*row+j;idx.push(k,k+1,k+row,k+1,k+row+1,k+row);}
 }
 const fitted=conformRibbon(p,uv,idx,sample,height),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(fitted.positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(fitted.uvs,2));g.setIndex(fitted.indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;return {mesh,curve,len};
}
function markingMesh(segments,sample,mat){const p=[],idx=[];for(const {a,b,width=.12} of segments){const d=b.clone().sub(a).normalize(),s=new THREE.Vector3(-d.z,0,d.x).multiplyScalar(width/2),k=p.length/3;for(const q of [a.clone().sub(s),a.clone().add(s),b.clone().sub(s),b.clone().add(s)])p.push(q.x,sample(q.x,q.z)+.21,q.z);idx.push(k,k+1,k+2,k+1,k+3,k+2);}const fitted=conformRibbon(p,new Array(p.length/3*2).fill(0),idx,sample,.21),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(fitted.positions,3));g.setIndex(fitted.indices);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.receiveShadow=true;return m;}

export async function buildStreets({scene,renderer,sample,textures}){
 const [an,cn]=await Promise.all([tx('asfalto-normal.jpg',renderer,false),tx('concreto-normal.jpg',renderer,false)]);
 const asphalt=new THREE.MeshStandardMaterial({map:textures.asphalt,normalMap:an,normalScale:new THREE.Vector2(.32,.32),roughness:.93,color:0xb3b8b4});
 const curb=new THREE.MeshStandardMaterial({map:textures.concrete,normalMap:cn,normalScale:new THREE.Vector2(.25,.25),roughness:.9,color:0xb6b4a5});
 const paint=new THREE.MeshStandardMaterial({color:0xdedbc9,roughness:.8,side:THREE.DoubleSide});
 // Verified offline against the complete measured shell, including road width.
 // Keep setup responsive: no path search runs on the browser's rendering thread.
 const response=await fetch(AS+'ruas-corrigidas.json');if(!response.ok)throw Error('Traçado viário validado indisponível');
 const all=(await response.json()).roads;
 if(!Array.isArray(all)||all.length!==ROAD_LAYOUT.length)throw Error('Traçado viário incompleto');
 for(const road of all)road.path.linear=true;
 const markings=[];const routes=[];
 for(const road of all){const r=ribbon(road.path,road.w,sample,asphalt);r.width=road.w;scene.add(r.mesh);routes.push(r);for(const s of [-1,1])scene.add(ribbon(road.path,.2,sample,curb,s*(road.w/2+.15),.31).mesh);
 if(road.lines){for(let d=0;d<r.len-4;d+=10){markings.push({a:r.curve.getPointAt(d/r.len),b:r.curve.getPointAt(Math.min(1,(d+4)/r.len)),width:.13});}for(const s of [-1,1])scene.add(ribbon(road.path,.1,sample,paint,s*(road.w/2-.3),.20).mesh);}}
 const parking=[];
 // Rows within the observed industrial yards; cars themselves are illustrative.
 const rows=[{u:.661,v:.242,n:8,angle:.12},{u:.647,v:.288,n:8,angle:.18},{u:.688,v:.24,n:5,angle:.10},{u:.643,v:.356,n:8,angle:.13},{u:.615,v:.462,n:8,angle:.18},{u:.597,v:.546,n:5,angle:.2}];
 for(const row of rows){const start=local([row.u,row.v]),axis=new THREE.Vector3(Math.sin(row.angle),0,Math.cos(row.angle)),cross=new THREE.Vector3(axis.z,0,-axis.x);
 for(let i=0;i<=row.n;i++){const a=start.clone().addScaledVector(axis,i*2.7);markings.push({a:a.clone().addScaledVector(cross,-2.6),b:a.clone().addScaledVector(cross,2.6),width:.085});if(i<row.n&&rnd(i+row.u*100)> .17){const q=a.clone().addScaledVector(axis,1.35);parking.push({x:q.x,z:q.z,yaw:Math.PI/2-row.angle});}}}
 scene.add(markingMesh(markings,sample,paint));
 return {routes,parking};
}

export async function buildStreetProps({scene,sample,streets}){
 const loader=new GLTFLoader(),[props,...assets]=await Promise.all(['props.glb','veiculo-carconcept-realista.glb','veiculo-carconcept-realista-medio.glb','veiculo-carconcept-realista-distante.glb','veiculo-realista.glb','veiculo-realista-medio.glb','veiculo-realista-distante.glb'].map(file=>loader.loadAsync(AS+file)));
 props.scene.updateMatrixWorld(true);
 const stats={cars:0,lamps:0,vehicles:['Car Concept / Darmstadt Graphics Group GmbH + Eric Chadwick (2024) / CC-BY 4.0','Ferrari 458 Italia / vicent091036 / CC-BY 4.0'],illustrative:true,lodCounts:[0,0,0],vehicleTriangles:0,maxWheelGapM:0,vehicleFamilies:{sedan:0,ferrari:0}};
 function instanceNode(name,placements){const node=props.scene.getObjectByName(name);if(!node)return false;node.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(node.matrixWorld).invert(),m=new THREE.Matrix4(),o=new THREE.Object3D();node.traverse(mesh=>{if(!mesh.isMesh)return;const geo=mesh.geometry.clone();m.multiplyMatrices(inv,mesh.matrixWorld);geo.applyMatrix4(m);const im=new THREE.InstancedMesh(geo,mesh.material,placements.length);im.castShadow=true;im.receiveShadow=true;placements.forEach((p,i)=>{o.position.set(p.x,sample(p.x,p.z)+.22,p.z);o.rotation.set(0,p.yaw||0,0);o.scale.setScalar(p.scale||1);o.updateMatrix();im.setMatrixAt(i,o.matrix);});im.computeBoundingSphere();scene.add(im);});return true;}
 // The vehicle mix is illustrative. Unlike the rejected block-out cars, these
 // are licensed PBR car assets with glass, tires and three explicit distance
 // meshes. The lone Ferrari remains a rare detail; chassis fit four tire points.
 const placements=[],colors=[0x193d62,0x9b3a23,0x6f7377,0xe0ddd2,0x31553b,0x513642,0x647985,0x846e50].map(c=>new THREE.Color(c));
 const families=[{name:'sedan',wheelX:1.08,wheelZ:1.33,scale:.95},{name:'ferrari',wheelX:.85,wheelZ:1.30,scale:1}];
 const candidates=[...streets.parking.map((_,i)=>i)];
 for(const index of [...new Set(candidates)]){
  if(placements.length===12)break;const p=streets.parking[index];if(!p||placements.some(q=>Math.hypot(q.position.x-p.x,q.position.z-p.z)<5.6))continue;
  // The lone Ferrari prevents a car-park made of repeated supercars. Vans are
  // spaced out and never dominate the compact passenger-car rows.
  const family=families[(placements.length===2)?1:0];
  const wheelX=family.wheelX*family.scale,wheelZ=family.wheelZ*family.scale,s=Math.sin(p.yaw||0),c=Math.cos(p.yaw||0);
  const contacts=[[-wheelX,-wheelZ],[wheelX,-wheelZ],[-wheelX,wheelZ],[wheelX,wheelZ]].map(([x,z])=>({x,z,y:sample(p.x+c*x+s*z,p.z-s*x+c*z)}));
  const slopeX=(contacts[1].y+contacts[3].y-contacts[0].y-contacts[2].y)/(4*wheelX),slopeZ=(contacts[2].y+contacts[3].y-contacts[0].y-contacts[1].y)/(4*wheelZ);
  if(Math.hypot(slopeX,slopeZ)>.18)continue;
  const right=new THREE.Vector3(c,slopeX,-s).normalize(),forward=new THREE.Vector3(s,slopeZ,c),up=new THREE.Vector3().crossVectors(forward,right).normalize();forward.crossVectors(right,up).normalize();
  const rotation=new THREE.Matrix4().makeBasis(right,up,forward),corrections=contacts.map(q=>q.y-new THREE.Vector3(q.x,0,q.z).applyMatrix4(rotation).y),gap=Math.max(...corrections)-Math.min(...corrections);
  if(gap>.06)continue;const position=new THREE.Vector3(p.x,Math.max(...corrections)+.006,p.z),matrix=rotation.clone().scale(new THREE.Vector3(family.scale,family.scale,family.scale)).setPosition(position);
  placements.push({position,matrix,color:colors[placements.length%colors.length],family:family.name});stats.vehicleFamilies[family.name]++;stats.maxWheelGapM=Math.max(stats.maxWheelGapM,gap+.006);
 }
 stats.cars=placements.length;
 stats.preview=placements.slice(0,3).map((p,index)=>({index,family:p.family,position:p.position.toArray(),paint:`#${p.color.getHexString()}`}));
 stats.positions=placements.map((p,index)=>({index,family:p.family,position:p.position.toArray()}));
 function instancedFamily(source,name,level=0){
  source.scene.updateMatrixWorld(true);const meshes=[];
  source.scene.traverse(mesh=>{if(!mesh.isMesh)return;const geo=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
   const material=mesh.material.clone(),isPaint=/paint|body|carroceria/i.test(material.name);if(isPaint){material.color.set(0xffffff);material.vertexColors=true;}
   if(level>0&&material.transmission>0){material.transmission=0;material.metalness=.35;material.roughness=.16;}
   const im=new THREE.InstancedMesh(geo,material,Math.max(1,placements.length));im.name=`Veículo ${name} / LOD ${level} / ${material.name}`;im.count=0;im.visible=false;im.castShadow=level<2;im.receiveShadow=true;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.userData.paint=isPaint;scene.add(im);meshes.push(im);
  });return meshes;
 }
 const groups={sedan:assets.slice(0,3).map((asset,level)=>[instancedFamily(asset,'Car Concept CC-BY',level)]),ferrari:assets.slice(3,6).map((asset,level)=>[instancedFamily(asset,'Ferrari 458 Italia',level)])};
 const assetTriangles=assets.map(asset=>{let n=0;asset.scene.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});return n;});
 const previous=new THREE.Vector3(Infinity,Infinity,Infinity);
 stats.update=camera=>{
  if(camera.position.distanceToSquared(previous)<.25)return;previous.copy(camera.position);
  const lists={sedan:[[],[],[]],ferrari:[[],[],[]]};
  placements.forEach(p=>{const d=p.position.distanceTo(camera.position),level=d<35?0:d<100?1:2;lists[p.family][level].push(p);});
  stats.lodCounts=[0,0,0];stats.vehicleTriangles=0;
  // Count a placement once; meshes are only its material parts.
  for(const name of Object.keys(groups))for(let level=0;level<3;level++){const count=lists[name][level].length;stats.lodCounts[level]+=count;stats.vehicleTriangles+=count*assetTriangles[(name==='sedan'?0:3)+level];}
  for(const name of Object.keys(groups))groups[name].forEach((levels,level)=>levels.forEach(meshes=>meshes.forEach(im=>{
   const bucket=lists[name][level]||[];im.count=bucket.length;im.visible=!!bucket.length;bucket.forEach((p,i)=>{im.setMatrixAt(i,p.matrix);if(im.userData.paint)im.setColorAt(i,p.color);});im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;if(bucket.length){im.computeBoundingBox();im.computeBoundingSphere();}
  })));
 };
 stats.update({position:new THREE.Vector3(0,1000,0)});
 const lamps=[];for(const r of streets.routes.slice(0,2))for(let d=15;d<r.len;d+=38){const q=r.curve.getPointAt(d/r.len),v=r.curve.getTangentAt(d/r.len);q.add(new THREE.Vector3(-v.z,0,v.x).multiplyScalar(5.3));lamps.push({x:q.x,z:q.z,yaw:Math.atan2(v.x,v.z)});}if(instanceNode('lamp',lamps))stats.lamps=lamps.length;
 return stats;
}

export async function buildRiverRocks({scene,sample,water=null}){
 const gltf=await new GLTFLoader().loadAsync(AS+'rochas-escaneadas.glb');gltf.scene.updateMatrixWorld(true);
 const capacity=900,groups=[],supports=[],placements=[],d=new THREE.Object3D(),point=new THREE.Vector3();
 const stats={rocks:0,variants:2,illustrative:true,source:'Poly Haven / Boulder 01 + Rock 07 / CC0',lodCounts:[0,0,0],triangles:0,maxBasalPenetrationM:0,sizeBands:{pebble:0,cobble:0,boulder:0},wetRocks:0,distribution:'Clustered gravel bars with sparse embedded boulders; open deeper channel',contactMethod:'Lower scan vertices fitted to rendered DEM and buried 24–38%; wetline follows inferred river surface'};
 for(let variant=0;variant<2;variant++){
  const levels=[];
  for(const [level,suffix] of ['near','mid','far'].entries()){
   const node=gltf.scene.getObjectByName(`rocha_v${variant}_${suffix}`);if(!node?.isMesh)throw new Error(`Missing scanned rock ${variant}/${suffix}`);
   const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);geometry.computeBoundingBox();
   const height=geometry.boundingBox.max.y-geometry.boundingBox.min.y,material=node.material.clone();
   material.envMapIntensity=.65;material.normalScale.set(.85,.85);material.aoMapIntensity=.8;
   for(const key of ['map','normalMap','roughnessMap','aoMap'])if(material[key])material[key].anisotropy=8;
   geometry.setAttribute('stoneWetLevel',new THREE.InstancedBufferAttribute(new Float32Array(capacity),1));
   // Moisture follows each instance's inferred water level in world space,
   // rather than painting every dry boulder's lower third black.
   material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float stoneWetLevel; varying float vStoneWaterHeight; varying vec2 vStoneXZ;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec3 stoneWorld=(modelMatrix*instanceMatrix*vec4(position,1.0)).xyz;vStoneWaterHeight=stoneWorld.y-stoneWetLevel;vStoneXZ=stoneWorld.xz;');
    shader.fragmentShader='varying float vStoneWaterHeight; varying vec2 vStoneXZ;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\nfloat damp=1.0-smoothstep(-.03,.16,vStoneWaterHeight+.02*sin(vStoneXZ.x*23.0+vStoneXZ.y*17.0));diffuseColor.rgb*=mix(1.0,.55,damp);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,max(.22,roughnessFactor*.48),damp);');
   };
   material.customProgramCacheKey=()=>`scanned-river-rock-waterline-v2-${variant}-${level}`;
   const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.name=`Rocha fotogramétrica CC0 / variante ${variant} / LOD ${level}`;mesh.count=0;mesh.visible=false;mesh.castShadow=level<2;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);levels.push(mesh);
   if(level===0){const p=geometry.attributes.position,base=[];for(let i=0;i<p.count;i++)if(p.getY(i)<height*.38)base.push(new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)));supports.push({base,height});}
  }
  groups.push(levels);
 }
 for(let i=0;i<24000&&placements.length<capacity;i++){
  const cluster=Math.floor(i/14),j=i%14,radius=2.5+rnd(cluster+849)*7;
  const u=.36+rnd(cluster*4)*.4+(rnd(i+491)-.5)*radius/500,v=rnd(cluster*4+1)+(rnd(i+711)-.5)*radius/500;if(!inside(u,v,riverbed))continue;
  const x=u*1000-500,z=v*1000-500,slope=Math.hypot(sample(x+1,z)-sample(x-1,z),sample(x,z+1)-sample(x,z-1))/2;if(slope>.34)continue;
  const depth=water?.depthAt(x,z)||0;if(depth>.7&&rnd(i+511)<.9)continue;
  const variant=rnd(i+82)>.53?1:0,large=j===0&&rnd(cluster+883)>.4,size=large?.75+rnd(i+10)*.85:.07+Math.pow(rnd(i+10),1.8)*.5;
  if(placements.some(p=>Math.hypot(p.position.x-x,p.position.z-z)<(p.size+size)*.45))continue;
  d.position.set(0,0,0);d.rotation.set((rnd(i+21)-.5)*.22,rnd(i+1)*Math.PI*2,(rnd(i+22)-.5)*.2);d.scale.set(size*(.85+rnd(i+17)*.3),size*(.88+rnd(i+18)*.22),size);d.updateMatrix();
  let support=-Infinity;
  for(const p of supports[variant].base){point.copy(p).applyMatrix4(d.matrix);support=Math.max(support,sample(x+point.x,z+point.z)-point.y);}
  const burial=supports[variant].height*size*(.24+rnd(i+41)*.14);d.position.set(x,support-burial,z);d.updateMatrix();
  const banks=water?.extentAt(z),wetLevel=banks&&x>banks[0]-2&&x<banks[1]+2?water.levelAt(z):-10000;
  placements.push({variant,matrix:d.matrix.clone(),position:d.position.clone(),size,wetLevel,color:new THREE.Color().setRGB(.75+rnd(i+37)*.18,.77+rnd(i+37)*.17,.76+rnd(i+37)*.16)});stats.maxBasalPenetrationM=Math.max(stats.maxBasalPenetrationM,burial);stats.sizeBands[size<.25?'pebble':size<.75?'cobble':'boulder']++;if(wetLevel>sample(x,z)-.1)stats.wetRocks++;
 }
 stats.rocks=placements.length;
 stats.previewCandidates=placements.filter(p=>p.size>1&&p.position.y>=3&&p.position.y<=10&&p.position.x>=-120&&p.position.x<=70&&p.position.z>=-100&&p.position.z<=150).sort((a,b)=>b.size-a.size).slice(0,5).map(p=>({position:p.position.toArray(),size:p.size,variant:p.variant,groundY:sample(p.position.x,p.position.z),approximateTopY:p.position.y+supports[p.variant].height*p.size}));
 const previous=new THREE.Vector3(Infinity,Infinity,Infinity);
 stats.update=camera=>{
  if(camera.position.distanceToSquared(previous)<4)return;previous.copy(camera.position);
  const buckets=groups.map(()=>[[],[],[]]),order=placements.map(p=>({p,d:p.position.distanceTo(camera.position)})).sort((a,b)=>a.d-b.d);let near=0,mid=0;
  for(const {p,d} of order){let level=2;if(d<45&&near<24){level=0;near++;}else if(d<180&&mid<180){level=1;mid++;}buckets[p.variant][level].push(p);}
  stats.lodCounts=[0,0,0];stats.triangles=0;
  groups.forEach((levels,variant)=>levels.forEach((mesh,level)=>{
   const list=buckets[variant][level];mesh.count=list.length;mesh.visible=!!list.length;
   list.forEach((p,i)=>{mesh.setMatrixAt(i,p.matrix);mesh.setColorAt(i,p.color);mesh.geometry.attributes.stoneWetLevel.setX(i,p.wetLevel);});mesh.geometry.attributes.stoneWetLevel.needsUpdate=true;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
   if(list.length){mesh.computeBoundingBox();mesh.computeBoundingSphere();}stats.lodCounts[level]+=list.length;stats.triangles+=list.length*(mesh.geometry.index?mesh.geometry.index.count:mesh.geometry.attributes.position.count)/3;
  }));
 };
 stats.update({position:new THREE.Vector3(0,1200,0)});
 return stats;
}

export async function createUnderstory({scene,ground,mask,data,sample,exclude=()=>false,gardenProfile=()=>0}){
 const source=await new GLTFLoader().loadAsync(AS+'subbosque.glb'),groups=[];source.scene.updateMatrixWorld(true);
 source.scene.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone().applyMatrix4(o.matrixWorld),mat=o.material.clone();mat.alphaTest=.42;mat.alphaToCoverage=true;mat.transparent=false;mat.side=THREE.DoubleSide;mat.envMapIntensity=.6;const m=new THREE.InstancedMesh(geo,mat,1600);m.count=0;m.receiveShadow=true;m.castShadow=false;m.frustumCulled=false;scene.add(m);groups.push(m);});
 const prev=new THREE.Vector3(1e6,0,1e6),d=new THREE.Object3D();
 return camera=>{if(camera.position.distanceToSquared(prev)<16)return;prev.copy(camera.position);groups.forEach(m=>m.count=0);if(camera.position.y-sample(camera.position.x,camera.position.z)>25)return;
  const counts=groups.map(()=>0),cx=Math.floor(camera.position.x),cz=Math.floor(camera.position.z);
  for(let dz=-28;dz<=28;dz++)for(let dx=-28;dx<=28;dx++){
   const gx=cx+dx,gz=cz+dz,seed=gx*37.12+gz*91.74,x=gx+(rnd(seed)-.5),z=gz+(rnd(seed+1)-.5);if(Math.abs(x)>498||Math.abs(z)>498||dx*dx+dz*dz>780)continue;
   const k=Math.round(z+500)*data.n+Math.round(x+500),forest=!!mask[k],u=(x+500)/1000,vv=(z+500)/1000;
   const meadow=!inside(u,vv,riverbed)&&!inside(u,vv,yard)&&!inside(u,vv,yard2);
   if((!forest&&!meadow)||exclude(x,z))continue;const garden=gardenProfile(x,z);
   const slope=Math.hypot(sample(x+.5,z)-sample(x-.5,z),sample(x,z+.5)-sample(x,z-.5));if(slope>.7||(!forest&&rnd(seed+17)<.28))continue;
   if(!forest&&garden&&rnd(seed+17)>.32+garden*.4)continue;const v=Math.floor(rnd(seed+2)*groups.length),m=groups[v],n=counts[v];if(n>=1600)continue;
   d.position.set(x,sample(x,z)-.018,z);d.rotation.set(0,rnd(seed+4)*6.28,0);d.scale.setScalar(((forest?.75:.50)+rnd(seed+3)*(forest?.95:.65))*(1-garden*.58));d.updateMatrix();m.setMatrixAt(n,d.matrix);m.setColorAt(n,new THREE.Color().setRGB(.75+rnd(seed+5)*.25-garden*.08,.82+rnd(seed+6)*.18+garden*.08,.67+rnd(seed+7)*.25-garden*.09));counts[v]++;
  }
  groups.forEach((m,i)=>{m.count=counts[i];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;});
 };
}
