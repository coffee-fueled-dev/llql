import {
  Kind,
  print,
  visit,
  type DefinitionNode,
  type DocumentNode,
  buildClientSchema,
  parse,
  printSchema,
  type IntrospectionQuery,
} from "graphql";
import { withInitializer } from ".";
import type OpenAI from "openai";

export async function buildSDLContext(
  introspection: IntrospectionQuery,
  businessContext: string
) {
  // Build the GraphQL schema and parse the SDL.
  const schema = buildClientSchema(introspection);
  const sdl = printSchema(schema);
  const dn = parse(sdl);

  // Retrieve the Query definitions from the schema.
  const sdlQueries = await printNodesOfKind(dn, {
    kind: DefinitionKind["ObjectTypeDefinition"],
    name: "Query",
  });

  const sdlContext =
    "\nBusiness Context:\n" +
    businessContext +
    "\nGraphQL Queries:\n" +
    sdlQueries;

  return { sdlContext, documentNode: dn, schema };
}

export const astTraversalTool = (toolName: string, document: DocumentNode) => ({
  config: toolConfig(toolName),
  method: withInitializer(document, printNodesOfKind),
});

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

const toolConfig = (
  toolName: string
): OpenAI.Beta.Assistants.AssistantTool => ({
  type: "function",
  function: {
    name: toolName,
    description:
      "Traverse the GraphQL AST for matching node kinds by typename and extract relevant SDL snippets." +
      "The snippets will include the complete graphql type definition for a matched GraphQL entity " +
      "Provide the desired kind and optional name descriminator to retrieve matching GraphQL entities.",
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
            "Optionally, a specific name for which to extract schema context.",
        },
      },
      required: ["kind"],
    },
  },
});
