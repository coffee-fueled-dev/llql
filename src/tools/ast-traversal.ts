import {
  Kind,
  print,
  visit,
  parse,
  type DocumentNode,
  type DefinitionNode,
  printSchema,
  buildClientSchema,
  type IntrospectionQuery,
} from "graphql";
import { createToolConfig, type Tool } from ".";

// withInitializer takes a DocumentNode and a function that accepts the document
// plus additional arguments. It returns a function that already has the document bound.
export const withInitializer =
  <TArgs extends any[], R>(
    document: DocumentNode,
    fn: (document: DocumentNode, ...args: TArgs) => R
  ): ((...args: TArgs) => R) =>
  (...args: TArgs) =>
    fn(document, ...args);

export const DefinitionKind = {
  OperationTypeDefinition: Kind.OPERATION_TYPE_DEFINITION,
  OperationDefinition: Kind.OPERATION_DEFINITION,
  ScalarTypeDefinition: Kind.SCALAR_TYPE_DEFINITION,
  ObjectTypeDefinition: Kind.OBJECT_TYPE_DEFINITION,
  FieldDefinition: Kind.FIELD_DEFINITION,
  InterfaceTypeDefinition: Kind.INTERFACE_TYPE_DEFINITION,
  UnionTypeDefinition: Kind.UNION_TYPE_DEFINITION,
  EnumTypeDefinition: Kind.ENUM_TYPE_DEFINITION,
  InputObjectTypeDefinition: Kind.INPUT_OBJECT_TYPE_DEFINITION,
} as const;

/**
 * A helper function that visits a DocumentNode and returns the printed definitions
 * that match the provided criteria.
 */
export const printNodesOfKind = async (
  document: DocumentNode,
  {
    kind,
    name,
  }: {
    kind: (typeof DefinitionKind)[keyof typeof DefinitionKind];
    name?: string;
  }
): Promise<string> => {
  const entries: DefinitionNode[] = [];
  visit(document, {
    [kind](node: DefinitionNode) {
      if (name && "name" in node && node.name?.value !== name) return;
      entries.push(node);
    },
  });
  return print({ ...document, definitions: entries });
};

// ---------------------------------------------------------------------------
// The AST Traversal Tool
// ---------------------------------------------------------------------------

/**
 * The astTraversalTool creates a tool that traverses the GraphQL AST.
 * It returns a Tool whose method accepts a single parameter—a tuple with an object
 * containing the desired `kind` (and optional `name`) for filtering.
 *
 * @param toolName - The name for this tool.
 * @param document - The DocumentNode representing the GraphQL AST.
 * @returns A Tool that conforms to the unified interface.
 */
export const astTraversalTool = <TName extends string>(
  toolName: TName,
  document: DocumentNode
): Tool<
  [
    {
      kind: (typeof DefinitionKind)[keyof typeof DefinitionKind];
      name?: string;
    }
  ]
> => {
  // Use the common helper to create the tool configuration.
  const config = createToolConfig(toolName, {
    description:
      "Traverse the GraphQL AST for matching node kinds by typename and extract relevant SDL snippets. " +
      "The snippets include the complete GraphQL type definition for the matched entity. " +
      "Provide the desired kind and an optional name to retrieve matching GraphQL entities.",
    parameters: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: Object.values(DefinitionKind),
          description:
            "The kind of definition to extract (for example, ObjectTypeDefinition).",
        },
        name: {
          type: "string",
          description:
            "Optionally, a specific name to filter the schema context.",
        },
      },
      required: ["kind"],
    },
  });

  return {
    config,
    // Bind the document to the printNodesOfKind function.
    method: withInitializer(document, printNodesOfKind),
  };
};

export async function buildSDLContext(
  introspection: IntrospectionQuery,
  businessContext: string
) {
  // Build the GraphQL schema and obtain its SDL.
  const schema = buildClientSchema(introspection);
  const sdl = printSchema(schema);
  const documentNode = parse(sdl);

  // Retrieve the Query definitions.
  const sdlQueries = await printNodesOfKind(documentNode, {
    kind: DefinitionKind.ObjectTypeDefinition,
    name: "Query",
  });

  const sdlContext =
    "\nBusiness Context:\n" +
    businessContext +
    "\nGraphQL Queries:\n" +
    sdlQueries;

  return { sdlContext, documentNode, schema };
}
