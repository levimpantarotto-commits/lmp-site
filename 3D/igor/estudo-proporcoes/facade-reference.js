// Evidência visual: fotos originais 03/04/05 do anúncio ~202.
// Contagem/forma visíveis são observadas; coordenadas continuam estimadas.
export const facadeEvidence={
 upperFront:{photo:4,sashes:4,confidence:'observed'},
 sideWindows:{photo:5,count:2,confidence:'observed'},
 wingEntrance:{photo:5,recess:1.45,confidence:'recess-observed-depth-estimated'},
 lateralUse:{photo:3,confidence:'unknown',bedroomConfirmed:false}
};
export function applyObservedFacade(rooms,floorAreas,walls,furniture){
 const lateral=rooms.find(r=>r.id==='quarto14');
 Object.assign(lateral,{name:'Ala lateral',note:'Uso interno não confirmado. Recuo visível; profundidade estimada.',kind:'INTERIOR NÃO CONFIRMADO',photo:5,rect:[5.8,1.45,9.8,8]});
 const bed=furniture.findIndex(f=>f.id==='cama14');if(bed>=0)furniture.splice(bed,1);
 const upperFront=walls[21].openings[0];Object.assign(upperFront,{panels:4,frameWidth:.085});
 walls[0].materialRanges=[{from:0,to:2.6,material:'stone'},{from:2.6,to:5.8,material:'plaster'}];
 // Duas aberturas laterais visíveis na foto05, não uma fachada cega.
 walls[23].openings=[{from:.16,to:1.15,bottom:1.2,top:2.65,type:'window',panels:1,frameWidth:.075},{from:2.55,to:3.52,bottom:1.05,top:2.65,type:'window',panels:1}];
 // Um pano lateral inteiro de vidro não é sustentado pela foto04.
 walls[22].openings=[{from:.15,to:1.05,bottom:.65,top:2.65,type:'window',panels:1}];
 const entry=walls[10];entry.a=[5.8,facadeEvidence.wingEntrance.recess];entry.b=[9.8,facadeEvidence.wingEntrance.recess];
 entry.openings=[{from:.72,to:3.07,bottom:0,top:2.45,type:'door',style:'glazed-timber',initialOpen:false}];
 const wing=floorAreas.find(f=>f.level===0&&f.rect.join(',')==='5.8,0,9.8,12');wing.rect=[5.8,1.45,9.8,12];
 floorAreas.push({rect:[5.8,0,9.8,1.45],level:0,material:'paving'});
 // A porta recuada recebe seu pórtico existente, sem janela falsa na frente.
 walls[11].openings=[];
}
