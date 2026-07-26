/**
 * src/agent/schemas.js
 *
 * JSON Schema definitions for the agent's planning contract.
 *
 * BOUNDARY: LLM output MUST conform to PlanSchema before it reaches any
 * execution layer.  The schemas are the only authoritative definition of what
 * the LLM is allowed to return.  Deterministic execution code never parses
 * free-form text; it only reads validated plan objects.
 */

/**
 * Schema for a single action step inside a plan.
 * Each step names a registered action and provides typed arguments.
 *
 * @type {import("ajv").SchemaObject}
 */
export const ActionSchema = {
  type: "object",
  required: ["action", "args"],
  additionalProperties: false,
  properties: {
    /** Registered action name – must match a handler in the action registry. */
    action: {
      type: "string",
      enum: [
        "gather_wood",
        "craft_chest",
        "go_to",
        "attack_target",
        "deposit_items",
        "idle"
      ]
    },
    /** Free-form arguments for the action handler. */
    args: { type: "object" },
    /** Optional scheduling priority (1 = highest, 5 = lowest). */
    priority: { type: "integer", minimum: 1, maximum: 5 },
    /** Short human-readable rationale from the LLM (never executed). */
    reason: { type: "string", maxLength: 240 }
  }
};

/**
 * Schema for a complete plan returned by the LLM.
 * A plan has a high-level goal string and an ordered list of action steps.
 *
 * @type {import("ajv").SchemaObject}
 */
export const PlanSchema = {
  type: "object",
  required: ["goal", "steps"],
  additionalProperties: false,
  properties: {
    /** High-level goal description (informational only). */
    goal: { type: "string", maxLength: 120 },
    /** Ordered sequence of action steps to execute. */
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: ActionSchema
    }
  }
};

/**
 * Safe fallback plan used when LLM output is invalid or unavailable.
 * Always returns a single idle step so the loop has something to execute.
 *
 * @returns {{ goal: string, steps: Array<{ action: string, args: object, priority: number, reason: string }> }}
 */
export function safeFallbackPlan() {
  return {
    goal: "safe_fallback",
    steps: [
      {
        action: "idle",
        args: { durationMs: 800 },
        priority: 5,
        reason: "planning_failed"
      }
    ]
  };
}
