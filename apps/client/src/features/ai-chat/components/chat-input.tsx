import { Textarea, Button, Group } from "@mantine/core";
import { useState } from "react";

interface Props {
  onSend: (content: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export default function ChatInput({ onSend, isStreaming, onStop }: Props) {
  const [value, setValue] = useState("");

  const submit = () => {
    const content = value.trim();
    if (!content) return;
    onSend(content);
    setValue("");
  };

  return (
    <Group align="flex-end" gap="sm">
      <Textarea
        flex={1}
        autosize
        minRows={1}
        maxRows={6}
        placeholder="给 AI 发送消息…（Enter 发送，Shift+Enter 换行）"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {isStreaming ? (
        <Button color="red" variant="light" onClick={onStop}>
          停止
        </Button>
      ) : (
        <Button onClick={submit} disabled={!value.trim()}>
          发送
        </Button>
      )}
    </Group>
  );
}
