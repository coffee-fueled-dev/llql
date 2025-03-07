import { env } from "./env.js";
import OpenAI from "openai";

const { OPENAI_API_KEY } = env;

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const embeddingModel: OpenAI.EmbeddingModel = "text-embedding-3-small";
