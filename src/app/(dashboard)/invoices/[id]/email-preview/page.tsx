import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { generateInvoiceEmail } from "@/lib/email-templates"
import { EmailPreviewActions } from "./email-preview-actions"

export default async function InvoiceEmailPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const orgId = (session.user as any).organizationId
  const { id } = await params

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
    include: {
      contact: true,
      lines: { include: { account: true } },
      organization: true,
    },
  })

  if (!invoice) notFound()

  const org = invoice.organization

  const emailHtml = generateInvoiceEmail(
    {
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      taxTotal: invoice.taxTotal,
      total: invoice.total,
      amountDue: invoice.amountDue,
      notes: invoice.notes,
      contact: { name: invoice.contact.name, email: invoice.contact.email },
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        amount: l.amount,
      })),
    },
    {
      name: org.name,
      abn: org.abn,
      address: org.address,
      city: org.city,
      state: org.state,
      postcode: org.postcode,
      country: org.country,
    }
  )

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <>
      <style>{`
        @media print {
          nav, aside, header, [data-sidebar], .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          main > div {
            max-width: 100% !important;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body > div, body > div > div {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Email Preview</h1>
            <p className="mt-1 text-sm text-slate-500">
              Invoice {invoice.invoiceNumber} to {invoice.contact.name} &mdash; ${fmt(invoice.total)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <EmailPreviewActions emailHtml={emailHtml} />
            <a
              href={`/invoices/${invoice.id}`}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              Back to Invoice
            </a>
          </div>
        </div>

        {/* Email Preview Frame */}
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-6 shadow-sm">
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 print:hidden">
            <div className="space-y-1 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">To:</span> {invoice.contact.email || invoice.contact.name}</p>
              <p><span className="font-medium text-slate-900">Subject:</span> Invoice {invoice.invoiceNumber} from {org.name}</p>
            </div>
          </div>
          <div
            className="rounded-lg bg-white shadow-sm"
            dangerouslySetInnerHTML={{ __html: emailHtml }}
          />
        </div>
      </div>
    </>
  )
}
