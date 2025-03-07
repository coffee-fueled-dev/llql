import type { Assistant } from ".";

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
  public register(key: string, props: Assistant): void {
    this.registry.set(key, props);
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
