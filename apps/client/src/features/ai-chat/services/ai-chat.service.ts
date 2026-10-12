import api from "@/lib/api-client";
import type { AiChat, AiChatMessage, AiChatStreamEvent } from "../types";

export async function createChat(): Promise<AiChat> {
  return (await api.post("/ai/chats/create")) as AiChat;
}

export async function listChats(params?: {
  limit?: number;
  cursor?: string;
}): Promise<{ items: AiChat[]; meta: { hasNextPage: boolean; nextCursor: string | null } }> {
  return (await api.post("/ai/chats", params)) as {
    items: AiChat[];
    meta: { hasNextPage: boolean; nextCursor: string | null };
  };
}

export async function getChatInfo(
  chatId: string,
): Promise<{ chat: AiChat; messages: AiChatMessage[] }> {
  return (await api.post("/ai/chats/info", { chatId })) as {
    chat: AiChat;
    messages: AiChatMessage[];
  };
}

export async function deleteChat(chatId: string): Promise<void> {
  await api.post("/ai/chats/delete", { chatId });
}

export async function updateChatTitle(
  chatId: string,
  title: string,
): Promise<void> {
  await api.post("/ai/chats/update", { chatId, title });
}

export async function searchChats(query: string): Promise<AiChat[]> {
  return (await api.post("/ai/chats/search", { query })) as AiChat[];
}

export interface SendChatParams {
  chatId?: string;
  content: string;
  mentionedPageIds?: string[];
  attachmentIds?: string[];
}

export function sendChatMessage(
  params: SendChatParams,
  onEvent: (event: AiChatStreamEvent) => void,
  onError?: (error: string) => void,
  onComplete?: () => void,
): AbortController {
  const abortController = new AbortController();

  (async () => {
    try {
      const response = await fetch("/api/ai/chats/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: abortController.signal,
        credentials: "include",
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const parsed = JSON.parse(errorBody);
          errorMessage = parsed.message || errorMessage;
        } catch {
          // keep default
        }
        onError?.(errorMessage);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        onError?.("Response body is not readable");
        return;
      }

      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                onComplete?.();
                return;
              }
              try {
                const parsed = JSON.parse(data) as AiChatStreamEvent;
                onEvent(parsed);
              } catch {
                // skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      onComplete?.();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        onComplete?.();
        return;
      }
      onError?.(error instanceof Error ? error.message : "Stream failed");
    }
  })();

  return abortController;
}
