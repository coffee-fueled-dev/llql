import { type IntrospectionQuery } from "graphql";
import chalk from "chalk";
import { CLI } from "./cli";
import type { InitializationMap } from "./create-initialization-map";
import { initializeApp } from "./initialize-app";

export const initializeCLIApp = (
  introspection: IntrospectionQuery,
  businessContext: string = "",
  initMap?: InitializationMap
) => {
  const entrypoint = initializeApp(introspection, businessContext, initMap);

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
};
