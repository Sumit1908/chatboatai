import type { BillingPayment } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { getBillingPlanById } from "./billingPlans";
import { formatPriceLabel } from "@shared/billingPlans";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function typeLabel(type: string): string {
  switch (type) {
    case "subscription":
      return "Subscription";
    case "upgrade":
      return "Plan upgrade";
    case "renewal":
      return "Subscription renewal";
    case "refund":
      return "Refund";
    default:
      return type;
  }
}

export async function buildPaymentInvoiceHtml(params: {
  payment: BillingPayment;
  user: User;
}): Promise<{ html: string; filename: string }> {
  const { payment, user } = params;
  const plan = payment.billingPlanId ? await getBillingPlanById(payment.billingPlanId) : undefined;
  const fromPlan = payment.fromPlanId ? await getBillingPlanById(payment.fromPlanId) : undefined;
  const invoiceNo = `INV-${(payment.razorpayPaymentId || payment.id).slice(-10).toUpperCase()}`;
  const issuedAt = payment.createdAt ? new Date(payment.createdAt) : new Date();
  const customerName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Customer";
  const lineDescription =
    payment.description ||
    (payment.type === "upgrade" && plan
      ? `Upgrade${fromPlan ? ` from ${fromPlan.name}` : ""} to ${plan.name}`
      : plan
        ? `${plan.name} — ${typeLabel(payment.type)}`
        : typeLabel(payment.type));

  const amountLabel = formatPriceLabel(payment.amountInr);
  const filename = `chatboatai-invoice-${invoiceNo}.html`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoiceNo)} — ChatBoatAI</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0f3d36; margin: 0; background: #f7fbf8; }
    .page { max-width: 720px; margin: 32px auto; background: #fff; border: 1px solid #d7ebe4; border-radius: 16px; padding: 40px; box-shadow: 0 12px 40px rgba(7,94,84,0.06); }
    .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 1px solid #e5f2ee; padding-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 800; color: #075E54; letter-spacing: -0.02em; }
    .brand span { color: #25D366; }
    .muted { color: #5f7f78; font-size: 13px; line-height: 1.5; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 28px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid #eef6f3; font-size: 14px; }
    th { color: #5f7f78; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .right { text-align: right; }
    .total { font-size: 18px; font-weight: 700; color: #075E54; }
    .badge { display: inline-block; background: #e8f8ef; color: #128C7E; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 600; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5f2ee; font-size: 12px; color: #7a9590; }
    .actions { margin: 20px auto; max-width: 720px; text-align: center; }
    .actions button { background: #25D366; color: white; border: 0; border-radius: 10px; padding: 10px 16px; font-weight: 600; cursor: pointer; }
    @media print {
      body { background: white; }
      .page { margin: 0; border: 0; box-shadow: none; border-radius: 0; max-width: none; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand">ChatBoatAI</div>
        <div class="muted">WhatsApp Business API platform<br/>Payment receipt / tax invoice</div>
      </div>
      <div class="right">
        <h1>Invoice</h1>
        <div class="muted">
          <strong>${escapeHtml(invoiceNo)}</strong><br/>
          Date: ${escapeHtml(issuedAt.toLocaleString("en-IN"))}<br/>
          Status: <span class="badge">${escapeHtml(payment.status)}</span>
        </div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="muted" style="margin-bottom:6px;font-weight:600;color:#075E54;">Billed to</div>
        <div><strong>${escapeHtml(customerName)}</strong></div>
        <div class="muted">${escapeHtml(user.email || payment.email || "—")}</div>
      </div>
      <div>
        <div class="muted" style="margin-bottom:6px;font-weight:600;color:#075E54;">Payment details</div>
        <div class="muted">
          Type: ${escapeHtml(typeLabel(payment.type))}<br/>
          Method: ${escapeHtml(payment.method || "Razorpay")}<br/>
          Payment ID: ${escapeHtml(payment.razorpayPaymentId || "—")}<br/>
          Order ID: ${escapeHtml(payment.razorpayOrderId || "—")}<br/>
          Subscription ID: ${escapeHtml(payment.razorpaySubscriptionId || "—")}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Plan</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(lineDescription)}</td>
          <td>${escapeHtml(plan ? `${plan.name} (${plan.priceLabel}/mo)` : "—")}</td>
          <td class="right">${escapeHtml(amountLabel)}</td>
        </tr>
        <tr>
          <td colspan="2" class="right total">Total paid</td>
          <td class="right total">${escapeHtml(amountLabel)} ${escapeHtml(payment.currency || "INR")}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      This receipt confirms payment collected via Razorpay for ChatBoatAI. GST, if applicable, is included as per your checkout.
      For support contact your ChatBoatAI account manager or reply from your registered email.
      <br/><br/>
      Generated on ${escapeHtml(new Date().toLocaleString("en-IN"))}.
    </div>
  </div>
</body>
</html>`;

  return { html, filename };
}
