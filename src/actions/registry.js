/**
 * src/actions/registry.js
 *
 * Action registry – maps validated action names to deterministic handler functions.
 *
 * BOUNDARY: This is the only module that imports action handlers.  The loop
 * calls `runActionStep` with a validated step; it never imports handlers
 * directly.  Adding a new action means: (1) adding its name to ActionSchema
 * enum in schemas.js, (2) implementing its handler, (3) registering it here.
 *
 * All handlers share the same signature:
 *   ({ args: object, ctx: ExecutionContext }) => Promise<ActionResult>
 *
 * ActionResult: { ok: boolean, status?: string, error?: string }
 */

import { gatherWood }   from "./gatherWood.js";
import { craftChest }   from "./craftChest.js";
import { goTo }         from "./goTo.js";
import { attackTarget } from "./attackTarget.js";
import { withTimeout }  from "../safety/guardrails.js";
import { STEP_TIMEOUT_MS, DISALLOWED_ACTIONS } from "../safety/guardrails.js";

/**
 * Map of registered action names to their deterministic handler functions.
 *
 * @type {Record<string, (params: { args: object, ctx: object }) => Promise<{ ok: boolean, status?: string, error?: string }>>}
 */
const handlers = {
  gather_wood:   gatherWood,
  craft_chest:   craftChest,
  go_to:         goTo,
  attack_target: attackTarget,
  deposit_items: async ({ args, ctx }) => {
    // Stub – implement when the engine exposes a deposit/storage API.
    const result = await ctx.engine.depositItems(args?.items ?? null);
    return result?.ok
      ? { ok: true, status: "Items deposited" }
      : { ok: false, error: "Deposit failed" };
  },
  idle: async ({ args }) => {
    const durationMs = Math.min(args?.durationMs ?? 500, 5000); // cap at 5 s
    await new Promise(resolve => setTimeout(resolve, durationMs));
    return { ok: true, status: `Idled for ${durationMs} ms` };
  }
};

/**
 * Dispatches a single validated plan step to its registered handler.
 *
 * Rejects steps with unknown action names or actions on the safety denylist.
 * Wraps execution in a per-step timeout (see guardrails.js).
 *
 * @param {{ action: string, args?: object }} step - Validated action step.
 * @param {object} ctx - Shared execution context (engine, memory, sensors).
 * @returns {Promise<{ ok: boolean, status?: string, error?: string }>}
 */
export async function runActionStep(step, ctx) {
  const { action, args = {} } = step;

  // Reject actions on the safety denylist before even looking up the handler.
  if (DISALLOWED_ACTIONS.has(action)) {
    return { ok: false, error: `Action "${action}" is on the safety denylist` };
  }

  const fn = handlers[action];
  if (!fn) {
    return { ok: false, error: `Unknown action: "${action}"` };
  }

  // Wrap in a per-step timeout so a hanging engine call cannot block the loop.
  return withTimeout(fn({ args, ctx }), STEP_TIMEOUT_MS, `action "${action}" timed out`);
}
