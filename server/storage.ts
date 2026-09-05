import { 
  type Template, type InsertTemplate, templates,
  type Campaign, type InsertCampaign, campaigns,
  type Message, type InsertMessage, messages,
  type CampaignMetrics, type InsertCampaignMetrics, campaignMetrics,
  type DashboardMetrics,
  type ActivityItem, activities,
  type ApiSettings, apiSettings,
  type WhatsAppAccount, type InsertWhatsAppAccount, whatsappAccounts,
  type Contact, type InsertContact, contacts,
  type ContactList, type InsertContactList, contactLists,
  type ContactTag, type InsertContactTag, contactTags,
  type Conversation, type InsertConversation, conversations,
  type ConversationMessage, type InsertConversationMessage, conversationMessages,
  type Notification, type InsertNotification, notifications,
  type TeamMember, type InsertTeamMember, teamMembers,
  type UploadedFile, uploadedFiles,
  activeAccounts,
  type QualityScore,
} from "@shared/schema";
import { db } from "@db";
import { eq, desc, and, or, isNull, isNotNull, inArray, gte, ilike, sql as dsql } from "drizzle-orm";
import { normalizePhone } from "./phone";
import {
  bumpAccountMessageCreated,
  bumpAccountMessageStatusChange,
  bumpNotificationOnMessageCreate,
  bumpNotificationOnStatusChange,
  bumpCampaignMetricsOnCreate,
  adjustListCounts,
  adjustTagCounts,
  bumpAccountContactDelta,
  bumpAccountTemplateStatus,
} from "./counters";

export interface IStorage {
  getTemplates(accountId?: string): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplateByName(name: string, accountId: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;

  getCampaigns(accountId?: string): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  getMessages(accountId?: string): Promise<Message[]>;
  getMessagesPage(params: {
    accountId: string;
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
  }): Promise<{ messages: Message[]; total: number; statusCounts: Record<string, number> }>;
  getMessageCountsByAccount(): Promise<Array<{ accountId: string | null; total: number; failed: number }>>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByWhatsappId(whatsappId: string): Promise<Message | undefined>;
  getMessagesByCampaign(campaignId: string): Promise<Message[]>;
  getMessagesByCampaignFiltered(campaignId: string, opts?: { status?: string; limit?: number }): Promise<Message[]>;
  getMessageStatusCountsByCampaign(campaignId: string): Promise<{ sent: number; failed: number; total: number; delivered: number; read: number; queued: number }>;
  getMessageStatusCountsByCampaigns(campaignIds: string[]): Promise<Map<string, { sent: number; failed: number; delivered: number; read: number; queued: number; total: number }>>;
  getAttemptedPhonesByCampaign(campaignId: string): Promise<string[]>;
  getMessageByCampaignAndPhone(campaignId: string, phone: string): Promise<Message | undefined>;
  getExistingPhonesForCampaign(campaignId: string, phones: string[]): Promise<Set<string>>;
  getSubscribedPhoneChunksByLists(accountId: string, listIds: string[], pageSize?: number): AsyncGenerator<string[]>;
  getMessagingUsed24h(accountId: string): Promise<number>;
  getActiveAccountWithDetails(userId: string): Promise<{ accountId: string; account: WhatsAppAccount } | undefined>;
  getTemplateByMetaId(metaTemplateId: string): Promise<Template | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;

  getCampaignMetrics(campaignId: string): Promise<CampaignMetrics | undefined>;
  upsertCampaignMetrics(metrics: InsertCampaignMetrics): Promise<CampaignMetrics>;

  getDashboardMetrics(accountId?: string): Promise<DashboardMetrics>;
  getDashboardChartData(accountId: string): Promise<{ messageVolume: any[]; statusDistribution: any[] }>;
  getRecentActivities(accountId?: string): Promise<ActivityItem[]>;
  addActivity(activity: Omit<ActivityItem, "id">): Promise<ActivityItem>;

  getSettings(): Promise<ApiSettings | undefined>;
  saveSettings(settings: Omit<ApiSettings, "id">): Promise<ApiSettings>;
  backfillMessageCampaignIds(): Promise<void>;

  getAnalyticsData(timeRange: string, accountId?: string): Promise<AnalyticsData>;

  getAccountsByUser(userId: string): Promise<WhatsAppAccount[]>;
  getAccounts(): Promise<WhatsAppAccount[]>;
  getAccount(id: string): Promise<WhatsAppAccount | undefined>;
  createAccount(account: InsertWhatsAppAccount): Promise<WhatsAppAccount>;
  updateAccount(id: string, updates: Partial<WhatsAppAccount>): Promise<WhatsAppAccount | undefined>;
  deleteAccount(id: string): Promise<boolean>;
  setActiveAccount(userId: string, accountId: string): Promise<void>;
  getActiveAccountId(userId: string): Promise<string | undefined>;

  getContacts(accountId: string): Promise<Contact[]>;
  // Paginated + filtered variant for the Contacts page UI - getContacts()
  // above returns the full unpaginated list and is used by broadcast/
  // notification send flows that genuinely need every contact; this one
  // is for rendering a bounded page of rows without loading (and trying to
  // render) an entire tenant's contact list at once, which was hanging the
  // Contacts page for accounts with large lists.
  getContactsPage(accountId: string, params: { page: number; pageSize: number; search?: string; listId?: string; tagId?: string }): Promise<{ contacts: Contact[]; total: number }>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;
  bulkDeleteContacts(ids: string[], accountId: string): Promise<number>;
  deleteAllContactsForAccount(accountId: string): Promise<number>;
  deleteAllListsForAccount(accountId: string): Promise<number>;
  // Deletes broadcast/campaign message records and Inbox conversation
  // history for a set of phone numbers on an account - called whenever a
  // contact is deleted, so removing someone from the contact list also
  // clears their message history instead of leaving it behind.
  deleteMessagesForPhones(accountId: string, phones: string[]): Promise<void>;
  importContacts(contactsData: InsertContact[], listId?: string): Promise<{ imported: number; updated: number }>;

  getLists(accountId: string): Promise<ContactList[]>;
  getList(id: string): Promise<ContactList | undefined>;
  createList(list: InsertContactList): Promise<ContactList>;
  updateList(id: string, updates: Partial<ContactList>): Promise<ContactList | undefined>;
  deleteList(id: string): Promise<boolean>;
  deleteContactList(id: string): Promise<boolean>;
  getContactListsByAccount(accountId: string): Promise<ContactList[]>;

  getTags(accountId: string): Promise<ContactTag[]>;
  getTag(id: string): Promise<ContactTag | undefined>;
  createTag(tag: InsertContactTag): Promise<ContactTag>;
  deleteTag(id: string): Promise<boolean>;
  deleteContactTag(id: string): Promise<boolean>;
  getContactTagsByAccount(accountId: string): Promise<ContactTag[]>;

  getConversations(accountId: string, limit?: number): Promise<Conversation[]>;
  getConversationsByIds(accountId: string, ids: string[]): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByPhone(phone: string, accountId: string): Promise<Conversation | undefined>;
  createConversation(phone: string, name: string | undefined, accountId: string): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  getConversationMessages(conversationId: string): Promise<ConversationMessage[]>;
  getRepliedConversationIds(accountId: string): Promise<Set<string>>;
  addConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage>;
  getConversationsByAccount(accountId: string): Promise<Conversation[]>;
  deleteConversation(id: string): Promise<boolean>;

  getNotifications(accountId: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<boolean>;
  getNotificationsByAccount(accountId: string): Promise<Notification[]>;

  getContactsByAccount(accountId: string): Promise<Contact[]>;

  getApiSettings(): Promise<ApiSettings | undefined>;
  deleteApiSettings(): Promise<boolean>;

  saveUploadedFile(file: { id?: string; userId?: string; phoneNumberId?: string; originalName?: string; mimeType: string; size: number; data?: string; storageKey?: string }): Promise<UploadedFile>;
  getUploadedFile(id: string): Promise<UploadedFile | undefined>;
  deleteUploadedFile(id: string): Promise<boolean>;
  listUploadedFiles(params: { limit: number; offset: number }): Promise<UploadedFile[]>;
  getUploadedFilesStats(): Promise<{ count: number; totalSize: number }>;
  listUploadedFilesMissingStorageKey(params: { limit: number; afterId?: string }): Promise<UploadedFile[]>;
  setUploadedFileStorageKey(id: string, storageKey: string): Promise<void>;
  listUploadedFilesReadyToClear(params: { limit: number; afterId?: string }): Promise<UploadedFile[]>;
  clearUploadedFileData(id: string): Promise<void>;

  getContactCountsByAccount(): Promise<Array<{ accountId: string; contactCount: number; listCount: number }>>;

  getTeamMembers(accountId: string): Promise<TeamMember[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(id: string): Promise<boolean>;
  getTeamMemberByEmail(email: string, accountId: string): Promise<TeamMember | undefined>;
  getSharedAccountsForUser(userEmail: string): Promise<TeamMember[]>;
  acceptTeamInvite(id: string, userId: string): Promise<TeamMember | undefined>;
}

export interface AnalyticsData {
  dailyData: Array<{ date: string; sent: number; delivered: number; read: number; failed: number }>;
  hourlyData: Array<{ hour: string; messages: number }>;
  categoryData: Array<{ name: string; value: number; color: string }>;
  errorData: Array<{ code: string; description: string; count: number }>;
  costData: Array<{ date: string; cost: number }>;
  summary: {
    totalMessages: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    deliveryRate: number;
    readRate: number;
    totalCost: number;
  };
}

export class DatabaseStorage implements IStorage {

  // Templates
  async getTemplates(accountId?: string): Promise<Template[]> {
    if (accountId) {
      return db.select().from(templates).where(eq(templates.accountId, accountId)).orderBy(desc(templates.createdAt));
    }
    return db.select().from(templates).orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const rows = await db.select().from(templates).where(eq(templates.id, id));
    return rows[0];
  }

  async getTemplateByName(name: string, accountId: string): Promise<Template | undefined> {
    const rows = await db.select().from(templates)
      .where(and(eq(templates.name, name), eq(templates.accountId, accountId)));
    return rows[0];
  }

  async getTemplateByMetaId(metaTemplateId: string): Promise<Template | undefined> {
    const rows = await db.select().from(templates).where(eq(templates.metaTemplateId, metaTemplateId)).limit(1);
    return rows[0];
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const rows = await db.insert(templates).values(template as any).returning();
    const created = rows[0];
    void bumpAccountTemplateStatus(created.accountId, null, created.status).catch(() => {});
    return created;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    const { id: _id, ...rest } = updates as any;
    const existing = rest.status !== undefined ? await this.getTemplate(id) : undefined;
    const rows = await db.update(templates).set({ ...rest, updatedAt: new Date() }).where(eq(templates.id, id)).returning();
    const updated = rows[0];
    if (updated && existing && rest.status !== undefined && existing.status !== rest.status) {
      void bumpAccountTemplateStatus(updated.accountId, existing.status, rest.status).catch(() => {});
    }
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const existing = await this.getTemplate(id);
    const result = await db.delete(templates).where(eq(templates.id, id));
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted && existing) {
      void bumpAccountTemplateStatus(existing.accountId, existing.status, null).catch(() => {});
    }
    return deleted;
  }

  // Campaigns
  async getCampaigns(accountId?: string): Promise<Campaign[]> {
    if (accountId) {
      return db.select().from(campaigns).where(eq(campaigns.accountId, accountId)).orderBy(desc(campaigns.createdAt));
    }
    return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const rows = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return rows[0];
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const recipientCount = Array.isArray(campaign.recipients) ? campaign.recipients.length : 0;
    const rows = await db.insert(campaigns).values({ ...campaign, recipientCount } as any).returning();
    return rows[0];
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const { id: _id, ...rest } = updates as any;
    if (Array.isArray(rest.recipients)) {
      rest.recipientCount = rest.recipients.length;
    }
    const rows = await db.update(campaigns).set({ ...rest, updatedAt: new Date() }).where(eq(campaigns.id, id)).returning();
    return rows[0];
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await db.delete(campaigns).where(eq(campaigns.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Messages
  // Prefer getMessagesPage for UI. This unbounded getter remains for rare
  // admin/backfill paths only — never call it from polled endpoints.
  async getMessages(accountId?: string): Promise<Message[]> {
    if (accountId) {
      return db.select().from(messages).where(eq(messages.accountId, accountId)).orderBy(desc(messages.queuedAt)).limit(5000);
    }
    return db.select().from(messages).orderBy(desc(messages.queuedAt)).limit(5000);
  }

  async getMessagesPage(params: {
    accountId: string;
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
  }): Promise<{ messages: Message[]; total: number; statusCounts: Record<string, number> }> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
    const conditions = [eq(messages.accountId, params.accountId)];
    if (params.status && params.status !== "all") {
      conditions.push(eq(messages.status, params.status));
    }
    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(or(ilike(messages.recipientPhone, term), ilike(messages.whatsappMessageId, term))!);
    }
    const where = and(...conditions);

    const [rows, countRow, statusRows] = await Promise.all([
      db.select().from(messages).where(where).orderBy(desc(messages.queuedAt)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ count: dsql<number>`count(*)::int` }).from(messages).where(where),
      db
        .select({ status: messages.status, count: dsql<number>`count(*)::int` })
        .from(messages)
        .where(eq(messages.accountId, params.accountId))
        .groupBy(messages.status),
    ]);

    const statusCounts: Record<string, number> = { all: 0 };
    for (const row of statusRows) {
      const n = Number(row.count) || 0;
      statusCounts[row.status] = n;
      statusCounts.all += n;
    }

    return { messages: rows, total: Number(countRow[0]?.count) || 0, statusCounts };
  }

  // Aggregated in SQL rather than pulling every message row into the app -
  // the admin usage dashboard polls this every 30s, and this table grows to
  // tens of thousands of rows per bulk campaign, so a naive SELECT * here
  // would repeatedly transfer the whole table over the wire for no reason.
  async getMessageCountsByAccount(): Promise<Array<{ accountId: string | null; total: number; failed: number }>> {
    const rows = await db
      .select({
        accountId: messages.accountId,
        status: messages.status,
        count: dsql<number>`count(*)`,
      })
      .from(messages)
      .groupBy(messages.accountId, messages.status);

    const byAccount = new Map<string | null, { total: number; failed: number }>();
    for (const row of rows) {
      const entry = byAccount.get(row.accountId) || { total: 0, failed: 0 };
      const count = Number(row.count);
      entry.total += count;
      if (row.status === "failed") entry.failed += count;
      byAccount.set(row.accountId, entry);
    }
    return Array.from(byAccount.entries()).map(([accountId, { total, failed }]) => ({ accountId, total, failed }));
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const rows = await db.select().from(messages).where(eq(messages.id, id));
    return rows[0];
  }

  async getMessagesByWhatsappId(whatsappId: string): Promise<Message | undefined> {
    const rows = await db.select().from(messages).where(eq(messages.whatsappMessageId, whatsappId));
    return rows[0];
  }

  async getMessagesByCampaign(campaignId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.campaignId, campaignId));
  }

  async getMessageStatusCountsByCampaign(campaignId: string): Promise<{
    sent: number;
    failed: number;
    total: number;
    delivered: number;
    read: number;
    queued: number;
  }> {
    const rows = await db
      .select({
        status: messages.status,
        count: dsql<number>`count(*)::int`,
      })
      .from(messages)
      .where(eq(messages.campaignId, campaignId))
      .groupBy(messages.status);

    let sent = 0;
    let failed = 0;
    let delivered = 0;
    let read = 0;
    let queued = 0;
    let total = 0;
    for (const row of rows) {
      const n = Number(row.count) || 0;
      total += n;
      if (row.status === "failed") failed += n;
      else if (row.status === "delivered") delivered += n;
      else if (row.status === "read") read += n;
      else if (row.status === "queued") queued += n;
      else sent += n; // sent + any other non-failed
    }
    // "sent" for UI = reached Meta successfully (sent+delivered+read)
    return {
      sent: sent + delivered + read,
      failed,
      total,
      delivered: delivered + read,
      read,
      queued,
    };
  }

  async getMessageStatusCountsByCampaigns(
    campaignIds: string[],
  ): Promise<Map<string, { sent: number; failed: number; delivered: number; read: number; queued: number; total: number }>> {
    const map = new Map<string, { sent: number; failed: number; delivered: number; read: number; queued: number; total: number }>();
    if (campaignIds.length === 0) return map;

    const rows = await db
      .select({
        campaignId: messages.campaignId,
        status: messages.status,
        count: dsql<number>`count(*)::int`,
      })
      .from(messages)
      .where(inArray(messages.campaignId, campaignIds))
      .groupBy(messages.campaignId, messages.status);

    for (const id of campaignIds) {
      map.set(id, { sent: 0, failed: 0, delivered: 0, read: 0, queued: 0, total: 0 });
    }
    for (const row of rows) {
      if (!row.campaignId) continue;
      const entry = map.get(row.campaignId) || { sent: 0, failed: 0, delivered: 0, read: 0, queued: 0, total: 0 };
      const n = Number(row.count) || 0;
      entry.total += n;
      if (row.status === "failed") entry.failed += n;
      else if (row.status === "delivered") entry.delivered += n;
      else if (row.status === "read") entry.read += n;
      else if (row.status === "queued") entry.queued += n;
      else entry.sent += n;
      map.set(row.campaignId, entry);
    }
    for (const [id, entry] of Array.from(map.entries())) {
      entry.sent = entry.sent + entry.delivered + entry.read;
      entry.delivered = entry.delivered + entry.read;
      map.set(id, entry);
    }
    return map;
  }

  async getMessagesByCampaignFiltered(
    campaignId: string,
    opts?: { status?: string; limit?: number },
  ): Promise<Message[]> {
    const conditions = [eq(messages.campaignId, campaignId)];
    if (opts?.status) conditions.push(eq(messages.status, opts.status));
    let q = db.select().from(messages).where(and(...conditions)).orderBy(desc(messages.queuedAt));
    if (opts?.limit) {
      return q.limit(opts.limit);
    }
    return q.limit(5000);
  }

  async getAttemptedPhonesByCampaign(campaignId: string): Promise<string[]> {
    const rows = await db
      .selectDistinct({ phone: messages.recipientPhone })
      .from(messages)
      .where(eq(messages.campaignId, campaignId));
    return rows.map((r) => r.phone);
  }

  async getMessageByCampaignAndPhone(campaignId: string, phone: string): Promise<Message | undefined> {
    const rows = await db
      .select()
      .from(messages)
      .where(and(eq(messages.campaignId, campaignId), eq(messages.recipientPhone, phone)))
      .limit(1);
    return rows[0];
  }

  async getExistingPhonesForCampaign(campaignId: string, phones: string[]): Promise<Set<string>> {
    if (phones.length === 0) return new Set();
    const rows = await db
      .select({ phone: messages.recipientPhone })
      .from(messages)
      .where(and(eq(messages.campaignId, campaignId), inArray(messages.recipientPhone, phones)));
    return new Set(rows.map((r) => r.phone));
  }

  /**
   * Stream subscribed contact phones that belong to any of the given lists,
   * page by page — never load the full contact table into memory.
   */
  async *getSubscribedPhoneChunksByLists(
    accountId: string,
    listIds: string[],
    pageSize = 500,
  ): AsyncGenerator<string[]> {
    if (listIds.length === 0) return;

    let offset = 0;
    for (;;) {
      const rows = await db
        .select({ phone: contacts.phone })
        .from(contacts)
        .where(
          and(
            eq(contacts.accountId, accountId),
            eq(contacts.status, "subscribed"),
            or(
              ...listIds.map(
                (lid) => dsql`${contacts.listIds} @> ${JSON.stringify([lid])}::jsonb`,
              ),
            ),
          ),
        )
        .orderBy(contacts.id)
        .limit(pageSize)
        .offset(offset);

      if (rows.length === 0) break;

      const phones = rows
        .map((r) => normalizePhone(r.phone))
        .filter((p): p is string => Boolean(p));
      if (phones.length > 0) yield phones;

      offset += rows.length;
      if (rows.length < pageSize) break;
    }
  }

  async getMessagingUsed24h(accountId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ count }] = await db
      .select({ count: dsql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          eq(messages.accountId, accountId),
          gte(messages.sentAt, since),
          dsql`${messages.status} != 'failed'`,
        ),
      );
    return Number(count) || 0;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const rows = await db.insert(messages).values(message).returning();
    const created = rows[0];
    // Fire-and-forget counters — never fail the send path if rollups lag.
    void Promise.all([
      bumpAccountMessageCreated(created.accountId, created.status),
      bumpNotificationOnMessageCreate(created.campaignId, created.status),
      bumpCampaignMetricsOnCreate(created.campaignId, created.accountId, created.status),
    ]).catch((err) => console.error("[counters] createMessage bump failed:", err.message));
    return created;
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined> {
    const { id: _id, ...rest } = updates as any;
    const existing = rest.status ? await this.getMessage(id) : undefined;
    const rows = await db.update(messages).set(rest).where(eq(messages.id, id)).returning();
    const updated = rows[0];
    if (updated && existing && rest.status && existing.status !== rest.status) {
      void Promise.all([
        bumpAccountMessageStatusChange(updated.accountId, existing.status, rest.status),
        bumpNotificationOnStatusChange(updated.campaignId, existing.status, rest.status),
      ]).catch((err) => console.error("[counters] updateMessage bump failed:", err.message));
    }
    return updated;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Campaign Metrics
  async getCampaignMetrics(campaignId: string): Promise<CampaignMetrics | undefined> {
    const rows = await db.select().from(campaignMetrics).where(eq(campaignMetrics.campaignId, campaignId));
    return rows[0];
  }

  async upsertCampaignMetrics(metrics: InsertCampaignMetrics): Promise<CampaignMetrics> {
    const rows = await db.insert(campaignMetrics)
      .values({ ...metrics, lastUpdatedAt: new Date() })
      .onConflictDoUpdate({
        target: campaignMetrics.campaignId,
        set: { ...metrics, lastUpdatedAt: new Date() },
      })
      .returning();
    return rows[0];
  }

  // Dashboard
  // Prefer denormalized rollups on whatsapp_accounts (O(1) by id). Fall back
  // to SQL GROUP BY only when rollups are still zero but messages exist
  // (pre-backfill accounts).
  async getDashboardMetrics(accountId?: string): Promise<DashboardMetrics> {
    const allAccounts = accountId
      ? await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.id, accountId))
      : await db.select().from(whatsappAccounts);

    const account = allAccounts[0];
    const hasRollups = account && (
      (account.messageTotalCount || 0) > 0 ||
      (account.messageFailedCount || 0) > 0 ||
      (account.templateApprovedCount || 0) > 0
    );

    let totalMessageRows = 0;
    let localSent = 0;
    let localDelivered = 0;
    let readCount = 0;
    let failedCount = 0;
    let approvedTemplates = 0;
    let pendingTemplates = 0;
    let activeCampaigns = 0;
    let localCost = 0;

    if (hasRollups && accountId && account) {
      totalMessageRows = account.messageTotalCount || 0;
      // Dashboard "sent" historically = sent+delivered+read
      localSent = (account.messageSentCount || 0) + (account.messageDeliveredCount || 0) + (account.messageReadCount || 0);
      localDelivered = (account.messageDeliveredCount || 0) + (account.messageReadCount || 0);
      readCount = account.messageReadCount || 0;
      failedCount = account.messageFailedCount || 0;
      approvedTemplates = account.templateApprovedCount || 0;
      pendingTemplates = account.templatePendingCount || 0;

      const [campaignStatusCounts] = await Promise.all([
        db.select({ status: campaigns.status, count: dsql<number>`count(*)` })
          .from(campaigns).where(eq(campaigns.accountId, accountId)).groupBy(campaigns.status),
      ]);
      activeCampaigns = Number(campaignStatusCounts.find(r => r.status === "running")?.count || 0);
    } else {
      const [messageStatusCounts, templateStatusCounts, campaignStatusCounts] = await Promise.all([
        accountId
          ? db.select({ status: messages.status, count: dsql<number>`count(*)`, costSum: dsql<string>`coalesce(sum(${messages.cost}), 0)` })
              .from(messages).where(eq(messages.accountId, accountId)).groupBy(messages.status)
          : db.select({ status: messages.status, count: dsql<number>`count(*)`, costSum: dsql<string>`coalesce(sum(${messages.cost}), 0)` })
              .from(messages).groupBy(messages.status),
        accountId
          ? db.select({ status: templates.status, count: dsql<number>`count(*)` }).from(templates).where(eq(templates.accountId, accountId)).groupBy(templates.status)
          : db.select({ status: templates.status, count: dsql<number>`count(*)` }).from(templates).groupBy(templates.status),
        accountId
          ? db.select({ status: campaigns.status, count: dsql<number>`count(*)` }).from(campaigns).where(eq(campaigns.accountId, accountId)).groupBy(campaigns.status)
          : db.select({ status: campaigns.status, count: dsql<number>`count(*)` }).from(campaigns).groupBy(campaigns.status),
      ]);

      const countFor = (rows: { status: string | null; count: number }[], status: string) =>
        Number(rows.find(r => r.status === status)?.count || 0);
      totalMessageRows = messageStatusCounts.reduce((sum, r) => sum + Number(r.count), 0);
      localSent = countFor(messageStatusCounts, "sent") + countFor(messageStatusCounts, "delivered") + countFor(messageStatusCounts, "read");
      localDelivered = countFor(messageStatusCounts, "delivered") + countFor(messageStatusCounts, "read");
      readCount = countFor(messageStatusCounts, "read");
      failedCount = countFor(messageStatusCounts, "failed");
      localCost = messageStatusCounts.reduce((sum, r) => sum + parseFloat(r.costSum || "0"), 0);
      approvedTemplates = countFor(templateStatusCounts, "APPROVED");
      pendingTemplates = countFor(templateStatusCounts, "PENDING");
      activeCampaigns = countFor(campaignStatusCounts, "running");
    }

    const metaSent = allAccounts.reduce((sum, a) => sum + (a.metaSentCount || 0), 0);
    const metaDelivered = allAccounts.reduce((sum, a) => sum + (a.metaDeliveredCount || 0), 0);
    const metaCost = allAccounts.reduce((sum, a) => sum + parseFloat(a.metaTotalCost || "0"), 0);

    const sentCount = Math.max(localSent, metaSent);
    const deliveredCount = Math.max(localDelivered, metaDelivered);
    const totalCost = Math.max(localCost, metaCost);
    const totalMessagingLimit = allAccounts.reduce((sum, a) => sum + (a.messagingLimit || 0), 0);
    const lastSync = allAccounts[0]?.lastSyncedAt;

    return {
      totalMessages: Math.max(totalMessageRows, sentCount + failedCount),
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
      deliveryRate: sentCount > 0 ? (deliveredCount / sentCount) * 100 : 0,
      readRate: deliveredCount > 0 ? (readCount / deliveredCount) * 100 : 0,
      totalCost,
      activeCampaigns,
      approvedTemplates,
      pendingTemplates,
      messagingLimit: totalMessagingLimit,
      messagingUsed: Math.max(totalMessageRows, sentCount),
      throughputLevel: allAccounts[0]?.throughputLevel || null,
      qualityRating: (allAccounts[0]?.qualityRating as QualityScore) || "GREEN",
      apiStatus: allAccounts.length > 0 ? "connected" : "disconnected",
      lastSyncedAt: lastSync ? lastSync.toISOString() : null,
    };
  }

  async getDashboardChartData(accountId: string): Promise<{ messageVolume: any[]; statusDistribution: any[] }> {
    const now = new Date();
    // The volume chart only ever shows the last 24h, so only pull rows (and
    // only the 3 columns actually used) from that window instead of the
    // account's entire message history every time this is polled.
    const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const recentMessages = await db
      .select({ sentAt: messages.sentAt, queuedAt: messages.queuedAt, status: messages.status })
      .from(messages)
      .where(and(eq(messages.accountId, accountId), gte(messages.queuedAt, windowStart)));

    const hourlyMap = new Map<string, { time: string; sent: number; delivered: number; read: number }>();
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now);
      h.setHours(now.getHours() - i, 0, 0, 0);
      const label = h.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      hourlyMap.set(label, { time: label, sent: 0, delivered: 0, read: 0 });
    }

    for (const msg of recentMessages) {
      const sentTime = msg.sentAt || msg.queuedAt;
      if (!sentTime) continue;
      const msgDate = new Date(sentTime);
      const hoursDiff = (now.getTime() - msgDate.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) continue;
      const label = msgDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      const bucket = hourlyMap.get(label);
      if (bucket) {
        bucket.sent++;
        if (msg.status === "delivered" || msg.status === "read") bucket.delivered++;
        if (msg.status === "read") bucket.read++;
      }
    }

    const messageVolume = Array.from(hourlyMap.values());

    // Status distribution reflects all-time totals, not just the 24h window
    // - aggregate that in SQL too instead of fetching every row to count them.
    const statusCounts = await db
      .select({ status: messages.status, count: dsql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.accountId, accountId))
      .groupBy(messages.status);
    const countFor = (status: string) => Number(statusCounts.find(r => r.status === status)?.count || 0);
    const statusDistribution = [
      { name: "Delivered", value: countFor("delivered") },
      { name: "Read", value: countFor("read") },
      { name: "Sent", value: countFor("sent") },
      { name: "Failed", value: countFor("failed") },
    ].filter(s => s.value > 0);

    return { messageVolume, statusDistribution };
  }

  async getRecentActivities(accountId?: string): Promise<ActivityItem[]> {
    if (accountId) {
      return db.select().from(activities).where(eq(activities.accountId, accountId)).orderBy(desc(activities.timestamp)).limit(20);
    }
    return db.select().from(activities).orderBy(desc(activities.timestamp)).limit(20);
  }

  async addActivity(activity: Omit<ActivityItem, "id">): Promise<ActivityItem> {
    const rows = await db.insert(activities).values(activity).returning();
    return rows[0];
  }

  // Settings
  async getSettings(): Promise<ApiSettings | undefined> {
    const rows = await db.select().from(apiSettings).limit(1);
    return rows[0];
  }

  async saveSettings(settings: Omit<ApiSettings, "id">): Promise<ApiSettings> {
    const existing = await this.getSettings();
    if (existing) {
      const rows = await db.update(apiSettings).set(settings).where(eq(apiSettings.id, existing.id)).returning();
      return rows[0];
    }
    const rows = await db.insert(apiSettings).values(settings).returning();
    return rows[0];
  }

  async getApiSettings(): Promise<ApiSettings | undefined> {
    return this.getSettings();
  }

  async deleteApiSettings(): Promise<boolean> {
    const existing = await this.getSettings();
    if (!existing) return false;
    const result = await db.delete(apiSettings).where(eq(apiSettings.id, existing.id));
    return (result.rowCount ?? 0) > 0;
  }

  async saveUploadedFile(file: { id?: string; userId?: string; phoneNumberId?: string; originalName?: string; mimeType: string; size: number; data?: string; storageKey?: string }): Promise<UploadedFile> {
    const [row] = await db.insert(uploadedFiles).values(file).returning();
    return row;
  }

  async getUploadedFile(id: string): Promise<UploadedFile | undefined> {
    const rows = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id));
    return rows[0];
  }

  async deleteUploadedFile(id: string): Promise<boolean> {
    const result = await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async listUploadedFiles(params: { limit: number; offset: number }): Promise<UploadedFile[]> {
    return db
      .select()
      .from(uploadedFiles)
      .orderBy(desc(uploadedFiles.createdAt))
      .limit(params.limit)
      .offset(params.offset);
  }

  async getUploadedFilesStats(): Promise<{ count: number; totalSize: number }> {
    const rows = await db
      .select({
        count: dsql<number>`count(*)`,
        totalSize: dsql<number>`coalesce(sum(${uploadedFiles.size}), 0)`,
      })
      .from(uploadedFiles);
    return { count: Number(rows[0]?.count || 0), totalSize: Number(rows[0]?.totalSize || 0) };
  }

  // Keyset-paginated by id (not chronological, just a stable cursor) so the
  // one-time R2 backfill script can walk every legacy row exactly once
  // without loading the whole table into memory at once.
  async listUploadedFilesMissingStorageKey(params: { limit: number; afterId?: string }): Promise<UploadedFile[]> {
    const conditions = [isNull(uploadedFiles.storageKey)];
    if (params.afterId) conditions.push(dsql`${uploadedFiles.id} > ${params.afterId}`);
    return db
      .select()
      .from(uploadedFiles)
      .where(and(...conditions))
      .orderBy(uploadedFiles.id)
      .limit(params.limit);
  }

  async setUploadedFileStorageKey(id: string, storageKey: string): Promise<void> {
    await db.update(uploadedFiles).set({ storageKey }).where(eq(uploadedFiles.id, id));
  }

  // Rows the backfill script's Phase B (clear) can safely shrink: bytes are
  // confirmed to live in object storage (storageKey set) and the legacy
  // base64 fallback hasn't been cleared yet.
  async listUploadedFilesReadyToClear(params: { limit: number; afterId?: string }): Promise<UploadedFile[]> {
    const conditions = [isNotNull(uploadedFiles.storageKey), isNotNull(uploadedFiles.data)];
    if (params.afterId) conditions.push(dsql`${uploadedFiles.id} > ${params.afterId}`);
    return db
      .select()
      .from(uploadedFiles)
      .where(and(...conditions))
      .orderBy(uploadedFiles.id)
      .limit(params.limit);
  }

  async clearUploadedFileData(id: string): Promise<void> {
    await db.update(uploadedFiles).set({ data: null }).where(eq(uploadedFiles.id, id));
  }

  async getContactCountsByAccount(): Promise<Array<{ accountId: string; contactCount: number; listCount: number }>> {
    const contactRows = await db
      .select({ accountId: contacts.accountId, count: dsql<number>`count(*)` })
      .from(contacts)
      .groupBy(contacts.accountId);
    const listRows = await db
      .select({ accountId: contactLists.accountId, count: dsql<number>`count(*)` })
      .from(contactLists)
      .groupBy(contactLists.accountId);

    const byAccount = new Map<string, { contactCount: number; listCount: number }>();
    for (const row of contactRows) {
      byAccount.set(row.accountId, { contactCount: Number(row.count), listCount: 0 });
    }
    for (const row of listRows) {
      const entry = byAccount.get(row.accountId) || { contactCount: 0, listCount: 0 };
      entry.listCount = Number(row.count);
      byAccount.set(row.accountId, entry);
    }
    return Array.from(byAccount.entries()).map(([accountId, v]) => ({ accountId, ...v }));
  }

  // Analytics
  async getAnalyticsData(timeRange: string, accountId?: string): Promise<AnalyticsData> {
    const now = new Date();
    const daysMap: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[timeRange] || 7;

    // Filter to the selected window (and only the columns actually used
    // below) in SQL, instead of pulling the account's entire message
    // history into memory on every Analytics page load/refetch. For an
    // account with months of campaign history that was a multi-hundred-MB
    // spike per request - a real contributor to the server hitting its
    // memory limit and getting restarted.
    const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const messageConditions = [gte(messages.queuedAt, windowStart)];
    if (accountId) messageConditions.push(eq(messages.accountId, accountId));

    const allMessages = await db
      .select({
        queuedAt: messages.queuedAt,
        status: messages.status,
        errorCode: messages.errorCode,
        errorDescription: messages.errorDescription,
        cost: messages.cost,
      })
      .from(messages)
      .where(and(...messageConditions));

    const allTemplates = accountId
      ? await db.select({ category: templates.category }).from(templates).where(eq(templates.accountId, accountId))
      : await db.select({ category: templates.category }).from(templates);

    const dailyMap = new Map<string, { sent: number; delivered: number; read: number; failed: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyMap.set(dateStr, { sent: 0, delivered: 0, read: 0, failed: 0 });
    }

    allMessages.forEach(msg => {
      if (!msg.queuedAt) return;
      const msgDate = new Date(msg.queuedAt);
      const daysDiff = Math.floor((now.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < days) {
        const dateStr = msgDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const dayData = dailyMap.get(dateStr);
        if (dayData) {
          dayData.sent++;
          if (msg.status === "delivered" || msg.status === "read") dayData.delivered++;
          if (msg.status === "read") dayData.read++;
          if (msg.status === "failed") dayData.failed++;
        }
      }
    });

    const dailyData = Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data }));

    const hourlyMap = new Map<string, number>();
    for (let h = 0; h < 24; h += 2) {
      hourlyMap.set(`${h.toString().padStart(2, "0")}:00`, 0);
    }
    allMessages.forEach(msg => {
      if (!msg.queuedAt) return;
      const hour = new Date(msg.queuedAt).getHours();
      const hourKey = `${(Math.floor(hour / 2) * 2).toString().padStart(2, "0")}:00`;
      hourlyMap.set(hourKey, (hourlyMap.get(hourKey) || 0) + 1);
    });
    const hourlyData = Array.from(hourlyMap.entries()).map(([hour, msgs]) => ({ hour, messages: msgs }));

    const categoryCount = new Map<string, number>();
    allTemplates.forEach(t => {
      categoryCount.set(t.category, (categoryCount.get(t.category) || 0) + 1);
    });
    const categoryColors: Record<string, string> = {
      MARKETING: "hsl(var(--chart-1))",
      UTILITY: "hsl(var(--chart-2))",
      AUTHENTICATION: "hsl(var(--chart-4))",
    };
    const categoryData = Array.from(categoryCount.entries()).map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name] || "hsl(var(--chart-3))",
    }));

    const errorMap = new Map<string, { description: string; count: number }>();
    allMessages.forEach(msg => {
      if (msg.status === "failed" && msg.errorCode) {
        const existing = errorMap.get(msg.errorCode);
        if (existing) existing.count++;
        else errorMap.set(msg.errorCode, { description: msg.errorDescription || "Unknown error", count: 1 });
      }
    });
    const errorData = Array.from(errorMap.entries())
      .map(([code, { description, count }]) => ({ code, description, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const costMap = new Map<string, number>();
    dailyMap.forEach((_, date) => costMap.set(date, 0));
    allMessages.forEach(msg => {
      if (!msg.queuedAt) return;
      const dateStr = new Date(msg.queuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (costMap.has(dateStr)) {
        costMap.set(dateStr, (costMap.get(dateStr) || 0) + parseFloat(msg.cost || "0"));
      }
    });
    const costData = Array.from(costMap.entries()).map(([date, cost]) => ({
      date,
      cost: Math.round(cost * 100) / 100,
    }));

    const totalMessages = allMessages.length;
    const totalDelivered = allMessages.filter(m => m.status === "delivered" || m.status === "read").length;
    const totalRead = allMessages.filter(m => m.status === "read").length;
    const totalFailed = allMessages.filter(m => m.status === "failed").length;
    const totalCost = allMessages.reduce((sum, m) => sum + parseFloat(m.cost || "0"), 0);

    return {
      dailyData,
      hourlyData,
      categoryData,
      errorData,
      costData,
      summary: {
        totalMessages,
        totalDelivered,
        totalRead,
        totalFailed,
        deliveryRate: totalMessages > 0 ? (totalDelivered / totalMessages) * 100 : 0,
        readRate: totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0,
        totalCost: Math.round(totalCost * 100) / 100,
      },
    };
  }

  // WhatsApp Accounts
  async getAccountsByUser(userId: string): Promise<WhatsAppAccount[]> {
    const ownAccounts = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.userId, userId));
    const sharedMemberships = await db.select().from(teamMembers)
      .where(and(eq(teamMembers.memberUserId, userId), eq(teamMembers.status, "active")));
    const sharedAccountIds = sharedMemberships.map(m => m.accountId).filter(id => !ownAccounts.some(a => a.id === id));
    const sharedAccounts: WhatsAppAccount[] = [];
    for (const accId of sharedAccountIds) {
      const acc = await this.getAccount(accId);
      if (acc) sharedAccounts.push(acc);
    }
    return [...ownAccounts, ...sharedAccounts];
  }

  async getAccounts(): Promise<WhatsAppAccount[]> {
    return db.select().from(whatsappAccounts);
  }

  async getAccount(id: string): Promise<WhatsAppAccount | undefined> {
    const rows = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.id, id));
    return rows[0];
  }

  async createAccount(account: InsertWhatsAppAccount): Promise<WhatsAppAccount> {
    const rows = await db.insert(whatsappAccounts).values({
      ...account,
      status: "connected",
      qualityRating: "UNKNOWN",
      messagingLimit: 1000,
      messagingUsed: 0,
    }).returning();
    return rows[0];
  }

  async updateAccount(id: string, updates: Partial<WhatsAppAccount>): Promise<WhatsAppAccount | undefined> {
    const { id: _id, ...rest } = updates as any;
    const rows = await db.update(whatsappAccounts).set(rest).where(eq(whatsappAccounts.id, id)).returning();
    return rows[0];
  }

  async deleteAccount(id: string): Promise<boolean> {
    const result = await db.delete(whatsappAccounts).where(eq(whatsappAccounts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async setActiveAccount(userId: string, accountId: string): Promise<void> {
    await db.insert(activeAccounts)
      .values({ userId, accountId })
      .onConflictDoUpdate({
        target: activeAccounts.userId,
        set: { accountId },
      });
  }

  async getActiveAccountId(userId: string): Promise<string | undefined> {
    const rows = await db.select().from(activeAccounts).where(eq(activeAccounts.userId, userId));
    if (rows[0]) return rows[0].accountId;
    const userAccounts = await this.getAccountsByUser(userId);
    if (userAccounts.length > 0) {
      const first = userAccounts.find(a => a.status === "connected") || userAccounts[0];
      await this.setActiveAccount(userId, first.id);
      return first.id;
    }
    return undefined;
  }

  /** Single round-trip for the common authz path (active map + account row). */
  async getActiveAccountWithDetails(userId: string): Promise<{ accountId: string; account: WhatsAppAccount } | undefined> {
    const joined = await db
      .select({
        accountId: activeAccounts.accountId,
        account: whatsappAccounts,
      })
      .from(activeAccounts)
      .innerJoin(whatsappAccounts, eq(whatsappAccounts.id, activeAccounts.accountId))
      .where(eq(activeAccounts.userId, userId))
      .limit(1);

    if (joined[0]?.account) {
      return { accountId: joined[0].accountId, account: joined[0].account };
    }

    const accountId = await this.getActiveAccountId(userId);
    if (!accountId) return undefined;
    const account = await this.getAccount(accountId);
    if (!account) return undefined;
    return { accountId, account };
  }

  // Contacts
  async getContacts(accountId: string): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.accountId, accountId)).orderBy(desc(contacts.createdAt));
  }

  async getContactsPage(accountId: string, params: { page: number; pageSize: number; search?: string; listId?: string; tagId?: string }): Promise<{ contacts: Contact[]; total: number }> {
    const conditions = [eq(contacts.accountId, accountId)];
    if (params.search) {
      const term = `%${params.search}%`;
      conditions.push(or(ilike(contacts.phone, term), ilike(contacts.name, term))!);
    }
    if (params.listId) {
      conditions.push(dsql`${contacts.listIds} @> ${JSON.stringify([params.listId])}::jsonb`);
    }
    if (params.tagId) {
      conditions.push(dsql`${contacts.tagIds} @> ${JSON.stringify([params.tagId])}::jsonb`);
    }
    const where = and(...conditions);

    const [{ count }] = await db.select({ count: dsql<number>`count(*)` }).from(contacts).where(where);
    const rows = await db
      .select()
      .from(contacts)
      .where(where)
      .orderBy(desc(contacts.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return { contacts: rows, total: Number(count) };
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const rows = await db.select().from(contacts).where(eq(contacts.id, id));
    return rows[0];
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const normalized = contact.phone ? { ...contact, phone: normalizePhone(contact.phone) } : contact;
    const rows = await db.insert(contacts).values(normalized as any).returning();
    const created = rows[0];
    const listIds = (created.listIds as string[]) || [];
    const tagIds = (created.tagIds as string[]) || [];
    void Promise.all([
      bumpAccountContactDelta(created.accountId, 1),
      adjustListCounts(listIds, []),
      adjustTagCounts(tagIds, []),
    ]).catch((err) => console.error("[counters] createContact:", err.message));
    return created;
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | undefined> {
    const { id: _id, ...rest } = updates as any;
    if (rest.phone) rest.phone = normalizePhone(rest.phone);
    const before = (rest.listIds !== undefined || rest.tagIds !== undefined)
      ? await this.getContact(id)
      : undefined;
    const rows = await db.update(contacts).set({ ...rest, updatedAt: new Date() }).where(eq(contacts.id, id)).returning();
    const updated = rows[0];
    if (updated && before) {
      const oldLists = new Set((before.listIds as string[]) || []);
      const newLists = new Set((updated.listIds as string[]) || []);
      const oldTags = new Set((before.tagIds as string[]) || []);
      const newTags = new Set((updated.tagIds as string[]) || []);
      const listInc = Array.from(newLists).filter((x) => !oldLists.has(x));
      const listDec = Array.from(oldLists).filter((x) => !newLists.has(x));
      const tagInc = Array.from(newTags).filter((x) => !oldTags.has(x));
      const tagDec = Array.from(oldTags).filter((x) => !newTags.has(x));
      void Promise.all([
        adjustListCounts(listInc, listDec),
        adjustTagCounts(tagInc, tagDec),
      ]).catch((err) => console.error("[counters] updateContact:", err.message));
    }
    return updated;
  }

  async deleteContact(id: string): Promise<boolean> {
    const [contact] = await db
      .select({
        phone: contacts.phone,
        accountId: contacts.accountId,
        listIds: contacts.listIds,
        tagIds: contacts.tagIds,
      })
      .from(contacts)
      .where(eq(contacts.id, id));
    const result = await db.delete(contacts).where(eq(contacts.id, id));
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted && contact) {
      await this.deleteMessagesForPhones(contact.accountId, [contact.phone]);
      void Promise.all([
        bumpAccountContactDelta(contact.accountId, -1),
        adjustListCounts([], (contact.listIds as string[]) || []),
        adjustTagCounts([], (contact.tagIds as string[]) || []),
      ]).catch((err) => console.error("[counters] deleteContact:", err.message));
    }
    return deleted;
  }

  async bulkDeleteContacts(ids: string[], accountId: string): Promise<number> {
    if (ids.length === 0) return 0;
    const toDelete = await db
      .select({ phone: contacts.phone, listIds: contacts.listIds, tagIds: contacts.tagIds })
      .from(contacts)
      .where(and(inArray(contacts.id, ids), eq(contacts.accountId, accountId)));
    const result = await db.delete(contacts)
      .where(and(inArray(contacts.id, ids), eq(contacts.accountId, accountId)));
    const deletedCount = result.rowCount ?? 0;
    if (deletedCount > 0 && toDelete.length > 0) {
      await this.deleteMessagesForPhones(accountId, toDelete.map((c) => c.phone));
      const listDec = toDelete.flatMap((c) => (c.listIds as string[]) || []);
      const tagDec = toDelete.flatMap((c) => (c.tagIds as string[]) || []);
      void Promise.all([
        bumpAccountContactDelta(accountId, -deletedCount),
        adjustListCounts([], listDec),
        adjustTagCounts([], tagDec),
      ]).catch((err) => console.error("[counters] bulkDeleteContacts:", err.message));
    }
    return deletedCount;
  }

  async deleteAllContactsForAccount(accountId: string): Promise<number> {
    const rows = await db
      .select({ phone: contacts.phone })
      .from(contacts)
      .where(eq(contacts.accountId, accountId));
    if (rows.length === 0) return 0;

    await this.deleteMessagesForPhones(accountId, rows.map((r) => r.phone));
    const result = await db.delete(contacts).where(eq(contacts.accountId, accountId));
    const deletedCount = result.rowCount ?? 0;

    if (deletedCount > 0) {
      await bumpAccountContactDelta(accountId, -deletedCount);
      await db
        .update(contactLists)
        .set({ contactCount: 0, updatedAt: new Date() })
        .where(eq(contactLists.accountId, accountId));
    }

    return deletedCount;
  }

  async deleteAllListsForAccount(accountId: string): Promise<number> {
    await db
      .update(contacts)
      .set({ listIds: [], updatedAt: new Date() })
      .where(eq(contacts.accountId, accountId));

    const result = await db.delete(contactLists).where(eq(contactLists.accountId, accountId));
    return result.rowCount ?? 0;
  }

  async deleteMessagesForPhones(accountId: string, phones: string[]): Promise<void> {
    if (phones.length === 0) return;
    const normalizedPhones = Array.from(new Set(phones.map(normalizePhone).filter(Boolean)));
    if (normalizedPhones.length === 0) return;
    await db.delete(messages).where(and(eq(messages.accountId, accountId), inArray(messages.recipientPhone, normalizedPhones)));

    const matchingConversations = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.accountId, accountId), inArray(conversations.contactPhone, normalizedPhones)));

    if (matchingConversations.length > 0) {
      const conversationIds = matchingConversations.map((c) => c.id);
      await db.delete(conversationMessages).where(inArray(conversationMessages.conversationId, conversationIds));
      await db.delete(conversations).where(inArray(conversations.id, conversationIds));
    }
  }

  async importContacts(contactsData: InsertContact[], listId?: string): Promise<{ imported: number; updated: number }> {
    if (contactsData.length === 0) return { imported: 0, updated: 0 };

    const accountId = contactsData[0].accountId!;

    // Normalize before de-duping so "+91 87663-50093" and "8766350093" in the
    // same CSV are recognized as the same contact instead of both importing.
    const normalizedData = contactsData.map((c) => c.phone ? { ...c, phone: normalizePhone(c.phone) } : c);

    // De-dupe within the incoming batch itself (CSVs commonly contain repeats)
    const seenPhones = new Set<string>();
    const uniqueIncoming = normalizedData.filter((c) => {
      if (!c.phone || seenPhones.has(c.phone)) return false;
      seenPhones.add(c.phone);
      return true;
    });

    // One query to find which phones already exist, instead of one query per
    // contact - importing a few thousand contacts was issuing thousands of
    // sequential round trips and timing out.
    const existingRows = await db.select({ id: contacts.id, phone: contacts.phone, listIds: contacts.listIds })
      .from(contacts)
      .where(and(eq(contacts.accountId, accountId), inArray(contacts.phone, uniqueIncoming.map((c) => c.phone))));
    const existingByPhone = new Map(existingRows.map((r) => [r.phone, r]));

    const toInsert: any[] = [];
    const toUpdate: { id: string; listIds: string[]; name?: string }[] = [];

    const listIncFromMerge: string[] = [];
    for (const c of uniqueIncoming) {
      const existing = existingByPhone.get(c.phone);
      if (existing) {
        // Contact already exists elsewhere - merge this list into it and
        // refresh its name, instead of silently skipping it.
        const currentListIds = (existing.listIds as string[]) || [];
        const addsNewList = !!listId && !currentListIds.includes(listId);
        const mergedListIds = addsNewList ? [...currentListIds, listId!] : currentListIds;
        if (addsNewList) listIncFromMerge.push(listId!);
        toUpdate.push({ id: existing.id, listIds: mergedListIds, name: c.name || undefined });
      } else {
        toInsert.push({ ...c, listIds: listId ? [listId] : (c.listIds || []) });
      }
    }

    let imported = 0;
    const BATCH_SIZE = 500;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      await db.insert(contacts).values(batch as any);
      imported += batch.length;
    }

    // Apply updates concurrently in bounded chunks - much faster than one
    // sequential await per row, without building a giant dynamic bulk-update
    // statement.
    let updated = 0;
    const UPDATE_CONCURRENCY = 25;
    for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
      const chunk = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
      await Promise.all(chunk.map((u) =>
        db.update(contacts)
          .set({ listIds: u.listIds, ...(u.name ? { name: u.name } : {}), updatedAt: new Date() })
          .where(eq(contacts.id, u.id))
      ));
      updated += chunk.length;
    }

    // Keep denormalized counters in sync: newly inserted rows count toward
    // their lists/tags/account total, and existing contacts that merged in
    // this list (but weren't already on it) count toward the list once.
    if (imported > 0 || listIncFromMerge.length > 0) {
      const listInc = toInsert.flatMap((c: any) => (c.listIds as string[]) || []).concat(listIncFromMerge);
      const tagInc = toInsert.flatMap((c: any) => (c.tagIds as string[]) || []);
      void Promise.all([
        imported > 0 ? bumpAccountContactDelta(accountId, imported) : Promise.resolve(),
        adjustListCounts(listInc, []),
        adjustTagCounts(tagInc, []),
      ]).catch((err) => console.error("[counters] importContacts:", err.message));
    }

    return { imported, updated };
  }

  // Contact Lists — trust denormalized contact_count (indexed account lookup only).
  async getLists(accountId: string): Promise<ContactList[]> {
    return db.select().from(contactLists).where(eq(contactLists.accountId, accountId)).orderBy(desc(contactLists.createdAt));
  }

  async getList(id: string): Promise<ContactList | undefined> {
    const rows = await db.select().from(contactLists).where(eq(contactLists.id, id));
    return rows[0];
  }

  async createList(list: InsertContactList): Promise<ContactList> {
    const rows = await db.insert(contactLists).values(list).returning();
    return rows[0];
  }

  async updateList(id: string, updates: Partial<ContactList>): Promise<ContactList | undefined> {
    const { id: _id, ...rest } = updates as any;
    const rows = await db.update(contactLists).set({ ...rest, updatedAt: new Date() }).where(eq(contactLists.id, id)).returning();
    return rows[0];
  }

  async deleteList(id: string): Promise<boolean> {
    const result = await db.delete(contactLists).where(eq(contactLists.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteContactList(id: string): Promise<boolean> {
    return this.deleteList(id);
  }

  async getContactListsByAccount(accountId: string): Promise<ContactList[]> {
    return this.getLists(accountId);
  }

  // Contact Tags — trust denormalized contact_count.
  async getTags(accountId: string): Promise<ContactTag[]> {
    return db.select().from(contactTags).where(eq(contactTags.accountId, accountId)).orderBy(desc(contactTags.createdAt));
  }

  async getTag(id: string): Promise<ContactTag | undefined> {
    const rows = await db.select().from(contactTags).where(eq(contactTags.id, id));
    return rows[0];
  }

  async createTag(tag: InsertContactTag): Promise<ContactTag> {
    const rows = await db.insert(contactTags).values(tag).returning();
    return rows[0];
  }

  async deleteTag(id: string): Promise<boolean> {
    const result = await db.delete(contactTags).where(eq(contactTags.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteContactTag(id: string): Promise<boolean> {
    return this.deleteTag(id);
  }

  async getContactTagsByAccount(accountId: string): Promise<ContactTag[]> {
    return this.getTags(accountId);
  }

  // Conversations
  // A "conversation" row gets created for every campaign recipient (even a
  // one-way broadcast with no reply), so this table grows enormous fast -
  // one account already has 28k+ rows. The Inbox only ever needs the most
  // recent slice for its own listing; unbounded callers (like account
  // deletion cleanup) pass no limit and still get everything.
  async getConversations(accountId: string, limit?: number): Promise<Conversation[]> {
    const query = db.select().from(conversations)
      .where(eq(conversations.accountId, accountId))
      .orderBy(desc(conversations.lastMessageAt));
    return limit ? query.limit(limit) : query;
  }

  async getConversationsByIds(accountId: string, ids: string[]): Promise<Conversation[]> {
    if (ids.length === 0) return [];
    return db.select().from(conversations)
      .where(and(eq(conversations.accountId, accountId), inArray(conversations.id, ids)))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const rows = await db.select().from(conversations).where(eq(conversations.id, id));
    return rows[0];
  }

  async getConversationByPhone(phone: string, accountId: string): Promise<Conversation | undefined> {
    const normalizedPhone = normalizePhone(phone);
    const rows = await db.select().from(conversations)
      .where(and(eq(conversations.contactPhone, normalizedPhone), eq(conversations.accountId, accountId)));
    return rows[0];
  }

  async createConversation(phone: string, name: string | undefined, accountId: string): Promise<Conversation> {
    const normalizedPhone = normalizePhone(phone);
    const contactRows = await db.select().from(contacts)
      .where(and(eq(contacts.phone, normalizedPhone), eq(contacts.accountId, accountId)));
    const contact = contactRows[0];

    const rows = await db.insert(conversations).values({
      accountId,
      contactId: contact?.id || "",
      contactPhone: normalizedPhone,
      contactName: name || contact?.name || undefined,
      unreadCount: 0,
      status: "open",
    }).returning();
    return rows[0];
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const { id: _id, ...rest } = updates as any;
    const rows = await db.update(conversations).set(rest).where(eq(conversations.id, id)).returning();
    return rows[0];
  }

  async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    return db.select().from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(conversationMessages.sentAt);
  }

  async getRepliedConversationIds(accountId: string): Promise<Set<string>> {
    // One joined query instead of fetching every conversation's full message
    // history one at a time just to check for an inbound message.
    const rows = await db.selectDistinct({ id: conversationMessages.conversationId })
      .from(conversationMessages)
      .innerJoin(conversations, eq(conversations.id, conversationMessages.conversationId))
      .where(and(eq(conversations.accountId, accountId), eq(conversationMessages.direction, "inbound")));
    return new Set(rows.map((r) => r.id));
  }

  async addConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage> {
    const rows = await db.insert(conversationMessages).values(message).returning();
    const newMsg = rows[0];

    await db.update(conversations).set({
      lastMessage: message.content,
      lastMessageAt: new Date(),
      ...(message.direction === "inbound" ? { unreadCount: dsql`${conversations.unreadCount} + 1` } : {}),
    }).where(eq(conversations.id, message.conversationId));

    return newMsg;
  }

  async getConversationsByAccount(accountId: string): Promise<Conversation[]> {
    return this.getConversations(accountId);
  }

  async deleteConversation(id: string): Promise<boolean> {
    await db.delete(conversationMessages).where(eq(conversationMessages.conversationId, id));
    const result = await db.delete(conversations).where(eq(conversations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Notifications
  async getNotifications(accountId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.accountId, accountId))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const rows = await db.select().from(notifications).where(eq(notifications.id, id));
    return rows[0];
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    let totalRecipients = 0;
    if (notification.listIds && Array.isArray(notification.listIds)) {
      for (const listId of notification.listIds) {
        const list = await this.getList(listId);
        totalRecipients += list?.contactCount || 0;
      }
    }
    const rows = await db.insert(notifications).values({
      ...notification,
      status: notification.scheduledAt ? "scheduled" : "draft",
      totalRecipients,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
    } as any).returning();
    return rows[0];
  }

  async updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | undefined> {
    const { id: _id, ...rest } = updates as any;
    const rows = await db.update(notifications).set(rest).where(eq(notifications.id, id)).returning();
    return rows[0];
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getNotificationsByAccount(accountId: string): Promise<Notification[]> {
    return this.getNotifications(accountId);
  }

  async getContactsByAccount(accountId: string): Promise<Contact[]> {
    return this.getContacts(accountId);
  }

  async getTeamMembers(accountId: string): Promise<TeamMember[]> {
    return db.select().from(teamMembers).where(eq(teamMembers.accountId, accountId));
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const rows = await db.insert(teamMembers).values(member).returning();
    return rows[0];
  }

  async removeTeamMember(id: string): Promise<boolean> {
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getTeamMemberByEmail(email: string, accountId: string): Promise<TeamMember | undefined> {
    const rows = await db.select().from(teamMembers)
      .where(and(eq(teamMembers.memberEmail, email), eq(teamMembers.accountId, accountId)));
    return rows[0];
  }

  async getSharedAccountsForUser(userEmail: string): Promise<TeamMember[]> {
    return db.select().from(teamMembers)
      .where(and(eq(teamMembers.memberEmail, userEmail), eq(teamMembers.status, "active")));
  }

  async acceptTeamInvite(id: string, userId: string): Promise<TeamMember | undefined> {
    const rows = await db.update(teamMembers).set({
      memberUserId: userId,
      status: "active",
      acceptedAt: new Date(),
    }).where(eq(teamMembers.id, id)).returning();
    return rows[0];
  }

  async backfillMessageCampaignIds(): Promise<void> {
    const orphanedMessages = await db.select().from(messages).where(isNull(messages.campaignId));
    if (orphanedMessages.length === 0) {
      return;
    }

    const allNotifications = await db.select().from(notifications);
    let linked = 0;

    for (const msg of orphanedMessages) {
      const matchingNotification = allNotifications
        .filter(n =>
          n.templateId === msg.templateId &&
          n.sentAt &&
          n.accountId === msg.accountId
        )
        .sort((a, b) => {
          const msgTime = msg.sentAt || msg.queuedAt;
          if (!msgTime) return 0;
          const aDiff = Math.abs(new Date(a.sentAt!).getTime() - new Date(msgTime).getTime());
          const bDiff = Math.abs(new Date(b.sentAt!).getTime() - new Date(msgTime).getTime());
          return aDiff - bDiff;
        })
        .find(n => {
          const msgTime = msg.sentAt || msg.queuedAt;
          if (!msgTime || !n.sentAt) return false;
          const nStart = new Date(n.sentAt).getTime();
          const nEnd = n.completedAt ? new Date(n.completedAt).getTime() + 60000 : nStart + 30 * 60 * 1000;
          const mTime = new Date(msgTime).getTime();
          return mTime >= nStart - 5000 && mTime <= nEnd;
        });

      if (matchingNotification) {
        await db.update(messages)
          .set({ campaignId: matchingNotification.id })
          .where(eq(messages.id, msg.id));
        linked++;
      }
    }
  }
}

export const storage = new DatabaseStorage();
