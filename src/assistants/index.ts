import type OpenAI from "openai";
import type { ToolRegistry } from "../tools";
import { openai } from "../lib/openai";
import type { RequestOptions } from "openai/core.mjs";
import type { Run } from "openai/resources/beta/threads/index.mjs";

export interface AssistantCreateParams<
  T extends ToolRegistry | undefined = undefined
> {
  openaiParams: OpenAI.Beta.Assistants.AssistantCreateParams;
  tools?: T;
}

export interface ProgressMessage {
  message: string;
  type: "assistant-response" | "tool-call" | "tool-response" | "error";
  errors?: Error[];
}
export type ProgressHandler = (props: ProgressMessage) => void;

export interface AssistantAsToolDefinition<T extends string = string> {
  name: T;
  description: string;
  messageDescription: string;
}

/**
 * The Assistant class encapsulates an assistant, its conversation thread, and the available tools.
 * It sends messages to the thread, processes any tool calls, and pipes incremental progress
 * messages via an event handler.
 */
export class Assistant<T extends ToolRegistry = ToolRegistry> {
  public busy: boolean = false;

  private constructor(
    public assistant: OpenAI.Beta.Assistant,
    public thread: OpenAI.Beta.Thread,
    public name: string,
    public tools?: T,
    public onProgress?: ProgressHandler
  ) {}

  /**
   * Creates an instance of Assistant.
   */
  static async create<T extends ToolRegistry>({
    assistantParams,
    tools,
    name,
    requestOptions,
    onProgress,
  }: {
    assistantParams: OpenAI.Beta.Assistants.AssistantCreateParams;
    tools?: T;
    name: string;
    requestOptions?: RequestOptions;
    onProgress?: ProgressHandler;
  }): Promise<Assistant<T>> {
    const assistant = await openai.beta.assistants.create(
      assistantParams,
      requestOptions
    );
    const thread = await openai.beta.threads.create();
    return new Assistant<T>(assistant, thread, name, tools, onProgress);
  }

  /**
   * Sends a message to the assistant and returns the assistant's response.
   */
  async message(content: string): Promise<string | undefined> {
    if (this.busy) {
      return "I'm working on something else right now. Ask me again later.";
    }
    this.busy = true;
    const response = await this.getAssistantResponse(content);
    this.busy = false;
    return response;
  }

  /**
   * Private helper to obtain the assistant response. Logs the user message, initiates the run,
   * resolves any tool calls if necessary, and then returns the final response.
   */
  private async getAssistantResponse(
    content: string
  ): Promise<string | undefined> {
    // Log the user message.
    await openai.beta.threads.messages.create(this.thread.id, {
      role: "user",
      content,
    });

    // Start the run on the thread.
    let run = await openai.beta.threads.runs.createAndPoll(this.thread.id, {
      assistant_id: this.assistant.id,
    });

    // If the assistant requires tool calls, resolve them.
    if (run.status === "requires_action" && this.tools) {
      const toolCalls = run.required_action?.submit_tool_outputs.tool_calls;
      if (toolCalls) {
        run = await this.resolveToolCalls(run, toolCalls);
      }
    }

    // Retrieve all messages from the thread and return the last assistant message.
    const messages = await openai.beta.threads.messages.list(this.thread.id);
    return this.getLastMessage(messages, run);
  }

  /**
   * Private helper to resolve tool calls recursively.
   */
  private async resolveToolCalls(
    run: Run,
    toolCalls: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall[]
  ): Promise<Run> {
    const toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[] =
      [];

    for (const call of toolCalls) {
      const toolCallMsg = `\nTOOL CALL: ${call.function.name}\nARGUMENTS: ${call.function.arguments}\nBY ASSISTANT: ${this.name}`;
      this.reportProgress({ message: toolCallMsg, type: "tool-call" });

      try {
        if (!this.tools || !(call.function.name in this.tools)) {
          throw new Error(`Unrecognized tool call: ${call.function.name}`);
        }
        const knownTool = call.function.name as keyof typeof this.tools;
        const output = await this.tools[knownTool].method(
          JSON.parse(call.function.arguments)
        );
        const nullResponseMessage = `Received no output from tool ${call.function.name}`;
        const cleanOutput =
          output === null || output === undefined
            ? nullResponseMessage
            : output;

        this.reportProgress({
          message: cleanOutput,
          type: "tool-response",
        });
        toolOutputs.push({ tool_call_id: call.id, output: cleanOutput });
      } catch (error) {
        const errOutput =
          error instanceof Error
            ? `Failed to complete tool call: ${error.message}`
            : `Failed to complete tool call: ${error}`;
        this.reportProgress({ message: errOutput, type: "error" });
        toolOutputs.push({ tool_call_id: call.id, output: errOutput });
      }
    }

    const toolResponse =
      await openai.beta.threads.runs.submitToolOutputsAndPoll(
        this.thread.id,
        run.id,
        { tool_outputs: toolOutputs }
      );

    if (toolResponse.status === "requires_action") {
      const newToolCalls =
        toolResponse.required_action?.submit_tool_outputs.tool_calls;
      if (newToolCalls) {
        return await this.resolveToolCalls(toolResponse, newToolCalls);
      }
    }
    return toolResponse;
  }

  /**
   * Private helper to extract the last assistant message from the thread messages.
   */
  private getLastMessage(
    messages: OpenAI.Beta.Threads.Messages.MessagesPage,
    run: Run
  ): string | undefined {
    const lastMessageForRun = messages.data
      .filter(
        (message) => message.run_id === run.id && message.role === "assistant"
      )
      .pop();
    return textMessage(lastMessageForRun?.content[0])?.text.value;
  }

  /**
   * Private helper to report progress messages via the onProgress callback.
   */
  private reportProgress(progress: ProgressMessage): void {
    this.onProgress?.(progress);
  }
}

/**
 * Helper to return text content if the message type is "text".
 */
export const textMessage = (
  content?: OpenAI.Beta.Threads.Messages.MessageContent
) => (content?.type === "text" ? content : undefined);
