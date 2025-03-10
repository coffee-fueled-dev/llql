import { type IntrospectionQuery } from "graphql";
import introspection from "./documents/schema.json";
import { initializeCLIApp } from "./lib/initialize-cli-app";

const businessContext =
  "Bloom is marketplace network SaaS company that connects companies that buy and sell manufacturing and fulfillment services. " +
  "An example organization in Bloom's partner network would sell warehouse space. " +
  "An example organization in the Bloom's brand network would buy warehouse space from a partner closest to a trade hot-spot or other consideration. " +
  "Bloom facilitates the connection of organizations in the brand and partner network, routes the services necessary to complete a job across partners, and provides some financial services. " +
  "This schema snippet shows queries available for interacting with the Bloom network API. ";

initializeCLIApp(
  introspection as unknown as IntrospectionQuery,
  businessContext
);
