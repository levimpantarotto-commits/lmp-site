import {GLTFLoader} from './vendor/GLTFLoader.js';
// Fotos04/27: cactus junto à entrada. Folhagem aproximada por ativo CC0,
// não inventário botânico ou digitalização da planta do imóvel.
export async function addPottedPlants(THREE,scene,M){
 const soil=new THREE.MeshStandardMaterial({color:0x30271e,roughness:1}),terra=new THREE.MeshStandardMaterial({color:0x937052,roughness:.92});
 const cactus=new THREE.MeshStandardMaterial({color:0x5a6e45,roughness:.87});let triangles=0;
 function add(g,m,x,y,z){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);triangles+=(g.index?.count||g.attributes.position.count)/3;return o;}
 const x=3.6,z=-1.4;
 // Perfil torneado com borda e cavidade, terra abaixo da boca.
 const profile=[[.12,0],[.15,.025],[.20,.40],[.225,.41],[.225,.45],[.192,.45],[.18,.39],[.12,.05]].map(v=>new THREE.Vector2(...v));
 add(new THREE.LatheGeometry(profile,40),terra,x,0,z);const s=add(new THREE.CircleGeometry(.186,40),soil,x,.395,z);s.rotation.x=-Math.PI/2;
 for(const [dx,dz,h]of[[0,0,.70],[-.075,.035,.48],[.06,-.04,.40]]){
  const g=new THREE.SphereGeometry(1,48,20),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),ny=p.getY(i),r=.047*(1+.12*Math.cos(a*9));p.setXYZ(i,p.getX(i)*r,ny*h/2,p.getZ(i)*r);}
  g.computeVertexNormals();add(g,cactus,x+dx,.395+h/2,z+dz);
 }
 const source=(await new GLTFLoader().loadAsync(new URL('./assets/potted-shrub.glb',import.meta.url).href)).scene;source.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const plants=[[5.5,-1.4,.88,.4],[-3,3,1.06,2.0],[-3,7,.97,4.5]];
 source.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);g.translate(-center.x,-bounds.min.y,-center.z);g.scale(1/size.y,1/size.y,1/size.y);
  const mat=o.material.clone();mat.side=THREE.DoubleSide;mat.roughness=Math.max(mat.roughness,.68);const mesh=new THREE.InstancedMesh(g,mat,plants.length),m=new THREE.Matrix4(),q=new THREE.Quaternion();
  plants.forEach(([x,z,h,angle],i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),angle);m.compose(new THREE.Vector3(x,0,z),q,new THREE.Vector3(h,h,h));mesh.setMatrixAt(i,m);});mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);triangles+=(g.index?.count||g.attributes.position.count)/3*plants.length;
 });
 return {count:4,triangles,source:'CC0 potted_plant_01 + cactus derivado da foto27',exact:false};
}
