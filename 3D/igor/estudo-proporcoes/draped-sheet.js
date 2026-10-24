// Cobertura contínua de cama: topo repousado e queda ondulada sob gravidade.
// Aproximação geométrica, não simulação física nem escaneamento do tecido real.
export function drapedSheet(T,width,depth,drop,phase=0){
 const nx=30,nz=30,positions=[],uv=[],indices=[],top=[],put=(x,y,z,s,t)=>{positions.push(x,y,z);uv.push(s,t);return positions.length/3-1;};
 for(let j=0;j<=nz;j++){top[j]=[];for(let i=0;i<=nx;i++){
  const u=i/nx*2-1,v=j/nz*2-1;
  const wrinkle=.006*Math.sin(u*23+v*5+phase)*Math.exp(-(((Math.abs(v)-.72)/.24)**2));
  const settle=.010*Math.sin(u*5+phase)*(1-v*v)+.007*Math.cos(v*7-phase)*(1-u*u);
  top[j][i]=put(u*width/2,.035-settle+wrinkle,v*depth/2,(u+1)*width/4,(v+1)*depth/4);
 }}
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=top[j][i],b=top[j][i+1],c=top[j+1][i+1],d=top[j+1][i];indices.push(a,d,b,b,d,c);}
 const rim=[];for(let i=0;i<=nx;i++)rim.push(top[0][i]);for(let j=1;j<=nz;j++)rim.push(top[j][nx]);for(let i=nx-1;i>=0;i--)rim.push(top[nz][i]);for(let j=nz-1;j>0;j--)rim.push(top[j][0]);
 let last=rim;
 for(let row=1;row<=6;row++){
  const t=row/6,next=[];
  for(let k=0;k<rim.length;k++){
   const source=rim[k],x=positions[source*3],y=positions[source*3+1],z=positions[source*3+2];
   const normal=new T.Vector2(x/(width/2),z/(depth/2));
   if(Math.abs(normal.x)>Math.abs(normal.y)+.001)normal.set(Math.sign(x),0);else if(Math.abs(normal.y)>Math.abs(normal.x)+.001)normal.set(0,Math.sign(z));else normal.normalize();
   const wave=Math.sin(k*.64+phase)+.35*Math.sin(k*1.19+.8);
   const flare=.012*Math.sin(t*Math.PI/2)+.010*wave*Math.sin(t*Math.PI*.82);
   next.push(put(x+normal.x*flare,y-drop*t+.012*wave*t*t,z+normal.y*flare,k*.035,t*drop/2));
  }
  for(let k=0;k<rim.length;k++){const q=(k+1)%rim.length;indices.push(last[k],last[q],next[k],last[q],next[q],next[k]);}
  last=next;
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
