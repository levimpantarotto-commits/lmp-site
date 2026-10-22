const hash=(x,z)=>{const n=Math.sin(x*12.9898+z*78.233)*43758.5453;return n-Math.floor(n);};
// Artistic planting zones near observed façades, not cadastral parcel boundaries.
export function collectGardenAnchors(root){
 const bins=new Map();root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh||!/(Doors|Glass)/i.test(o.name||''))return;const p=o.geometry?.attributes?.position,e=o.matrixWorld.elements;if(!p)return;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),qx=e[0]*x+e[4]*y+e[8]*z+e[12],qz=e[2]*x+e[6]*y+e[10]*z+e[14];if(qx<195||qx>345||qz<245||qz>410)continue;
   const k=`${Math.floor(qx/14)},${Math.floor(qz/14)}`,b=bins.get(k)||{x:0,z:0,n:0};b.x+=qx;b.z+=qz;b.n++;bins.set(k,b);
  }
 });return [...bins.values()].map(b=>[b.x/b.n,b.z/b.n]);
}
export function gardenProfileFor(anchors){
 const bins=new Map(),cell=15;
 for(const [x,z] of anchors){const k=`${Math.floor(x/cell)},${Math.floor(z/cell)}`;if(!bins.has(k))bins.set(k,[]);bins.get(k).push([x,z,.20+hash(Math.round(x),Math.round(z))*.80]);}
 return (x,z)=>{let strength=0;const cx=Math.floor(x/cell),cz=Math.floor(z/cell);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)for(const a of bins.get(`${cx+dx},${cz+dz}`)||[]){const d=Math.hypot(x-a[0],z-a[1])/15;if(d>=1)continue;const w=1-d*d*(3-2*d);strength=Math.max(strength,w*a[2]);}return strength;};
}
