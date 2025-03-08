import type OpenAI from "openai";

export interface Tool<TArgs extends any[] = any> {
  config: OpenAI.Beta.Assistants.AssistantTool;
  method: (...args: TArgs) => Promise<string>;
}

export type ToolRegistry<
  N extends string = string,
  T extends Tool = Tool
> = Record<N, T>;

export function registerToolWithName<
  N extends string,
  A extends any[],
  T extends Tool
>(
  name: N,
  toolFactory: (name: N, ...args: A) => T,
  ...args: A
): { [K in N]: T } {
  return { [name]: toolFactory(name, ...args) } as { [K in N]: T };
}

export interface ToolConfigOptions {
  description: string;
  parameters: OpenAI.Beta.Assistants.FunctionTool["function"]["parameters"];
}

export function createToolConfig<TName extends string>(
  toolName: TName,
  options: ToolConfigOptions
): OpenAI.Beta.Assistants.AssistantTool {
  return {
    type: "function",
    function: {
      name: toolName,
      description: options.description,
      parameters: options.parameters,
    },
  };
}

export function mergeTools(...registries: ToolRegistry[]): ToolRegistry {
  return registries.reduce(
    (acc, reg) => ({ ...acc, ...reg }),
    {} as ToolRegistry
  );
}
