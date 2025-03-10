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
import { createOrRetrieveVectorStore } from "./openai";
import { messageAssistantTool } from "../tools/message-assistant";
import {
  createInitializationMap,
  type InitializationMap,
} from "./create-initialization-map";

export async function initializeApp(
  introspection: IntrospectionQuery,
  businessContext: string = "",
  initMap?: InitializationMap
) {
  const mergedInitMap = createInitializationMap(initMap);

  console.log("Setting things up...");

  const vectorStore = await createOrRetrieveVectorStore(
    mergedInitMap.VECTOR_STORE
  );

  const { sdlContext, documentNode, schema } = await buildSDLContext(
    introspection,
    businessContext
  );

  // Set up the registry and progress message history.
  const registry = new AssistantRegistry();
  const chatHistory: ProgressMessage[] = [];

  // --- Build Message Assistant Tools ---
  const chatObserverAssistantTool = registerToolWithName(
    mergedInitMap.CHAT_OBSERVER_ASSISTANT.name,
    (n) => messageAssistantTool(n, chatObserverAssistantToolConfig, registry)
  );
  const thoughtPartnerAssistantTool = registerToolWithName(
    mergedInitMap.THOUGHT_PARTNER_ASSISTANT.name,
    (n) => messageAssistantTool(n, thoughtPartnerAssistantToolConfig, registry)
  );
  const formatQueryAssistantTool = registerToolWithName(
    mergedInitMap.QUERY_FORMATTER_ASSISTANT.name,
    (n) => messageAssistantTool(n, formatQueryAssistantToolConfig, registry)
  );

  // Other tools.
  const traverseSchema = registerToolWithName(
    mergedInitMap.TRAVERSE_SCHEMA_AST_TOOL.name,
    astTraversalTool,
    documentNode
  );
  const requestData = registerToolWithName(
    mergedInitMap.REQUEST_DATA_TOOL.name,
    requestDataTool
  );
  const validateQuery = registerToolWithName(
    mergedInitMap.VALIDATE_QUERY_TOOL.name,
    queryValidationTool,
    schema
  );

  // --- Progress Handler ---
  const handleProgress = async (message: ProgressMessage) => {
    const assistant = registry.get(mergedInitMap.CHAT_OBSERVER_ASSISTANT.name)!;
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
    mergedInitMap.CHAT_OBSERVER_ASSISTANT.name,
    chatObserverAssistantCreateParams()
  );

  await registerAssistant(
    registry,
    mergedInitMap.MAIN_ASSISTANT.name,
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
    mergedInitMap.QUERY_FORMATTER_ASSISTANT.name,
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
    mergedInitMap.THOUGHT_PARTNER_ASSISTANT.name,
    thoughtPartnerAssistantCreateParams(
      mergeTools(validateQuery, traverseSchema, chatObserverAssistantTool),
      sdlContext,
      vectorStore?.id
    ),
    handleProgress
  );

  return registry.get(mergedInitMap.MAIN_ASSISTANT.name);
}
