// Detalhes de banheiros observados nas fotos 12, 13, 16 e 17. Medidas são estimadas.
export const bathObstacles=[
 {id:'shower1-back',rect:[.20,9.30,.80,9.34]},{id:'shower1-side',rect:[.20,9.30,.24,9.95],opening:.65},
 {id:'shower2-back',rect:[11.45,10.00,12.30,10.04]},{id:'shower2-side',rect:[11.45,10.00,11.49,11.15],opening:.65}
];

export function buildBathDetails(THREE,scene,M){
 const meshes=[],evidence={photos:[12,13,16,17],estimated:true,notes:['vidro fixo com acesso aberto','dimensões derivadas dos footprints recebidos']};
 const mat=(name,fallback='white')=>M[name]||M[fallback]||M.white;
 const add=(g,m,x,y,z,id,sourcePhoto)=>{if(!g.getAttribute('normal'))g.computeVertexNormals();const n=new THREE.Mesh(g,m);n.position.set(x,y,z);n.castShadow=n.receiveShadow=true;n.userData={detail:id,sourcePhoto};scene.add(n);meshes.push(n);return n;};
 const box=(x,y,z,w,h,d,m,id,photo)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,id,photo);
 const cyl=(x,y,z,r,h,m,id,photo)=>add(new THREE.CylinderGeometry(r,r,h,12),m,x,y,z,id,photo);
 const tube=(x,y,z,points,r,m,id,photo)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'),28,r,6,false),m,x,y,z,id,photo);
 const glass=()=>{const g=(mat('glass','white').clone?.()||mat('glass','white'));g.transparent=true;g.opacity=.22;g.depthWrite=false;return g;};
 const cloth=mat('fabricWhite','linen'),wood=mat('furnitureWood','wood'),dark=mat('black','metal'),ceramic=mat('ceramic','white');
 const panel=(x,z,w,d,h,id,photo)=>box(x,h/2,z,w,h,d,glass(),id,photo);
 // Fotos 12/16/17: vidro fixo tem perfis pretos delgados, não uma caixa opaca.
 const glassProfile=(x,z,h,photo)=>box(x,h/2,z,.022,h,.022,dark,'shower-glass-profile',photo);
 // Box 1: painel de fundo + painel lateral, com abertura livre de 65 cm no acesso.
 panel(.50,9.32,.60,.018,1.92,'shower-glass-fixed',12);panel(.22,9.625,.018,.65,1.92,'shower-glass-fixed',12);
 glassProfile(.205,9.32,1.92,12);glassProfile(.795,9.32,1.92,12);glassProfile(.22,9.31,1.92,12);glassProfile(.22,9.94,1.92,12);
 box(.50,.035,9.95,.56,.07,1.25,ceramic,'shower-floor',12);box(.50,1.94,9.37,.14,.10,.08,ceramic,'electric-shower',12);cyl(.50,1.87,9.43,.075,.035,ceramic,'shower-head',12);tube(.50,1.84,9.43,[[0,0,0],[-.08,-.26,0],[-.05,-.62,.03],[-.13,-.92,.04]],.009,ceramic,'shower-hose',12);box(.50,.93,9.345,.28,.06,.045,dark,'shower-niche',12);cyl(.44,.99,9.31,.025,.09,mat('linen','white'),'soap-bottle',12);
 // Box 2: cabine mais larga; novamente só segmentos fixos, nunca um volume sólido que bloqueie entrada.
 panel(11.875,10.02,.85,.018,2.03,'shower-glass-fixed',16);panel(11.47,10.575,.018,1.15,2.03,'shower-glass-fixed',16);
 glassProfile(11.45,10.02,2.03,16);glassProfile(12.30,10.02,2.03,16);glassProfile(11.47,10.01,2.03,16);glassProfile(11.47,11.14,2.03,16);
 box(11.875,.035,10.90,.81,.07,1.72,ceramic,'shower-floor',16);box(11.875,2.05,10.08,.15,.10,.08,ceramic,'electric-shower',16);cyl(11.875,1.98,10.14,.078,.035,ceramic,'shower-head',16);tube(11.875,1.95,10.14,[[0,0,0],[.10,-.20,0],[.08,-.55,.04],[.15,-.90,.06]],.009,ceramic,'shower-hose',16);box(11.88,1.02,10.045,.34,.06,.045,dark,'shower-niche',16);cyl(11.80,1.08,10.01,.026,.10,mat('linen','white'),'soap-bottle',16);
 const basket=(x,z,photo)=>{const basketMat=mat('woodDark','wood');cyl(x,.12,z,.105,.20,basketMat,'woven-basket',photo);for(let i=0;i<8;i++){const a=i*Math.PI/4;const n=cyl(x+Math.cos(a)*.105,.15,z+Math.sin(a)*.105,.009,.20,cloth,'basket-weave',photo);n.rotation.z=Math.cos(a)*.16;}};
 // Fotos 13, 16 e 17: toalhas são dobradas/roladas no vão aberto da bancada.
 const towels=(x,z,photo)=>{box(x,.16,z,.28,.10,.20,cloth,'folded-towel',photo);cyl(x+.12,.29,z,.055,.20,cloth,'rolled-towel',photo);box(x+.12,.29,z,.012,.028,.205,dark,'rolled-towel-band',photo);};
 // Cestos e roupas ficam no nicho inferior das bancadas, sem fechar o corredor ou a cuba.
 basket(.43,11.45,13);towels(.76,11.43,13);basket(10.33,11.42,16);towels(10.67,11.43,16);
 const sconce=(x,z,photo)=>{box(x,1.79,z,.13,.07,.08,dark,'sconce-base',photo);cyl(x,1.72,z,.035,.12,mat('light','white'),'sconce-lamp',photo);};
 sconce(.64,11.62,13);sconce(10.50,11.62,16);
 let triangles=0;for(const n of meshes){const g=n.geometry;triangles+=(g.index?g.index.count:g.getAttribute('position').count)/3;}
 return {meshes,triangles,budget:20000,withinBudget:triangles<=20000,evidence};
}
