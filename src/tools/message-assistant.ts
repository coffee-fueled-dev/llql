import type { AssistantAsToolDefinition, Assistant } from "../assistants";
import { createToolConfig, type Tool } from ".";
import type { AssistantRegistry } from "../assistants/registry";

export interface MessageAssistantToolConfig<TName extends string> {
  definition: Omit<AssistantAsToolDefinition<TName>, "name">;
  getAssistant: (assistantName: TName) => Assistant | undefined;
}

/**
 * messageAssistantTool now directly builds a tool registry entry.
 * It accepts a config function, the tool name, and a registry.
 * It calls the config function to extract the definition, then returns a ToolRegistry.
 */
export const messageAssistantTool = <TName extends string>(
  toolName: TName,
  configFn: (name: TName) => AssistantAsToolDefinition<TName>,
  registry: AssistantRegistry
): Tool<[{ content: string }]> => {
  const { name, ...definition } = configFn(toolName);
  const config = createToolConfig(name, {
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
  });
  const method = async ({ content }: { content: string }): Promise<string> => {
    const assistant = registry.get(name);
    if (!assistant) return "";
    return (await assistant.message(content)) ?? "";
  };

  return { config, method };
};
