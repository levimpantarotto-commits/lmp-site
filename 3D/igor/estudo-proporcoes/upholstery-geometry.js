// Foto10/11: duas capas unidas na borda, volume do enchimento e pregas
// localizadas. Encostos são derivados estáticos do Cloth aprovado; não há solver
// nem simulação no runtime. Os assentos preservam o catálogo anterior.
import {upholsteryData,upholsteryProvenance} from './authored-upholstery-data.js';
// Derivados Blender fechados, subdivididos/simplificados offline. Compartilhados
// por desktop/mobile; UV0 é métrico, UV1 vem apenas do bake da casa.
export function sewnCushion(T,w,h,d,{seed=0,seat=false}={}){
 const names=seat?['seatA','seatB']:['backA','backB','backC'];
 const name=names[Math.abs(Math.round(seed*7))%names.length],a=upholsteryData[name];
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a.position,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(a.uv,2));g.setIndex(a.index);
 const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){
  const axis=a.uvAxis[i];
  uv.setXY(i,uv.getX(i)*(axis===0?h:w)/2,uv.getY(i)*(axis===2?h:d)/2);
 }
 g.scale(w,h,d);g.userData={source:seat?'catálogo Blender anterior':'Frozen Cloth estático aprovado',variant:name,photoReference:seat?'10/11':'10/11',runtimeSolver:false,provenance:upholsteryProvenance};return g;
}
// Retained construction reference, not used by the active scene.
function legacyCushion(T,w,h,d,{seed=0,seat=false}={}){
 if(seat)return gussetSeat(T,w,h,d,seed);
 const nx=40,ny=30,p=[],uv=[],indices=[],front=[],back=[],hx=w/2,hy=h/2,hz=d/2;
 const gauss=(v,s)=>Math.exp(-(v*v)/(s*s));
 for(let side=0;side<2;side++)for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const u=2*i/nx-1,v=2*j/ny-1,boundary=i===0||i===nx||j===0||j===ny;
  if(side&&boundary){back.push(front[j*(nx+1)+i]);continue;}
  const core=Math.max(0,(1-u*u)*(1-v*v)),puff=Math.pow(core,seat?.28:.38);
  let x=hx*u*(1-.065*Math.pow(Math.abs(v),10)),y=hy*v*(1-.065*Math.pow(Math.abs(u),10)),z=hz*puff;
  if(!boundary){
   if(seat){const ends=gauss(Math.abs(u)-.85,.16);z-=.008*ends*(.5+.5*Math.sin(v*24+u*2+seed))*puff;z-=.009*gauss(u,.6)*gauss(v,.5);}
   else{
    for(const [k,c]of[-.68,-.31,.14,.52].entries()){
     const path=c+.08*Math.sin(seed+k)+(1-v)*.17*(k%2?1:-1),line=gauss(u-path,.035),shoulder=gauss(u-path-.046,.04);
     z+=(.0045*shoulder-.018*line)*gauss(v-.76,.30)*puff;
    }
    // Tecido comprimido pelo contato com o assento: pregas curtas, inclinadas,
    // não ondulação global nem manchas de sombra pintadas no albedo.
    for(let k=0;k<4;k++){
     const path=-.78+k*.115+(v+.75)*.20;
     z-=.010*gauss(u-path,.035)*gauss(v+.77,.20)*puff;
    }
    // A capa não tem quatro bordas perfeitamente retas/iguais. A amplitude é
    // milimétrica e desaparece nos cantos para manter encaixe e silhueta.
    y+=.007*Math.sin(u*11+seed*2)*Math.pow(Math.abs(v),8)*(1-u*u);
    z-=.008*gauss(u+.73,.13)*gauss(v+.70,.22)*puff;
    y+=.007*Math.sin(u*8+seed)*puff;
   }
  }
  const idx=p.length/3;p.push(x,y,(side?-1:1)*Math.max(0,z));uv.push(x/2,y/2);(side?back:front).push(idx);
 }
 for(const [side,list]of[front,back].entries())for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const k=j*(nx+1)+i,a=list[k],b=list[k+1],c=list[k+nx+1],d=list[k+nx+2];
  // Evita faces duplicadas coplanares nos dois cantos em que a diagonal
  // ligaria três vértices da própria costura. Cada aresta pertence a duas faces.
  const diagonalAD=(i===0&&j===0)||(i===nx-1&&j===ny-1);
  if(diagonalAD){if(!side)indices.push(a,b,d,a,d,c);else indices.push(a,d,b,a,c,d);}
  else if(!side)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

// Fotos10/11: assento de espuma com faixa lateral (gusset). A capa superior
// arredonda na costura, mas NÃO afina até espessura zero como um travesseiro.
function gussetSeat(T,w,h,d,seed){
 const nx=56,ny=18,hx=w/2,hy=h/2,hz=d/2,p=[],uv=[],idx=[],skins=[];
 const gauss=(v,s)=>Math.exp(-(v*v)/(s*s));
 const put=(x,y,z)=>{p.push(x,y,z);uv.push(x/2,y/2);return p.length/3-1;};
 for(let side=0;side<2;side++){
  const skin=[];skins.push(skin);
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
   const u=2*i/nx-1,v=2*j/ny-1,core=Math.max(0,(1-u*u)*(1-v*v));
   const x=hx*u*(1-.035*Math.pow(Math.abs(v),12)),y=hy*v*(1-.035*Math.pow(Math.abs(u),12));
   let z=hz*(.64+.35*Math.pow(core,.24));
   if(!side){
    z-=.009*gauss(u+.12,.62)*gauss(v+.05,.66)*Math.pow(core,.25);
    // Pregas paralelas na ponta do assento observadas na foto11.
    const end=gauss(u-.83,.14),wave=Math.sin(v*28+seed*1.3+u*4);
    z+=.0058*end*wave*Math.pow(core,.28);
   }
   skin.push(put(x,y,side?-z:z));
  }
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
   const k=j*(nx+1)+i,a=skin[k],b=skin[k+1],c=skin[k+nx+1],e=skin[k+nx+2];
   if(!side)idx.push(a,b,c,b,e,c);else idx.push(a,c,b,b,c,e);
  }
 }
 const boundary=[];
 for(let i=0;i<=nx;i++)boundary.push(i);
 for(let j=1;j<=ny;j++)boundary.push(j*(nx+1)+nx);
 for(let i=nx-1;i>=0;i--)boundary.push(ny*(nx+1)+i);
 for(let j=ny-1;j>0;j--)boundary.push(j*(nx+1));
 const rings=[boundary.map(i=>skins[0][i])];
 for(let row=1;row<4;row++){
  const t=row/4,ring=[];
  for(const k of boundary){const a=skins[0][k],x=p[a*3],y=p[a*3+1],bulge=1+.006*Math.sin(Math.PI*t);ring.push(put(x*bulge,y*bulge,hz*.64*(1-2*t)));}
  rings.push(ring);
 }
 rings.push(boundary.map(i=>skins[1][i]));
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<boundary.length;i++){
  const k=(i+1)%boundary.length,a=rings[j][i],b=rings[j][k],c=rings[j+1][i],e=rings[j+1][k];idx.push(a,c,b,b,c,e);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 // A faixa lateral precisa de sua própria ilha UV. Projeção XY colapsava
 // sua altura e esticava trama/normal como veios de madeira. As normais já
 // suavizadas são preservadas; vértices duplicados aqui são só costuras UV.
 const flat=g.toNonIndexed(),pos=flat.attributes.position,tex=flat.attributes.uv;
 const sideStart=nx*ny*12;
 for(let i=sideStart;i<pos.count;i+=3){
  const a=new T.Vector3().fromBufferAttribute(pos,i),b=new T.Vector3().fromBufferAttribute(pos,i+1),c=new T.Vector3().fromBufferAttribute(pos,i+2),n=b.clone().sub(a).cross(c.clone().sub(a));
  for(let k=i;k<i+3;k++)tex.setXY(k,(Math.abs(n.x)>Math.abs(n.y)?pos.getY(k):pos.getX(k))/2,pos.getZ(k)/2);
 }
 flat.setIndex(Array.from({length:pos.count},(_,i)=>i));g.dispose();return flat;
}
