import type { AssistantAsToolDefinition, AssistantCreateParams } from ".";
import type { ToolRegistry } from "../tools";

export const thoughtPartnerAssistantCreateParams = <T extends ToolRegistry>(
  tools: T,
  SDLContext: string,
  vectorStoreId?: string
): AssistantCreateParams<T> => ({
  tools,
  openaiParams: {
    instructions:
      "You are the thought partner for the leader of a team of BI assistants. " +
      "Users ask the team leader colloquial questions about their business data, and their job is to use tools and team members to find the insight they're looking for. " +
      "The team leader may reach out to you to think more deeply about user questions. " +
      "You should do your best to help them find the right solution or next steps. " +
      "Assume the GraphQL schema cannot be modified. " +
      "Use query patterns of arbitrary depth. " +
      "Keep your responses insightful and clear, but minimal enough to lead to a definite solution. " +
      "Here's some information about the GraphQL schema:\n" +
      SDLContext,
    model: "o3-mini",
    reasoning_effort: "medium",
    tools: Object.values(tools).map((t) => t.config),
    tool_resources: vectorStoreId
      ? { file_search: { vector_store_ids: [vectorStoreId] } }
      : undefined,
  },
});

export const thoughtPartnerAssistantToolConfig = <TName extends string>(
  name: TName
): AssistantAsToolDefinition<TName> => ({
  name,
  description:
    "Message a deeply intelligent thought partner to help find the best solution or path forward to answering the user's question. " +
    "Provide a message to ask the thought partner.",
  messageDescription: "A clarifying message to ask the thought partner.",
});
