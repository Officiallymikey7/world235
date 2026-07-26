/**
 * src/agent/memory.js
 *
 * Lightweight in-memory event store for the agent session.
 *
 * BOUNDARY: The memory module is write-only from the action and loop layers.
 * The planner (LLM) reads a summary of memory via the context object that the
 * loop assembles – it never writes directly.  This prevents the LLM from
 * fabricating or tampering with past events.
 */

/**
 * @typedef {object} MemoryEvent
 * @property {string}  type      - Event category (e.g. "plan_executed", "step_failed").
 * @property {number}  timestamp - Unix ms timestamp.
 * @property {object}  [data]    - Arbitrary event payload.
 */

/**
 * Creates a new isolated memory store for one agent session.
 *
 * @returns {AgentMemory}
 */
export function createMemory() {
  /** @type {MemoryEvent[]} */
  const events = [];
  /** @type {object|null} */
  let activeTask = null;

  /**
   * @typedef {object} AgentMemory
   */
  return {
    /**
     * Records a memory event.
     *
     * @param {{ type: string } & Record<string, unknown>} event
     */
    addEvent(event) {
      events.push({
        ...event,
        timestamp: Date.now()
      });
    },

    /**
     * Returns a shallow copy of all recorded events.
     *
     * @returns {MemoryEvent[]}
     */
    getEvents() {
      return [...events];
    },

    /**
     * Returns the most recent N events (useful for context summaries).
     *
     * @param {number} [n=10]
     * @returns {MemoryEvent[]}
     */
    getRecentEvents(n = 10) {
      return events.slice(-n);
    },

    /**
     * Sets the currently active high-level task.
     *
     * @param {object|null} task
     */
    setActiveTask(task) {
      activeTask = task;
    },

    /**
     * Returns the currently active task, or null.
     *
     * @returns {object|null}
     */
    getActiveTask() {
      return activeTask;
    },

    /**
     * Clears all events and the active task (e.g. on session reset).
     */
    reset() {
      events.length = 0;
      activeTask = null;
    }
  };
}
