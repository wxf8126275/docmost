import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Text, ScrollArea } from "@mantine/core";
import AiChatSidebar from "../components/ai-chat-sidebar";
import ChatMessageList from "../components/chat-message-list";
import ChatInput from "../components/chat-input";
import { useChatStream } from "../hooks/use-chat-stream";
import { useChatInfoQuery } from "../queries/ai-chat.queries";

export default function AiChat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { data, isError } = useChatInfoQuery(chatId);

  const {
    messages,
    streamingContent,
    streamingToolCalls,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
    hydrateFromServer,
  } = useChatStream(chatId, {
    onChatCreated: (id) => navigate(`/ai/chat/${id}`, { replace: true }),
  });

  useEffect(() => {
    if (data?.messages) {
      hydrateFromServer(data.messages);
    }
  }, [data, hydrateFromServer]);

  return (
    <div style={{ display: "flex", height: "100%", gap: 12 }}>
      <div
        style={{
          width: 300,
          borderRight: "1px solid #e4e4e4",
          padding: 10,
        }}
      >
        <AiChatSidebar />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {isError ? (
          <Text c="red" p="md">
            加载对话失败。
          </Text>
        ) : (
          <>
            <ScrollArea style={{ flex: 1, padding: 16 }}>
              <ChatMessageList
                messages={messages}
                streamingContent={streamingContent}
                streamingToolCalls={streamingToolCalls}
                isStreaming={isStreaming}
              />
            </ScrollArea>

            {error && (
              <Text c="red" px="md" pb={4}>
                {error}
              </Text>
            )}

            <div style={{ padding: 12, borderTop: "1px solid #e4e4e4" }}>
              <ChatInput
                onSend={sendMessage}
                isStreaming={isStreaming}
                onStop={stopGeneration}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
