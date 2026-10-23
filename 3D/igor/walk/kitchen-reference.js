// Cozinha das fotos 06/07. X/Z são coordenadas lógicas: o runtime aplica .78 nos dois eixos.
export const kitchenObstacles=[
 {id:'kitchen-main-base',rect:[4.90,4.95,5.70,8.85]},
 {id:'kitchen-return-base',rect:[3.95,8.05,4.90,8.85]},
 {id:'kitchen-fridge',rect:[4.85,3.98,5.70,4.85]}
];

export function buildKitchenReference(THREE,scene,M){
 const meshes=[],evidence={photos:[6,7],estimated:true,notes:['L de pedra preta, estrutura bege e madeira escura observados','profundidade lógica .80 m será calibrada em X/Z pelo runtime']};
 const material=(name,fallback='white')=>M[name]||M[fallback]||new THREE.MeshStandardMaterial({color:0xffffff});
 const tri=g=>(g.index?g.index.count:g.getAttribute('position').count)/3;
 const add=(g,m,x,y,z,piece,photo=7)=>{if(!g.getAttribute('normal'))g.computeVertexNormals();if(!g.getAttribute('uv'))throw new Error(`PNU ausente: ${piece}`);const n=new THREE.Mesh(g,m);n.name=`kitchen-${piece}`;n.position.set(x,y,z);n.castShadow=n.receiveShadow=true;n.userData={detail:'kitchen',piece,sourcePhoto:photo};scene.add(n);meshes.push(n);return n;};
 const box=(x,y,z,w,h,d,m,p,photo=7)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,p,photo);
 const cyl=(x,y,z,r,h,m,p,photo=7,segments=16)=>add(new THREE.CylinderGeometry(r,r,h,segments),m,x,y,z,p,photo);
 const tube=(points,r,m,p,photo=7)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),24,r,7,false),m,0,0,0,p,photo);
 const bevel=(x,y,z,w,h,d,m,p,r=.025,photo=7)=>{const q=Math.min(r,w*.22,h*.22,d*.22),g=new THREE.BoxGeometry(w,h,d,6,6,6),a=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,half=[w/2,h/2,d/2];for(let i=0;i<a.count;i++){const v=[a.getX(i),a.getY(i),a.getZ(i)],inside=v.map((v,k)=>Math.max(-half[k]+q,Math.min(half[k]-q,v))),normal=new THREE.Vector3(...v.map((v,k)=>v-inside[k])).normalize();a.setXYZ(i,...inside.map((v,k)=>v+normal.getComponent(k)*q));n.setXYZ(i,normal.x,normal.y,normal.z);u.setXY(i,(Math.abs(normal.x)>.5?v[2]:v[0])/2,(Math.abs(normal.y)>.5?v[2]:v[1])/2);}return add(g,m,x,y,z,p,photo);};
 const wood=()=>{const base=material('wood','woodDark'),m=base.clone?.()||base;if(m.color?.multiply)m.color.multiply(new THREE.Color(.42,.31,.24));if(m.map?.clone){m.map=m.map.clone();m.map.repeat.set(1,3.15);m.map.needsUpdate=true;}m.userData={...m.userData,grain:'vertical'};return m;};
 const black=material('black','metal'),metal=material('metal','black'),beige=material('plaster','stone'),darkWood=wood(),white=material('white'),surface=.9275;
 // Uma só superfície em L e um único furo elíptico: o tampo fica contínuo em torno da cuba.
 const l=new THREE.Shape();l.moveTo(4.90,-4.95);l.lineTo(5.70,-4.95);l.lineTo(5.70,-8.85);l.lineTo(3.95,-8.85);l.lineTo(3.95,-8.05);l.lineTo(4.90,-8.05);l.closePath();
 const hole=new THREE.Path();hole.absellipse(5.30,-5.65,.19,.245,0,Math.PI*2,true);l.holes.push(hole);
 const topGeo=new THREE.ExtrudeGeometry(l,{depth:.055,bevelEnabled:false,curveSegments:28});topGeo.rotateX(-Math.PI/2);const uv=topGeo.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2,uv.getY(i)/2);add(topGeo,black,0,.8725,0,'continuous-L-countertop');
 // Bandas e caixas segmentadas no vão da cuba: nada fecha sua cavidade por baixo.
 const run=(z,len,tag)=>{box(5.30,.815,z,.80,.145,len,beige,`${tag}-beige-fascia`);box(5.30,.415,z,.70,.76,len,darkWood,`${tag}-cabinet-case`);};
 run(5.145,.39,'front-run');run(7.385,2.93,'back-run');box(4.425,.815,8.45,.95,.145,.80,beige,'return-beige-fascia');box(4.425,.415,8.45,.85,.76,.70,darkWood,'return-cabinet-case');
 const archedHandle=(points,p)=>tube(points,.014,metal,p);
 const mainDoor=(z,len)=>{bevel(4.925,.43,z,.030,.65,len-.035,darkWood,'main-door',.009);for(const dz of[-len/2+.018,len/2-.018])box(4.897,.43,z+dz,.016,.60,.022,darkWood,'main-door-stile');for(const y of[.15,.71])box(4.897,y,z,.016,.025,len,darkWood,'main-door-rail');archedHandle([[4.885,.35,z-.08],[4.865,.37,z-.08],[4.865,.49,z-.08],[4.885,.51,z-.08]],'main-curved-handle');};
 mainDoor(5.12,.34);mainDoor(5.46,.24);mainDoor(5.79,.24);mainDoor(6.35,.56);mainDoor(7.72,.64);mainDoor(8.47,.58);
 for(let i=0;i<4;i++){const y=.19+i*.145;bevel(4.91,y,7.15,.034,.115,.38,darkWood,'central-drawer',.008);archedHandle([[4.882,y-.028,7.02],[4.863,y-.010,7.02],[4.863,y+.030,7.02],[4.882,y+.048,7.02]],'drawer-curved-handle');}
 for(const x of[4.10,4.40,4.68]){bevel(x,.43,8.075,.26,.65,.030,darkWood,'return-door',.009);for(const dx of[-.105,.105])box(x+dx,.43,8.043,.020,.60,.016,darkWood,'return-door-stile');for(const y of[.15,.71])box(x,y,8.043,.26,.025,.016,darkWood,'return-door-rail');archedHandle([[x-.06,.35,8.035],[x-.06,.37,8.015],[x+.06,.37,8.015],[x+.06,.35,8.035]],'return-curved-handle');}
 // Cuba côncava contínua, aberta pelo furo do tampo e com normais voltadas à água.
 const bowlGeo=new THREE.SphereGeometry(1,32,16,0,Math.PI*2,Math.PI/2,Math.PI/2),index=bowlGeo.index.array;for(let i=0;i<index.length;i+=3){const t=index[i+1];index[i+1]=index[i+2];index[i+2]=t;}const normals=bowlGeo.getAttribute('normal');for(let i=0;i<normals.count;i++)normals.setXYZ(i,-normals.getX(i),-normals.getY(i),-normals.getZ(i));
 const bowl=add(bowlGeo,material('stainless','metal'),5.30,surface+.006,5.65,'concave-sink-bowl');bowl.scale.set(.172,.185,.225);const rimPoints=Array.from({length:33},(_,i)=>{const a=i/32*Math.PI*2;return new THREE.Vector3(5.30+Math.cos(a)*.19,surface+.008,5.65+Math.sin(a)*.245)}),r=add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints,true),48,.012,7,true),material('stainless','metal'),0,0,0,'sink-rim');cyl(5.30,.747,5.65,.022,.008,black,'sink-drain');
 tube([[5.55,surface,5.84],[5.55,1.19,5.84],[5.48,1.28,5.76],[5.31,1.17,5.65]],.021,black,'black-gooseneck-faucet');cyl(5.55,.978,5.84,.038,.10,black,'faucet-base');
 bevel(5.40,.947,5.98,.31,.025,.18,metal,'dish-drainer',.006);for(let i=0;i<6;i++)box(5.28+i*.048,.977,5.98,.010,.045,.16,metal,'drainer-rail');
 bevel(5.30,.949,7.10,.48,.043,.56,black,'cooktop',.010);for(const dx of[-.13,.13])for(const dz of[-.17,.17]){cyl(5.30+dx,.978,7.10+dz,.075,.014,metal,'cooktop-burner');cyl(5.30+dx,.988,7.10+dz,.047,.012,black,'cooktop-burner-cap');for(const s of[-1,1]){box(5.30+dx+s*.072,.994,7.10+dz,.012,.018,.17,metal,'cooktop-support');box(5.30+dx,.994,7.10+dz+s*.072,.17,.018,.012,metal,'cooktop-support');}}for(const z of[6.91,7.03,7.15,7.27])cyl(5.04,.977,z,.021,.022,black,'cooktop-knob');
 // Aparelhos com base exata em y=.9275 e frentes voltadas para X negativo (corredor).
 const appliance=(x,z,w,h,d,p)=>bevel(x,surface+h/2,z,w,h,d,black,p,.026);
 appliance(5.30,6.18,.23,.28,.25,'airfryer');box(5.172,1.065,6.18,.012,.11,.14,material('glass','black'),'airfryer-front');archedHandle([[5.156,1.03,6.13],[5.145,1.05,6.13],[5.145,1.10,6.13],[5.156,1.12,6.13]],'airfryer-grip');
 appliance(5.31,6.43,.18,.25,.18,'coffee-maker');cyl(5.205,1.095,6.43,.032,.13,metal,'coffee-spout');cyl(5.18,.985,6.43,.042,.105,material('ceramic','white'),'coffee-cup');archedHandle([[5.16,1.00,6.47],[5.145,1.015,6.50],[5.145,.965,6.50],[5.16,.955,6.47]],'coffee-cup-handle');
 appliance(5.31,6.65,.22,.18,.19,'toaster');for(const z of[6.60,6.68])box(5.31,1.020,z,.15,.008,.016,black,'toaster-slot');
 bevel(5.30,surface+.15,8.35,.47,.30,.32,black,'microwave',.025);box(5.052,1.075,8.32,.014,.215,.190,material('glass','black'),'microwave-window');for(const z of[8.215,8.425])box(5.043,1.075,z,.008,.270,.010,metal,'microwave-frame-bar');for(const y of[.935,1.215])box(5.043,y,8.32,.008,.010,.220,metal,'microwave-frame-bar');archedHandle([[5.026,.985,8.42],[5.010,1.00,8.42],[5.010,1.15,8.42],[5.026,1.17,8.42]],'microwave-handle');for(const y of[1.02,1.13]){const k=cyl(5.026,y,8.49,.021,.014,metal,'microwave-knob');k.rotation.z=Math.PI/2;}
 bevel(5.30,1.48,6.49,.42,.035,.20,darkWood,'appliance-shelf',.008);box(5.67,1.41,6.49,.035,.16,.20,darkWood,'shelf-backer');for(const z of[6.40,6.58]){const b=box(5.58,1.405,z,.15,.025,.025,metal,'shelf-triangle-bracket');b.rotation.z=Math.PI/4;}
 // Nichos de três colunas no fundo, com objetos físicos; nunca uma fileira sobre a pia.
 box(4.825,1.50,8.885,1.75,.72,.035,beige,'back-niche-recess',6);for(const y of[1.18,1.50,1.82])box(4.825,y,8.82,1.75,.035,.19,beige,'back-niche-shelf',6);for(const x of[4.25,4.83,5.40])box(x,1.50,8.81,.028,.66,.18,beige,'back-niche-divider',6);
 const cupGeometry=()=>new THREE.LatheGeometry([new THREE.Vector2(0,-.045),new THREE.Vector2(.028,-.060),new THREE.Vector2(.041,-.045),new THREE.Vector2(.041,.040),new THREE.Vector2(.032,.057),new THREE.Vector2(.024,.057),new THREE.Vector2(.024,-.026),new THREE.Vector2(0,-.026)],18);
 for(const x of[4.08,4.18,4.48,4.58,5.00,5.10]){add(cupGeometry(),material('ceramic','white'),x,1.2575,8.78,'niche-cup',6);tube([[x+.035,1.2925,8.78],[x+.066,1.2975,8.78],[x+.066,1.2275,8.78],[x+.035,1.2225,8.78]],.006,material('ceramic','white'),'niche-cup-handle',6);}
 bevel(5.35,1.205,8.71,.30,.018,.16,wood(),'flat-cutting-board',.018,6);
 // Tomadas com três furos e parafuso. Geladeira preserva puxador vertical visível no corredor.
 const outlet=(z,p)=>{box(5.686,1.18,z,.012,.115,.12,white,p);for(const[dy,dz]of[[.022,-.020],[-.022,-.020],[0,.024]]){const pin=cyl(5.677,1.18+dy,z+dz,.009,.008,black,'outlet-pin');pin.rotation.z=Math.PI/2;}const screw=cyl(5.676,1.225,z,.008,.008,metal,'outlet-screw');screw.rotation.z=Math.PI/2;};outlet(5.96,'wall-outlet-sink');outlet(8.08,'wall-outlet-microwave');
 bevel(5.275,1.05,4.415,.75,2.10,.80,metal,'fridge',.065);box(4.892,1.05,4.415,.016,1.94,.70,black,'fridge-door-seam');box(4.872,1.06,4.18,.020,1.64,.035,material('woodDark','wood'),'fridge-vertical-handle');
 const triangles=meshes.reduce((sum,m)=>sum+tri(m.geometry),0);return {meshes,triangles,budget:45000,withinBudget:triangles<=45000,evidence};
}
