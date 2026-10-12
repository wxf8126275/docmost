import { Stack, Text, Paper } from "@mantine/core";
import type { AiChatMessage, AiChatToolCall } from "../types";
import ChatMessage from "./chat-message";

interface Props {
  messages: AiChatMessage[];
  streamingContent: string;
  streamingToolCalls: AiChatToolCall[];
  isStreaming: boolean;
}

export default function ChatMessageList({
  messages,
  streamingContent,
  streamingToolCalls,
  isStreaming,
}: Props) {
  if (messages.length === 0 && !streamingContent && !isStreaming) {
    return (
      <Text c="dimmed" ta="center" mt="xl">
        开始与 AI 对话吧。输入消息后，助手会基于你的问题流式回复。
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {isStreaming && (streamingContent || streamingToolCalls.length > 0) && (
        <Paper
          withBorder
          p="sm"
          radius="md"
          style={{ alignSelf: "flex-start", maxWidth: "85%", backgroundColor: "#f8f9fa" }}
        >
          {streamingToolCalls.length > 0 && (
            <Text size="xs" c="dimmed" mb={4}>
              正在调用工具：{streamingToolCalls.map((t) => t.name).join(", ")}
            </Text>
          )}
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {streamingContent}
          </Text>
        </Paper>
      )}
    </Stack>
  );
}
