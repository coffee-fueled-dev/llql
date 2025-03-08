import { type IntrospectionQuery } from "graphql";
import introspection from "./documents/schema.json";
import chalk from "chalk";
import { initializeApp } from "./initialize-app";
import { CLI } from "./cli";
import { uploadFile } from "./upload-file";
import fs from "fs";
import path from "path";
import { env } from "./lib/env";
import type { VectorStore } from "openai/resources/beta/index.mjs";
import { openai } from "./lib/openai";
const { OPENAI_VECTOR_STORE_ID } = env;

// Static business context
const businessContext =
  "Bloom is marketplace network SaaS company that connects companies that buy and sell manufacturing and fulfillment services. " +
  "An example organization in Bloom's partner network would sell warehouse space. " +
  "An example organization in the Bloom's brand network would buy warehouse space from a partner closest to a trade hot-spot or other consideration. " +
  "Bloom facilitates the connection of organizations in the brand and partner network, routes the services necessary to complete a job across partners, and provides some financial services. " +
  "This schema snippet shows queries available for interacting with the Bloom network API. ";

// Initialize the vector store with sone file context if it doesn't already exist
let vs:
  | (VectorStore & {
      _request_id?: string | null;
    })
  | undefined;
if (OPENAI_VECTOR_STORE_ID) {
  vs = await openai.beta.vectorStores.retrieve(OPENAI_VECTOR_STORE_ID);
  // For now, assume the file exists if we find an existing vector store
} else {
  try {
    const fileStream = fs.createReadStream(
      path.join(__dirname, "./documents/bloom_security.md")
    );
    vs = await uploadFile({
      file: fileStream,
      purpose: "assistants",
    });
  } catch (error) {
    vs = undefined;
  }
}

const entrypoint = await initializeApp(
  introspection as unknown as IntrospectionQuery,
  businessContext,
  vs
);

// --- CLI Prompt Loop ---
const cli = new CLI();
const promptAgain = async (response: string) => {
  if (entrypoint) {
    const res = await entrypoint.message(response);
    console.log(chalk.blue(res));
  }
  cli.prompt("", promptAgain);
};

cli.prompt(
  chalk.blue("What would you like to know about your data?"),
  promptAgain
);
