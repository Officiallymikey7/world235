/**
 * src/engine/worldState.js
 *
 * World state helper utilities.
 *
 * BOUNDARY: Pure data utilities – no engine API calls, no LLM calls.
 * Operates on the plain world snapshot returned by EngineAdapter.getWorldState().
 */

/**
 * @typedef {object} WorldSnapshot
 * @property {string}   biome
 * @property {string}   timeOfDay
 * @property {object[]} nearbyEntities
 * @property {{ x: number, y: number, z?: number }} position
 */

/**
 * Returns true if the world is currently in a night-time state, which may
 * affect spawn rates or agent behaviour.
 *
 * @param {WorldSnapshot} worldState
 * @returns {boolean}
 */
export function isNightTime(worldState) {
  return worldState.timeOfDay === "night" || worldState.timeOfDay === "midnight";
}

/**
 * Filters the nearby entities list to return only hostile mobs.
 *
 * @param {WorldSnapshot} worldState
 * @param {string[]} [hostileTypes=["zombie","skeleton","creeper","spider"]]
 * @returns {object[]}
 */
export function getNearbyHostiles(worldState, hostileTypes = ["zombie", "skeleton", "creeper", "spider"]) {
  return (worldState.nearbyEntities ?? []).filter(
    e => hostileTypes.includes(e.type)
  );
}

/**
 * Returns a compact serialisable summary of the world state suitable for
 * inclusion in an LLM prompt.  Strips large arrays to a configurable
 * maximum to keep token counts low.
 *
 * @param {WorldSnapshot} worldState
 * @param {object}  [opts]
 * @param {number}  [opts.maxEntities=5] - Maximum entity entries to include.
 * @returns {object}
 */
export function summariseWorldState(worldState, { maxEntities = 5 } = {}) {
  return {
    biome:          worldState.biome,
    timeOfDay:      worldState.timeOfDay,
    position:       worldState.position,
    entityCount:    (worldState.nearbyEntities ?? []).length,
    nearbyEntities: (worldState.nearbyEntities ?? []).slice(0, maxEntities)
  };
}
