import * as THREE from 'three';

// Public-survey terrain. No procedural trees or invented surface geometry.
export async function loadRealTerrain(renderer){
 const r=await fetch('./assets/terreno-real.json');if(!r.ok)throw new Error('Terreno real: HTTP '+r.status);
 const data=await r.json(),n=data.nx*data.ny,scale=500/Math.max(data.width_m,data.depth_m);
 const pos=new Float32Array(n*3),uv=new Float32Array(n*2),color=new Float32Array(n*3),indices=[];
 const min=data.min_elevation_m,max=data.max_elevation_m,base=data.base_elevation_m;
 const stops=['#133d9c','#22b9c2','#93cf6f','#f2d960','#c64e31'];
 for(let y=0;y<data.ny;y++)for(let x=0;x<data.nx;x++){
  const i=y*data.nx+x,h=data.heights_m[i];
  pos[i*3]=(x/(data.nx-1)-.5)*data.width_m*scale;pos[i*3+1]=h*scale;pos[i*3+2]=(y/(data.ny-1)-.5)*data.depth_m*scale;
  uv[i*2]=x/(data.nx-1);uv[i*2+1]=1-y/(data.ny-1);
  const t=THREE.MathUtils.clamp((h+base-min)/(max-min),0,.9999)*4,j=Math.floor(t);new THREE.Color(stops[j]).lerp(new THREE.Color(stops[j+1]),t-j).toArray(color,i*3);
  if(x<data.nx-1&&y<data.ny-1){const b=i+data.nx;indices.push(i,b,i+1,i+1,b,b+1);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.BufferAttribute(color,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const texture=await new THREE.TextureLoader().loadAsync('./assets/'+data.texture);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const photoMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:1,metalness:0,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.35,side:THREE.DoubleSide});
 const heightMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geometry,photoMaterial);mesh.name='Terreno real / swisstopo';const group=new THREE.Group();group.add(mesh);
 const pointGeometry=new THREE.BufferGeometry();pointGeometry.setAttribute('position',geometry.attributes.position);pointGeometry.setAttribute('color',geometry.attributes.color);const pointCloud=new THREE.Points(pointGeometry,new THREE.PointsMaterial({size:.8,vertexColors:true}));pointCloud.visible=false;group.add(pointCloud);
 const vectorGroup=new THREE.Group();group.add(vectorGroup);vectorGroup.visible=false;
 if(data.contours){for(const line of data.contours){const xyz=(line.points||line).map(p=>new THREE.Vector3(p[0]*scale,(p[2]+.8)*scale,-p[1]*scale));if(xyz.length<2)continue;vectorGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xyz),new THREE.LineBasicMaterial({color:0xffe3a0,transparent:true,opacity:.75})));}}
 const middle=(max-min)*scale*.48;
 return {group,mesh,pointCloud,vectorGroup,data,scale,middle,
  mode(name){mesh.visible=name!=='points';pointCloud.visible=name==='points';mesh.material=name==='height'?heightMaterial:photoMaterial;},
  vectors(visible){vectorGroup.visible=visible;},
  aerial:{position:[520,430+middle,650],target:[0,middle,0]},
  detail:{position:[120,125+middle,210],target:[0,middle,0]},
  map:{position:[0,720,0.1],target:[0,0,0]}
 };
}
