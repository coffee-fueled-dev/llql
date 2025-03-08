import { type IntrospectionQuery } from "graphql";
import { astTraversalTool, buildSDLContext } from "../tools/ast-traversal";
import { type ProgressMessage } from "../assistants";
import { routerAssistantCreateParams } from "../assistants/router-assistant";
import { AssistantRegistry, registerAssistant } from "../assistants/registry";
import {
  formatQueryAssistantCreateParams,
  formatQueryAssistantToolConfig,
} from "../assistants/format-query-assistant";
import { requestDataTool } from "../tools/request-data";
import chalk from "chalk";
import {
  thoughtPartnerAssistantCreateParams,
  thoughtPartnerAssistantToolConfig,
} from "../assistants/thought-partner-assistant";
import { queryValidationTool } from "../tools/query-validation";
import { mergeTools, registerToolWithName } from "../tools";
import {
  chatObserverAssistantCreateParams,
  chatObserverAssistantToolConfig,
} from "../assistants/chat-observer-assistant";
import {
  createOrRetrieveVectorStore,
  type VectorStoreCreateOrRetrieveParams,
} from "./openai";
import merge from "lodash.merge";
import { messageAssistantTool } from "../tools/message-assistant";

export interface AssistantInitialization {
  name: string;
  id?: { assistant?: string; thread?: string };
}

export interface InitializationMap {
  VECTOR_STORE: VectorStoreCreateOrRetrieveParams;
  CHAT_OBSERVER_ASSISTANT: AssistantInitialization;
  THOUGHT_PARTNER_ASSISTANT: AssistantInitialization;
  QUERY_FORMATTER_ASSISTANT: AssistantInitialization;
  MAIN_ASSISTANT: AssistantInitialization;
  REQUEST_DATA_TOOL: { name: string };
  VALIDATE_QUERY_TOOL: { name: string };
  TRAVERSE_SCHEMA_AST_TOOL: { name: string };
}

export const createInitMap = <T extends Partial<InitializationMap>>(
  initMap?: T
) =>
  merge(
    {},
    {
      VECTOR_STORE: {},
      CHAT_OBSERVER_ASSISTANT: {
        name: "CHAT_OBSERVER_ASSISTANT",
        id: { assistant: undefined, thread: undefined },
      },
      THOUGHT_PARTNER_ASSISTANT: {
        name: "THOUGHT_PARTNER_ASSISTANT",
        id: { assistant: undefined, thread: undefined },
      },
      QUERY_FORMATTER_ASSISTANT: {
        name: "QUERY_FORMATTER_ASSISTANT",
        id: { assistant: undefined, thread: undefined },
      },
      MAIN_ASSISTANT: {
        name: "MAIN_ASSISTANT",
        id: { assistant: undefined, thread: undefined },
      },
      REQUEST_DATA_TOOL: { name: "REQUEST_DATA_TOOL" },
      VALIDATE_QUERY_TOOL: { name: "VALIDATE_QUERY_TOOL" },
      TRAVERSE_SCHEMA_AST_TOOL: { name: "TRAVERSE_SCHEMA_AST_TOOL" },
    },
    initMap
  );

export async function initializeApp(
  introspection: IntrospectionQuery,
  businessContext: string,
  initMap: InitializationMap
) {
  console.log("Setting things up...");

  const vectorStore = await createOrRetrieveVectorStore(initMap.VECTOR_STORE);

  const { sdlContext, documentNode, schema } = await buildSDLContext(
    introspection,
    businessContext
  );

  // Set up the registry and progress message history.
  const registry = new AssistantRegistry();
  const chatHistory: ProgressMessage[] = [];

  // --- Build Message Assistant Tools ---
  const chatObserverAssistantTool = registerToolWithName(
    initMap.CHAT_OBSERVER_ASSISTANT.name,
    (n) => messageAssistantTool(n, chatObserverAssistantToolConfig, registry)
  );
  const thoughtPartnerAssistantTool = registerToolWithName(
    initMap.THOUGHT_PARTNER_ASSISTANT.name,
    (n) => messageAssistantTool(n, thoughtPartnerAssistantToolConfig, registry)
  );
  const formatQueryAssistantTool = registerToolWithName(
    initMap.QUERY_FORMATTER_ASSISTANT.name,
    (n) => messageAssistantTool(n, formatQueryAssistantToolConfig, registry)
  );

  // Other tools.
  const traverseSchema = registerToolWithName(
    initMap.TRAVERSE_SCHEMA_AST_TOOL.name,
    astTraversalTool,
    documentNode
  );
  const requestData = registerToolWithName(
    initMap.REQUEST_DATA_TOOL.name,
    requestDataTool
  );
  const validateQuery = registerToolWithName(
    initMap.VALIDATE_QUERY_TOOL.name,
    queryValidationTool,
    schema
  );

  // --- Progress Handler ---
  const handleProgress = async (message: ProgressMessage) => {
    const assistant = registry.get(initMap.CHAT_OBSERVER_ASSISTANT.name)!;
    chatHistory.push(message);
    if (assistant.busy) return;
    const progress = await assistant.message(
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
    initMap.CHAT_OBSERVER_ASSISTANT.name,
    chatObserverAssistantCreateParams()
  );

  await registerAssistant(
    registry,
    initMap.MAIN_ASSISTANT.name,
    routerAssistantCreateParams(
      mergeTools(
        formatQueryAssistantTool,
        thoughtPartnerAssistantTool,
        requestData,
        validateQuery,
        traverseSchema,
        chatObserverAssistantTool
      ),
      sdlContext,
      vectorStore?.id
    ),
    handleProgress
  );

  await registerAssistant(
    registry,
    initMap.QUERY_FORMATTER_ASSISTANT.name,
    formatQueryAssistantCreateParams(
      mergeTools(
        thoughtPartnerAssistantTool,
        validateQuery,
        traverseSchema,
        chatObserverAssistantTool
      ),
      sdlContext,
      vectorStore?.id
    ),
    handleProgress
  );

  await registerAssistant(
    registry,
    initMap.THOUGHT_PARTNER_ASSISTANT.name,
    thoughtPartnerAssistantCreateParams(
      mergeTools(validateQuery, traverseSchema, chatObserverAssistantTool),
      sdlContext,
      vectorStore?.id
    ),
    handleProgress
  );

  return registry.get(initMap.MAIN_ASSISTANT.name);
}
