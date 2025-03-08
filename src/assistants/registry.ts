import { Assistant, type AssistantCreateParams, type ProgressHandler } from ".";
import type { ToolRegistry } from "../tools";

export class AssistantRegistry {
  private registry: Map<string, Assistant>;

  constructor() {
    this.registry = new Map();
  }

  /**
   * Registers an assistant by its key.
   * @param key A unique string key for the assistant.
   * @param props The assistant properties (excluding "content").
   */
  public register(key: string, assistant: Assistant): void {
    this.registry.set(key, assistant);
  }

  /**
   * Retrieves the assistant properties by key.
   * @param key The unique string key for the assistant.
   * @returns The assistant properties if found, or undefined.
   */
  public get(key: string): Assistant | undefined {
    return this.registry.get(key);
  }
}

/**
 * registerAssistant creates an assistant using the provided parameters,
 * then registers it under the given name in the registry.
 */
export async function registerAssistant(
  registry: AssistantRegistry,
  name: string,
  {
    tools,
    assistantCreateOrRetrieveParams,
    threadCreateOrRetrieveParams,
  }: AssistantCreateParams<ToolRegistry | undefined>,
  onProgress?: ProgressHandler
) {
  const assistant = await Assistant.create({
    assistantParams: assistantCreateOrRetrieveParams,
    threadParams: threadCreateOrRetrieveParams,
    name,
    ...(tools ? { tools } : {}),
    ...(onProgress ? { onProgress } : {}),
  });
  registry.register(name, assistant);
}
