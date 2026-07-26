/**
 * src/agent/planner.js
 *
 * Schema validation layer – sits between the LLM output and execution.
 *
 * BOUNDARY: Every plan produced by the LLM must pass through `validateOrThrow`
 * before any action is dispatched.  This is the hard gate that prevents
 * invalid, incomplete, or adversarially crafted plans from reaching the
 * deterministic execution layer.
 */

import Ajv from "ajv";
import { PlanSchema } from "./schemas.js";

const ajv = new Ajv({ allErrors: true, strict: false });

/** Compiled validator for PlanSchema – reused across calls. */
const validatePlan = ajv.compile(PlanSchema);

/**
 * Validates a raw plan object against PlanSchema.
 *
 * @param {unknown} plan - The object returned by the LLM (or any source).
 * @returns {object} The same plan object, typed as a valid plan.
 * @throws {Error} With a human-readable description of every validation error.
 */
export function validateOrThrow(plan) {
  const ok = validatePlan(plan);
  if (!ok) {
    const details = (validatePlan.errors ?? [])
      .map(e => `${e.instancePath || "/"} ${e.message}`)
      .join("; ");
    throw new Error(`Invalid plan: ${details}`);
  }
  return /** @type {object} */ (plan);
}

/**
 * Non-throwing variant – returns `{ valid: true, plan }` or `{ valid: false, errors }`.
 *
 * Useful in tests or when the caller wants to handle validation errors gracefully
 * without a try/catch.
 *
 * @param {unknown} plan
 * @returns {{ valid: true, plan: object } | { valid: false, errors: string }}
 */
export function validatePlanSafe(plan) {
  const ok = validatePlan(plan);
  if (!ok) {
    const errors = (validatePlan.errors ?? [])
      .map(e => `${e.instancePath || "/"} ${e.message}`)
      .join("; ");
    return { valid: false, errors };
  }
  return { valid: true, plan: /** @type {object} */ (plan) };
}
