/**
 * src/safety/validator.js
 *
 * Public schema-validation façade for use outside the agent package.
 *
 * Re-exports the planner's validation helpers so that external modules (e.g.
 * chatHandler, tests) have a single clean import point for validation without
 * needing to know the internal agent directory layout.
 */

export { validateOrThrow, validatePlanSafe } from "../agent/planner.js";
export { safeFallbackPlan } from "../agent/schemas.js";
