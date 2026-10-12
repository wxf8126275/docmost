export type AiChatStreamEvent =
  | { type: 'chat_created'; chatId: string }
  | { type: 'content'; text: string }
  | {
      type: 'tool_call';
      id: string;
      name: string;
      args: Record<string, unknown>;
    }
  | { type: 'tool_result'; id: string; result: unknown }
  | { type: 'done'; messageId: string; usage?: Record<string, number> }
  | {
      type: 'error';
      message: string;
      code?: string;
      retryable?: boolean;
    };

export interface SendChatInput {
  chatId?: string;
  workspaceId: string;
  userId: string;
  content: string;
  mentionedPageIds?: string[];
  attachmentIds?: string[];
}
