import { Paper, Text } from "@mantine/core";
import type { AiChatMessage } from "../types";

export default function ChatMessage({ message }: { message: AiChatMessage }) {
  const isUser = message.role === "user";
  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        backgroundColor: isUser ? "#e7f0ff" : "#f8f9fa",
      }}
    >
      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
        {message.content ?? ""}
      </Text>
    </Paper>
  );
}
