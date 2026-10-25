export async function createMaterials(THREE,renderer,{mobile=false}={}){
 const asset=name=>new URL(`./assets/materials/${mobile?'mobile/':''}${name}?v=details-r2`,import.meta.url).href;
 const loader=new THREE.TextureLoader(),maxAnisotropy=Math.min(mobile?4:8,renderer.capabilities?.getMaxAnisotropy?.()??1);
 const load=async(name,{color=false,repeat=1}={})=>{const texture=await loader.loadAsync(asset(name));texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.anisotropy=maxAnisotropy;texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;return texture};
 // Dois mapas por vez limitam o pico de decodificação durante o carregamento.
 const [woodMap,woodNormal]=await Promise.all([load('fachada-madeira-diff.jpg',{color:true,repeat:2/1.7}),load('fachada-madeira-normal.jpg',{repeat:2/1.7})]);
 const [woodRoughness,stoneMap]=await Promise.all([load('fachada-madeira-rough.jpg',{repeat:2/1.7}),load('sandstone-diff.jpg',{color:true,repeat:1.4})]);
 const [stoneNormal,stoneRoughness]=await Promise.all([load('sandstone-normal.jpg',{repeat:1.4}),load('sandstone-rough.jpg',{repeat:1.4})]);
 const [roofMap,roofNormal]=await Promise.all([load('telha-diff.jpg',{color:true,repeat:2}),load('telha-normal.jpg',{repeat:2})]);
 // Amostra ajustada em metros do estudo, não medida do jardim. Evita ampliar
 // lâminas a dezenas de centímetros; UV das caixas é metro/2.
 const [grassMap,grassNormal]=await Promise.all([load('lawn-green-diff.webp',{color:true,repeat:2/1.4}),load('lawn-green-normal.jpg',{repeat:2/1.4})]);
 const grassRoughness=await load('lawn-green-rough.jpg',{repeat:2/1.4});
 const [plasterMap,plasterNormal]=await Promise.all([load('reboco-diff.jpg',{color:true,repeat:2}),load('reboco-normal.jpg',{repeat:2})]);
 const [pavingMap,pavingNormal]=await Promise.all([load('cascalho-diff.jpg',{color:true,repeat:2}),load('cascalho-normal.jpg',{repeat:2})]);
 const [tileMap,tileNormal]=await Promise.all([load('concreto-diff.jpg',{color:true,repeat:2/2.6}),load('concreto-normal.jpg',{repeat:2/2.6})]);
 const tileRough=await load('concreto-rough.jpg',{repeat:2/2.6});
 // A captura tem juntas diagonais; nas fotos06/11 elas acompanham as paredes.
 for(const t of[tileMap,tileNormal,tileRough])t.rotation=Math.PI/4;
 const [clothMap,clothNormal]=await Promise.all([load('tecido-diff.jpg',{color:true,repeat:2/.2707}),load('tecido-normal.jpg',{repeat:2/.2707})]);
 const [basinMap,basinNormal]=await Promise.all([load('cuba-diff.jpg',{color:true,repeat:1}),load('cuba-normal.jpg',{repeat:1})]);
 const clothRough=await load('tecido-rough.jpg',{repeat:2/.2707});
 const [graniteMap,graniteNormal]=await Promise.all([load('granito-diff.jpg',{color:true,repeat:2/3.8}),load('granito-normal.jpg',{repeat:2/3.8})]);
 const graniteRough=await load('granito-rough.jpg',{repeat:2/3.8});
 // PBRs contínuos de madeira maciça. UV das caixas é metro/2, portanto 2/m.
 const [furnitureMap,furnitureNormal]=await Promise.all([load('movel-madeira-diff.jpg',{color:true,repeat:2/1.83}),load('movel-madeira-normal.jpg',{repeat:2/1.83})]);
 const furnitureRough=await load('movel-madeira-rough.jpg',{repeat:2/1.83});
 const [timberMap,timberNormal]=await Promise.all([load('viga-madeira-diff.jpg',{color:true,repeat:2}),load('viga-madeira-normal.jpg',{repeat:2})]);
 const timberRough=await load('viga-madeira-rough.jpg',{repeat:2});
 const standard=(options)=>new THREE.MeshStandardMaterial(options),neutral=(color,roughness=.8,extra={})=>standard({color,roughness,...extra});
 const fabric=color=>new THREE.MeshPhysicalMaterial({color,map:clothMap,normalMap:clothNormal,normalScale:new THREE.Vector2(.22,.22),roughnessMap:clothRough,roughness:1,sheen:.18,sheenRoughness:.92,sheenColor:new THREE.Color(color),specularIntensity:.65});
 // Poly Haven wood_floor: 1,7 m por repetição, com grão/normal/rugosidade
 // da mesma captura. Seleção aproximada pelas fotos06/14, não material medido.
 const wood=()=>standard({color:0xffffff,map:woodMap,normalMap:woodNormal,roughnessMap:woodRoughness,roughness:.82,metalness:0});
 const tile=()=>standard({color:0xffffff,map:tileMap,normalMap:tileNormal,roughnessMap:tileRough,roughness:.66});
 // Fotos 06/07: madeira usada, castanha e quente; o PBR preserva os veios,
 // sem forçar preto puro nem trocar os conjuntos de mapas já rastreados.
 const furnitureWood=()=>standard({color:0x79513a,map:furnitureMap,normalMap:furnitureNormal,normalScale:new THREE.Vector2(.42,.42),roughnessMap:furnitureRough,roughness:.58,metalness:0});
 const timber=()=>standard({color:0x8b5a32,map:timberMap,normalMap:timberNormal,normalScale:new THREE.Vector2(.32,.32),roughnessMap:timberRough,roughness:.74,metalness:0});
 return {
  graniteWall:standard({color:0xf0eee5,map:graniteMap,normalMap:graniteNormal,normalScale:new THREE.Vector2(.28,.28),roughnessMap:graniteRough,roughness:1,metalness:0}),
  fabricTaupe:fabric(0xb7a58e),fabricGrey:fabric(0x94918b),fabricWhite:fabric(0xece9dd),ceramic:neutral(0xf4f2ec,.22),stainless:neutral(0xb1b5b8,.24,{metalness:.88}),basinStone:standard({color:0xc2bdb5,map:basinMap,normalMap:basinNormal,normalScale:new THREE.Vector2(.11,.11),roughness:.48}),
  stone:standard({color:0xffffff,map:stoneMap,normalMap:stoneNormal,roughnessMap:stoneRoughness,roughness:.9,metalness:0}),wood:wood(),deck:wood(),furnitureWood:furnitureWood(),timber:timber(),tile:tile(),roof:standard({color:0xffffff,map:roofMap,normalMap:roofNormal,roughness:.88}),grass:standard({color:0xb2c8a1,map:grassMap,normalMap:grassNormal,normalScale:new THREE.Vector2(.38,.38),roughnessMap:grassRoughness,roughness:.96}),plaster:standard({color:0xffffff,map:plasterMap,normalMap:plasterNormal,roughness:.92}),linen:fabric(0xd8cdbc),white:neutral(0xffffff,.8),woodDark:timber(),metal:neutral(0x292929,.38,{metalness:.65}),black:neutral(0x171717,.28),glass:neutral(0x4e6b69,.10,{transparent:true,opacity:.57,depthWrite:false,metalness:.15}),mirror:neutral(0xb9cbd0,.14,{metalness:.75}),light:neutral(0xffe3b2,.6,{emissive:0xffc56b,emissiveIntensity:2}),paving:standard({color:0xffffff,map:pavingMap,normalMap:pavingNormal,roughness:.9})
 };
}
