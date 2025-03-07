import {
  buildClientSchema,
  parse,
  printSchema,
  type IntrospectionQuery,
} from "graphql";
import introspection from "../schema.json";
import {
  DefinitionKind,
  extractNodeOfKindTool,
} from "./tools/extract-nodes-of-kind";
import { messageAssistantTool } from "./tools/message-assistant";
import { CLI } from "./cli";
import { Assistant } from "./assistants";
import {
  routerAssistantCreateParams,
  routerAssistantToolConfig,
} from "./assistants/router-assistant";
import { AssistantRegistry } from "./assistants/registry";
import { formatQueryAssistantToolConfig } from "./assistants/format-query-assistant";
import { requestDataTool } from "./tools/request-data";

const schema = buildClientSchema(
  introspection as unknown as IntrospectionQuery
);
const sdl = printSchema(schema);
const dn = parse(sdl);

const cli = new CLI();

const registry = new AssistantRegistry();

const commonTools = {
  EXTRACT_NODE_OF_KIND: extractNodeOfKindTool("EXTRACT_NODE_OF_KIND", dn),
  REQUEST_DATA_TOOL: requestDataTool("REQUEST_DATA_TOOL"),
};

const { name: routerAssistantToolName, ...routerAssistantDefinition } =
  routerAssistantToolConfig("MESSAGE_SELF");

const {
  name: formatQueryAssistantToolName,
  ...formatQueryAssistantDefinition
} = formatQueryAssistantToolConfig("FORMAT_QUERY");

const routerAssistantTool = {
  [routerAssistantToolName]: messageAssistantTool(routerAssistantToolName, {
    getConfig: (assistantName) => registry.get(assistantName),
    definition: routerAssistantDefinition,
  }),
};
const formatQueryAssistantTool = {
  [formatQueryAssistantToolName]: messageAssistantTool(
    formatQueryAssistantToolName,
    {
      getConfig: (assistantName) => registry.get(assistantName),
      definition: formatQueryAssistantDefinition,
    }
  ),
};

const schemaTypes = commonTools["EXTRACT_NODE_OF_KIND"].method({
  kind: DefinitionKind["ObjectTypeDefinition"],
});

const allTools = {
  ...commonTools,
  ...routerAssistantTool,
  ...formatQueryAssistantTool,
};

console.log("Setting things up...");

registry.register(
  routerAssistantToolName,
  await Assistant.create(
    routerAssistantCreateParams(schemaTypes, allTools),
    allTools
  )
);

await registry
  .get(routerAssistantToolName)
  ?.message("What tools can you use to get relevant data for me?");

registry.register(
  formatQueryAssistantToolName,
  await Assistant.create(
    routerAssistantCreateParams(schemaTypes, allTools),
    allTools
  )
);

const promptAgain = async (response: string) => {
  const res = await registry.get(routerAssistantToolName)?.message(response);
  const responseContent = res?.flatMap(({ content }) =>
    content.map((c) => c.type === "text" && c.text.value).filter(Boolean)
  );
  if (responseContent) {
    console.log(responseContent[0]);
  } else console.log("Failed to get a response...");

  cli.prompt("", promptAgain);
};

cli.prompt("What would you like to know about your data?", promptAgain);
