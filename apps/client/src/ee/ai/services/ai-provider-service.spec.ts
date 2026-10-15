import { describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("@/lib/api-client", () => ({
  default: { post },
}));

import {
  createAiProvider,
  deleteAiProvider,
  listAiProviders,
  setDefaultAiProvider,
  updateAiProvider,
} from "./ai-provider-service";

describe("ai-provider-service", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("listAiProviders POSTs to /ai-providers and returns the array", async () => {
    post.mockResolvedValue({ data: [{ id: "p1", name: "OpenAI" }] });

    const result = await listAiProviders();

    expect(post).toHaveBeenCalledWith("/ai-providers", {});
    expect(result).toEqual([{ id: "p1", name: "OpenAI" }]);
  });

  it("createAiProvider POSTs to /ai-providers/create", async () => {
    post.mockResolvedValue({ data: { id: "p1" } });

    const result = await createAiProvider({
      name: "OpenAI",
      driver: "openai",
      apiKey: "secret",
      completionModel: "gpt-4o",
    });

    expect(post).toHaveBeenCalledWith("/ai-providers/create", {
      name: "OpenAI",
      driver: "openai",
      apiKey: "secret",
      completionModel: "gpt-4o",
    });
    expect(result).toEqual({ id: "p1" });
  });

  it("updateAiProvider embeds the id in the body", async () => {
    post.mockResolvedValue({ data: { id: "p1", name: "Renamed" } });

    await updateAiProvider("p1", { name: "Renamed" });

    expect(post).toHaveBeenCalledWith("/ai-providers/update", {
      id: "p1",
      name: "Renamed",
    });
  });

  it("deleteAiProvider POSTs the id to /ai-providers/delete", async () => {
    post.mockResolvedValue({ data: undefined });

    await deleteAiProvider("p1");

    expect(post).toHaveBeenCalledWith("/ai-providers/delete", { id: "p1" });
  });

  it("setDefaultAiProvider POSTs the id to /ai-providers/set-default", async () => {
    post.mockResolvedValue({ data: { id: "p1", isDefault: true } });

    await setDefaultAiProvider("p1");

    expect(post).toHaveBeenCalledWith("/ai-providers/set-default", { id: "p1" });
  });
});
