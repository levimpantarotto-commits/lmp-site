// Pedra cinza observada nas fotos 10/11. A paginação é procedural, mas fixa:
// juntas e recortes acompanham os vãos da própria parede, sem uma segunda parede.
import {proportionStudy} from './proportion-study.js';
import {graniteHeightSize,graniteHeights} from './granite-relief.js';
export function buildMasonryReference(T,scene,M,walls=[]){
 const meshes=[],budget=20000;
 const evidence={photos:[10,11],observed:['blocos irregulares cinza nas faces internas da sala','cabideiro escuro de cinco ganchos'],estimated:['modulação e relevo das pedras']};
 const triangles=g=>(g.index?g.index.count:g.getAttribute('position').count)/3;
 const ensurePNU=g=>{if(!g.getAttribute('normal'))g.computeVertexNormals();if(!g.getAttribute('uv'))throw Error('masonry geometry requires UVs');return g;};
 const add=(g,material,x,y,z,piece,photo=11,rotation=0)=>{const mesh=new T.Mesh(ensurePNU(g),material);mesh.name=`masonry-${piece}`;mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=mesh.receiveShadow=true;mesh.userData={detail:'masonry-reference',piece,sourcePhoto:photo};scene.add(mesh);meshes.push(mesh);return mesh;};
 const base=M.basinStone||M.plaster||M.white;
 const tones=(proportionStudy?[0xe7e3d5,0xe0ddd0,0xdcd9cd,0xeeeadd]:[0xc2beb1,0xb2aea2,0xd0cbbd,0xa7a69a]).map(color=>{const material=base.clone?.()||base;if(material.color?.set)material.color.set(color);material.roughness=proportionStudy?.98:.9;if(material.normalScale?.set)material.normalScale.set(proportionStudy?.18:.6,proportionStudy?.18:.6);material.userData={...material.userData,masonryMicroTexture:'basinStone'};return material;});
 const dark=M.woodDark||M.wood||base,white=M.white||M.plaster||base;
 // No estudo, a pedra fotográfica reaproveitada da base tem grão e juntas
 // contínuos. Os relevos-caixa anteriores pareciam painéis de metal, não pedra.
 const observedStone=proportionStudy?(M.graniteWall||base):null;
 // Deslocamento estático amostrado da MESMA captura do albedo/normal: juntas
 // não são inventadas por ruído e o relevo continua alinhado no WebGL e Cycles.
 const heightAt=(x,y)=>{const fract=v=>v-Math.floor(v),xx=fract(x/2.8)*graniteHeightSize,yy=fract(-y/2.8)*graniteHeightSize,ix=Math.floor(xx),iy=Math.floor(yy),tx=xx-ix,ty=yy-iy,n=graniteHeightSize,get=(a,b)=>graniteHeights[((b+n)%n)*n+(a+n)%n]/255;return (get(ix,iy)*(1-tx)+get(ix+1,iy)*tx)*(1-ty)+(get(ix,iy+1)*(1-tx)+get(ix+1,iy+1)*tx)*ty;};
 const displacedPlane=(a,b,c,d)=>{const g=new T.PlaneGeometry(c-a,d-b,Math.max(1,Math.ceil((c-a)/.08)),Math.max(1,Math.ceil((d-b)/.08))),p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const x=a+uv.getX(i)*(c-a),y=b+uv.getY(i)*(d-b);uv.setXY(i,x/2,y/2);p.setZ(i,.002+.018*heightAt(x,y));}g.computeVertexNormals();return g;};
 // Retângulo arredondado extrudado: arestas discretamente quebradas e relevo
 // real de 2--4,5 cm, sem usar a textura sandstone (que já traz juntas).
 const blockGeometry=(width,height,depth,seed)=>{const j=n=>((Math.sin(seed*91.17+n*17.3)*.5+.5)*.014+.002),l=-width/2,r=width/2,b=-height/2,t=height/2,bevel=Math.min(.010,depth*.35,width*.06,height*.08);const shape=new T.Shape();shape.moveTo(l+j(1),b+j(2));shape.lineTo(r-j(3),b+j(4));shape.lineTo(r-j(5),t-j(6));shape.lineTo(l+j(7),t-j(8));shape.closePath();const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:1}),uv=geometry.getAttribute('uv'),p=geometry.getAttribute('position');for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)*3.2,p.getY(i)*3.2);uv.needsUpdate=true;return geometry;};
 // Frente contínua em baixa subdivisão: as facetas variam 5--12 mm, sem
 // "remendos" aplicados sobre a pedra e sem transformar o muro em ardósia lisa.
 const faceGeometry=(width,height,depth,seed)=>{const gx=3,gy=2,inset=Math.min(.018,width*.10,height*.13),positions=[],uvs=[],indices=[],j=n=>proportionStudy?.001+(Math.sin(seed*71.9+n*31.7)*.5+.5)*.002:.005+((Math.sin(seed*71.9+n*31.7)*.5+.5)*.007);for(let iy=0;iy<=gy;iy++)for(let ix=0;ix<=gx;ix++){const x=-width/2+inset+(width-2*inset)*ix/gx,y=-height/2+inset+(height-2*inset)*iy/gy,n=iy*(gx+1)+ix;positions.push(x,y,depth+j(n));uvs.push(x*3.2,y*3.2);}for(let iy=0;iy<gy;iy++)for(let ix=0;ix<gx;ix++){const a=iy*(gx+1)+ix,b=a+1,c=a+gx+1,d=c+1;indices.push(a,b,c,b,d,c);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;};
 const openingParts=(rect,openings)=>{let parts=[rect];for(const raw of openings){const o={from:raw.from-.016,to:raw.to+.016,bottom:raw.bottom-.016,top:raw.top+.016},next=[];for(const p of parts){const [a,b,c,d]=p,ix0=Math.max(a,o.from),ix1=Math.min(c,o.to),iy0=Math.max(b,o.bottom),iy1=Math.min(d,o.top);if(ix1<=ix0||iy1<=iy0){next.push(p);continue;}if(a<ix0)next.push([a,b,ix0,d]);if(ix1<c)next.push([ix1,b,c,d]);if(b<iy0)next.push([ix0,b,ix1,iy0]);if(iy1<d)next.push([ix0,iy1,ix1,d]);}parts=next;}return parts.filter(p=>p[2]-p[0]>.025&&p[3]-p[1]>.025);};
 const materialParts=(wall,rect)=>{const ranges=wall.materialRanges||[],[a,b,c,d]=rect;if(!ranges.length)return wall.material==='stone'?[rect]:[];const cuts=[a,c,...ranges.flatMap(r=>[r.from,r.to].filter(v=>v>a&&v<c))].filter(Number.isFinite).sort((x,y)=>x-y),out=[];for(let i=1;i<cuts.length;i++){const from=cuts[i-1],to=cuts[i],mid=(from+to)/2,range=ranges.find(r=>mid>=r.from&&mid<=r.to),safeFrom=from+(from>a?.004:0),safeTo=to-(to<c?.004:0);if(safeTo-safeFrom>.025&&(range?.material||wall.material)==='stone')out.push([safeFrom,b,safeTo,d]);}return out;};
 const buildFace=(wall,axis)=>{if(!wall||wall.base!==0)return;const length=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]);if(!length)return;let y=0,row=0;
  if(proportionStudy){for(const rect of materialParts(wall,[0,0,length,wall.height]))for(const[a,b,c,d]of openingParts(rect,wall.openings||[])){const g=displacedPlane(a,b,c,d);if(axis==='z')add(g,observedStone,(a+c)/2,(b+d)/2,.102,'stone-continuous-face',11);else add(g,observedStone,.102,(b+d)/2,(a+c)/2,'stone-continuous-face',11,Math.PI/2);}return;}
  const heights=proportionStudy?[.27,.36,.29,.32,.25,.38]:[.19,.24,.17,.27,.22,.20],widths=proportionStudy?[.75,1.16,.63,.94,.82,1.28]:[.44,.63,.36,.74,.48,.57];while(y<wall.height-.01){const h=Math.min(heights[row%heights.length],wall.height-y),offset=proportionStudy?(row*.317)%1:(row%2)*.17;let u=-offset,col=0;while(u<length-.01){const width=widths[(row*3+col)%widths.length],a0=Math.max(0,u),c0=Math.min(length,u+width);for(const materialRect of materialParts(wall,[a0,y,c0,y+h]))for(const [a,b,c,d] of openingParts(materialRect,wall.openings||[])){const mid=(a+c)/2,centerY=(b+d)/2,seed=row*29+col,relief=proportionStudy?.004+(seed%6)*.001:.018+(seed%6)*.004,geo=blockGeometry(c-a-.014,d-b-.013,relief,seed),tone=tones[(row+col)%4],hasFace=c-a>.09&&d-b>.09,face=hasFace&&faceGeometry(c-a-.038,d-b-.035,relief,seed);if(axis==='z'){add(geo,tone,mid,centerY,.10,'stone-block',10,0);if(face)add(face,tone,mid,centerY,.10,'stone-face',10,0);}else{add(geo,tone,.10,centerY,mid,'stone-block',10,Math.PI/2);if(face)add(face,tone,.10,centerY,mid,'stone-face',10,Math.PI/2);}}
   u+=width;col++;}y+=h;row++;}
 };
 // Apenas as faces voltadas para dentro: wall[0] (+z) e wall[1] (+x).
 // Foto10: a pedra interna chega até a divisória do banco. A divisão entre
 // pedra/reboco da fachada exterior não define o acabamento do lado interno.
 const interiorFront=proportionStudy?{...walls[0],materialRanges:[{from:0,to:3.52,material:'stone'},{from:3.52,to:5.8,material:'plaster'}]}:walls[0];
 buildFace(interiorFront,'z');buildFace(walls[1],'x');
 const box=(x,y,z,w,h,d,material,piece,photo=11)=>add(new T.BoxGeometry(w,h,d),material,x,y,z,piece,photo);
 // Cabideiro da foto 11, na pedra à esquerda, sem acrescentar mobiliário não observado.
 box(.121,1.95,2.55,.032,.09,1.55,dark,'coat-rack-rail');
 for(let i=0;i<5;i++){const z=1.80+i*.375,hook=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(.13,1.95,z),new T.Vector3(.27,1.90,z),new T.Vector3(.27,1.81,z+.055)]),8,.025,6,false);add(hook,dark,0,0,0,'coat-rack-hook',11);}
 // Interruptor/tomada visto no divisor direito. Três pontos mantêm sua leitura sem
 // invadir a faixa de circulação nem simular uma parede estrutural ainda inexistente.
 box(3.52,1.20,3.251,.19,.15,.018,white,'divider-switch-plate');
 for(const [x,y] of[[3.485,1.225],[3.555,1.225],[3.52,1.165]]){const hole=add(new T.CylinderGeometry(.012,.012,.006,8),dark,x,y,3.264,'divider-switch-hole');hole.rotation.x=Math.PI/2;}
 const total=meshes.reduce((sum,m)=>sum+triangles(m.geometry),0);
 return {meshes,triangles:total,budget,withinBudget:total<=budget,evidence};
}
