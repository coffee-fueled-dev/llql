import { type IntrospectionQuery } from "graphql";
import introspection from "./documents/schema.json";
import chalk from "chalk";
import { createInitMap, initializeApp } from "./lib/initialize-app";
import { CLI } from "./lib/cli";

// Static business context
const businessContext =
  "Bloom is marketplace network SaaS company that connects companies that buy and sell manufacturing and fulfillment services. " +
  "An example organization in Bloom's partner network would sell warehouse space. " +
  "An example organization in the Bloom's brand network would buy warehouse space from a partner closest to a trade hot-spot or other consideration. " +
  "Bloom facilitates the connection of organizations in the brand and partner network, routes the services necessary to complete a job across partners, and provides some financial services. " +
  "This schema snippet shows queries available for interacting with the Bloom network API. ";

const entrypoint = initializeApp(
  introspection as unknown as IntrospectionQuery,
  businessContext,
  createInitMap()
);

// --- CLI Prompt Loop ---
const cli = new CLI();
const promptAgain = async (response: string) => {
  const ent = await entrypoint;
  const res = await ent?.message(response);
  console.log(chalk.blue(res));
  cli.prompt("", promptAgain);
};

cli.prompt(
  chalk.blue("What would you like to know about your data?"),
  promptAgain
);
