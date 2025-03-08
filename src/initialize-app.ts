import { type IntrospectionQuery } from "graphql";
import { astTraversalTool, buildSDLContext } from "./tools/ast-traversal";
import { buildMessageTool } from "./tools/message-assistant";
import { type ProgressHandler, type ProgressMessage } from "./assistants";
import { routerAssistantCreateParams } from "./assistants/router-assistant";
import { AssistantRegistry, registerAssistant } from "./assistants/registry";
import {
  formatQueryAssistantCreateParams,
  formatQueryAssistantToolConfig,
} from "./assistants/format-query-assistant";
import { requestDataTool } from "./tools/request-data";
import chalk from "chalk";
import {
  thoughtPartnerAssistantCreateParams,
  thoughtPartnerAssistantToolConfig,
} from "./assistants/thought-partner-assistant";
import { queryValidationTool } from "./tools/query-validation";
import type { ToolRegistry } from "./tools";
import {
  chatObserverAssistantCreateParams,
  chatObserverAssistantToolConfig,
} from "./assistants/chat-observer-assistant";
import type { VectorStore } from "openai/resources/beta/index.mjs";

export async function initializeApp(
  introspection: IntrospectionQuery,
  businessContext: string,
  vectorStore?: VectorStore,
  entrypointAssistantName: string = "ROUTER_ASSISTANT"
) {
  console.log("Setting things up...");

  const { sdlContext, documentNode, schema } = await buildSDLContext(
    introspection,
    businessContext
  );

  // Set up the registry and progress message history.
  const registry = new AssistantRegistry();
  const chatHistory: ProgressMessage[] = [];

  // --- Build Message Assistant Tools ---
  const [observerAssistantName, chatObserverAssistantTool] = buildMessageTool(
    chatObserverAssistantToolConfig,
    "CHAT_OBSERVER_ASSISTANT",
    registry
  );
  const [thoughtPartnerAssistantName, thoughtPartnerAssistantTool] =
    buildMessageTool(
      thoughtPartnerAssistantToolConfig,
      "MESSAGE_THOUGHT_PARTNER",
      registry
    );
  const [formatQueryAssistantToolName, formatQueryAssistantTool] =
    buildMessageTool(formatQueryAssistantToolConfig, "FORMAT_QUERY", registry);

  // Other tools.

  // Build a tool that traverses the GraphQL schema AST.
  const traverseSchema: ToolRegistry = {
    TRAVERSE_SCHEMA_AST: astTraversalTool("TRAVERSE_SCHEMA_AST", documentNode),
  };

  const requestData: ToolRegistry = {
    REQUEST_DATA_TOOL: requestDataTool("REQUEST_DATA_TOOL"),
  };
  const validateQuery: ToolRegistry = {
    QUERY_VALIDATION_TOOL: queryValidationTool("QUERY_VALIDATION_TOOL", schema),
  };

  // --- Progress Handler ---
  const handleProgress: ProgressHandler = async (message) => {
    chatHistory.push(message);
    const observerAssistant = registry.get(observerAssistantName);
    if (!observerAssistant || observerAssistant.busy) return;
    const progress = await observerAssistant.message(
      chatHistory
        .slice()
        .reduce(
          (acc, m, i) => `${acc}\n\nUPDATE ${i + 1}:\n${JSON.stringify(m)}`,
          ""
        )
    );
    console.log(chalk.green(progress));
  };

  // --- Register Assistants ---
  await registerAssistant(
    registry,
    observerAssistantName,
    chatObserverAssistantCreateParams
  );

  await registerAssistant(
    registry,
    entrypointAssistantName,
    routerAssistantCreateParams(
      {
        ...formatQueryAssistantTool,
        ...thoughtPartnerAssistantTool,
        ...requestData,
        ...validateQuery,
        ...traverseSchema,
        ...chatObserverAssistantTool,
      },
      sdlContext,
      vectorStore?.id
    ),
    handleProgress
  );

  await registerAssistant(
    registry,
    formatQueryAssistantToolName,
    formatQueryAssistantCreateParams(
      {
        ...thoughtPartnerAssistantTool,
        ...validateQuery,
        ...traverseSchema,
        ...chatObserverAssistantTool,
      },
      sdlContext,
      vectorStore?.id
    ),
    handleProgress
  );

  await registerAssistant(
    registry,
    thoughtPartnerAssistantName,
    thoughtPartnerAssistantCreateParams(
      {
        ...validateQuery,
        ...traverseSchema,
        ...chatObserverAssistantTool,
      },
      sdlContext,
      vectorStore?.id
    ),
    handleProgress
  );

  return registry.get(entrypointAssistantName);
}
