// Email template generators for invoices, bills, and overdue notices.
// These produce inline-CSS HTML suitable for email clients.

interface EmailOrganization {
  name: string
  abn?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postcode?: string | null
  country?: string | null
}

interface EmailInvoiceLine {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

interface EmailInvoice {
  invoiceNumber: string
  date: Date | string
  dueDate: Date | string
  subtotal: number
  taxTotal: number
  total: number
  amountDue?: number | null
  notes?: string | null
  contact: { name: string; email?: string | null }
  lines: EmailInvoiceLine[]
}

interface EmailBill {
  billNumber: string
  date: Date | string
  dueDate: Date | string
  subtotal: number
  taxTotal: number
  total: number
  amountDue?: number | null
  notes?: string | null
  contact: { name: string; email?: string | null }
  lines: EmailInvoiceLine[]
}

function fmt(n: number): string {
  return n.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function orgAddress(org: EmailOrganization): string {
  return [org.address, org.city, org.state, org.postcode]
    .filter(Boolean)
    .join(", ")
}

function baseWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background-color:#f1f5f9;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function generateInvoiceEmail(
  invoice: EmailInvoice,
  organization: EmailOrganization
): string {
  const linesHtml = invoice.lines
    .map(
      (line) => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;">${line.description}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;text-align:right;">${line.quantity}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;text-align:right;">$${fmt(line.unitPrice)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;text-align:right;font-weight:600;">$${fmt(line.amount)}</td>
        </tr>`
    )
    .join("")

  const amountDue = invoice.amountDue ?? invoice.total
  const addr = orgAddress(organization)

  const content = `
    <!-- Header -->
    <tr>
      <td style="background-color:#4f46e5;padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">${organization.name}</h1>
        ${organization.abn ? `<p style="margin:8px 0 0;color:#c7d2fe;font-size:13px;">ABN: ${organization.abn}</p>` : ""}
      </td>
    </tr>

    <!-- Subject -->
    <tr>
      <td style="padding:24px;border-bottom:1px solid #e2e8f0;">
        <h2 style="margin:0;font-size:20px;color:#1e293b;font-weight:600;">Invoice ${invoice.invoiceNumber} from ${organization.name}</h2>
        <p style="margin:8px 0 0;font-size:14px;color:#64748b;">Issued to ${invoice.contact.name}</p>
      </td>
    </tr>

    <!-- Summary -->
    <tr>
      <td style="padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="width:50%;padding:16px;background-color:#f8fafc;border-radius:8px;">
              <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Amount Due</p>
              <p style="margin:8px 0 0;font-size:28px;font-weight:700;color:#1e293b;">$${fmt(amountDue)}</p>
            </td>
            <td style="width:16px;"></td>
            <td style="width:50%;padding:16px;background-color:#f8fafc;border-radius:8px;">
              <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Due Date</p>
              <p style="margin:8px 0 0;font-size:20px;font-weight:600;color:#1e293b;">${formatDate(invoice.dueDate)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Line Items -->
    <tr>
      <td style="padding:0 24px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <tr style="background-color:#f8fafc;">
            <th style="padding:10px 16px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Description</th>
            <th style="padding:10px 16px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Qty</th>
            <th style="padding:10px 16px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Unit Price</th>
            <th style="padding:10px 16px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Amount</th>
          </tr>
          ${linesHtml}
          <tr style="background-color:#f8fafc;">
            <td colspan="3" style="padding:10px 16px;text-align:right;font-size:14px;color:#64748b;">Subtotal</td>
            <td style="padding:10px 16px;text-align:right;font-size:14px;color:#1e293b;font-weight:600;">$${fmt(invoice.subtotal)}</td>
          </tr>
          <tr style="background-color:#f8fafc;">
            <td colspan="3" style="padding:10px 16px;text-align:right;font-size:14px;color:#64748b;">GST</td>
            <td style="padding:10px 16px;text-align:right;font-size:14px;color:#1e293b;font-weight:600;">$${fmt(invoice.taxTotal)}</td>
          </tr>
          <tr style="background-color:#4f46e5;">
            <td colspan="3" style="padding:12px 16px;text-align:right;font-size:16px;color:#ffffff;font-weight:700;">Total</td>
            <td style="padding:12px 16px;text-align:right;font-size:16px;color:#ffffff;font-weight:700;">$${fmt(invoice.total)}</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CTA Button -->
    <tr>
      <td style="padding:0 24px 24px;text-align:center;">
        <a href="#" style="display:inline-block;padding:14px 32px;background-color:#4f46e5;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">View Invoice</a>
      </td>
    </tr>

    ${invoice.notes ? `
    <tr>
      <td style="padding:0 24px 24px;">
        <p style="margin:0;font-size:13px;color:#64748b;"><strong>Notes:</strong> ${invoice.notes}</p>
      </td>
    </tr>` : ""}

    <!-- Footer -->
    <tr>
      <td style="padding:24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:13px;color:#64748b;">${organization.name}</p>
        ${addr ? `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${addr}</p>` : ""}
        ${organization.abn ? `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">ABN: ${organization.abn}</p>` : ""}
      </td>
    </tr>`

  return baseWrapper(content)
}

export function generatePaymentReminderEmail(
  bill: EmailBill,
  organization: EmailOrganization
): string {
  const linesHtml = bill.lines
    .map(
      (line) => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;">${line.description}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;text-align:right;font-weight:600;">$${fmt(line.amount)}</td>
        </tr>`
    )
    .join("")

  const amountDue = bill.amountDue ?? bill.total
  const addr = orgAddress(organization)

  const content = `
    <!-- Header -->
    <tr>
      <td style="background-color:#0891b2;padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Payment Reminder</h1>
      </td>
    </tr>

    <!-- Subject -->
    <tr>
      <td style="padding:24px;border-bottom:1px solid #e2e8f0;">
        <h2 style="margin:0;font-size:20px;color:#1e293b;font-weight:600;">Bill ${bill.billNumber} - Payment Due</h2>
        <p style="margin:8px 0 0;font-size:14px;color:#64748b;">From ${bill.contact.name}</p>
      </td>
    </tr>

    <!-- Summary -->
    <tr>
      <td style="padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="width:50%;padding:16px;background-color:#f0fdfa;border-radius:8px;border:1px solid #99f6e4;">
              <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#0f766e;font-weight:600;">Amount Owed</p>
              <p style="margin:8px 0 0;font-size:28px;font-weight:700;color:#134e4a;">$${fmt(amountDue)}</p>
            </td>
            <td style="width:16px;"></td>
            <td style="width:50%;padding:16px;background-color:#f0fdfa;border-radius:8px;border:1px solid #99f6e4;">
              <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#0f766e;font-weight:600;">Due Date</p>
              <p style="margin:8px 0 0;font-size:20px;font-weight:600;color:#134e4a;">${formatDate(bill.dueDate)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Line Items -->
    <tr>
      <td style="padding:0 24px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <tr style="background-color:#f8fafc;">
            <th style="padding:10px 16px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Description</th>
            <th style="padding:10px 16px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;">Amount</th>
          </tr>
          ${linesHtml}
          <tr style="background-color:#0891b2;">
            <td style="padding:12px 16px;font-size:16px;color:#ffffff;font-weight:700;">Total</td>
            <td style="padding:12px 16px;text-align:right;font-size:16px;color:#ffffff;font-weight:700;">$${fmt(bill.total)}</td>
          </tr>
        </table>
      </td>
    </tr>

    ${bill.notes ? `
    <tr>
      <td style="padding:0 24px 24px;">
        <p style="margin:0;font-size:13px;color:#64748b;"><strong>Payment Details:</strong> ${bill.notes}</p>
      </td>
    </tr>` : ""}

    <!-- Footer -->
    <tr>
      <td style="padding:24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:13px;color:#64748b;">${organization.name}</p>
        ${addr ? `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${addr}</p>` : ""}
        ${organization.abn ? `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">ABN: ${organization.abn}</p>` : ""}
      </td>
    </tr>`

  return baseWrapper(content)
}

export function generateOverdueNoticeEmail(
  invoice: EmailInvoice,
  organization: EmailOrganization
): string {
  const amountDue = invoice.amountDue ?? invoice.total
  const addr = orgAddress(organization)
  const daysOverdue = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  )

  const content = `
    <!-- Header -->
    <tr>
      <td style="background-color:#dc2626;padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Overdue Notice</h1>
        <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">${daysOverdue} days past due</p>
      </td>
    </tr>

    <!-- Subject -->
    <tr>
      <td style="padding:24px;border-bottom:1px solid #e2e8f0;">
        <h2 style="margin:0;font-size:20px;color:#1e293b;font-weight:600;">Invoice ${invoice.invoiceNumber} is Overdue</h2>
        <p style="margin:8px 0 0;font-size:14px;color:#64748b;">Dear ${invoice.contact.name},</p>
        <p style="margin:12px 0 0;font-size:14px;color:#475569;line-height:1.6;">
          This is a reminder that invoice <strong>${invoice.invoiceNumber}</strong> was due on
          <strong>${formatDate(invoice.dueDate)}</strong> and remains unpaid.
          Please arrange payment at your earliest convenience.
        </p>
      </td>
    </tr>

    <!-- Summary -->
    <tr>
      <td style="padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
          <tr>
            <td style="padding:20px;text-align:center;">
              <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#991b1b;font-weight:600;">Amount Overdue</p>
              <p style="margin:8px 0 0;font-size:32px;font-weight:700;color:#dc2626;">$${fmt(amountDue)}</p>
              <p style="margin:8px 0 0;font-size:13px;color:#991b1b;">Due: ${formatDate(invoice.dueDate)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CTA Button -->
    <tr>
      <td style="padding:0 24px 24px;text-align:center;">
        <a href="#" style="display:inline-block;padding:14px 32px;background-color:#dc2626;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">Pay Now</a>
      </td>
    </tr>

    <tr>
      <td style="padding:0 24px 24px;">
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
          If you have already made this payment, please disregard this notice.
          For any questions regarding this invoice, please don't hesitate to contact us.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:13px;color:#64748b;">${organization.name}</p>
        ${addr ? `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${addr}</p>` : ""}
        ${organization.abn ? `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">ABN: ${organization.abn}</p>` : ""}
      </td>
    </tr>`

  return baseWrapper(content)
}
