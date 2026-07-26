/**
 * src/engine/inventory.js
 *
 * Inventory helper utilities for the agent.
 *
 * BOUNDARY: Pure data utilities – no engine API calls, no LLM calls.
 * Operates on plain inventory snapshots (Record<string, number>) returned by
 * EngineAdapter.getInventory().
 */

/**
 * Returns the count of a specific item in an inventory snapshot.
 *
 * @param {Record<string, number>} inventory
 * @param {string} itemName
 * @returns {number}
 */
export function countItem(inventory, itemName) {
  return inventory[itemName] ?? 0;
}

/**
 * Returns true if the inventory contains at least `qty` of every item in
 * the requirements map.
 *
 * @param {Record<string, number>} inventory
 * @param {Record<string, number>} requirements - e.g. { oak_planks: 8 }
 * @returns {boolean}
 */
export function hasRequirements(inventory, requirements) {
  return Object.entries(requirements).every(
    ([item, qty]) => countItem(inventory, item) >= qty
  );
}

/**
 * Returns a list of items that are missing (or under-supplied) relative to
 * a requirements map.
 *
 * @param {Record<string, number>} inventory
 * @param {Record<string, number>} requirements
 * @returns {Array<{ item: string, need: number, have: number }>}
 */
export function missingItems(inventory, requirements) {
  return Object.entries(requirements)
    .filter(([item, qty]) => countItem(inventory, item) < qty)
    .map(([item, qty]) => ({
      item,
      need: qty,
      have: countItem(inventory, item)
    }));
}

/**
 * Returns the total number of unique item types held.
 *
 * @param {Record<string, number>} inventory
 * @returns {number}
 */
export function uniqueItemCount(inventory) {
  return Object.values(inventory).filter(v => v > 0).length;
}
