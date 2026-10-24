// Foto10/11: duas capas unidas na borda, volume do enchimento e pregas
// localizadas. Modelagem paramétrica estática, NÃO escaneamento/simulação.
export function sewnCushion(T,w,h,d,{seed=0,seat=false}={}){
 const nx=seat?42:30,ny=seat?18:24,p=[],uv=[],indices=[],front=[],back=[],hx=w/2,hy=h/2,hz=d/2;
 const gauss=(v,s)=>Math.exp(-(v*v)/(s*s));
 for(let side=0;side<2;side++)for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const u=2*i/nx-1,v=2*j/ny-1,boundary=i===0||i===nx||j===0||j===ny;
  if(side&&boundary){back.push(front[j*(nx+1)+i]);continue;}
  const core=Math.max(0,(1-u*u)*(1-v*v)),puff=Math.pow(core,seat?.28:.38);
  let x=hx*u*(1-.065*Math.pow(Math.abs(v),10)),y=hy*v*(1-.065*Math.pow(Math.abs(u),10)),z=hz*puff;
  if(!boundary){
   if(seat){const ends=gauss(Math.abs(u)-.85,.16);z-=.008*ends*(.5+.5*Math.sin(v*24+u*2+seed))*puff;z-=.009*gauss(u,.6)*gauss(v,.5);}
   else{
    for(const [k,c]of[-.63,-.17,.42].entries()){
     const path=c+.08*Math.sin(seed+k)+(1-v)*.17*(k%2?1:-1),line=gauss(u-path,.035),shoulder=gauss(u-path-.046,.04);
     z+=(.0045*shoulder-.015*line)*gauss(v-.76,.25)*puff;
    }
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
