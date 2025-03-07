import type OpenAI from "openai";
import {
  getAssistantResponse,
  type GetAssistantResponseProps,
  type AssistantAsToolDefinition,
} from "../assistants";

interface MessageAssistantToolConfig<TName extends string> {
  definition: Omit<AssistantAsToolDefinition<TName>, "name">;
  getConfig: (
    assistantName: TName
  ) => Partial<GetAssistantResponseProps> | undefined;
}

export const messageAssistantTool = <TName extends string>(
  toolName: TName,
  { definition, getConfig }: MessageAssistantToolConfig<TName>
) => ({
  config: toolConfig({ toolName, definition }),
  method: ({ message }: { message: string; assistantName: TName }) => {
    const config = getConfig(toolName);
    if (!config) return;
    if (config.assistant === undefined) return;
    if (config.thread === undefined) return;
    getAssistantResponse({
      ...config,
      content: message,
    } as GetAssistantResponseProps);
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
