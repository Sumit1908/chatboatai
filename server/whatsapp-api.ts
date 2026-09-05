import type { TemplateComponent } from "@shared/schema";
import { getUploadedMediaBuffer } from "./uploadStorage";

const META_API_VERSION = "v21.0";
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// Template creation (POST .../message_templates) rejects with a generic
// "does not exist, cannot be loaded due to missing permissions, or does not
// support this operation" (code 100, subcode 33) on v21.0 for this app,
// while the identical request succeeds on v19.0 - confirmed by testing both
// directly against Meta. Every other endpoint (messaging, media, template
// listing/fetching) is unaffected and stays on v21.0.
const META_TEMPLATE_CREATE_API_BASE = "https://graph.facebook.com/v19.0";

export interface MetaApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export interface MetaApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: MetaApiError;
  rawStatus?: number;
}

async function metaApiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<MetaApiResponse<T>> {
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      return {
        success: false,
        error: {
          message: `Invalid JSON response: ${responseText.substring(0, 200)}`,
          type: "ParseError",
          code: -1,
        },
        rawStatus: response.status,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || {
          message: `HTTP ${response.status}: ${responseText.substring(0, 200)}`,
          type: "HttpError",
          code: response.status,
        },
        rawStatus: response.status,
      };
    }

    return { success: true, data: data as T };
  } catch (err: any) {
    return {
      success: false,
      error: {
        message: err.message || "Network error",
        type: "NetworkError",
        code: -1,
      },
    };
  }
}

export async function testConnection(
  phoneNumberId: string,
  accessToken: string
): Promise<MetaApiResponse> {
  return metaApiRequest(
    `${META_API_BASE}/${phoneNumberId}?access_token=${accessToken}`
  );
}

export async function uploadSessionMedia(
  appId: string,
  accessToken: string,
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<MetaApiResponse> {
  const fileSize = fileBuffer.length;

  const createSessionRes = await metaApiRequest<{ id: string }>(
    `${META_API_BASE}/${appId}/uploads?file_length=${fileSize}&file_type=${encodeURIComponent(mimeType)}&file_name=${encodeURIComponent(fileName)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!createSessionRes.success || !createSessionRes.data?.id) {
    console.error("Failed to create upload session:", createSessionRes.error);
    return createSessionRes;
  }

  const uploadSessionId = createSessionRes.data.id;

  const uploadRes = await metaApiRequest<{ h: string }>(
    `${META_API_BASE}/${uploadSessionId}`,
    {
      method: "POST",
      headers: {
        Authorization: `OAuth ${accessToken}`,
        "file_offset": "0",
        "Content-Type": mimeType,
      },
      body: fileBuffer,
    }
  );

  if (!uploadRes.success || !uploadRes.data?.h) {
    console.error("Failed to upload file data:", uploadRes.error);
    return uploadRes;
  }

  // Meta's resumable upload endpoint has been observed returning the "h" field
  // as multiple newline-joined handles instead of a single token. Only the
  // final one is the completed upload's handle - take the last non-empty line.
  const rawHandle = uploadRes.data.h;
  const handleLines = rawHandle.split("\n").map((l) => l.trim()).filter(Boolean);
  if (handleLines.length > 1) {
    console.warn(`[Media Upload] Received ${handleLines.length} handles instead of 1, using the last one`);
  }
  const handle = handleLines[handleLines.length - 1] || rawHandle;

  return {
    success: true,
    data: { handle },
  };
}

function buildMetaComponents(components: TemplateComponent[], mediaHandle?: string): any[] {
  const metaComponents: any[] = [];

  for (const comp of components) {
    if (comp.type === "HEADER") {
      const header: any = { type: "HEADER" };
      if (comp.format === "TEXT") {
        header.format = "TEXT";
        header.text = comp.text || "";
        if (header.text && header.text.includes("{{")) {
          const varCount = (header.text.match(/\{\{\d+\}\}/g) || []).length;
          if (varCount > 0) {
            header.example = {
              header_text: Array(varCount).fill("Sample"),
            };
          }
        }
      } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(comp.format || "")) {
        header.format = comp.format;
        if (mediaHandle) {
          header.example = { header_handle: [mediaHandle] };
        }
      }
      metaComponents.push(header);
    } else if (comp.type === "BODY") {
      const bodyComp: any = {
        type: "BODY",
        text: comp.text || "",
      };
      if (bodyComp.text && bodyComp.text.includes("{{")) {
        const varCount = (bodyComp.text.match(/\{\{\d+\}\}/g) || []).length;
        if (varCount > 0) {
          bodyComp.example = {
            body_text: [Array(varCount).fill("Sample")],
          };
        }
      }
      metaComponents.push(bodyComp);
    } else if (comp.type === "FOOTER") {
      if (comp.text && comp.text.trim()) {
        metaComponents.push({
          type: "FOOTER",
          text: comp.text,
        });
      }
    } else if (comp.type === "BUTTONS" && comp.buttons) {
      metaComponents.push({
        type: "BUTTONS",
        buttons: comp.buttons.map((btn) => {
          if (btn.type === "QUICK_REPLY") {
            return { type: "QUICK_REPLY", text: btn.text };
          } else if (btn.type === "URL") {
            return { type: "URL", text: btn.text, url: btn.url };
          } else if (btn.type === "PHONE_NUMBER") {
            return {
              type: "PHONE_NUMBER",
              text: btn.text,
              phone_number: (btn as any).phone_number || btn.phoneNumber,
            };
          }
          return { type: btn.type, text: btn.text };
        }),
      });
    }
  }

  return metaComponents;
}

// Shared by createTemplate and updateTemplateOnMeta: resolves the header's
// media handle (pre-uploaded at file-upload time, or freshly uploaded from
// the stored file) or returns an error response if that fails.
async function resolveTemplateMediaHandle(
  components: TemplateComponent[],
  accessToken: string,
  effectiveAppId: string,
): Promise<{ mediaHandle?: string; error?: MetaApiResponse }> {
  const headerComp = components.find(c => c.type === "HEADER");
  if (!headerComp || !["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format || "")) {
    return {};
  }

  if ((headerComp as any).mediaHandle) {
    return { mediaHandle: (headerComp as any).mediaHandle };
  }

  let file: { buffer: Buffer; mimeType: string; originalName?: string | null } | null = null;

  if (headerComp.mediaUrl) {
    file = await getUploadedMediaBuffer(headerComp.mediaUrl);
    if (!file) {
      console.warn("Media file not found, submitting template without media sample:", headerComp.mediaUrl);
    }
  }

  // Templates synced in from Meta (or duplicated from one) carry Meta's own
  // response shape instead of our mediaUrl/mediaHandle - the header's only
  // media reference is example.header_handle, a CDN URL Meta hosts the
  // approved template's media at. Fetch and re-upload it as a fresh sample
  // rather than submitting an IMAGE/VIDEO/DOCUMENT header with none at all,
  // which Meta now hard-rejects ("Missing sample parameter for title type").
  if (!file) {
    const cdnUrl = (headerComp as any).example?.header_handle?.[0];
    if (typeof cdnUrl === "string" && /^https?:\/\//i.test(cdnUrl)) {
      try {
        const res = await fetch(cdnUrl);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          const mimeType = res.headers.get("content-type") || "application/octet-stream";
          file = { buffer, mimeType, originalName: "header" };
        } else {
          console.warn(`Failed to fetch synced header media (${res.status}), submitting without a sample:`, cdnUrl);
        }
      } catch (err: any) {
        console.warn("Failed to fetch synced header media, submitting without a sample:", err.message);
      }
    }
  }

  if (!file) return {};

  const uploadResult = await uploadSessionMedia(effectiveAppId, accessToken, file.buffer, file.mimeType, file.originalName || "header");

  if (uploadResult.success && uploadResult.data?.handle) {
    return { mediaHandle: uploadResult.data.handle };
  }

  console.error("Media upload to Meta failed:", uploadResult.error);
  return {
    error: {
      success: false,
      error: {
        message: `Failed to upload media to Meta: ${uploadResult.error?.message || "Unknown error"}. Please try again or use a different media file.`,
        type: "MediaUploadError",
        code: -1,
      },
    },
  };
}

export async function createTemplate(
  wabaId: string,
  accessToken: string,
  name: string,
  category: string,
  language: string,
  components: TemplateComponent[],
  appId?: string
): Promise<MetaApiResponse> {
  const { mediaHandle, error } = await resolveTemplateMediaHandle(components, accessToken, appId || wabaId);
  if (error) return error;

  const metaComponents = buildMetaComponents(components, mediaHandle);

  const hasBody = metaComponents.some(c => c.type === "BODY" && c.text && c.text.trim());
  if (!hasBody) {
    return {
      success: false,
      error: {
        message: "Template body text is required. Please add body text before submitting.",
        type: "ValidationError",
        code: -1,
      },
    };
  }

  const payload = {
    name: name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
    category: category.toUpperCase(),
    language: language,
    components: metaComponents,
  };

  const submit = () =>
    metaApiRequest(`${META_TEMPLATE_CREATE_API_BASE}/${wabaId}/message_templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

  const result = await submit();
  if (result.success || !mediaHandle) {
    return result;
  }

  // Freshly-uploaded media handles are sometimes not yet fully processed on
  // Meta's side, causing an immediate submission to fail with a generic
  // "(#100) Invalid parameter" even though the same handle works moments
  // later. Retry a couple of times with a short delay before giving up.
  const isRetryableMediaError = result.error?.code === 100;
  if (!isRetryableMediaError) {
    return result;
  }

  const delays = [3000, 6000];
  let lastResult = result;
  for (const delayMs of delays) {
    console.warn(`Template submission failed with a possibly-stale media handle, retrying in ${delayMs}ms:`, lastResult.error?.message);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    lastResult = await submit();
    if (lastResult.success) {
      return lastResult;
    }
  }

  return lastResult;
}

// Edits an already-submitted template on Meta's side (name and language can't
// be changed once submitted - only category/components). This is what
// actually needs to run when a user edits an approved/rejected/paused
// template's content: previously nothing called Meta at all on edit, so
// changes only ever touched the local copy while Meta kept sending the
// original approved version. Editing resets the template to PENDING review.
// Meta also enforces a small daily limit on how many times a template can be
// edited - that surfaces here as a normal API error.
export async function updateTemplateOnMeta(
  metaTemplateId: string,
  wabaId: string,
  accessToken: string,
  category: string,
  components: TemplateComponent[],
  appId?: string
): Promise<MetaApiResponse> {
  const { mediaHandle, error } = await resolveTemplateMediaHandle(components, accessToken, appId || wabaId);
  if (error) return error;

  const metaComponents = buildMetaComponents(components, mediaHandle);
  const hasBody = metaComponents.some(c => c.type === "BODY" && c.text && c.text.trim());
  if (!hasBody) {
    return {
      success: false,
      error: { message: "Template body text is required.", type: "ValidationError", code: -1 },
    };
  }

  const payload = { category: category.toUpperCase(), components: metaComponents };

  return metaApiRequest(`${META_API_BASE}/${metaTemplateId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteTemplate(
  wabaId: string,
  accessToken: string,
  templateName: string
): Promise<MetaApiResponse> {
  return metaApiRequest(
    `${META_API_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

export async function getTemplates(
  wabaId: string,
  accessToken: string
): Promise<MetaApiResponse> {
  return metaApiRequest(
    `${META_API_BASE}/${wabaId}/message_templates?limit=100&fields=id,name,status,category,language,components,quality_score,rejected_reason`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// Meta permanently hosts the header media of any APPROVED template at a CDN
// URL of its own - fetching it lets us send header media without ever
// depending on our own local disk, which can be wiped by a server restart
// long after the template was approved.
export async function getTemplateHeaderMediaLink(
  wabaId: string,
  accessToken: string,
  templateName: string
): Promise<string | null> {
  const result = await metaApiRequest<{ data: any[] }>(
    `${META_API_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}&fields=id,name,status,components`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!result.success || !result.data?.data?.length) return null;

  // Meta's `name` filter does a prefix match, not an exact one - it will
  // also return e.g. "hero_04_copy_xyz" for a query of "hero_04" - so filter
  // to an exact name match ourselves before picking one.
  const exactMatches = result.data.data.filter((t: any) => t.name === templateName);
  const approved = exactMatches.find((t: any) => t.status === "APPROVED") || exactMatches[0];
  if (!approved) return null;
  const headerComp = (approved.components || []).find((c: any) => c.type === "HEADER");
  const link = headerComp?.example?.header_handle?.[0];
  return typeof link === "string" && /^https?:\/\//i.test(link) ? link : null;
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  templateName: string,
  templateLanguage: string,
  headerParams?: any[],
  bodyParams?: any[],
  buttonParams?: any[]
): Promise<MetaApiResponse> {
  const template: any = {
    name: templateName,
    language: { code: templateLanguage },
  };

  const templateComponents: any[] = [];

  if (headerParams && headerParams.length > 0) {
    templateComponents.push({
      type: "header",
      parameters: headerParams,
    });
  }

  if (bodyParams && bodyParams.length > 0) {
    templateComponents.push({
      type: "body",
      parameters: bodyParams,
    });
  }

  if (buttonParams && buttonParams.length > 0) {
    for (let i = 0; i < buttonParams.length; i++) {
      templateComponents.push({
        type: "button",
        sub_type: buttonParams[i].sub_type || "quick_reply",
        index: i.toString(),
        parameters: [buttonParams[i].parameter],
      });
    }
  }

  if (templateComponents.length > 0) {
    template.components = templateComponents;
  }

  const payload = {
    messaging_product: "whatsapp",
    to: recipientPhone.replace(/[^0-9]/g, ""),
    type: "template",
    template,
  };

  return metaApiRequest(`${META_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  messageText: string
): Promise<MetaApiResponse> {
  const payload = {
    messaging_product: "whatsapp",
    to: recipientPhone.replace(/[^0-9]/g, ""),
    type: "text",
    text: { body: messageText },
  };

  return metaApiRequest(`${META_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function uploadMedia(
  phoneNumberId: string,
  accessToken: string,
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<MetaApiResponse> {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append("file", blob, fileName);
  formData.append("messaging_product", "whatsapp");
  formData.append("type", mimeType);

  return metaApiRequest(`${META_API_BASE}/${phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
}

export async function getPhoneNumberAnalytics(
  phoneNumberId: string,
  accessToken: string
): Promise<MetaApiResponse> {
  const fields = "quality_rating,messaging_limit_tier,throughput,verified_name,display_phone_number,status";
  return metaApiRequest(
    `${META_API_BASE}/${phoneNumberId}?fields=${fields}&access_token=${accessToken}`
  );
}

export async function getWabaAnalytics(
  wabaId: string,
  accessToken: string,
  startTimestamp: number,
  endTimestamp: number
): Promise<MetaApiResponse> {
  const granularity = "DAY";
  const url = `${META_API_BASE}/${wabaId}?fields=analytics.start(${startTimestamp}).end(${endTimestamp}).granularity(${granularity})&access_token=${accessToken}`;
  return metaApiRequest(url);
}

export async function getConversationAnalytics(
  wabaId: string,
  accessToken: string,
  startTimestamp: number,
  endTimestamp: number
): Promise<MetaApiResponse> {
  const granularity = "DAILY";
  const url = `${META_API_BASE}/${wabaId}?fields=conversation_analytics.start(${startTimestamp}).end(${endTimestamp}).granularity(${granularity}).conversation_type(FREE_ENTRY,FREE_TIER,REGULAR)&access_token=${accessToken}`;
  return metaApiRequest(url);
}

const whatsappApi = {
  testConnection,
  createTemplate,
  deleteTemplate,
  getTemplates,
  sendTemplateMessage,
  sendTextMessage,
  uploadMedia,
  uploadSessionMedia,
  subscribeAppToWaba,
  getPhoneNumberAnalytics,
  getWabaAnalytics,
  getConversationAnalytics,
};

export async function subscribeAppToWaba(
  wabaId: string,
  accessToken: string
): Promise<MetaApiResponse> {
  const url = `${META_API_BASE}/${wabaId}/subscribed_apps`;
  return metaApiRequest(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

export async function registerWebhookWithMeta(
  appId: string,
  appSecret: string,
  callbackUrl: string,
  verifyToken: string
): Promise<MetaApiResponse> {
  const appAccessToken = `${appId}|${appSecret}`;
  const url = `${META_API_BASE}/${appId}/subscriptions`;
  
  const params = new URLSearchParams({
    object: "whatsapp_business_account",
    callback_url: callbackUrl,
    verify_token: verifyToken,
    fields: "messages,message_template_status_update",
    access_token: appAccessToken,
  });

  return metaApiRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
}

export async function getWebhookSubscriptions(
  appId: string,
  appSecret: string
): Promise<MetaApiResponse> {
  const appAccessToken = `${appId}|${appSecret}`;
  const url = `${META_API_BASE}/${appId}/subscriptions?access_token=${appAccessToken}`;
  return metaApiRequest(url);
}

export default whatsappApi;
