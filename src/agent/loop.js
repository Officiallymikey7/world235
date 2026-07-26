/**
 * src/agent/loop.js
 *
 * Main agent execution loop.
 *
 * BOUNDARY: The loop orchestrates three distinct phases:
 *   1. Sense   – gather world state, inventory, and memory from deterministic sources.
 *   2. Plan    – call the LLM brain, validate the returned plan against the schema.
 *   3. Execute – dispatch each action step to the registry, record results in memory.
 *
 * The LLM (brain) is called exactly once per loop tick and never directly
 * touches the engine.  If planning fails for any reason, a safe fallback plan
 * is substituted so the loop always has something deterministic to execute.
 */

import { planWithLLM } from "./brain.js";
import { validateOrThrow } from "./planner.js";
import { PlanSchema, safeFallbackPlan } from "./schemas.js";
import { runActionStep } from "../actions/registry.js";
import { applyGuardrails } from "../safety/guardrails.js";

/**
 * Runs one full sense → plan → execute cycle.
 *
 * @param {object} params
 * @param {object}       params.llmClient   - LLM client adapter (see brain.js).
 * @param {import("../engine/adapter.js").EngineAdapter} params.engine
 *   - Engine adapter that provides world state and action primitives.
 * @param {ReturnType<import("./memory.js").createMemory>} params.memory
 *   - Agent memory store for this session.
 * @param {object}       params.sensors     - Sensor utilities (e.g. findNearestBlock).
 * @param {string}       params.userRequest - Raw user/player message that triggered this loop.
 *
 * @returns {Promise<{
 *   plan: object,
 *   results: Array<{ step: object, result: object }>,
 *   fallback: boolean
 * }>}
 */
export async function runAgentLoop({
  llmClient,
  engine,
  memory,
  sensors,
  userRequest
}) {
  // ── Phase 1: Sense ────────────────────────────────────────────────────────
  const [worldState, inventory] = await Promise.all([
    engine.getWorldState(),
    engine.getInventory()
  ]);
  const activeTask = memory.getActiveTask();

  // ── Phase 2: Plan ─────────────────────────────────────────────────────────
  let plan;
  let fallback = false;

  try {
    const draft = await planWithLLM({
      llmClient,
      schema: PlanSchema,
      context: { userRequest, worldState, inventory, activeTask }
    });

    // Hard validation gate: throws if the LLM returned invalid JSON structure.
    const validated = validateOrThrow(draft);

    // Safety guardrails: cap steps, reject disallowed actions, etc.
    plan = applyGuardrails(validated);
  } catch (err) {
    fallback = true;
    plan = safeFallbackPlan();
    memory.addEvent({
      type: "planning_failed",
      error: err instanceof Error ? err.message : String(err)
    });
  }

  // ── Phase 3: Execute ──────────────────────────────────────────────────────
  const results = [];
  const ctx = { engine, memory, sensors };

  for (const step of plan.steps) {
    const result = await runActionStep(step, ctx);
    results.push({ step, result });

    if (!result.ok) {
      memory.addEvent({ type: "step_failed", step, error: result.error });
      break; // Stop on first failure; caller decides whether to retry.
    }

    memory.addEvent({ type: "step_completed", step, status: result.status });
  }

  memory.addEvent({ type: "plan_executed", goal: plan.goal, stepCount: results.length });

  return { plan, results, fallback };
}
