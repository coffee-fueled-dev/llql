import type { DocumentNode } from "graphql";
import type OpenAI from "openai";

export interface Tool<TArgs extends any[] = any, R = any> {
  config: OpenAI.Beta.Assistants.AssistantTool;
  method: (...args: TArgs) => R | Promise<R>;
}

// withInitializer takes a DocumentNode and a function that accepts the document
// plus additional arguments. It returns a function that already has the document bound.
export const withInitializer =
  <TArgs extends any[], R>(
    document: DocumentNode,
    fn: (document: DocumentNode, ...args: TArgs) => R
  ): ((...args: TArgs) => R) =>
  (...args: TArgs) =>
    fn(document, ...args);

// The initializeTools helper accepts a mapping of tool initializer functions.
// Each initializer takes a DocumentNode and returns a Tool. We iterate over the keys
// and assert that each assignment is of the expected type.
export function initializeTools<
  T extends Record<string, (doc: DocumentNode) => Tool<any, any>>
>(
  document: DocumentNode,
  toolFactoryMap: T
): Readonly<{ [K in keyof T]: ReturnType<T[K]> }> {
  const tools = {} as { [K in keyof T]: ReturnType<T[K]> };
  for (const key of Object.keys(toolFactoryMap) as Array<keyof T>) {
    tools[key] = toolFactoryMap[key](document) as ReturnType<T[typeof key]>;
  }
  return tools;
}
