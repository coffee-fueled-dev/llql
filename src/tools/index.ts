import type { DocumentNode } from "graphql";
import type OpenAI from "openai";

export interface Tool<TArgs extends any[] = any> {
  config: OpenAI.Beta.Assistants.AssistantTool;
  method: (...args: TArgs) => Promise<string>;
}

export type ToolRegistry = Record<string, Tool>;

// withInitializer takes a DocumentNode and a function that accepts the document
// plus additional arguments. It returns a function that already has the document bound.
export const withInitializer =
  <TArgs extends any[], R>(
    document: DocumentNode,
    fn: (document: DocumentNode, ...args: TArgs) => R
  ): ((...args: TArgs) => R) =>
  (...args: TArgs) =>
    fn(document, ...args);
