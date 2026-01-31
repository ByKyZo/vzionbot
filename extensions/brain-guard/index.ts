import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { brainGuardSchema, handleBrainGuardTool } from "./src/tool.js";
import { buildBrainGuardPrompt, resetSessionCount } from "./src/prompt.js";
import { handleBrainCommand } from "./src/command.js";
import { closeDb } from "./src/storage.js";

const brainGuardPlugin = {
  id: "brain-guard",
  name: "BrainGuard",
  description: "Cognitive health monitor - preserve mental autonomy",
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", default: true },
      reminderInterval: {
        type: "number",
        default: 10,
        description: "Inject reminder every N messages",
      },
    },
  },
  register(api: OpenClawPluginApi) {
    const config = api.pluginConfig as
      | { enabled?: boolean; reminderInterval?: number }
      | undefined;

    if (config?.enabled === false) {
      api.logger.info("BrainGuard disabled");
      return;
    }

    api.logger.info("BrainGuard loaded");

    // Hook: Inject methodology prompt
    api.on("before_agent_start", async (_event, ctx) => {
      const prompt = buildBrainGuardPrompt({
        sessionKey: ctx.sessionKey,
        reminderInterval: config?.reminderInterval,
      });

      if (prompt) {
        return { systemPrompt: prompt };
      }
    });

    // Tool: brain_guard
    api.registerTool({
      name: "brain_guard",
      description: "Record and query cognitive patterns for BrainGuard",
      parameters: brainGuardSchema,
      execute: async (_toolCallId, args, _signal, ctx) => {
        const result = handleBrainGuardTool(args, { sessionKey: ctx?.sessionKey });
        return JSON.stringify(result);
      },
    });

    // Command: /brain
    api.registerCommand({
      name: "brain",
      aliases: ["bg"],
      description: "BrainGuard - cognitive health stats",
      acceptsArgs: true,
      requireAuth: true,
      handler: (ctx) => handleBrainCommand(ctx.args),
    });

    // Reset session on end
    api.on("session_end", async (event) => {
      resetSessionCount(event.sessionId);
    });

    // Cleanup on gateway stop
    api.on("gateway_stop", () => {
      closeDb();
    });
  },
};

export default brainGuardPlugin;
