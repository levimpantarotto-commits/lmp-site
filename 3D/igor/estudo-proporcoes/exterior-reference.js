// Relações observadas nas fotos03/04/05/27. Coordenadas são hipóteses,
// não limites cadastrais. Esta revisão só é aplicada no estudo isolado.
import {leafAtlasRegions} from './leaf-atlas-regions.js';
export const exteriorReference={
 photos:[3,4,5,27],classification:'relação observada; cotas estimadas',
 leftWall:-2.75,rightFence:11.2,fenceStart:-18,fenceEnd:7.8,
 garden:[-2.55,-18,11.05,0],side:[9.8,0,11.05,8],
 arrival:{x:9.7,y:0,z:-12,yaw:2.69,pitch:.035},
 bench:{x:5.40,z:-.92,yaw:-Math.PI/2,rect:[5.10,-1.54,5.73,-.30]},
 cactus:[3.0,-1.35],pot:[5.5,-2.05],
 patio:[[-2.55,0],[-2.55,-7.1],[-.8,-6.5],[5.5,-3.9],[10.8,-3.9],[10.8,0]]
};
export const referenceBarriers=[[-2.90,-18,-2.60,2.5],[11.06,-18,11.34,7.8],[-.33,-1.65,-.10,2.5]];
// Ambientação estimada para o horizonte das fotos 00/01; não reconstrói mata real.
// O ativo disponível só expõe v1_mid com 12.084 triângulos: 3 desktop / 2 mobile.
export const distantCanopyPlacements=[[-14,-28,0,6.4,1],[-1,-33,0,8.1,1],[14,-30,0,7.0,1]];
export const distantCanopyBudget={desktop:{instances:3,triangles:36252},mobile:{instances:2,triangles:24168}};
export function buildReferenceBoundary(T,scene,M,box,{planX=x=>x,planZ=z=>z}={}){
 const e=exteriorReference;
 const slopeWall=(x,z0,z1,h0,h1,w,material,bottom0=0,bottom1=0)=>{
  const v=[[x-w/2,bottom0,z0],[x+w/2,bottom0,z0],[x+w/2,h0,z0],[x-w/2,h0,z0],[x-w/2,bottom1,z1],[x+w/2,bottom1,z1],[x+w/2,h1,z1],[x-w/2,h1,z1]];
  const faces=[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]],p=[],uv=[];
  for(const [face,[a,b,c,d]]of faces.entries())for(const i of[a,b,c,a,c,d]){p.push(...v[i]);uv.push((face<2?v[i][0]:face<4?v[i][2]:v[i][0])/2,(face<4?v[i][1]:v[i][2])/2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();const n=new T.Mesh(g,material);n.castShadow=n.receiveShadow=true;scene.add(n);return n;
 };
 // Arrimo esquerdo acompanha o desnível; não é o muro de blocos à direita.
 for(const [z0,z1,h0,h1]of[[-18,-1.5,1.25,1.25],[-1.5,2.5,1.25,2.85]]){
  slopeWall(e.leftWall,z0,z1,h0,h1,.30,M.stone);slopeWall(e.leftWall,z0,z1,h0+.07,h1+.07,.36,M.plaster,h0,h1);
 }
 // Mureta baixa junto à escada, distinta da parede da sala.
 slopeWall(-.215,-1.65,2.5,.74,2.38,.23,M.stone);
 const post=M.wood.clone();post.color.set(0xb5b4a5);post.roughness=1;
 for(let z=e.fenceStart;z<=e.fenceEnd;z+=2.4)box(e.rightFence,1.42,z,.16,2.84,.18,post);
 box(e.rightFence,.08,-5.1,.22,.16,25.8,M.stone);
 // Tela fina continua visível entre folhas. Uma chamada de desenho.
 const vertices=[];for(let z=e.fenceStart;z<e.fenceEnd;z+=.12)vertices.push(e.rightFence,0,z,e.rightFence,2.65,z);
 for(let y=.1;y<2.65;y+=.12)vertices.push(e.rightFence,y,e.fenceStart,e.rightFence,y,e.fenceEnd);
 for(let i=0;i<vertices.length;i+=3){vertices[i]=planX(vertices[i]);vertices[i+2]=planZ(vertices[i+2]);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));const wire=new T.LineSegments(g,new T.LineBasicMaterial({color:0x777b69,transparent:true,opacity:.45}));scene.add(wire);
}

// Folhas fotografadas do ativo CC0 já usado no projeto, sem textura sintética
// e sem adicionar outra descarga de assets. É aproximação botânica, não scan.
export function addBoundaryFoliage(T,scene,gltf,{mobile=false,planX=x=>x,planZ=z=>z,leafMaps}={}){
 const sources=[];gltf.scene.traverse(o=>{if(o.isMesh&&o.material?.alphaTest>0&&o.material.map)sources.push(o);});
 const source=sources[0];if(!source)throw Error('Folhas fotográficas indisponíveis');
 const material=source.material.clone();material.side=T.DoubleSide;material.alphaTest=.42;material.transparent=false;material.roughness=.93;
 // The source is an atlas of eight individual leaves, not one leaf. Mapping
 // its whole bitmap onto every card repeated eight tiny leaves on a rectangle.
 const rects=leafAtlasRegions;
 const rand=n=>{const r=Math.sin(n*127.1+73.2)*43758.5453;return r-Math.floor(r);};
 // Cartões menores e agrupados: a cerca tem folhagem, não folhas gigantes isoladas.
 const count=mobile?8000:22000,m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),color=new T.Color(),points=[],stalks=[];
 // A WebGL line is at least one screen pixel even when a real petiole would
 // be subpixel. Tapered triangles use physical width and disappear naturally.
 const point=(x,y,z)=>new T.Vector3(planX(x),y,planZ(z));
 function petiole(a,b){const direction=b.clone().sub(a).normalize(),root=b.clone().addScaledVector(direction,-.035),side=new T.Vector3(1,0,0).cross(direction).normalize().multiplyScalar(.0009);stalks.push(...root.clone().add(side).toArray(),...root.clone().sub(side).toArray(),...b.toArray());}
 function vineSegment(a,b){const direction=b.clone().sub(a).normalize(),side=new T.Vector3(1,0,0).cross(direction).normalize(),other=direction.clone().cross(side),rings=[];for(const p of[a,b])for(let j=0;j<3;j++){const angle=j*Math.PI*2/3;rings.push(p.clone().addScaledVector(side,Math.cos(angle)*.0035).addScaledVector(other,Math.sin(angle)*.0035));}for(let j=0;j<3;j++)for(const k of[j,(j+1)%3,j+3,(j+1)%3,(j+1)%3+3,j+3])stalks.push(...rings[k].toArray());}
 for(let i=0;i<count;i++){
  if(leafMaps&&!leafMaps[i%rects.length])continue;
  const right=i<count*.68,local=right?i:i-Math.floor(count*.68),stems=right?60:40,stem=local%stems;
  const y=.15+rand(i*7+2)*(2.15+rand(stem+51)*.4),z0=-17.8+(stem+.5+(rand(stem+83)-.5)*.8)/stems*25.1;
  const z=z0+Math.sin(y*3.7+stem)*.14+(rand(i*7+1)-.5)*.9;
  const x=right?11.25+(rand(i*7+3)-.2)*.35:-2.90-rand(i*7+3)*.45;
  const yy=right?y:1.1+Math.max(0,z+1.5)*.40+y*(.7+rand(stem+93)*.55);
  const branchX=right?11.25:-2.93,branchY=yy-.12-rand(i*7+31)*.25,branchZ=z0+Math.sin(y*3.7+stem)*.14;
  petiole(point(branchX,branchY,branchZ),point(x,yy,z));
  points.push({x:planX(x),y:yy,z:planZ(z),i,variant:i%rects.length});
 }
 if(points.length)for(const right of[true,false])for(let stem=0;stem<(right?60:40);stem++)for(let segment=0;segment<7;segment++){
  const z0=-17.8+(stem+.5+(rand(stem+83)-.5)*.8)/(right?60:40)*25.1;
  const endpoints=[];for(const y of[segment*.4,(segment+1)*.4]){const z=z0+Math.sin(y*3.7+stem)*.14,yy=right?y:1.1+Math.max(0,z+1.5)*.40+y*(.7+rand(stem+93)*.55);endpoints.push(point(right?11.25:-2.93,yy,z));}vineSegment(...endpoints);
 }
 const meshes=[];
 rects.forEach(([u0,v0,u1,v1],variant)=>{
  if(leafMaps&&!leafMaps[variant])return;
  const hasLeafMap=!!leafMaps?.[variant],leafMaterial=leafMaps?material.clone():material;
  if(hasLeafMap){leafMaterial.map=leafMaps[variant];if(leafMaterial.normalMap){leafMaterial.normalMap=leafMaterial.normalMap.clone();leafMaterial.normalMap.repeat.set(u1-u0,v1-v0);leafMaterial.normalMap.offset.set(u0,v0);}}
  const geometry=new T.PlaneGeometry(1,1,1,2),p=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,.06*(1-4*x*x)+(.025+variant*.004)*Math.sin((y+.5)*Math.PI));uv.setXY(i,hasLeafMap?uv.getX(i):u0+uv.getX(i)*(u1-u0),hasLeafMap?1-uv.getY(i):v0+(1-uv.getY(i))*(v1-v0));}
  geometry.computeVertexNormals();const leaves=points.filter(p=>p.variant===variant),mesh=new T.InstancedMesh(geometry,leafMaterial,leaves.length);
  leaves.forEach(({x,y,z,i},j)=>{
   e.set((rand(i*7+4)-.5)*1.25,Math.PI/2+(rand(i*7+5)-.5)*1.15,(rand(i*7+6)-.5)*2.3);q.setFromEuler(e);
   const height=.10+rand(i*7+9)*.14,width=height*(u1-u0)/(v1-v0)*(.9+rand(i*7+11)*.2);
   const center=new T.Vector3(0,height*.5,0).applyQuaternion(q).add(new T.Vector3(x,y,z));
   m.compose(center,q,new T.Vector3(width,height,height));mesh.setMatrixAt(j,m);
   color.setRGB(.92+rand(i*7+8)*.09,.95+rand(i*7+10)*.08,.92+rand(i*7+12)*.08);mesh.setColorAt(j,color);
  });
  mesh.name='reference-boundary-leaf-'+variant;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.natureRevision='leaf-atlas-r1';mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;scene.add(mesh);meshes.push(mesh);
 });
 const stemsGeometry=new T.BufferGeometry();stemsGeometry.setAttribute('position',new T.Float32BufferAttribute(stalks,3));stemsGeometry.computeVertexNormals();const stems=new T.Mesh(stemsGeometry,new T.MeshStandardMaterial({color:0x50603a,roughness:.96,side:T.DoubleSide}));stems.name='reference-vine-stalks';stems.receiveShadow=true;scene.add(stems);
 return{instances:points.length,triangles:points.length*4+stalks.length/9,stalkTriangles:stalks.length/9,drawCalls:meshes.length+(points.length?1:0),leafVariants:meshes.length,leafMapsFallback:leafMaps?leafMaps.flatMap((m,i)=>m?[]:[i]):[],leafFailureMode:'omit-unavailable-variant',source:'CC0 island_tree_01: individual photographed leaves, curved geometry and attached physical-width petioles; planting estimated'};
}
