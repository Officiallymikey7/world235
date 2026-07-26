/**
 * src/engine/adapter.js
 *
 * Engine adapter – the only module allowed to touch raw game API calls.
 *
 * BOUNDARY: All game-engine/plugin interactions (movement, crafting, combat,
 * block collection, inventory reads) are funnelled through this class.  No
 * other module is permitted to call the underlying game API directly.  This
 * ensures the LLM and action layers remain fully decoupled from the engine and
 * can be unit-tested with a mock adapter.
 *
 * `api` is the raw game plugin/engine object injected at construction time.
 * Swap it for a mock in tests without changing any other module.
 */

/**
 * @typedef {object} Position
 * @property {number} x
 * @property {number} y
 * @property {number} [z]
 */

/**
 * @typedef {object} WorldSnapshot
 * @property {string}   biome
 * @property {string}   timeOfDay
 * @property {object[]} nearbyEntities
 * @property {Position} position
 */

/**
 * @typedef {object} ActionResult
 * @property {boolean} ok
 * @property {string}  [status]
 * @property {string}  [error]
 */

export class EngineAdapter {
  /**
   * @param {object} api - Raw game engine / plugin API object.
   *   Expected methods (all async):
   *     getBiome()                    → string
   *     getTime()                     → string
   *     scanEntities()                → object[]
   *     getPosition()                 → Position
   *     getInventory()                → Record<string, number>
   *     navigateTo(position)          → ActionResult
   *     navigateToNamed(name)         → ActionResult
   *     collect(blockType, qty)       → ActionResult
   *     craft(item, qty)              → ActionResult
   *     attack(entityId)              → ActionResult
   *     depositItems(items)           → ActionResult
   */
  constructor(api) {
    this.api = api;
  }

  /**
   * Returns a snapshot of the current world state.
   *
   * @returns {Promise<WorldSnapshot>}
   */
  async getWorldState() {
    const [biome, timeOfDay, nearbyEntities, position] = await Promise.all([
      this.api.getBiome(),
      this.api.getTime(),
      this.api.scanEntities(),
      this.api.getPosition()
    ]);
    return { biome, timeOfDay, nearbyEntities, position };
  }

  /**
   * Returns the current inventory as a map of { itemName: quantity }.
   *
   * @returns {Promise<Record<string, number>>}
   */
  async getInventory() {
    return this.api.getInventory();
  }

  /**
   * Navigates the agent to a world-space position using the engine's
   * deterministic pathfinding backend.
   *
   * @param {Position} position
   * @returns {Promise<ActionResult>}
   */
  async pathTo(position) {
    return this.api.navigateTo(position);
  }

  /**
   * Navigates to a named waypoint registered in the engine.
   *
   * @param {string} name - Waypoint name (e.g. "base", "spawn").
   * @returns {Promise<ActionResult>}
   */
  async pathToNamed(name) {
    return this.api.navigateToNamed(name);
  }

  /**
   * Mines / collects the specified block type.
   *
   * @param {string} blockType - Block identifier (e.g. "oak_log").
   * @param {number} qty       - Number of blocks to collect.
   * @returns {Promise<ActionResult>}
   */
  async collectBlock(blockType, qty) {
    return this.api.collect(blockType, qty);
  }

  /**
   * Crafts the specified item.
   *
   * @param {string} item - Item identifier (e.g. "chest").
   * @param {number} qty  - Number of items to craft.
   * @returns {Promise<ActionResult>}
   */
  async craft(item, qty) {
    return this.api.craft(item, qty);
  }

  /**
   * Attacks the specified entity by ID.
   *
   * @param {string} entityId - Entity identifier.
   * @returns {Promise<ActionResult>}
   */
  async attack(entityId) {
    return this.api.attack(entityId);
  }

  /**
   * Deposits items into a container (chest, barrel, …).
   *
   * @param {string[]|null} items - Item names to deposit, or null for all.
   * @returns {Promise<ActionResult>}
   */
  async depositItems(items) {
    return this.api.depositItems(items);
  }
}
