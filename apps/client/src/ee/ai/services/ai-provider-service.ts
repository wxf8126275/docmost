import api from "@/lib/api-client";
import {
  AiProvider,
  CreateAiProviderInput,
  UpdateAiProviderInput,
} from "@/ee/ai/types/ai-provider.types";

export async function listAiProviders(): Promise<AiProvider[]> {
  const req = await api.post<AiProvider[]>("/ai-providers", {});
  return req.data;
}

export async function createAiProvider(
  data: CreateAiProviderInput,
): Promise<AiProvider> {
  const req = await api.post<AiProvider>("/ai-providers/create", data);
  return req.data;
}

export async function updateAiProvider(
  id: string,
  data: UpdateAiProviderInput,
): Promise<AiProvider> {
  const req = await api.post<AiProvider>("/ai-providers/update", {
    id,
    ...data,
  });
  return req.data;
}

export async function deleteAiProvider(id: string): Promise<void> {
  await api.post("/ai-providers/delete", { id });
}

export async function setDefaultAiProvider(id: string): Promise<AiProvider> {
  const req = await api.post<AiProvider>("/ai-providers/set-default", { id });
  return req.data;
}
