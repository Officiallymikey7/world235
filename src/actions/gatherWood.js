/**
 * src/actions/gatherWood.js
 *
 * Deterministic handler for the `gather_wood` action.
 *
 * BOUNDARY: This module only calls engine adapter methods.  It never calls LLM
 * APIs, constructs prompts, or makes network requests.  All decisions (what
 * type of wood, how many) come from the validated `args` object supplied by
 * the planner.
 */

/**
 * @typedef {object} GatherWoodArgs
 * @property {string} [woodType="oak_log"]  - Block type identifier to collect.
 * @property {number} [qtyLogs=4]           - Number of log blocks to gather.
 */

/**
 * Locates the nearest matching wood block, navigates to it, and collects the
 * requested quantity.
 *
 * @param {object} params
 * @param {GatherWoodArgs} params.args - Validated action arguments.
 * @param {object} params.ctx          - Shared execution context.
 * @param {import("../engine/adapter.js").EngineAdapter} params.ctx.engine
 * @param {object} params.ctx.sensors  - Must expose `findNearestBlock(type)`.
 * @returns {Promise<{ ok: boolean, status?: string, error?: string }>}
 */
export async function gatherWood({ args, ctx }) {
  const woodType = args?.woodType ?? "oak_log";
  const qtyLogs  = Math.max(1, args?.qtyLogs ?? 4);

  // 1. Sense: locate nearest block of the requested type.
  const located = await ctx.sensors.findNearestBlock(woodType);
  if (!located) {
    return { ok: false, error: `No ${woodType} found nearby` };
  }

  // 2. Navigate: path to the block's position.
  const nav = await ctx.engine.pathTo(located.position);
  if (!nav?.ok) {
    return { ok: false, error: `Navigation to ${woodType} failed` };
  }

  // 3. Collect: mine/break the requested number of blocks.
  const mined = await ctx.engine.collectBlock(woodType, qtyLogs);
  if (!mined?.ok) {
    return { ok: false, error: "Block collection failed" };
  }

  return { ok: true, status: `Collected ${qtyLogs} × ${woodType}` };
}
