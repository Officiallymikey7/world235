/**
 * src/engine/navigation.js
 *
 * Navigation helper utilities.
 *
 * BOUNDARY: Pure calculation utilities – no engine API calls, no LLM calls.
 * All functions are synchronous and operate on plain data structures so they
 * can be used safely inside action handlers or tests without a live engine.
 */

/**
 * @typedef {object} Position
 * @property {number} x
 * @property {number} y
 * @property {number} [z]
 */

/**
 * Computes the Euclidean distance between two 2-D (or 3-D) positions.
 *
 * @param {Position} a
 * @param {Position} b
 * @returns {number}
 */
export function euclideanDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Computes the Manhattan (grid) distance between two positions.
 * Useful for tile-based or voxel worlds.
 *
 * @param {Position} a
 * @param {Position} b
 * @returns {number}
 */
export function manhattanDistance(a, b) {
  return (
    Math.abs(a.x - b.x) +
    Math.abs(a.y - b.y) +
    Math.abs((a.z ?? 0) - (b.z ?? 0))
  );
}

/**
 * Finds the nearest entity or block from a list based on Euclidean distance
 * to a reference position.
 *
 * @template T
 * @param {Position}  reference
 * @param {Array<T & { position: Position }>} candidates
 * @returns {(T & { position: Position }) | null}
 */
export function findNearest(reference, candidates) {
  if (!candidates.length) return null;
  return candidates.reduce((best, candidate) => {
    return euclideanDistance(reference, candidate.position) <
      euclideanDistance(reference, best.position)
      ? candidate
      : best;
  });
}

/**
 * Checks whether a position falls within a bounding box defined by two
 * corner positions (inclusive).
 *
 * @param {Position} pos
 * @param {Position} min - Corner with smallest coordinates.
 * @param {Position} max - Corner with largest coordinates.
 * @returns {boolean}
 */
export function isWithinBounds(pos, min, max) {
  return (
    pos.x >= min.x && pos.x <= max.x &&
    pos.y >= min.y && pos.y <= max.y &&
    (pos.z == null || ((pos.z >= (min.z ?? -Infinity)) && (pos.z <= (max.z ?? Infinity))))
  );
}
