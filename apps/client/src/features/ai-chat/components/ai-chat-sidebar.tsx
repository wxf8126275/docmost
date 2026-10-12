import { Stack, Text, TextInput, Button, ScrollArea, ActionIcon, Group } from "@mantine/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import {
  useChatsQuery,
  useSearchChatsQuery,
  useDeleteChatMutation,
} from "../queries/ai-chat.queries";
import type { AiChat } from "../types";

export default function AiChatSidebar() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data, fetchNextPage, hasNextPage } = useChatsQuery();
  const searchQuery = useSearchChatsQuery(search);
  const deleteMutation = useDeleteChatMutation();

  const chats: AiChat[] = search.trim()
    ? searchQuery.data ?? []
    : data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Stack gap="xs" h="100%">
      <Group gap="xs">
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => navigate("/ai")}
          fullWidth
        >
          新建对话
        </Button>
      </Group>

      <TextInput
        placeholder="搜索对话"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap={4}>
          {chats.map((chat) => (
            <Group
              key={chat.id}
              justify="space-between"
              wrap="nowrap"
              px="xs"
              py={6}
              style={{
                borderRadius: 6,
                cursor: "pointer",
                backgroundColor: "#f3f4f6",
              }}
              onClick={() => navigate(`/ai/chat/${chat.id}`)}
            >
              <Text size="sm" truncate style={{ flex: 1 }}>
                {chat.title || "新对话"}
              </Text>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(chat.id);
                }}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          ))}

          {!search.trim() && hasNextPage && (
            <Button variant="subtle" size="xs" onClick={() => fetchNextPage()}>
              加载更多
            </Button>
          )}

          {chats.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" mt="md">
              暂无对话
            </Text>
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
