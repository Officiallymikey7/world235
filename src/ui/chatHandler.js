/**
 * src/ui/chatHandler.js
 *
 * Chat handler – the public entry point that bridges user/player messages to
 * the agent loop.
 *
 * BOUNDARY: This module owns the UX contract.  It:
 *   1. Receives a raw user message (string).
 *   2. Assembles the runtime dependencies (engine, memory, sensors, LLM client).
 *   3. Delegates to `runAgentLoop` – no planning or execution logic lives here.
 *   4. Formats and returns a structured result for the caller to display.
 *
 * The existing browser `app.js` can call `handleChat` directly once an engine
 * adapter and LLM client have been wired up.  In a Node.js / bundled context
 * it can be imported as a module.
 *
 * Example integration from app.js (browser):
 *
 *   import { handleChat } from './src/ui/chatHandler.js';
 *
 *   const result = await handleChat({
 *     message:    userInput,
 *     llmClient,
 *     engine,
 *     memory,
 *     sensors,
 *   });
 *   console.log(result.summary);
 */

import { runAgentLoop } from "../agent/loop.js";

/**
 * @typedef {object} ChatResult
 * @property {boolean}  ok           - True if the loop completed without a hard failure.
 * @property {boolean}  fallback     - True if a safe fallback plan was used.
 * @property {string}   summary      - Human-readable summary for display in the UI.
 * @property {object}   plan         - The executed plan object.
 * @property {Array<{ step: object, result: object }>} results - Per-step results.
 */

/**
 * Handles a single player/user chat message by running one agent loop cycle.
 *
 * @param {object} params
 * @param {string}  params.message    - Raw user text (e.g. "grab oak wood for a chest").
 * @param {object}  params.llmClient  - LLM client adapter.
 * @param {import("../engine/adapter.js").EngineAdapter} params.engine
 * @param {ReturnType<import("../agent/memory.js").createMemory>} params.memory
 * @param {object}  params.sensors    - Sensor utilities (findNearestBlock, findNearestEntity).
 *
 * @returns {Promise<ChatResult>}
 */
export async function handleChat({ message, llmClient, engine, memory, sensors }) {
  if (!message || typeof message !== "string" || !message.trim()) {
    return {
      ok:      false,
      fallback: true,
      summary: "Empty message – nothing to do.",
      plan:    { goal: "none", steps: [] },
      results: []
    };
  }

  let loopResult;
  try {
    loopResult = await runAgentLoop({
      llmClient,
      engine,
      memory,
      sensors,
      userRequest: message.trim()
    });
  } catch (err) {
    return {
      ok:      false,
      fallback: true,
      summary: `Agent loop error: ${err instanceof Error ? err.message : String(err)}`,
      plan:    { goal: "error", steps: [] },
      results: []
    };
  }

  const { plan, results, fallback } = loopResult;

  // Derive a concise summary for the UI.
  const failedStep = results.find(r => !r.result.ok);
  let summary;
  if (fallback) {
    summary = `⚠ Planning failed – safe fallback executed (idle).`;
  } else if (failedStep) {
    summary = `✗ Goal "${plan.goal}" stopped at step "${failedStep.step.action}": ${failedStep.result.error}`;
  } else {
    const stepNames = results.map(r => r.step.action).join(" → ");
    summary = `✓ Goal "${plan.goal}" completed: ${stepNames}`;
  }

  return {
    ok:      !fallback && !failedStep,
    fallback,
    summary,
    plan,
    results
  };
}
