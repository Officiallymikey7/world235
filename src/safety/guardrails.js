/**
 * src/safety/guardrails.js
 *
 * Runtime safety guardrails applied to every plan before execution.
 *
 * BOUNDARY: The guardrails layer is purely defensive – it never calls the LLM
 * or the engine.  It operates on already-validated plan objects (post-schema
 * check) and enforces additional policy rules that the JSON schema alone
 * cannot express:
 *
 *   1. Maximum steps per plan.
 *   2. Per-step execution timeout utility.
 *   3. Denylist of actions that must never be dispatched.
 *   4. Basic "impossible-action" guards (actions that would require privileges
 *      the engine does not support).
 */

/** Maximum number of steps allowed in a single plan. */
export const MAX_STEPS = 8;

/** Per-step execution timeout in milliseconds. */
export const STEP_TIMEOUT_MS = 30_000;

/**
 * Actions that are permanently denied regardless of what the LLM requests.
 * Extend this set as new privileged/unsupported actions are identified.
 *
 * @type {Set<string>}
 */
export const DISALLOWED_ACTIONS = new Set([
  "spawn_items",     // Would create items from nothing – impossible without cheats.
  "teleport",        // Arbitrary teleport not supported by the deterministic engine.
  "set_game_mode",   // Privilege escalation.
  "execute_command", // Raw command injection.
  "give_items",      // Economy exploit.
  "__proto__",       // Prototype pollution guard.
  "constructor"      // Prototype pollution guard.
]);

/**
 * Applies all guardrail policies to a validated plan, returning a (possibly
 * truncated / modified) plan that is safe to execute.
 *
 * Mutates a _copy_ – the original plan object is never modified.
 *
 * @param {{ goal: string, steps: object[] }} plan - A schema-validated plan.
 * @returns {{ goal: string, steps: object[] }} A guardrailed plan.
 * @throws {Error} If any step contains a disallowed action (caller should
 *   substitute the safe fallback plan when this is thrown).
 */
export function applyGuardrails(plan) {
  // 1. Cap the number of steps.
  const cappedSteps = plan.steps.slice(0, MAX_STEPS);

  // 2. Reject disallowed actions (throw so the loop can substitute fallback).
  for (const step of cappedSteps) {
    if (DISALLOWED_ACTIONS.has(step.action)) {
      throw new Error(
        `Guardrail violation: action "${step.action}" is not allowed`
      );
    }
  }

  return { ...plan, steps: cappedSteps };
}

/**
 * Wraps a promise with a timeout.  If the promise does not resolve within
 * `ms` milliseconds, the returned promise rejects with a timeout error.
 *
 * Used by the action registry to ensure no single step can block the loop
 * indefinitely.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms          - Timeout in milliseconds.
 * @param {string} [label=""]  - Descriptive label for the timeout error message.
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, label = "") {
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Timeout after ${ms} ms${label ? `: ${label}` : ""}`)),
      ms
    )
  );
  return Promise.race([promise, timeout]);
}

/**
 * Returns true if the agent's current health is below the panic threshold and
 * combat actions should be avoided.
 *
 * @param {number} currentHealth
 * @param {number} [panicThreshold=10]
 * @returns {boolean}
 */
export function isPanicking(currentHealth, panicThreshold = 10) {
  return currentHealth <= panicThreshold;
}
