import debug from "debug";
import { env as environmentVariables } from "./env.js";
import { createDebugPatterns, helloInnit } from "../util/hello.js";

const ns = ["document", "server", "openai"] as const;
const env = ["info", "warn", "debug", "error"] as const;

const patterns = {
  development: createDebugPatterns(ns, env),
  production: createDebugPatterns(ns, [env[3]] as const),
};

const DEBUG = patterns[environmentVariables.NODE_ENV || "development"];

export const sayHello = () => debug.enable(DEBUG);
export const hello = helloInnit(ns, env);
