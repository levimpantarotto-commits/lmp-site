export async function createMaterials(THREE,renderer,{mobile=false}={}){
 const asset=name=>new URL(`./assets/materials/${mobile?'mobile/':''}${name}?v=interior-r1`,import.meta.url).href;
 const loader=new THREE.TextureLoader(),maxAnisotropy=Math.min(mobile?4:8,renderer.capabilities?.getMaxAnisotropy?.()??1);
 const load=async(name,{color=false,repeat=1}={})=>{const texture=await loader.loadAsync(asset(name));texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeat,repeat);texture.anisotropy=maxAnisotropy;texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;return texture};
 // Dois mapas por vez limitam o pico de decodificação durante o carregamento.
 const [woodMap,woodNormal]=await Promise.all([load('fachada-madeira-diff.jpg',{color:true,repeat:2/1.7}),load('fachada-madeira-normal.jpg',{repeat:2/1.7})]);
 const [woodRoughness,stoneMap]=await Promise.all([load('fachada-madeira-rough.jpg',{repeat:2/1.7}),load('sandstone-diff.jpg',{color:true,repeat:1.4})]);
 const [stoneNormal,stoneRoughness]=await Promise.all([load('sandstone-normal.jpg',{repeat:1.4}),load('sandstone-rough.jpg',{repeat:1.4})]);
 const [roofMap,roofNormal]=await Promise.all([load('telha-diff.jpg',{color:true,repeat:2}),load('telha-normal.jpg',{repeat:2})]);
 // Amostra ajustada em metros do estudo, não medida do jardim. Evita ampliar
 // lâminas a dezenas de centímetros; UV das caixas é metro/2.
 const [grassMap,grassNormal]=await Promise.all([load('prado-diff.jpg',{color:true,repeat:.8}),load('prado-normal.jpg',{repeat:.8})]);
 const [plasterMap,plasterNormal]=await Promise.all([load('reboco-diff.jpg',{color:true,repeat:2}),load('reboco-normal.jpg',{repeat:2})]);
 const [pavingMap,pavingNormal]=await Promise.all([load('cascalho-diff.jpg',{color:true,repeat:2}),load('cascalho-normal.jpg',{repeat:2})]);
 const [tileMap,tileNormal]=await Promise.all([load('concreto-diff.jpg',{color:true,repeat:2}),load('concreto-normal.jpg',{repeat:2})]);
 const [clothMap,clothNormal]=await Promise.all([load('tecido-diff.jpg',{color:true,repeat:2/.2707}),load('tecido-normal.jpg',{repeat:2/.2707})]);
 const [basinMap,basinNormal]=await Promise.all([load('cuba-diff.jpg',{color:true,repeat:1}),load('cuba-normal.jpg',{repeat:1})]);
 const clothRough=await load('tecido-rough.jpg',{repeat:2/.2707});
 const standard=(options)=>new THREE.MeshStandardMaterial(options),neutral=(color,roughness=.8,extra={})=>standard({color,roughness,...extra});
 const fabric=color=>new THREE.MeshPhysicalMaterial({color,map:clothMap,normalMap:clothNormal,normalScale:new THREE.Vector2(.16,.16),roughnessMap:clothRough,roughness:1,sheen:.55,sheenRoughness:.85,sheenColor:new THREE.Color(color)});
 // Poly Haven wood_floor: 1,7 m por repetição, com grão/normal/rugosidade
 // da mesma captura. Seleção aproximada pelas fotos06/14, não material medido.
 const wood=()=>standard({color:0xffffff,map:woodMap,normalMap:woodNormal,roughnessMap:woodRoughness,roughness:.82,metalness:0});
 return {
  fabricTaupe:fabric(0xc5b5a3),fabricGrey:fabric(0x94918b),fabricWhite:fabric(0xece9dd),ceramic:neutral(0xf4f2ec,.22),stainless:neutral(0xb1b5b8,.24,{metalness:.88}),basinStone:standard({color:0xc2bdb5,map:basinMap,normalMap:basinNormal,normalScale:new THREE.Vector2(.11,.11),roughness:.48}),
  stone:standard({color:0xffffff,map:stoneMap,normalMap:stoneNormal,roughnessMap:stoneRoughness,roughness:.9,metalness:0}),wood:wood(),deck:wood(),tile:standard({color:0xffffff,map:tileMap,normalMap:tileNormal,roughness:.66}),roof:standard({color:0xffffff,map:roofMap,normalMap:roofNormal,roughness:.88}),grass:standard({color:0xa5c994,map:grassMap,normalMap:grassNormal,roughness:1}),plaster:standard({color:0xffffff,map:plasterMap,normalMap:plasterNormal,roughness:.92}),linen:fabric(0xd8cdbc),white:neutral(0xffffff,.8),woodDark:neutral(0x4b3528,.62),metal:neutral(0x292929,.38,{metalness:.65}),black:neutral(0x171717,.28),glass:neutral(0x4e6b69,.10,{transparent:true,opacity:.57,depthWrite:false,metalness:.15}),mirror:neutral(0xb9cbd0,.14,{metalness:.75}),light:neutral(0xffe3b2,.6,{emissive:0xffc56b,emissiveIntensity:2}),paving:standard({color:0xffffff,map:pavingMap,normalMap:pavingNormal,roughness:.9})
 };
}
