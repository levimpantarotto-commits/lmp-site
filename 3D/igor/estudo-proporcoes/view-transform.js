// A frente observada coloca o núcleo alto à esquerda e a ala baixa à direita.
// Navegação conserva suas coordenadas lógicas; cena, câmera e controles usam
// a mesma reflexão, evitando inverter apenas a foto ou desalinhar colisões.
export const facadeAxis=5.8;
export const worldX=x=>facadeAxis-x;
export const worldYaw=yaw=>-yaw;
export function movement(yaw,forward,strafe){
 return {x:-Math.sin(yaw)*forward-Math.cos(yaw)*strafe,z:-Math.cos(yaw)*forward+Math.sin(yaw)*strafe};
}
