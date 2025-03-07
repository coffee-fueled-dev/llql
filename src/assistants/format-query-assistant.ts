import type OpenAI from "openai";
import type { AssistantAsToolDefinition } from ".";
import type { Tool } from "../tools";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod.mjs";

export const formatQueryAssistantCreateParams = (
  schemaQueries: string,
  tools: Record<string, Tool>
): OpenAI.Beta.Assistants.AssistantCreateParams => ({
  instructions:
    "You are a helpful assistant that writes GraphQL queries that retrieve data to answer critical business questions. " +
    "Respond with a JSON object that adheres to the provided schema." +
    "Refer to the provided GraphQL queries and use the available tools to get more context if needed." +
    "Available GraphQL Queries:\n" +
    schemaQueries,
  model: "o3-mini",
  reasoning_effort: "low",
  response_format: zodResponseFormat(GraphQLQuery, "graphql_schema"),
  tools: Object.values(tools).map((t) => t.config),
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

const GraphQLQueryLayer = z.union([
  z.record(z.string()),
  z.array(z.record(z.string())),
  z.string(),
]);

const GraphQLQuery = z.object({
  query: z
    .string()
    .describe(
      "The GraphQL query string, which may add arguments as graphql variables."
    ),
  variables: z
    .record(GraphQLQueryLayer)
    .describe(
      "An object of arguments, including where clauses, sorts and other graphql variables."
    ),
});
