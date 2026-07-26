/**
 * src/agent/prompts.js
 *
 * Prompt templates for the LLM planning layer.
 *
 * BOUNDARY: Only this file is allowed to compose text sent to the LLM.
 * No other module should construct raw prompt strings.  This keeps the
 * LLM contract in one place and makes it easy to audit or swap models.
 */

/**
 * System prompt that constrains the LLM to schema-only output.
 * Must be sent as the system/developer turn for every planning call.
 *
 * @type {string}
 */
export const SYSTEM_PROMPT = `
You are a planning brain for a game agent.
Return ONLY valid JSON that strictly matches the provided PlanSchema.
Never claim to perform actions yourself.
Never output impossible game actions (e.g. spawn items, teleport without support).
If you are unsure or have insufficient information, return a safe idle step:
  {"goal":"safe_fallback","steps":[{"action":"idle","args":{"durationMs":1000},"priority":5,"reason":"insufficient_context"}]}
`.trim();

/**
 * Builds the user-turn prompt from current runtime context.
 *
 * @param {object} params
 * @param {string} params.userRequest   - Raw text from the user/player.
 * @param {object} params.worldState    - Current world snapshot (position, biome, entities…).
 * @param {object} params.inventory     - Current inventory snapshot.
 * @param {object|null} params.activeTask - In-progress task, or null if none.
 * @returns {string} Formatted prompt string ready to send to the LLM.
 */
export function buildPlanningPrompt({ userRequest, worldState, inventory, activeTask }) {
  return [
    `User request: ${JSON.stringify(userRequest)}`,
    `World state: ${JSON.stringify(worldState)}`,
    `Inventory: ${JSON.stringify(inventory)}`,
    `Active task: ${JSON.stringify(activeTask ?? null)}`,
    "",
    "Create a short executable plan. Respond with JSON only."
  ].join("\n");
}
