// Formas observadas nas fotos06/11/15. Dimensões/implantação são estimativas.
// Sem criar cômodos ou esconder vãos para encaixar a decoração.
export const observedObstacles=[[8.85,11.18,9.60,11.84]];
export const detailEvidence={kitchen:{photos:[6,7,8],observed:['cooktop','micro-ondas','cafeteira','torradeira','nichos','portas de madeira']},bedroom:{photos:[15],observed:['armário de madeira','ar-condicionado','toalhas','arandelas']},pendants:{photos:[1,10,11],observed:['cúpula trançada','lâmpadas pendentes']},classification:'formas derivadas; coordenadas, dimensões e ligações estimadas'};
export function buildObservedDetails(T,scene,M,{includeLegacyKitchen=false}={}){
 const meshes=[],add=(g,m,x,y,z,name,rot=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.rotation.y=rot;o.name=name;o.castShadow=o.receiveShadow=true;o.userData.observedDetail=name;scene.add(o);meshes.push(o);return o;};
 const box=(x,y,z,w,h,d,m,name,rot=0)=>{const g=new T.BoxGeometry(w,h,d),p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2);return add(g,m,x,y,z,name,rot);};
 const bevel=(x,y,z,w,h,d,m,name,r=.012)=>{const g=new T.BoxGeometry(w,h,d,6,6,6),p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,q=Math.min(r,w*.22,h*.22,d*.22),half=[w/2,h/2,d/2];for(let i=0;i<p.count;i++){const v=[p.getX(i),p.getY(i),p.getZ(i)],inset=v.map((v,k)=>Math.max(-half[k]+q,Math.min(half[k]-q,v))),vnorm=new T.Vector3(...v.map((v,k)=>v-inset[k])).normalize();p.setXYZ(i,...inset.map((v,k)=>v+vnorm.getComponent(k)*q));n.setXYZ(i,vnorm.x,vnorm.y,vnorm.z);u.setXY(i,(Math.abs(vnorm.x)>.5?v[2]:v[0])/2,(Math.abs(vnorm.y)>.5?v[2]:v[1])/2);}return add(g,m,x,y,z,name);};
 const cyl=(x,y,z,r,h,m,name,seg=20)=>add(new T.CylinderGeometry(r,r,h,seg),m,x,y,z,name);
 const tube=(points,r,m,name,seg=18)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),seg,r,5,false),m,0,0,0,name);
 const steel=M.stainless||M.metal,black=M.black,wood=M.wood,dark=M.woodDark;
 // Referência antiga preservada apenas para comparação; a cozinha integrada
 // vigente é kitchen-reference.js, nunca desenhar os dois conjuntos juntos.
 if(includeLegacyKitchen){
 box(5.30,.928,6.31,.50,.045,.51,black,'cooktop');
 for(const x of[5.16,5.44])for(const z of[6.17,6.44]){cyl(x,.958,z,.075,.020,steel,'burner');cyl(x,.970,z,.048,.014,black,'burner-cap');for(const sign of[-1,1]){box(x+sign*.075,.988,z,.014,.02,.18,M.metal,'burner-support');box(x,.988,z+sign*.075,.18,.02,.014,M.metal,'burner-support');}}
 for(const z of[6.08,6.23,6.38,6.53])cyl(5.04,.964,z,.025,.028,black,'cooktop-knob',12);
 // Micro-ondas voltado para o corredor. Porta escura, aro, puxador e comandos.
 bevel(5.30,1.105,6.91,.48,.35,.55,black,'microwave-body',.025);
 box(5.052,1.105,6.88,.018,.28,.39,M.metal,'microwave-frame');box(5.041,1.105,6.88,.012,.22,.33,black,'microwave-window');
 tube([[5.018,1.00,7.07],[4.995,1.02,7.07],[4.995,1.18,7.07],[5.018,1.20,7.07]],.009,steel,'microwave-handle');
 for(const y of[1.04,1.17]){const knob=cyl(5.035,y,7.13,.024,.018,steel,'microwave-knob',14);knob.rotation.z=Math.PI/2;}
 // Pequenos aparelhos no trecho livre, além da cuba existente (z≈7.81).
 bevel(5.34,1.07,8.55,.28,.34,.31,black,'coffee-machine',.035);box(5.19,.94,8.55,.08,.025,.23,M.metal,'coffee-tray');
 cyl(5.17,1.01,8.55,.045,.11,M.ceramic||M.white,'coffee-cup');tube([[5.17,1.03,8.59],[5.17,1.04,8.64],[5.17,.98,8.64],[5.17,.97,8.59]],.007,M.white,'coffee-cup-handle',10);
 bevel(5.28,1.02,8.28,.26,.22,.20,steel,'toaster',.045);for(const z of[8.23,8.33])box(5.28,1.132,z,.18,.008,.018,black,'toaster-slot');
 // Reposicionamento no footprint compartilhado com a colisão; nenhum anexo
 // de bancada cruza a porta lateral. Cuba fica em z7.44 e permanece livre.
 for(const m of meshes){if(m.name.startsWith('cooktop')||m.name.startsWith('burner'))m.position.z+=.69;else if(m.name.startsWith('microwave'))m.position.z+=1.59;else if(m.name.startsWith('coffee'))m.position.z-=.60;else if(m.name.startsWith('toaster')){m.position.y+=.63;m.position.z-=.10;}}
 box(5.36,1.53,8.18,.48,.045,.36,wood,'appliance-shelf');
 // Nichos: fundo, prateleiras e divisórias, não frascos suspensos na parede.
 box(5.70,1.90,8.08,.07,.82,1.64,M.plaster,'kitchen-niche-back');
 for(const h of[1.50,1.91,2.32])box(5.47,h,8.08,.50,.055,1.64,M.plaster,'kitchen-niche-shelf');
 for(const z of[7.26,7.82,8.37,8.90])box(5.47,2.10,z,.50,.38,.05,M.plaster,'kitchen-niche-divider');
 for(let i=0;i<8;i++){const z=7.40+i*.18;cyl(5.34,2.01,z,.045,.14,i%3?M.ceramic||M.white:M.metal,'storage-jar',14);cyl(5.34,2.09,z,.047,.018,wood,'jar-lid',14);}
 }
 // Armário de duas portas ripadas e ferragens da foto15.
 box(9.225,1.15,11.52,.75,2.30,.64,wood,'bedroom-cupboard');
 for(const x of[9.04,9.41]){box(x,1.17,11.182,.345,2.10,.045,dark,'cupboard-door-frame');for(let i=0;i<12;i++)box(x,.20+i*.17,11.15,.302,.158,.025,wood,'cupboard-slat');}
 for(const x of[9.18,9.27])tube([[x,1.01,11.126],[x,1.04,11.100],[x,1.16,11.100],[x,1.19,11.126]],.009,M.metal,'cupboard-handle');
 const ac=bevel(5.98,2.40,11.05,.95,.29,.25,M.ceramic||M.white,'bedroom-ac',.035);ac.rotation.y=Math.PI/2;for(let i=0;i<4;i++)box(6.114,2.29+i*.021,11.05,.014,.008,.81,M.metal,'ac-vent');
 // Toalhas sobre a cama, enroladas e apoiadas. Sem mudar o volume da cama.
 const towel=M.fabricWhite||M.white;
 for(const [x,y,z,r,l]of[[7.50,.61,11.10,.075,.30],[7.50,.75,11.12,.065,.27]]){const roll=cyl(x,y,z,r,l,towel,'bed-towel-roll',24);roll.rotation.z=Math.PI/2;const coil=new T.TorusGeometry(r*.82,.008,5,24),end=add(coil,towel,x+l/2+.002,y,z,'towel-edge');end.rotation.y=Math.PI/2;}
 box(5.99,1.75,11.05,.20,.07,.75,wood,'bedroom-shelf');cyl(6.015,1.87,11.05,.055,.17,M.basinStone||M.stone,'bedroom-vase');
 // Cúpulas de fibras: estrutura curva vazada, interior iluminado e fios reais.
 const fiber=(M.linen||wood).clone();fiber.color.set(0x8f774e);fiber.side=T.DoubleSide;
 for(const [x,y,z,r]of[[2.5,2.38,2.2,.32],[2.9,5.18,2.2,.34]]){
  const profile=[[.10,.26],[.17,.22],[r*.85,.06],[r,-.16]];
  for(let i=0;i<28;i++){const a=i*Math.PI/14;tube(profile.map(([rr,yy])=>[x+Math.cos(a)*rr,y+yy,z+Math.sin(a)*rr]),.006,fiber,'woven-pendant-rib',10);}
  for(let j=0;j<9;j++){const h=.22-j*.045,rr=.17+(r-.17)*j/8;const ring=add(new T.TorusGeometry(rr,.0045,4,32),fiber,x,y+h,z,'woven-pendant-ring');ring.rotation.x=Math.PI/2;}
  const bulb=add(new T.SphereGeometry(.045,12,8),M.light,x,y-.07,z,'pendant-bulb');bulb.scale.y=1.25;
  cyl(x,y+.43,z,.007,.34,black,'pendant-cable',8);
 }
 const triangles=meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0);
 return {meshes,triangles,evidence:detailEvidence,budget:23000,withinBudget:triangles<=23000};
}
