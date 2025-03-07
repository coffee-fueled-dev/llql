import type OpenAI from "openai";

export const requestDataTool = <TName extends string>(toolName: TName) => ({
  config: toolConfig(toolName),
  method: ({
    queryString,
    argumentsJSON,
  }: {
    queryString: string;
    argumentsJSON: string;
  }) => {
    console.log("____QUERY STRING____\n" + queryString);
    console.log("____ARGUMENTS JSON____" + argumentsJSON);

    throw new Error("Exiting early from the request data tool");
  },
});

const toolConfig = <TName extends string>(
  toolName: TName
): OpenAI.Beta.Assistants.AssistantTool => ({
  type: "function",
  function: {
    name: toolName,
    description:
      "Send a graphql query to a pre-determined API endpoint to get live data. " +
      "You can be sure routing is properly configured, so when you have a properly written query, it will work as expected.",
    parameters: {
      type: "object",
      properties: {
        queryString: {
          type: "string",
          description: "A GraphQL operation string to run.",
        },
        argumentsJSON: {
          type: "string",
          description:
            "A JSON string containing all arguments and variables required to execute the query.",
        },
      },
      required: ["content"],
    },
  },
});
