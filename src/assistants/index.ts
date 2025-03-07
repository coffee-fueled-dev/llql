import type OpenAI from "openai";
import type { Tool } from "../tools";
import { openai } from "../lib/openai";
import type { RequestOptions } from "openai/core.mjs";

export interface AssistantAsToolDefinition<T extends string = string> {
  name: T;
  description: string;
  messageDescription: string;
}

/**
 * The BIAssistant class encapsulates an assistant, its conversation thread, and the available tools.
 * The `message` method sends a message to the thread, processes any tool calls, and prints the final response.
 */
export class Assistant<T extends Record<string, Tool> = Record<string, Tool>> {
  public assistant: OpenAI.Beta.Assistant;
  public thread: OpenAI.Beta.Thread;
  public tools?: T;

  // Private constructor – use the static create() method to instantiate.
  private constructor(
    assistant: OpenAI.Beta.Assistant,
    thread: OpenAI.Beta.Thread,
    tools?: T
  ) {
    this.assistant = assistant;
    this.thread = thread;
    this.tools = tools;
  }

  /**
   * Creates an instance of BIAssistant.
   * @param initialContext Additional instructions to include in the assistant’s context.
   * @param tools An object mapping tool names to their implementations.
   */
  static async create<T extends Record<string, Tool>>(
    assistantParams: OpenAI.Beta.Assistants.AssistantCreateParams,
    tools?: T,
    requestOptions?: RequestOptions
  ): Promise<Assistant<T>> {
    const assistant = await openai.beta.assistants.create(
      assistantParams,
      requestOptions
    );

    const thread = await openai.beta.threads.create();

    return new Assistant<T>(assistant, thread, tools);
  }

  /**
   * Sends a message to the assistant and processes the response.
   * If the assistant’s final response indicates further messaging (e.g. begins with "NEXT:"),
   * the method calls itself recursively.
   *
   * @param content The message to send.
   */
  async message(
    content: string
  ): Promise<OpenAI.Beta.Threads.Messages.Message[] | undefined> {
    const res = await getAssistantResponse({
      assistant: this.assistant,
      thread: this.thread,
      tools: this.tools,
      content,
    });

    return res;
  }
}

export interface GetAssistantResponseProps {
  assistant: OpenAI.Beta.Assistant;
  thread: OpenAI.Beta.Thread;
  content: string;
  tools?: Record<string, Tool>;
}

export const getAssistantResponse = async ({
  assistant,
  thread,
  tools,
  content,
}: GetAssistantResponseProps) => {
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content,
  });

  // 6. Initiate a run on the thread (here using a polling approach)
  let run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id,
  });

  // 7. Check for a function call from the assistant and process it.
  if (run.status === "requires_action") {
    const toolCalls = run.required_action?.submit_tool_outputs.tool_calls;
    if (!toolCalls) return;
    const toolOutputs = [];
    for (const call of toolCalls) {
      console.log(
        `\nTool call: ${call.function.name}\nArguments: ${call.function.arguments}`
      );
      try {
        if (!tools)
          throw new Error(
            `A tool was requested but none were defined: ${call.function.name}`
          );
        if (!(call.function.name in tools))
          throw new Error(`Unrecognized tool call: ${call.function.name}`);
        const knownTool = call.function.name as keyof typeof tools;

        const output = await tools[knownTool].method(
          JSON.parse(call.function.arguments)
        );

        console.log(output);

        toolOutputs.push({ tool_call_id: call.id, output });
      } catch (error) {
        if (!(error instanceof Error)) return;
        console.error(error.message);
        throw new Error(`Failed to complete tool call: ${error}`);
      }
    }
    // Submit the tool outputs so the assistant can continue processing.
    run = await openai.beta.threads.runs.submitToolOutputsAndPoll(
      thread.id,
      run.id,
      { tool_outputs: toolOutputs }
    );
  }

  // 8. Finally, retrieve and display the assistant's final response.
  const messages = await openai.beta.threads.messages.list(thread.id);
  return messages.data;
};
