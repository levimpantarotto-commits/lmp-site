// Reconcile only moved furniture, after the visual scene has been constructed.
// Floor union, wall footprints, scale and the source door controllers are kept.
export function applyMasterNavigation(manifest,{furniture,exteriorObstacles,scale,planX,planZ,facadeAxis}){
 if(!Array.isArray(manifest.footprints)||!manifest.footprints.length)throw Error('Mestre sem circulação reconciliada');
 const inverse=(f,value)=>{let lo=-100,hi=100;for(let i=0;i<55;i++){const m=(lo+hi)/2;if(f(m)<value)lo=m;else hi=m;}return(lo+hi)/2;};
 const changes=manifest.footprints.map(f=>{const [[x0,x1],[y0,y1]]=f.bounds;if(![x0,x1,y0,y1].every(Number.isFinite))throw Error('Footprint inválido');return{id:f.id,rect:[inverse(planX,planX(facadeAxis)-x1/scale),inverse(planZ,-y1/scale),inverse(planX,planX(facadeAxis)-x0/scale),inverse(planZ,-y0/scale)],level:0,kind:'master-footprint'};});
 for(const f of changes){const old=furniture.find(o=>o.id===f.id);if(old)old.rect=f.rect;else furniture.push(f);}
 const table=furniture.find(f=>f.id==='mesa'),source=manifest.footprints.find(f=>f.id==='mesa');
 if(table&&source){const [[x0,x1],[z0,z1]]=source.bounds,cx=(x0+x1)/2,cz=(z0+z1)/2,rx=(x1-x0)/2,rz=(z1-z0)/2;table.footprintShape='ellipse';table.containsPoint=(x,z,pad=0)=>{const wx=(planX(facadeAxis)-planX(x))*scale,wz=-planZ(z)*scale,margin=pad*scale;return ((wx-cx)/(rx+margin))**2+((wz-cz)/(rz+margin))**2<1;};}
 // Three original dining-chair collision rectangles, replaced by the same
 // chairs' actual bounds from the Blender derivative.
 const expected=[[2.44,6.48,2.86,6.92],[3.39,5.48,3.81,5.92],[3.39,7.48,3.81,7.92]];
 if(JSON.stringify(exteriorObstacles.slice(0,3))!==JSON.stringify(expected))throw Error('Colisores anteriores alterados');
 exteriorObstacles.splice(0,3);return{updated:changes.map(f=>f.id),sourceMaster:manifest.masterSHA256};
}
