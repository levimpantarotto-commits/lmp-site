import {Reflector} from './vendor/Reflector.js';
// Superfície de espelho real; não refletir apenas o HDR do céu.
// Dois alvos pequenos, no máximo um passe extra por frame solicitado.
export function takeMirrorSurfaces(T,scene){
 const out=[];scene.updateMatrixWorld(true);
 for(const mesh of [...scene.children].filter(n=>n.userData.interiorPart==='mirror')){
  const b=new T.Box3().setFromObject(mesh),s=b.getSize(new T.Vector3()),p=b.getCenter(new T.Vector3());
  out.push({id:mesh.userData.interiorId,x:p.x,y:p.y,z:b.min.z-.004,width:s.x,height:s.y});
  scene.remove(mesh);mesh.geometry.dispose();
 }return out;
}
export function buildMirrors(T,scene,specs,{mobile=false}={}){
 const resolution=mobile?256:512,mirrors=specs.map(s=>{const m=new Reflector(new T.PlaneGeometry(s.width,s.height),{color:0xeeeeee,clipBias:.003,textureWidth:resolution,textureHeight:resolution,multisample:0});m.position.set(s.x,s.y,s.z);m.rotation.y=Math.PI;m.visible=false;m.userData.spec=s;scene.add(m);return m;});
 let active=0;return {mirrors,update(state){active=0;for(const m of mirrors){const s=m.userData.spec,inBathroom=s.id==='vanity1'?state.x>0&&state.x<2.7&&state.z>9&&state.z<12:state.x>9.8&&state.x<12.5&&state.z>8&&state.z<12;m.visible=state.y<.2&&inBathroom&&state.z<s.z;active+=Number(m.visible);}},diagnostics:()=>({count:mirrors.length,active,resolution,maxExtraPasses:1})};
}
