import type { AssistantAsToolDefinition, AssistantCreateParams } from ".";
import type { ToolRegistry } from "../tools";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod.mjs";

export const formatQueryAssistantCreateParams = <T extends ToolRegistry>(
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
          "You are a BI assistant that writes queries that could be used to answer critical business questions. " +
          "You may use any query depth necessary to write the query. " +
          "Double check your graphql query against the schema, using tools to extract context as necessary. " +
          "Assume the GraphQL schema cannot be modified. " +
          "When you have successfully validated the query, respond to the user with a JSON object that adheres to the provided schema." +
          "Here's some information about the GraphQL schema:\n" +
          SDLContext,
        model: "o3-mini",
        reasoning_effort: "medium",
        response_format: zodResponseFormat(GraphQLQuery, "graphql_schema"),
        tools: Object.values(tools).map((t) => t.config),
        tool_resources: vectorStoreId
          ? { file_search: { vector_store_ids: [vectorStoreId] } }
          : undefined,
      },
  threadCreateOrRetrieveParams: ids?.thread ? { id: ids.thread } : {},
});

export const formatQueryAssistantToolConfig = <TName extends string>(
  name: TName
): AssistantAsToolDefinition<TName> => ({
  name,
  description:
    "Prompt a query writer assistant to get a well-structured graphql query. " +
    "Provide a message to the assistant that has all context needed to write the query.",
  messageDescription:
    "Any relevant document parts or other context that would be useful writing a graphql request to answer the user's question.",
});

const GraphQLQuery = z.object({
  query: z
    .string()
    .describe(
      "The GraphQL query string, which may add arguments as graphql variables."
    ),
});
