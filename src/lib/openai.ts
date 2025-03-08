import { env } from "./env.js";
import OpenAI from "openai";

const { OPENAI_API_KEY } = env;

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const embeddingModel: OpenAI.EmbeddingModel = "text-embedding-3-small";

export async function uploadFile(params: OpenAI.FileCreateParams) {
  try {
    // Upload the file using the OpenAI Files API.
    // Wrap the blob in an async function that returns it.
    const fileResponse = await openai.files.create(params);

    // Use the uploaded file to create a vector store.
    const vectorStoreResponse = await openai.beta.vectorStores.create({
      file_ids: [fileResponse.id],
    });

    return vectorStoreResponse;
  } catch (error) {
    console.error("Error uploading file as blob:", error);
    throw error;
  }
}

export type AssistantCreateOrRetrieveParams =
  | OpenAI.Beta.Assistants.AssistantCreateParams
  | { id: string };
export const createOrRetrieveAssistant = async (
  params: AssistantCreateOrRetrieveParams,
  requestOptions?: OpenAI.RequestOptions
): Promise<OpenAI.Beta.Assistant> => {
  let a: OpenAI.Beta.Assistants.Assistant;
  if ("id" in params) {
    a = await openai.beta.assistants.retrieve(params.id);
  } else {
    a = await openai.beta.assistants.create(params, requestOptions);
  }
  return a;
};

export type ThreadCreateOrRetrieveParams =
  | OpenAI.Beta.ThreadCreateParams
  | { id: string };
export const createOrRetrieveThread = async (
  params: ThreadCreateOrRetrieveParams,
  requestOptions?: OpenAI.RequestOptions
): Promise<OpenAI.Beta.Thread> => {
  let t: OpenAI.Beta.Thread;
  if ("id" in params) {
    t = await openai.beta.threads.retrieve(params.id);
  } else {
    t = await openai.beta.threads.create(params, requestOptions);
  }
  return t;
};

export type VectorStoreCreateOrRetrieveParams =
  | OpenAI.Beta.VectorStoreCreateParams
  | { id: string };
export const createOrRetrieveVectorStore = async (
  params: VectorStoreCreateOrRetrieveParams,
  requestOptions?: OpenAI.RequestOptions
): Promise<OpenAI.Beta.VectorStore> => {
  let v: OpenAI.Beta.VectorStore;
  if ("id" in params) {
    v = await openai.beta.vectorStores.retrieve(params.id);
  } else {
    v = await openai.beta.vectorStores.create(params, requestOptions);
  }
  return v;
};
