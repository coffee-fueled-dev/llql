import { createToolConfig, type Tool } from ".";

export const requestDataTool = <TName extends string>(
  toolName: TName
): Tool<[{ queryString: string }]> => {
  const config = createToolConfig(toolName, {
    description:
      "Send a GraphQL query to a pre-determined API endpoint to get live data. " +
      "You can be sure routing is properly configured, so when you have a properly written query, it will work as expected.",
    parameters: {
      type: "object",
      properties: {
        queryString: {
          type: "string",
          description: "A GraphQL operation string to run.",
        },
      },
      required: ["queryString"],
    },
  });

  const method = async ({
    queryString,
  }: {
    queryString: string;
  }): Promise<string> => {
    console.log("____QUERY STRING____\n" + queryString);
    throw new Error("Exiting early from the request data tool");
  };

  return { config, method };
};
