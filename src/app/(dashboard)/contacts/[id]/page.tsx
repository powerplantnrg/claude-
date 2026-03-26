import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const { id } = await params

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      invoices: { orderBy: { date: "desc" }, take: 10 },
      bills: { orderBy: { date: "desc" }, take: 10 },
    },
  })

  if (!contact) redirect("/contacts")

  return (
    <div className="max-w-4xl">
      <Link href="/contacts" className="text-indigo-600 hover:underline text-sm mb-4 inline-block">&larr; Back to Contacts</Link>
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-indigo-700 font-bold text-lg">{contact.name.charAt(0)}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
          <div className="flex gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{contact.contactType}</span>
            {contact.isRdContractor && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">R&D Contractor</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Details</h2>
          <div className="space-y-3">
            <div><span className="text-sm text-slate-500">Email:</span> <span className="text-sm">{contact.email || "-"}</span></div>
            <div><span className="text-sm text-slate-500">Phone:</span> <span className="text-sm">{contact.phone || "-"}</span></div>
            <div><span className="text-sm text-slate-500">ABN:</span> <span className="text-sm">{contact.abn || "-"}</span></div>
            <div><span className="text-sm text-slate-500">Address:</span> <span className="text-sm">{[contact.address, contact.city, contact.state, contact.postcode].filter(Boolean).join(", ") || "-"}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>
          {contact.invoices.length === 0 ? (
            <p className="text-sm text-slate-500">No invoices</p>
          ) : (
            <div className="space-y-2">
              {contact.invoices.map(inv => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex justify-between py-1 hover:bg-slate-50 rounded px-2">
                  <span className="text-sm">{inv.invoiceNumber}</span>
                  <span className="text-sm font-medium">${inv.total.toFixed(2)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
