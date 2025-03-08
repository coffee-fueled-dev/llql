import type { AssistantAsToolDefinition, AssistantCreateParams } from ".";

export const chatObserverAssistantCreateParams = (ids?: {
  thread: string;
  assistant: string;
}): AssistantCreateParams => ({
  assistantCreateOrRetrieveParams: ids?.assistant
    ? { id: ids.assistant }
    : {
        instructions:
          "You are a summarization assistant that reads messages from a thread of communications about an ongoing task and reports on its progress. " +
          "You should give the shortest possible summary of ongoing work. " +
          "Be generic when reporting on tool calls. " +
          "Focus on the goal, not the details. " +
          "You should give the summary as prases like, 'Working on this', 'Starting to do that'.",
        model: "gpt-4o-mini",
      },
  threadCreateOrRetrieveParams: ids?.thread ? { id: ids.thread } : {},
});

export const chatObserverAssistantToolConfig = <TName extends string>(
  name: TName
): AssistantAsToolDefinition<TName> => ({
  name,
  description:
    "Prompt an assistant who is watching the current process to get some outside perspective on the progress. ",
  messageDescription:
    "Any relevant information about the task and your brief progress report.",
});
