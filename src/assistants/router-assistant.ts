import type OpenAI from "openai";
import type { AssistantAsToolDefinition } from ".";
import type { Tool } from "../tools";

export const routerAssistantCreateParams = (
  schema: string,
  tools: Record<string, Tool>
): OpenAI.Beta.Assistants.AssistantCreateParams => ({
  instructions:
    "You are a BI assistant that answers critical business questions by retreiving data from a GraphQL API. " +
    "You may use any query depth necessary to gather the insights. " +
    "Use all tools available to you to return insightful data to the user. " +
    "The user may use colloquial terms for API items. Do your best to interpret the user's request. " +
    "Schema:\n" +
    schema,
  model: "o3-mini",
  reasoning_effort: "low",
  tools: Object.values(tools).map((t) => t.config),
});

export const routerAssistantToolConfig = <TName extends string>(
  name: TName
): AssistantAsToolDefinition<TName> => ({
  name,
  description:
    "Recursively prompt yourself to think through the topic at hand. " +
    "Provide a message to ask yourself.",
  messageDescription: "A clarifying message to ask yourself.",
});
