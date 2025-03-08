import {
  getVariableValues,
  GraphQLError,
  parse,
  validate,
  type GraphQLSchema,
} from "graphql";
import type OpenAI from "openai";

export const queryValidationTool = <TName extends string>(
  toolName: TName,
  schema: GraphQLSchema
) => ({
  config: toolConfig(toolName),
  method: async ({ queryString }: { queryString: string }) =>
    validateGraphQLQueryAndVariables({ schema, queryString }),
});

const toolConfig = <TName extends string>(
  toolName: TName
): OpenAI.Beta.Assistants.AssistantTool => ({
  type: "function",
  function: {
    name: toolName,
    description:
      "Send a GraphQL query to check if it's valid. " +
      "Returns a 'valid' flag and any errors if valid is false. ",
    parameters: {
      type: "object",
      properties: {
        queryString: {
          type: "string",
          description: "A GraphQL operation string to validate.",
        },
      },
      required: ["queryString"],
    },
  },
});

interface ValidationResponse {
  valid: boolean;
  errors: string[];
}

// Function to validate both the query and variable values.
function validateGraphQLQueryAndVariables({
  schema,
  queryString,
}: {
  schema: GraphQLSchema;
  queryString: string;
}): string {
  let validationResponse: ValidationResponse = {
    valid: true,
    errors: [],
  };

  try {
    // Parse the query string into an AST.
    const ast = parse(queryString);

    // Validate the AST against the schema.
    const errors = validate(schema, ast);
    if (errors.length > 0) {
      validationResponse = {
        valid: false,
        errors: errors.map(({ message }) => message),
      };
    }

    // Find the operation definition that contains variable definitions.
    // const operationDefinition = ast.definitions.find(
    //   (def) => def.kind === "OperationDefinition"
    // );

    // if (
    //   operationDefinition &&
    //   "variableDefinitions" in operationDefinition &&
    //   operationDefinition.variableDefinitions
    // ) {
    //   // Validate the provided variable values against the variable definitions.
    //   const variableErrors = getVariableValues(
    //     schema,
    //     operationDefinition.variableDefinitions,
    //     JSON.parse(argumentsJSON)
    //   );
    //   validationResponse = {
    //     valid: false,
    //     errors: variableErrors.errors || [],
    //   };
    // }

    return JSON.stringify(validationResponse);
  } catch (error) {
    validationResponse = {
      valid: false,
      errors: [
        new GraphQLError(`Failed to validate GraphQL query:\n${error}`).message,
      ],
    };
    console.log(validationResponse);
    return JSON.stringify(validationResponse);
  }
}
