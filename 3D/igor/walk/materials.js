export async function createMaterials(THREE,renderer,{mobile=false}={}){
 const asset=name=>new URL(`./assets/materials/${mobile?'mobile/':''}${name}`,import.meta.url).href;
 const loader=new THREE.TextureLoader(),maxAnisotropy=Math.min(4,renderer.capabilities?.getMaxAnisotropy?.()??1);
 const load=async(name,{color=false,repeat=1}={})=>{const texture=await loader.loadAsync(asset(name));texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.anisotropy=maxAnisotropy;texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;return texture};
 // Dois mapas por vez limitam o pico de decodificação durante o carregamento.
 const [woodMap,woodNormal]=await Promise.all([load('fachada-madeira-diff.jpg',{color:true,repeat:.5}),load('fachada-madeira-normal.jpg',{repeat:.5})]);
 const [woodRoughness,stoneMap]=await Promise.all([load('fachada-madeira-rough.jpg',{repeat:.5}),load('sandstone-diff.jpg',{color:true,repeat:1.4})]);
 const [stoneNormal,stoneRoughness]=await Promise.all([load('sandstone-normal.jpg',{repeat:1.4}),load('sandstone-rough.jpg',{repeat:1.4})]);
 const [roofMap,roofNormal]=await Promise.all([load('telha-diff.jpg',{color:true,repeat:2}),load('telha-normal.jpg',{repeat:2})]);
 // A captura original cobre ~25 m: repetir a cada 66 cm apagava toda variação.
 const [grassMap,grassNormal]=await Promise.all([load('prado-diff.jpg',{color:true,repeat:.08}),load('prado-normal.jpg',{repeat:.08})]);
 const [plasterMap,plasterNormal]=await Promise.all([load('reboco-diff.jpg',{color:true,repeat:2}),load('reboco-normal.jpg',{repeat:2})]);
 const [pavingMap,pavingNormal]=await Promise.all([load('cascalho-diff.jpg',{color:true,repeat:2}),load('cascalho-normal.jpg',{repeat:2})]);
 const [tileMap,tileNormal]=await Promise.all([load('concreto-diff.jpg',{color:true,repeat:2}),load('concreto-normal.jpg',{repeat:2})]);
 const standard=(options)=>new THREE.MeshStandardMaterial(options),neutral=(color,roughness=.8,extra={})=>standard({color,roughness,...extra});
 const wood=()=>standard({color:0xffffff,map:woodMap,normalMap:woodNormal,roughnessMap:woodRoughness,roughness:.95,metalness:0});
 return {
  stone:standard({color:0xffffff,map:stoneMap,normalMap:stoneNormal,roughnessMap:stoneRoughness,roughness:.9,metalness:0}),wood:wood(),deck:wood(),tile:standard({color:0xffffff,map:tileMap,normalMap:tileNormal,roughness:.66}),roof:standard({color:0xffffff,map:roofMap,normalMap:roofNormal,roughness:.88}),grass:standard({color:0x97bc7b,map:grassMap,normalMap:grassNormal,roughness:1}),plaster:standard({color:0xffffff,map:plasterMap,normalMap:plasterNormal,roughness:.92}),linen:neutral(0xd8cdbc,.94),white:neutral(0xffffff,.8),woodDark:neutral(0x4b3528,.62),metal:neutral(0x292929,.38,{metalness:.65}),black:neutral(0x171717,.28),glass:neutral(0x4e6b69,.10,{transparent:true,opacity:.57,depthWrite:false,metalness:.15}),mirror:neutral(0xb9cbd0,.14,{metalness:.75}),light:neutral(0xffe3b2,.6,{emissive:0xffc56b,emissiveIntensity:2}),paving:standard({color:0xffffff,map:pavingMap,normalMap:pavingNormal,roughness:.9})
 };
}
