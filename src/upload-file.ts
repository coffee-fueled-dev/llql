import type { FileCreateParams } from "openai/resources/files.mjs";
import { openai } from "./lib/openai";

export async function uploadFile(params: FileCreateParams) {
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
