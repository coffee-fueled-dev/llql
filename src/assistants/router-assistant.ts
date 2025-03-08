import type { ToolRegistry } from "../tools";
import type { AssistantCreateParams } from ".";

export const routerAssistantCreateParams = <T extends ToolRegistry>(
  tools: T,
  SDLContext: string,
  vectorStoreId?: string,
  ids?: { thread: string; assistant: string }
): AssistantCreateParams<T> => ({
  tools,
  assistantCreateOrRetrieveParams: ids?.assistant
    ? { id: ids.assistant }
    : {
        instructions:
          "You are the leader of a team of BI assistants. " +
          "Users ask you colloquial questions about their business data, and your job is to use your tools and assistants to find the insight they're looking for. " +
          "Use a multi-step approach to fully answer the user's question with relevant data. " +
          "When a user asks a question about their data, you should use your schema interpretation tool to determine the best way to answer the user's question using the available queries. " +
          "Assume the GraphQL schema cannot be modified. " +
          "Use query patterns of arbitrary depth. " +
          "Interpret the user's question using your available tools and best assumptions without asking them for additional input. " +
          "After you understand how to answer the user's question, delegate to the query writer to format and validate the query. " +
          "Only after ensuring the query is valid, request data from the API and interpret the results with your thought partner before answering the user. " +
          "You can repeat the process for multiple queries if necessary. " +
          "Here's some information about the GraphQL schema:\n" +
          SDLContext,
        model: "gpt-4-turbo",
        tools: Object.values(tools).map((t) => t.config),
        tool_resources: vectorStoreId
          ? { file_search: { vector_store_ids: [vectorStoreId] } }
          : undefined,
      },
  threadCreateOrRetrieveParams: ids?.thread ? { id: ids.thread } : {},
});
