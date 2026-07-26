/**
 * src/actions/craftChest.js
 *
 * Deterministic handler for the `craft_chest` action.
 *
 * BOUNDARY: Reads inventory from the engine adapter, checks material
 * requirements, and calls the engine craft API.  No LLM calls, no network.
 */

/**
 * @typedef {object} CraftChestArgs
 * @property {number} [qty=1]              - Number of chests to craft.
 * @property {string} [plankType="oak_planks"] - Plank material to consume.
 */

/** Each chest requires 8 planks in a standard crafting recipe. */
const PLANKS_PER_CHEST = 8;

/**
 * Checks the inventory for sufficient planks and crafts the requested number
 * of chests.
 *
 * @param {object} params
 * @param {CraftChestArgs} params.args
 * @param {object} params.ctx
 * @param {import("../engine/adapter.js").EngineAdapter} params.ctx.engine
 * @returns {Promise<{ ok: boolean, status?: string, error?: string }>}
 */
export async function craftChest({ args, ctx }) {
  const qty       = Math.max(1, args?.qty ?? 1);
  const plankType = args?.plankType ?? "oak_planks";

  // 1. Check inventory.
  const inv    = await ctx.engine.getInventory();
  const planks = inv[plankType] ?? 0;
  const needed = qty * PLANKS_PER_CHEST;

  if (planks < needed) {
    return {
      ok: false,
      error: `Need ${needed} ${plankType} to craft ${qty} chest(s), but only have ${planks}`
    };
  }

  // 2. Craft via engine.
  const crafted = await ctx.engine.craft("chest", qty);
  if (!crafted?.ok) {
    return { ok: false, error: `Crafting ${qty} chest(s) failed` };
  }

  return { ok: true, status: `Crafted ${qty} chest(s) using ${needed} ${plankType}` };
}
