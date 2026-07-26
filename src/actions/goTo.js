/**
 * src/actions/goTo.js
 *
 * Deterministic handler for the `go_to` action.
 *
 * BOUNDARY: Delegates pathfinding entirely to the engine adapter.  No
 * path-computation logic lives here; this module is a thin, validated
 * dispatch shim.
 */

/**
 * @typedef {object} GoToArgs
 * @property {number} x              - World X coordinate to navigate to.
 * @property {number} y              - World Y coordinate to navigate to.
 * @property {number} [z]            - World Z coordinate (3-D worlds only).
 * @property {string} [namedTarget]  - Optional named landmark (e.g. "base", "chest_1").
 */

/**
 * Navigates the agent to the specified world coordinates or named target.
 *
 * @param {object} params
 * @param {GoToArgs} params.args
 * @param {object}   params.ctx
 * @param {import("../engine/adapter.js").EngineAdapter} params.ctx.engine
 * @returns {Promise<{ ok: boolean, status?: string, error?: string }>}
 */
export async function goTo({ args, ctx }) {
  if (args?.namedTarget) {
    // Named targets are resolved by the engine adapter (e.g. from a waypoint map).
    const nav = await ctx.engine.pathToNamed(args.namedTarget);
    if (!nav?.ok) {
      return { ok: false, error: `Navigation to named target "${args.namedTarget}" failed` };
    }
    return { ok: true, status: `Arrived at "${args.namedTarget}"` };
  }

  if (args?.x == null || args?.y == null) {
    return { ok: false, error: "go_to requires x and y coordinates (or namedTarget)" };
  }

  const target = { x: args.x, y: args.y, ...(args.z != null ? { z: args.z } : {}) };
  const nav = await ctx.engine.pathTo(target);

  if (!nav?.ok) {
    return { ok: false, error: `Navigation to (${args.x}, ${args.y}) failed` };
  }

  return { ok: true, status: `Arrived at (${args.x}, ${args.y})` };
}
