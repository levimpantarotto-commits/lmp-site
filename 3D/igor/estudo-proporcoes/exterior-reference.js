// Relações observadas nas fotos03/04/05/27. Coordenadas são hipóteses,
// não limites cadastrais. Esta revisão só é aplicada no estudo isolado.
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
export function addBoundaryFoliage(T,scene,gltf,{mobile=false,planX=x=>x,planZ=z=>z}={}){
 const sources=[];gltf.scene.traverse(o=>{if(o.isMesh&&o.material?.alphaTest>0&&o.material.map)sources.push(o);});
 const source=sources[0];if(!source)throw Error('Folhas fotográficas indisponíveis');
 const material=source.material.clone();material.side=T.DoubleSide;material.alphaTest=.42;material.transparent=false;material.roughness=.93;
 const geometry=new T.PlaneGeometry(1,1,1,2),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++)p.setZ(i,.1*(1-4*p.getY(i)*p.getY(i)));geometry.computeVertexNormals();
 const rand=n=>{const r=Math.sin(n*127.1+73.2)*43758.5453;return r-Math.floor(r);};
 const count=mobile?1000:2300,mesh=new T.InstancedMesh(geometry,material,count),m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),color=new T.Color();
 for(let i=0;i<count;i++){
  const right=i<count*.68,z=-18+rand(i*7+1)*25.7,y=.18+rand(i*7+2)*2.55;
  const x=right?11.25+(rand(i*7+3)-.3)*.38:-2.90-rand(i*7+3)*.50;
  const yy=right?y:1.25+Math.max(0,z+1.5)*.40+y*.72;
  e.set((rand(i*7+4)-.5)*.8,Math.PI/2+(rand(i*7+5)-.5)*.85,rand(i*7+6)*Math.PI*2);q.setFromEuler(e);
  const s=(mobile?.55:.40)+rand(i*7+9)*.38;
  m.compose(new T.Vector3(planX(x),yy,planZ(z)),q,new T.Vector3(s,s*.88,1));mesh.setMatrixAt(i,m);
  color.setHSL(.23+rand(i*7+8)*.035,.18,.66+rand(i*7+10)*.21);mesh.setColorAt(i,color);
 }
 mesh.name='reference-boundary-foliage';mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
 return{instances:count,triangles:count*4,drawCalls:1,source:'CC0 island_tree_01 leaf photograph; planting estimated'};
}
