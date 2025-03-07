import {
  Kind,
  print,
  visit,
  type DefinitionNode,
  type DocumentNode,
} from "graphql";
import { withInitializer } from ".";
import type OpenAI from "openai";

export const extractNodeOfKindTool = (
  toolName: string,
  document: DocumentNode
) => ({
  config: toolConfig(toolName),
  method: withInitializer(document, method),
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

const method = (
  document: DocumentNode,
  {
    kind,
    name,
  }: {
    kind: (typeof DefinitionKind)[keyof typeof DefinitionKind];
    name?: string;
  }
) => {
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
      "Extract an SDL snippet for a given type from the GraphQL schema. " +
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
