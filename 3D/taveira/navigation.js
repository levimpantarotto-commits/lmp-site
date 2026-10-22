/** Logica pura de caminhada da varanda; coordenadas horizontais sao X/Z. */
export const WALK_BOUNDS = Object.freeze({ minX: -3.05, maxX: 3.02, minZ: -2.45, maxZ: 2.45 });

export const COLLIDERS = Object.freeze([
  Object.freeze({ name: "mesa", x: -0.8, z: 0.5, r: 0.62 }),
  Object.freeze({ name: "cadeira_1", x: -1.75, z: 0.5, r: 0.39 }),
  Object.freeze({ name: "cadeira_2", x: 0.15, z: 0.5, r: 0.39 }),
  Object.freeze({ name: "cadeira_3", x: -0.8, z: -0.45, r: 0.39 }),
  Object.freeze({ name: "cadeira_4", x: -0.8, z: 1.45, r: 0.39 }),
  Object.freeze({ name: "vaso", x: 2.3, z: 2.25, r: 0.32 }),
]);

const VISITOR_RADIUS = 0.16;
const MAX_SUBSTEP = 0.07;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function constrainToBounds(x, z) {
  return {
    x: clamp(finite(x), WALK_BOUNDS.minX + VISITOR_RADIUS, WALK_BOUNDS.maxX - VISITOR_RADIUS),
    z: clamp(finite(z), WALK_BOUNDS.minZ + VISITOR_RADIUS, WALK_BOUNDS.maxZ - VISITOR_RADIUS),
  };
}

/** Retorna se o centro do visitante pode ficar em x/z sem tocar limite ou mobilia. */
export function isWalkable(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (x < WALK_BOUNDS.minX + VISITOR_RADIUS || x > WALK_BOUNDS.maxX - VISITOR_RADIUS ||
      z < WALK_BOUNDS.minZ + VISITOR_RADIUS || z > WALK_BOUNDS.maxZ - VISITOR_RADIUS) return false;
  return COLLIDERS.every((collider) => {
    const dx = x - collider.x;
    const dz = z - collider.z;
    const clearance = collider.r + VISITOR_RADIUS;
    return dx * dx + dz * dz >= clearance * clearance;
  });
}

/**
 * Move com passos curtos para impedir tunelamento. Quando o passo diagonal
 * encontra um obstaculo, aplica os eixos separadamente para permitir deslize.
 */
export function moveVisitor(position, dx, dz) {
  let { x, z } = constrainToBounds(position?.x, position?.z);
  const moveX = finite(dx);
  const moveZ = finite(dz);
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(moveX), Math.abs(moveZ)) / MAX_SUBSTEP));
  const stepX = moveX / steps;
  const stepZ = moveZ / steps;

  for (let step = 0; step < steps; step += 1) {
    const diagonal = { x: x + stepX, z: z + stepZ };
    if (isWalkable(diagonal.x, diagonal.z)) {
      x = diagonal.x;
      z = diagonal.z;
      continue;
    }
    // Avaliar Z depois de X mantem o segundo eixo como deslize quando X passou.
    if (isWalkable(x + stepX, z)) x += stepX;
    if (isWalkable(x, z + stepZ)) z += stepZ;
  }
  return { x, z };
}
