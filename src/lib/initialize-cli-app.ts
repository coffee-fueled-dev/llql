import { type IntrospectionQuery } from "graphql";
import introspection from "../documents/schema.json";
import chalk from "chalk";
import { createInitMap, initializeApp } from "./initialize-app";
import { CLI } from "./cli";

const entrypoint = initializeApp(
  introspection as unknown as IntrospectionQuery,
  "",
  createInitMap()
);

// --- CLI Prompt Loop ---
const cli = new CLI();
const mainLoop = async (response: string) => {
  const ent = await entrypoint;
  const res = await ent?.message(response);
  console.log(chalk.blue(res));
  cli.prompt("", mainLoop);
};

cli.prompt(
  chalk.blue("What would you like to know about your data?"),
  mainLoop
);
