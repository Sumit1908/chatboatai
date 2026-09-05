export type BroadcastKind = "notification" | "campaign";

export interface SendBatchJobData {
  kind: BroadcastKind;
  accountId: string;
  campaignId: string;
  templateId: string;
  templateName: string;
  templateLanguage: string;
  /** Small batch of recipient phones (normalized). */
  phones: string[];
  headerParams?: Array<Record<string, unknown>>;
  bodyParams?: Array<Record<string, unknown>>;
  /** Pre-rendered inbox preview text (avoids reloading template in worker). */
  bodyPreview: string;
  conversationMediaUrl?: string;
  totalRecipients: number;
}

export interface EnqueueBroadcastInput {
  kind: BroadcastKind;
  accountId: string;
  campaignId: string;
  templateId: string;
  templateName: string;
  templateLanguage: string;
  /** Async iterable of phone chunks — never materialize the full audience. */
  phoneChunks: AsyncIterable<string[]>;
  headerParams?: Array<Record<string, unknown>>;
  bodyParams?: Array<Record<string, unknown>>;
  bodyPreview: string;
  conversationMediaUrl?: string;
  /** Known total when caller already counted; otherwise counted while enqueueing. */
  totalRecipients?: number;
}

export interface EnqueueBroadcastResult {
  jobCount: number;
  totalRecipients: number;
  queueName: string;
}
