import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ChatIdDto {
  @IsString()
  chatId: string;
}

export class RenameChatDto {
  @IsString()
  chatId: string;

  @IsString()
  @MaxLength(200)
  title: string;
}

export class DeleteChatDto {
  @IsString()
  chatId: string;
}

export class SearchChatsDto {
  @IsString()
  @MaxLength(200)
  query: string;
}

export class SendChatDto {
  @IsOptional()
  @IsString()
  chatId?: string;

  @IsString()
  @MaxLength(20000)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentionedPageIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}
