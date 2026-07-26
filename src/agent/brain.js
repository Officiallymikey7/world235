/**
 * src/agent/brain.js
 *
 * LLM interface – the only module that talks to an external AI model.
 *
 * BOUNDARY: The brain's sole responsibility is to send a prompt and return
 * parsed JSON.  It does NOT validate the JSON (that is the planner's job) and
 * it does NOT execute anything (that is the action layer's job).
 *
 * The `llmClient` injected here is a thin adapter over whatever provider is
 * configured (Gemini, OpenAI, local heuristic, …).  It must implement:
 *
 *   llmClient.generate({ system: string, prompt: string, responseFormat?: object })
 *     → Promise<object>  // parsed JSON response
 */

import { SYSTEM_PROMPT, buildPlanningPrompt } from "./prompts.js";

/**
 * Calls the LLM to produce a raw (unvalidated) plan object.
 *
 * @param {object} params
 * @param {object} params.llmClient   - LLM client adapter (see module boundary above).
 * @param {object} params.schema      - JSON schema passed to the provider as `responseFormat`.
 * @param {object} params.context     - Context object forwarded to `buildPlanningPrompt`.
 * @param {string} params.context.userRequest
 * @param {object} params.context.worldState
 * @param {object} params.context.inventory
 * @param {object|null} params.context.activeTask
 * @returns {Promise<object>} Raw parsed JSON – caller must validate against schema.
 * @throws {Error} If the LLM call fails or does not return a parseable object.
 */
export async function planWithLLM({ llmClient, schema, context }) {
  const prompt = buildPlanningPrompt(context);

  const raw = await llmClient.generate({
    system: SYSTEM_PROMPT,
    prompt,
    // Pass schema as response format for providers that support constrained generation.
    responseFormat: { type: "json_schema", schema }
  });

  // Providers should return an already-parsed object; if they return a string, parse it.
  if (typeof raw === "string") {
    return JSON.parse(raw);
  }

  return raw;
}
