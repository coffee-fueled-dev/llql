import { GraphQLError, parse, validate, type GraphQLSchema } from "graphql";
import { createToolConfig, type Tool } from ".";

export const queryValidationTool = <TName extends string>(
  toolName: TName,
  schema: GraphQLSchema
): Tool<[{ queryString: string }]> => {
  const config = createToolConfig(toolName, {
    description:
      "Send a GraphQL query to check if it's valid. Returns a 'valid' flag and any errors if valid is false.",
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
  });

  const method = async ({
    queryString,
  }: {
    queryString: string;
  }): Promise<string> => {
    return validateGraphQLQueryAndVariables({ schema, queryString });
  };

  return { config, method };
};

interface ValidationResponse {
  valid: boolean;
  errors: string[];
}

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
