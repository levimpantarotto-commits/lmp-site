const fract=n=>n-Math.floor(n);
const hash=(x,z,s=0)=>fract(Math.sin(x*12.9898+z*78.233+s*37.719)*43758.5453);

// Stable by location: nearby crowns share a restrained species/colour family,
// while their silhouettes retain small independent differences.
export function treeVariation(x,z,variantCount){
 const groupX=Math.floor((x+(hash(x,z,7)-.5)*30)/58),groupZ=Math.floor((z+(hash(x,z,8)-.5)*30)/58),family=Math.floor(hash(groupX,groupZ,4)*variantCount),tone=hash(groupX,groupZ,9),shape=hash(x,z,13),shape2=hash(x,z,21),individual=(hash(x,z,12)-.5)*.07;
 return {variant:hash(x,z,1)<.23?Math.floor(hash(x,z,2)*variantCount):family,scaleX:.76+shape*.43,scaleZ:.78+shape2*.40,yaw:hash(x,z,31)*Math.PI*2,color:[.72+tone*.11+individual,.78+tone*.10+individual,.61+tone*.10+individual]};
}
