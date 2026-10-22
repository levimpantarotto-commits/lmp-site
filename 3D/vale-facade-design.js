import * as THREE from 'three';

// Architectural interpretation, not surveyed doors, rooms or building uses.
// All placements are tested against the measured facade triangles, never its AABB alone.
const up=new THREE.Vector3(0,1,0), hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;};
const styles=[
 {name:'casa de alvenaria e madeira',tone:0xd9c5a2,frame:0x5c4330,trim:0xd4c6a9,w:1.65,h:1.45,spacing:3.6,shutters:false,wood:true},
 {name:'casa tradicional com venezianas',tone:0xd6d0b6,frame:0x334939,trim:0xd9d1bb,w:1.05,h:1.6,spacing:2.9,shutters:true,wood:false},
 {name:'casa de tijolo e reboco',tone:0xc8b69b,frame:0x5b4538,trim:0xa99b83,w:1.4,h:1.6,spacing:3.4,shutters:false,brick:true},
 {name:'casa reformada com vãos largos',tone:0xd5d4c9,frame:0x535856,trim:0xc5bba7,w:2.2,h:1.35,spacing:4.4,shutters:false,modern:true},
 {name:'sobrado com esquadrias claras',tone:0xb9bdae,frame:0xc5c4ad,trim:0xd4cdbd,w:1.25,h:1.7,spacing:3.1,shutters:true,wood:false},
 {name:'casa rústica com embasamento',tone:0xd5b78c,frame:0x5b3d29,trim:0xb8ac97,w:1.8,h:1.45,spacing:3.8,shutters:false,wood:true}
];
function pointOn(f,u,y,out=0){return new THREE.Vector3(f.u[0]*u+f.normal[0]*(f.d+out),y,f.u[2]*u+f.normal[2]*(f.d+out));}
function inTriangle(u,y,t){const [ax,ay,bx,by,cx,cy]=t,d=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(d)<1e-7)return false;const a=((by-cy)*(u-cx)+(cx-bx)*(y-cy))/d,b=((cy-ay)*(u-cx)+(ax-cx)*(y-cy))/d;return a>=-.0001&&b>=-.0001&&a+b<=1.0001;}
export function facadeContains(f,u,y){return f.triangles.some(t=>inTriangle(u,y,t));}
export function facadeCoverage(f,u,y,w,h){
 const left=u-w/2,right=u+w/2,bottom=y-h/2,top=y+h/2;if(left<f.minU-.002||right>f.maxU+.002||bottom<f.minY-.002||top>f.maxY+.002)return 0;
 let area=0;for(const t of f.triangles){let poly=[[t[0],t[1]],[t[2],t[3]],[t[4],t[5]]];poly=clipY(clipY(poly,bottom,true),top,false).map(p=>[p[1],p[0]]);poly=clipY(clipY(poly,left,true),right,false);let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1];}area+=Math.abs(a)/2;}return area/(w*h);
}
function fits(f,u,y,w,h,margin=.14){return facadeCoverage(f,u,y,w+margin*2,h+margin*2)>=.996;}
function clipY(poly,y,above){const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=above?a[1]>=y:a[1]<=y,ib=above?b[1]>=y:b[1]<=y;if(ia)result.push(a);if(ia!==ib){const t=(y-a[1])/(b[1]-a[1]);result.push([a[0]+t*(b[0]-a[0]),y]);}}return result;}
function surfaceMaterial(name,color,kind=0){
 const m=new THREE.MeshStandardMaterial({name:'PBR '+name,color,roughness:.86,metalness:0,vertexColors:true});
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 facadeUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nfacadeUV=uv;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 facadeUV;').replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=facadeUV; float grain=sin(p.x*73.0+sin(p.y*4.0)*3.0)*sin(p.y*127.0+p.x*9.0);
   float variation=0.91+0.07*sin(p.x*.71+p.y*.43)+0.025*grain;
   ${kind===1?`float course=floor(p.y/.065);float board=fract(p.y/.065); variation*=mix(.46,1.0,smoothstep(.015,.07,board)*smoothstep(1.0,.94,board)); variation*=.9+.1*sin(p.x*18.0+sin(p.y*11.0));`:
     kind===2?`vec2 q=vec2(p.x/.24+mod(floor(p.y/.085),2.0)*.5,p.y/.085);vec2 g=fract(q);float mortar=(1.0-smoothstep(.02,.07,g.x))+smoothstep(.95,.99,g.x)+(1.0-smoothstep(.02,.10,g.y))+smoothstep(.89,.98,g.y);variation*=.82+.15*sin(dot(floor(q),vec2(53.3,71.1)));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.30,.29,.25),clamp(mortar,0.0,1.0)*.68);`:
     kind===3?`float joint=smoothstep(.025,.06,fract(p.y/.35));variation*=mix(.62,1.0,joint);`:
     kind===4?`float rib=pow(.5+.5*cos(p.x*38.0),4.0);variation*=.73+.25*rib;`:'variation*=.97+.03*sin(p.x*101.0)*sin(p.y*93.0);'}
   diffuseColor.rgb*=variation;`);
 };m.customProgramCacheKey=()=>`architectural-surface-${kind}`;return m;
}
function interiorMaterial(){
 const m=new THREE.MeshStandardMaterial({name:'PBR janela com profundidade interior ilustrativa',color:0xffffff,roughness:.24,metalness:.12,envMapIntensity:.72});
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>
   attribute vec3 roomU;attribute vec3 roomNormal;attribute vec3 roomData;
   varying vec2 roomUV;varying vec3 roomRay;varying vec3 roomParams;`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 wp=(modelMatrix*vec4(position,1.0)).xyz;vec3 eye=cameraPosition-wp;
   roomUV=uv;roomRay=vec3(dot(eye,roomU),eye.y,dot(eye,roomNormal));roomParams=roomData;`);
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
   varying vec2 roomUV;varying vec3 roomRay;varying vec3 roomParams;
   float rect(vec2 p,vec2 a,vec2 b){return step(a.x,p.x)*step(p.x,b.x)*step(a.y,p.y)*step(p.y,b.y);}
   float hitBox(vec3 ro,vec3 rd,vec3 mn,vec3 mx){vec3 inv=1.0/(rd+vec3(.00001));vec3 a=(mn-ro)*inv,b=(mx-ro)*inv;vec3 near=min(a,b),far=max(a,b);float tn=max(max(near.x,near.y),near.z),tf=min(min(far.x,far.y),far.z);return tf>=max(tn,0.0)?max(tn,0.0):10000.0;}`)
   .replace('#include <color_fragment>',`#include <color_fragment>
   float seed=roomParams.z;vec3 ro=vec3((roomUV-.5)*roomParams.xy,0.0),rd=normalize(-roomRay);rd.z=min(-.02,rd.z);
   vec3 mn=vec3(-2.4,-1.5,-3.1),mx=vec3(2.4,1.7,0.02);vec3 side=mix(mn,mx,step(vec3(0.0),rd));vec3 ts=(side-ro)/(rd+vec3(.000001));float t=min(min(ts.x,ts.y),ts.z);vec3 hit=ro+rd*t;
   vec3 wall=mix(vec3(.20,.16,.11),vec3(.32,.30,.23),seed);vec3 room=wall;
   if(abs(hit.y+1.5)<.02){room=vec3(.15,.10,.055)*(.8+.2*sin(hit.x*24.0));}
   else if(abs(hit.y-1.7)<.02){room=vec3(.38,.36,.29);}
   else if(hit.z< -3.08){vec2 artPos=hit.xy-vec2((seed-.5)*1.6,0.0);float frame=rect(artPos,vec2(-.7,-.1),vec2(.65,.9));float art=rect(artPos,vec2(-.58,.02),vec2(.53,.78));room=mix(room,vec3(.065,.05,.035),frame);room=mix(room,mix(vec3(.12,.21,.18),vec3(.29,.19,.085),seed),art);}
   float furnitureX=(seed-.5)*.9;float sofa=hitBox(ro,rd,vec3(-1.7+furnitureX,-1.5,-2.5),vec3(.7+furnitureX,-.65,-1.4));if(sofa<t){vec3 sp=ro+rd*sofa;room=mix(vec3(.12,.16,.13),vec3(.23,.13,.08),seed)*(.7+.3*smoothstep(-1.5,-.65,sp.y));}
   float cabinet=hitBox(ro,rd,vec3(1.45,-1.5,-2.9),vec3(2.25,.65,-2.25));if(cabinet<min(t,sofa))room=vec3(.14,.085,.04)*(.8+.2*sin((ro.y+rd.y*cabinet)*21.0));
   room*=.68+.32*clamp(1.0-abs(hit.x)/3.5,0.0,1.0);
   float curtains=step(roomUV.x,.09+seed*.12)+step(.91-seed*.10,roomUV.x);float fold=.64+.36*pow(.5+.5*cos(roomUV.x*105.0),2.0);
   if(seed>.22)room=mix(room,mix(vec3(.48,.44,.34),vec3(.68,.64,.52),seed)*fold,min(curtains,1.0));
   float blind=step(.86,seed)*step(.64,roomUV.y);room=mix(room,vec3(.36,.37,.31)*(.65+.35*step(.2,fract(roomUV.y*26.0))),blind);
   float fresnel=pow(1.0-clamp(normalize(roomRay).z,0.0,1.0),3.0);diffuseColor.rgb=mix(room,vec3(.25,.36,.40),.12+.38*fresnel);
  `).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=room*.10;');
 };m.customProgramCacheKey=()=> 'architectural-room-parallax-v1';return m;
}
function meshBucket(material){return {material,pos:[],normal:[],uv:[],color:[],roomU:[],roomNormal:[],roomData:[]};}
export function addArchitecturalFacades({root,manifest,sample,textures,roadExclusion}){
 const group=new THREE.Group();group.name='Fachadas reconstruídas por edifício';
 const material={plaster:surfaceMaterial('reboco de fachada',0xffffff),wood:surfaceMaterial('lambril de madeira',0xffffff),brick:surfaceMaterial('alvenaria aparente',0xffffff),stone:surfaceMaterial('embasamento mineral',0xffffff,3),metal:surfaceMaterial('chapa industrial',0xffffff,4),interior:interiorMaterial()};
 for(const key of ['plaster','wood','brick'])if(textures?.[key]){Object.assign(material[key],textures[key]);const strength=key==='plaster'?.35:.5;material[key].normalScale=new THREE.Vector2(strength,strength);}
 let buildingId;const buckets=Object.fromEntries(Object.entries(material).map(([k,m])=>[k,meshBucket(m)])),boxes=[],openings=[],stats={buildings:0,facades:0,windows:0,doors:0,loadingDoors:0,shutterPairs:0,types:{},styles:{},rejected:0,rejectedBoxes:0,rejectedRoad:0,legacyHidden:[],interiors:'Ilusão de cômodo por paralaxe; não interiores navegáveis nem levantados',maxProjection:.42};
 function clearRoad(f,u,w,out,depth=0){if(!roadExclusion)return true;for(let t=-1;t<=1;t+=.5)for(const d of [-1,1]){const p=pointOn(f,u+t*w/2,0,out+d*depth/2);if(roadExclusion(p.x,p.z,0))return false;}return true;}
 function box(f,u,y,w,h,depth,color,out=.08){if(w<=0||h<=0)return;if(!fits(f,u,y,w,h,0)){stats.rejectedBoxes++;return;}if(!clearRoad(f,u,w,out,depth)){stats.rejectedRoad++;return;}boxes.push({building:buildingId,f,u,y,w,h,depth,color,out});}
 function overlaps(f,u,y,w,h){return openings.some(o=>o.building===buildingId&&o.facade===f.id&&Math.abs(u-o.u)<(w+o.w)/2+.22&&Math.abs(y-o.y)<(h+o.h)/2+.18);}
 function triangle(bucket,f,points,color,out=.028,room=null){const col=new THREE.Color(color),[a,b,c]=points;if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<0)points=[a,c,b];for(const [u,y] of points){bucket.pos.push(...pointOn(f,u,y,out).toArray());bucket.normal.push(...f.normal);bucket.uv.push(room?(u-room.u)/room.w+.5:u,room?(y-room.y)/room.h+.5:y);bucket.color.push(col.r,col.g,col.b);if(room){bucket.roomU.push(...f.u);bucket.roomNormal.push(...f.normal);bucket.roomData.push(room.w,room.h,room.seed);}}}
 function rectangle(kind,f,u,y,w,h,color,out=.04,room=null){const p=[[u-w/2,y-h/2],[u+w/2,y-h/2],[u+w/2,y+h/2],[u-w/2,y+h/2]];triangle(buckets[kind],f,[p[0],p[1],p[2]],color,out,room);triangle(buckets[kind],f,[p[0],p[2],p[3]],color,out,room);}
 function band(kind,f,lo,hi,color,out=.03){for(const t of f.triangles){let p=[[t[0],t[1]],[t[2],t[3]],[t[4],t[5]]];p=clipY(clipY(p,lo,true),hi,false);for(let i=1;i<p.length-1;i++)triangle(buckets[kind],f,[p[0],p[i],p[i+1]],color,out);}}
 function trim(f,u,y,w,h,color,t=.075){box(f,u-w/2-t/2,y,t,h+t*2,.14,color);box(f,u+w/2+t/2,y,t,h+t*2,.14,color);box(f,u,y-h/2-t/2,w,t,.14,color);box(f,u,y+h/2+t/2,w,t,.14,color);}
 function window(f,u,y,w,h,style,seed,industrial=false){
  if(!fits(f,u,y,w,h,.20)||overlaps(f,u,y,w,h)||!clearRoad(f,u,w+.28,.13,.28)){stats.rejected++;return false;}
  if(sample&&[-1,0,1].some(a=>{const bottom=pointOn(f,u+a*w/2,y-h/2,.05);return bottom.y<sample(bottom.x,bottom.z)+.48;})){stats.rejected++;return false;}
  rectangle('interior',f,u,y,w,h,0xffffff,.055,{u,y,w,h,seed});trim(f,u,y,w,h,style.frame,.065);
  // Window reveals, stone lintel and projecting sill create a readable layered opening.
  box(f,u,y-h/2-.11,w+.28,.10,.28,style.trim,.13);
  if(!style.modern)box(f,u,y+h/2+.115,w+.24,.11,.12,style.trim,.055);
  if(w>1.45)box(f,u+(seed-.5)*w*.12,y,.045,h,.12,style.frame,.105);
  if(industrial||seed>.58)box(f,u,y+(industrial?.08:.20)*h,w,.035,.115,style.frame,.106);
  if(style.shutters&&fits(f,u,y,w*1.78,h+.2,.1)){
   const sw=w*.31;for(const side of [-1,1]){const su=u+side*(w/2+sw/2+.13);rectangle('wood',f,su,y,sw,h,seed>.5?0x485441:0x67503b,.065);trim(f,su,y,sw,h,style.frame,.035);for(let j=0;j<Math.floor(h/.12);j++)box(f,su,y-h/2+.07+j*.12,sw,.025,.08,style.frame,.10);}stats.shutterPairs++;
  }
  openings.push({building:buildingId,facade:f.id,u,y,w,h,kind:'window',normal:f.normal});stats.windows++;return true;
 }
 function door(f,u,y,style,loading=false){
  const w=loading?3.4:1.1,h=loading?3.15:2.25;
  if(sample)y=Math.max(y,...[-1,0,1].map(a=>{const p=pointOn(f,u+a*w/2,y,.1);return sample(p.x,p.z)+.08;}));
  if(!fits(f,u,y+h/2,w,h,.12)||overlaps(f,u,y+h/2,w,h)||!clearRoad(f,u,w+.65,.20,.42))return false;
  rectangle(loading?'metal':'wood',f,u,y+h/2,w,h,loading?0x626a66:0x5e432c,.06);trim(f,u,y+h/2,w,h,style.trim,.12);
  if(!loading){rectangle('interior',f,u,y+1.7,.55,.65,0xffffff,.075,{u,y:y+1.7,w:.55,h:.65,seed:.35});box(f,u+.35,y+1.02,.04,.24,.08,0xada485,.13);box(f,u,y-.02,w+.4,.13,.42,0x9f9788,.20);box(f,u,y+h+.24,w+.65,.12,.38,style.frame,.19);}
  else{for(let j=1;j<12;j++)box(f,u,y+j*h/12,w,.025,.06,0x48514f,.10);stats.loadingDoors++;}
  openings.push({building:buildingId,facade:f.id,u,y:y+h/2,w,h,kind:loading?'loading':'door'});stats.doors++;return true;
 }
 for(const b of manifest.buildings){
  buildingId=b.id;
  const mn=b.bounds.min,mx=b.bounds.max;if(mn[0]<-499||mx[0]>499||mn[2]<-499||mx[2]>499)continue;
  const cx=(mn[0]+mx[0])/2,cz=(mn[2]+mx[2])/2,sx=mx[0]-mn[0],sz=mx[2]-mn[2],height=mx[1]-mn[1],seed=hash(b.id),style=styles[Math.floor(seed*styles.length)];
   const slimTower=b.candidateType==='torre_candidata',landmark=cz>150&&(height>25||slimTower),tower=!landmark&&slimTower,industrial=cz<110&&(Math.max(sx,sz)>24||tower),type=landmark?'edificação histórica alta':tower?'torre de serviço':industrial?'galpão':height>12&&Math.max(sx,sz)>20?'edifício residencial':style.name;
  const fs=b.facades.filter(f=>(f.maxU-f.minU)>2.2&&(f.maxY-f.minY)>2.4);if(!fs.length)continue;
  stats.buildings++;stats.types[type]=(stats.types[type]||0)+1;stats.styles[style.name]=(stats.styles[style.name]||0)+1;
  const main=[...fs].sort((a,c)=>(c.maxU-c.minU)-(a.maxU-a.minU))[0];
  for(const f of fs){
   stats.facades++;const width=f.maxU-f.minU,mid=(f.minU+f.maxU)/2,probe=pointOn(f,mid,f.minY,.1),groundY=sample?sample(probe.x,probe.z):f.minY,base=Math.max(f.minY,groundY+.08),wallHeight=f.maxY-base;
   band('plaster',f,f.minY,f.maxY,industrial?0xc3c0af:style.tone);
   band('stone',f,f.minY,base+.55,industrial?0x82857c:0x9c9787,.038);
   if(landmark){
    if(f===main)door(f,mid,base,style);
    const h=Math.min(3.2,wallHeight*.28),w=Math.min(1.05,width*.18);
    for(const side of [-1,1])window(f,mid+side*width*.16,f.maxY-h*.8-.5,w,h,{...style,frame:0x747568,shutters:false},.12);
    for(const y of [base+3.3,f.maxY-4.5])if(fits(f,mid,y,width-.1,.16,.02))box(f,mid,y,width-.1,.16,.18,style.trim,.09);
    continue;
   }
   if(tower){
    band('metal',f,base+1,f.maxY-.35,0xa8aaa0,.045);
    for(let u=f.minU+.22;u<f.maxU;u+=3.4)if(fits(f,u,(base+f.maxY)/2,.12,wallHeight-.3,.02))box(f,u,(base+f.maxY)/2,.14,wallHeight-.3,.16,0x73796e,.10);
    for(let y=base+3;y<f.maxY-1;y+=4.2)if(fits(f,mid,y,width-.35,.12,.02))box(f,mid,y,width-.35,.12,.15,0x8c9186,.10);
    if(f===main){door(f,mid,base,style);if(wallHeight>7){rectangle('metal',f,mid,f.maxY-2,Math.min(2,width*.4),1,0x3e4946,.07);}}
    continue;
   }
   if(industrial){
    band('brick',f,base+.55,Math.min(base+2.1,f.maxY),0xb4a99c,.04);
    const bays=Math.max(1,Math.floor((width-1)/6)),step=width/bays;
    for(let j=0;j<bays;j++){const u=f.minU+step*(j+.5),isLoading=f===main&&(j===0||j===bays-1)&&wallHeight>4,isEntry=f===main&&bays>2&&j===1;
     if(isLoading)door(f,u,base,{...style,trim:0xa7aaa0},true);
     else if(isEntry)door(f,u,base,style);
     else window(f,u,base+Math.min(2.8,wallHeight*.55),Math.min(3.1,step-1.3),1.25,{...style,frame:0x56605b,shutters:false,modern:true},hash(b.id+j),true);
     if(wallHeight>7.5)window(f,u,base+6.4,Math.min(3.1,step-1.3),1.3,{...style,frame:0x56605b,shutters:false,modern:true},hash(b.id+j+100),true);
     if(j&&fits(f,f.minU+step*j,(base+f.maxY)/2,.18,wallHeight-.25,.04))box(f,f.minU+step*j,(base+f.maxY)/2,.18,wallHeight-.25,.16,0x92988c,.10);
    }
   }else{
    if(style.wood&&wallHeight>5.8)band('wood',f,base+3.15,f.maxY,seed>.5?0xa8a096:0xbbb5a6,.043);
    if(style.brick)band('brick',f,base+.55,Math.min(base+3.0,f.maxY),0xc3b8ab,.043);
    const floors=Math.max(1,Math.floor((wallHeight-.4)/3.05)),bays=Math.max(1,Math.floor((width-1.1)/style.spacing)),step=width/bays,doorBay=Math.floor(hash(b.id+'entry')*bays),hasDoor=f===main&&wallHeight>2.7;
    if(hasDoor)door(f,f.minU+step*(doorBay+.5),base,style);
    for(let floor=0;floor<floors;floor++)for(let bay=0;bay<bays;bay++){
     if(hasDoor&&floor===0&&bay===doorBay)continue;
     const u=f.minU+step*(bay+.5),y=base+1.65+floor*3.05,small=(f!==main&&bay===0&&hash(b.id+f.id)>.64),w=small?.7:Math.min(style.w,step-1.0),h=small?.85:style.h;
     window(f,u,y+(small?.3:0),w,h,style,hash(b.id+f.id+floor+':'+bay));
    }
    // A continuous cornice only where it fits below the eave, not through a gable.
    if(fits(f,mid,f.maxY-.23,width-.25,.12,.02))box(f,mid,f.maxY-.23,width-.25,.12,.23,style.trim,.11);
   }
   // Downpipe defines the wall edge; never extends below local measured ground.
   const pipeU=f.maxU-.24,pp=pointOn(f,pipeU,base,.08),pipeBase=Math.max(base,sample?sample(pp.x,pp.z):base),pipeTop=f.maxY-.4;
   if(pipeTop-pipeBase>2&&fits(f,pipeU,(pipeTop+pipeBase)/2,.08,pipeTop-pipeBase,.015))box(f,pipeU,(pipeTop+pipeBase)/2,.07,pipeTop-pipeBase,.08,0x6b7066,.09);
  }
 }
 root.traverse(o=>{if(o.isMesh&&/^(Glass__dark_reflective_details|Window_frames__charcoal_aluminium_details|Sills__light_limestone_details|Door__warm_timber_details|Door)/.test(o.name)){o.visible=false;stats.legacyHidden.push(o.name);}});
 for(const [key,b] of Object.entries(buckets)){
  if(!b.pos.length)continue;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.normal,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));if(key!=='interior')g.setAttribute('color',new THREE.Float32BufferAttribute(b.color,3));
  if(key==='interior'){g.setAttribute('roomU',new THREE.Float32BufferAttribute(b.roomU,3));g.setAttribute('roomNormal',new THREE.Float32BufferAttribute(b.roomNormal,3));g.setAttribute('roomData',new THREE.Float32BufferAttribute(b.roomData,3));}
  g.computeBoundingSphere();const m=new THREE.Mesh(g,b.material);m.name=`Fachadas ${key}`;m.receiveShadow=true;m.castShadow=key!=='interior';group.add(m);
 }
 const unit=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshStandardMaterial({name:'PBR elementos construtivos',color:0xffffff,roughness:.7}),inst=new THREE.InstancedMesh(unit,mat,boxes.length),matrix=new THREE.Matrix4(),basis=new THREE.Matrix4(),q=new THREE.Quaternion();
 for(let i=0;i<boxes.length;i++){const b=boxes[i];basis.makeBasis(new THREE.Vector3(...b.f.u),up,new THREE.Vector3(...b.f.normal));q.setFromRotationMatrix(basis);matrix.compose(pointOn(b.f,b.u,b.y,b.out),q,new THREE.Vector3(b.w,b.h,b.depth));inst.setMatrixAt(i,matrix);inst.setColorAt(i,new THREE.Color(b.color));}
 inst.name='Caixilhos peitoris portas e estrutura';inst.castShadow=inst.receiveShadow=true;inst.instanceMatrix.needsUpdate=true;if(inst.instanceColor)inst.instanceColor.needsUpdate=true;group.add(inst);root.add(group);stats.instances=boxes.length;stats.drawCalls=group.children.length;stats.openings=openings;stats.elements=boxes.map(b=>({building:b.building,facade:b.f.id,u:b.u,y:b.y,w:b.w,h:b.h,depth:b.depth,out:b.out,center:pointOn(b.f,b.u,b.y,b.out).toArray(),normal:b.f.normal,uAxis:b.f.u}));return stats;
}
