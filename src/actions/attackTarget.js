/**
 * src/actions/attackTarget.js
 *
 * Deterministic handler for the `attack_target` action.
 *
 * BOUNDARY: Resolves the target from the engine sensor layer (not from the
 * LLM) and delegates combat mechanics entirely to the engine adapter.
 */

/**
 * @typedef {object} AttackTargetArgs
 * @property {string} [entityId]    - Specific entity ID to attack (if known).
 * @property {string} [entityType]  - Entity type to target nearest of (e.g. "zombie").
 */

/**
 * Locates and attacks the specified entity or the nearest entity of the given
 * type.
 *
 * @param {object} params
 * @param {AttackTargetArgs} params.args
 * @param {object}           params.ctx
 * @param {import("../engine/adapter.js").EngineAdapter} params.ctx.engine
 * @param {object} params.ctx.sensors - Must expose `findNearestEntity(type)`.
 * @returns {Promise<{ ok: boolean, status?: string, error?: string }>}
 */
export async function attackTarget({ args, ctx }) {
  let entityId = args?.entityId ?? null;

  // Resolve nearest entity if only a type is given.
  if (!entityId && args?.entityType) {
    const found = await ctx.sensors.findNearestEntity(args.entityType);
    if (!found) {
      return { ok: false, error: `No ${args.entityType} found in range` };
    }
    entityId = found.id;
  }

  if (!entityId) {
    return { ok: false, error: "attack_target requires entityId or entityType" };
  }

  const result = await ctx.engine.attack(entityId);
  if (!result?.ok) {
    return { ok: false, error: `Attack on entity ${entityId} failed` };
  }

  return { ok: true, status: `Attacked entity ${entityId}` };
}
