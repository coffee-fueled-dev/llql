import type OpenAI from "openai";
import { type AssistantAsToolDefinition, Assistant } from "../assistants";
import type { ToolRegistry } from ".";
import type { AssistantRegistry } from "../assistants/registry";

/**
 * buildMessageTool creates a message assistant tool registry entry.
 * It calls the provided config function with a tool name and returns a tuple:
 *   [toolName, ToolRegistry]
 */
export function buildMessageTool(
  configFn: (name: string) => any,
  toolName: string,
  registry: AssistantRegistry
): [string, ToolRegistry] {
  const { name, ...definition } = configFn(toolName);
  return [
    name,
    {
      [name]: messageAssistantTool(name, {
        getAssistant: (assistantName: string) => registry.get(assistantName),
        definition,
      }),
    },
  ];
}
export interface MessageAssistantToolConfig<TName extends string> {
  definition: Omit<AssistantAsToolDefinition<TName>, "name">;
  getAssistant: (assistantName: TName) => Assistant | undefined;
}

export const messageAssistantTool = <TName extends string>(
  toolName: TName,
  { definition, getAssistant }: MessageAssistantToolConfig<TName>
) => ({
  config: toolConfig({ toolName, definition }),
  method: async ({ content }: { content: string }): Promise<string> => {
    const assistant = getAssistant(toolName);
    if (!assistant) return "";
    return (await assistant.message(content)) ?? "";
  },
});

const toolConfig = <TName extends string>({
  toolName,
  definition,
}: {
  toolName: TName;
  definition: Omit<AssistantAsToolDefinition<TName>, "name">;
}): OpenAI.Beta.Assistants.AssistantTool => ({
  type: "function",
  function: {
    name: toolName,
    description: definition.description,
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: definition.messageDescription,
        },
      },
      required: ["content"],
    },
  },
});
