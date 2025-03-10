import { type VectorStoreCreateOrRetrieveParams } from "./openai";
import merge from "lodash.merge";

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

export const createInitializationMap = <T extends Partial<InitializationMap>>(
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
