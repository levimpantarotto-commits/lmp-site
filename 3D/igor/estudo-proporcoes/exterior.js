import {GLTFLoader} from './vendor/GLTFLoader.js';
import {buildDiningSet} from './interior-detail.js';
import {roofPlanes} from './roof-layout.js?v=details-r2';
import {proportionStudy,planX,planZ} from './proportion-study.js';
import {exteriorReference,buildReferenceBoundary,addBoundaryFoliage,distantCanopyPlacements,distantCanopyBudget} from './exterior-reference.js?v=nature-r1';
import {varyLeafGeometry} from './leaf-variation.js?v=nature-r1';
export {roofPlanes} from './roof-layout.js?v=details-r2';

// Formas observáveis nas fotos 03/04/05. Escala e profundidade permanecem estimadas.
export const treePlacements=[
 // Copa alta recua do jardim; alturas/variação observadas, não cadastro arbóreo.
 [-8.7,-10.2,0,10.4,0],[-10.1,-2.7,0,11.8,1],[-7.2,4.8,0,9.7,0],[-9.4,12.5,0,12.6,1],
 [-3.6,17.8,0,10.3,0],[2.1,19.0,0,11.1,1],[10.7,18.7,0,9.4,0],[16.4,13.6,0,10.8,1],
 [-13.4,-5.7,0,12.2,0],[-12.1,6.3,0,11.4,1],[-13.0,17.3,0,10.6,0],[17.7,3.8,0,7.5,1]
];
export function buildExterior(THREE,scene,M,box,cylinder,walls=[]){
 function slope(r){const rise=r.back-r.front,len=Math.hypot(r.d,rise),angle=-Math.atan2(rise,r.d),mesh=box(r.x,(r.front+r.back)/2,r.z,r.w,.10,len,M.roof);mesh.rotation.x=angle;
  const underside=box(r.x,(r.front+r.back)/2-.09,r.z,r.w,.06,len,M.wood);underside.rotation.x=angle;
  for(const side of[-1,1]){const fascia=box(r.x+side*(r.w/2-.04),(r.front+r.back)/2-.04,r.z,.09,.18,len+.05,M.woodDark);fascia.rotation.x=angle;}
  box(r.x,r.front-.02,r.z-r.d/2,r.w+.05,.13,.12,M.woodDark);
  // Beiral com bordas de telhas curvas; não apenas uma chapa lisa pintada.
  const n=Math.floor(r.w/.23),geo=new THREE.CylinderGeometry(.085,.085,.24,8,1,true,0,Math.PI);geo.rotateX(Math.PI/2);
  for(let i=0;i<n;i++){const tile=new THREE.Mesh(geo,M.roof);tile.position.set(r.x-r.w/2+(i+.5)*r.w/n,r.front+.045,r.z-r.d/2+.07);tile.rotation.x=angle;tile.castShadow=true;tile.receiveShadow=true;scene.add(tile);}
 }
 roofPlanes.forEach(slope);
 // Fechamento sob as duas águas: não deixar um vão aberto acima da parede.
 const gable=new THREE.Shape();gable.moveTo(0,3);gable.lineTo(0,3.25);gable.lineTo(3.6,4.45);gable.lineTo(8,3.11);gable.lineTo(8,3);gable.closePath();
 const gg=new THREE.ExtrudeGeometry(gable,{depth:.18,bevelEnabled:false,steps:1}),guv=gg.attributes.uv;for(let i=0;i<guv.count;i++)guv.setXY(i,guv.getX(i)/2,guv.getY(i)/2);
 const gableMesh=new THREE.Mesh(gg,M.wood);gableMesh.rotation.y=-Math.PI/2;gableMesh.position.x=9.89;gableMesh.castShadow=gableMesh.receiveShadow=true;scene.add(gableMesh);
 // Pilares finos e vigas do alpendre, porta à direita e banco visível na foto04.
 for(const x of[-.1,5.82]){box(x,1.37,-1.7,.10,2.74,.10,M.plaster);box(x,2.79,-.45,.12,.12,2.6,M.woodDark);}
 // Banco ripado, braços e pés observados na foto04, não uma placa maciça.
 const benchStart=new Set(scene.children);
 for(let i=0;i<5;i++)box(1.8,.45,-1.02+i*.095,1.2,.045,.078,M.wood);
 for(let i=0;i<8;i++)box(1.28+i*.15,.75,-.60,.055,.55,.045,M.wood);
 box(1.8,1.03,-.60,1.24,.065,.065,M.wood);
 for(const x of[1.25,2.35]){for(const z of[-1.0,-.64])box(x,.23,z,.065,.46,.065,M.woodDark);box(x,.67,-.81,.065,.06,.5,M.wood);box(x,.55,-1.0,.05,.25,.05,M.wood);}
 if(proportionStudy){const b=exteriorReference.bench,c=Math.cos(b.yaw),s=Math.sin(b.yaw);for(const node of scene.children)if(!benchStart.has(node)){const x=node.position.x-1.8,z=node.position.z+.81;node.position.x=b.x+c*x+s*z;node.position.z=b.z-s*x+c*z;node.rotation.y+=b.yaw;}}
 // Janela alta lateral e condensadora da foto05; escala apenas estimada.
 box(5.99,3.85,.65,.35,.55,.48,M.white);
 for(let j=0;j<7;j++)box(6.175,3.62+j*.067,.65,.012,.018,.43,M.metal);
 for(const z of[.47,.83])box(6.01,3.51,z,.4,.035,.035,M.metal);
 // Armário baixo sob a janela lateral, sem ocupar o vão da entrada recuada.
 box(6.10,.49,.52,.50,.98,.75,M.plaster);
 for(const z of[.34,.70]){box(6.36,.46,z,.04,.84,.32,M.wood);box(6.39,.58,z,.02,.11,.025,M.metal);}
 // Pendentes pequenos dos dois lados da porta lateral; não inventar cômodo.
 for(const x of[6.27,9.30]){cylinder(x,2.66,1.15,.018,.26,M.woodDark,8);const shade=new THREE.Mesh(new THREE.ConeGeometry(.15,.16,20,1,true),M.wood);shade.position.set(x,2.49,1.15);shade.castShadow=shade.receiveShadow=true;scene.add(shade);}
 // Mesa redonda e cadeiras da cozinha; formas reconhecíveis nas fotos06/11.
 buildDiningSet(THREE,scene,M);
 // Pavimentação da chegada em pedra, gramado separado e caminho de placas.
 const patio=new THREE.Shape((proportionStudy?exteriorReference.patio.map(([x,z])=>[x,-z]):[[-6,0],[-6,8.4],[-.8,7.0],[5.5,3.9],[10.3,3.9],[10.3,0]]).map(([x,z])=>new THREE.Vector2(x,z)));
 const pg=new THREE.ShapeGeometry(patio),pos=pg.attributes.position,uv=pg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/3,pos.getY(i)/3);
 const pavement=new THREE.Mesh(pg,M.paving);pavement.rotation.x=-Math.PI/2;pavement.position.y=.015;pavement.receiveShadow=true;scene.add(pavement);
 for(let i=0;i<12;i++)box(2.2-i*.18,.003,-16+i*.83,.78,.012,.43,M.paving);
 // Muros laterais e vegetação do entorno: nenhum segundo imóvel inventado.
 if(proportionStudy)buildReferenceBoundary(THREE,scene,M,box,{planX,planZ});
 else{box(-6.15,.85,-5.5,.30,1.7,25,M.stone);box(14,.88,-4,.26,1.76,28,M.stone);
 for(let i=0;i<10;i++)box(13.8,1.06,-16+i*2.7,.14,2.12,.14,M.plaster);}
 // Sombra de contato/escala física: rodapé e calha no beiral.
 // Rodapé recortado pelos vãos reais, sem degrau de20cm atravessando a porta.
 const doorIntervals=(walls[0]?.openings||[{from:3.5,to:5.3,type:'door'}]).filter(o=>o.type==='door').sort((a,b)=>a.from-b.from);let cursor=0;
 for(const o of [...doorIntervals,{from:5.8,to:5.8}]){if(o.from>cursor)box((cursor+o.from)/2,.10,-.12,o.from-cursor,.20,.18,M.stone);cursor=o.to;}
 box(2.9,2.66,-2.05,7.1,.10,.10,M.metal);
 for(const x of[-.36,6.15])cylinder(x,1.33,-1.95,.035,2.66,M.metal,12);
}

export async function addReferenceTrees(THREE,scene,{mobile=false,groundMaterial}={}){
 // Context only, outside the modeled property: a receiving surface prevents
 // the distant tree bases ending against empty sky. No cadastral dimensions.
 if(groundMaterial){const geometry=new THREE.PlaneGeometry(180,180),p=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/2,p.getY(i)/2);const ground=new THREE.Mesh(geometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.set(4,-.025,1);ground.receiveShadow=true;ground.name='estimated-context-ground';scene.add(ground);}
 const horizon=proportionStudy?distantCanopyPlacements.slice(0,mobile?2:3):[],pointsByVariant=[...treePlacements,...horizon],stats={trees:treePlacements.length,distantCanopy:{instances:horizon.length,triangles:0,classification:'ambientação estimada, não paisagem reconstruída'},triangles:0};
 let gltf;try{gltf=await new GLTFLoader().loadAsync(new URL(mobile?'./assets/trees-mobile.glb':'./assets/trees-real.glb',import.meta.url).href);}catch(error){console.warn('Árvores indisponíveis; caminhada preservada.');return {...stats,trees:0,distantCanopy:{...stats.distantCanopy,instances:0},partial:true,assetFailure:'trees'};}
 if(proportionStudy){const loader=new THREE.TextureLoader(),leafMaps=[];for(let i=0;i<8;i++){try{const map=await loader.loadAsync(new URL(`./assets/nature/${mobile?'mobile/':''}leaf-${i}.webp`,import.meta.url).href);map.flipY=false;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=mobile?2:4;leafMaps.push(map);}catch{console.warn('Folha '+i+' indisponível; variante omitida para preservar recorte e caminhada.');leafMaps.push(null);}}stats.boundary=addBoundaryFoliage(THREE,scene,gltf,{mobile,planX,planZ,leafMaps});stats.triangles+=stats.boundary.triangles;}
 for(const variant of[0,1]){const root=gltf.scene.getObjectByName(`v${variant}_mid`);if(!root)throw new Error('Árvore da base não encontrada');root.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),points=pointsByVariant.filter(p=>p[4]===variant);
root.traverse(source=>{
 if(!source.isMesh)return;
 const base=source.geometry.clone().applyMatrix4(source.matrixWorld);base.translate(-center.x,-bounds.min.y,-center.z);base.scale(1/size.y,1/size.y,1/size.y);
 const material=source.material.clone(),isLeaf=source.material.alphaTest>0;
 if(isLeaf){material.alphaTest=Math.max(material.alphaTest,.35);material.side=THREE.DoubleSide;}
 material.transparent=false;material.depthWrite=true;
 // Preserve the photographed green and bark. A green HSL multiplier on all
 // primitives used to tint the woody branches as well as the foliage.
 const shapes=isLeaf?3:1;
 for(let shape=0;shape<shapes;shape++){
  const chosen=points.filter((p,i)=>!isLeaf||i%shapes===shape);if(!chosen.length)continue;
  const geometry=isLeaf?varyLeafGeometry(THREE,base,319+variant*79+shape*113):base;
  const instances=new THREE.InstancedMesh(geometry,material,chosen.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),tone=new THREE.Color(),triangles=(geometry.index?.count||geometry.attributes.position.count)/3;
  chosen.forEach(([x,z,y,height],i)=>{const identity=points.indexOf(chosen[i]);q.setFromAxisAngle(new THREE.Vector3(0,1,0),identity*2.399+.31*(identity%2));matrix.compose(new THREE.Vector3(proportionStudy?planX(x):x,y,proportionStudy?planZ(z):z),q,new THREE.Vector3(height*(.84+(identity*7%5)*.035),height,height*(.87+(identity*11%5)*.032)));instances.setMatrixAt(i,matrix);tone.setRGB(1,1,1).multiplyScalar(.92+(identity%5)*.025);instances.setColorAt(i,tone);});
  instances.name=`reference-tree-${variant}-${isLeaf?'leaves-'+shape:'bark'}`;instances.userData.leafVariation=geometry.userData.leafVariation||null;instances.castShadow=instances.receiveShadow=true;instances.instanceMatrix.needsUpdate=true;instances.instanceColor.needsUpdate=true;scene.add(instances);stats.triangles+=triangles*chosen.length;
  if(variant===1)stats.distantCanopy.triangles+=triangles*chosen.filter(p=>horizon.includes(p)).length;
 }
 if(isLeaf)base.dispose();
});
 }
 if(proportionStudy&&stats.distantCanopy.triangles>distantCanopyBudget[mobile?'mobile':'desktop'].triangles)throw Error('Orçamento da copa distante excedido');
 return stats;
}
