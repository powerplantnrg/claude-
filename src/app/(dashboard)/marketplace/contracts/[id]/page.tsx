"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  Star,
  Send,
  AlertCircle,
} from "lucide-react"

interface Milestone {
  id: string
  name: string
  description: string
  amount: number
  dueDate: string
  status: string
  submittedAt: string | null
  approvedAt: string | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  milestoneId: string
  milestoneName: string
  amount: number
  gstAmount: number
  totalAmount: number
  status: string
  submittedAt: string
  paidAt: string | null
}

const contract = {
  id: "con-001",
  contractNumber: "MKT-2026-001",
  title: "Materials Testing - Phase 1",
  description: "Comprehensive polymer materials testing suite including tensile strength, thermal analysis, and fatigue testing per ISO and ASTM standards.",
  providerName: "Dr. Sarah Chen",
  providerBusiness: "LabCorp Sciences",
  agreedAmount: 82000,
  status: "Active",
  startDate: "2026-04-15",
  endDate: "2026-07-01",
  paymentTerms: "Milestone",
  progress: 65,
}

const milestones: Milestone[] = [
  { id: "ms-001", name: "Test Plan & Setup", description: "Develop detailed test plan and prepare equipment calibration", amount: 12000, dueDate: "2026-04-30", status: "Paid", submittedAt: "2026-04-28", approvedAt: "2026-04-29" },
  { id: "ms-002", name: "Tensile Testing Complete", description: "Complete all tensile strength tests per ISO 527", amount: 25000, dueDate: "2026-05-20", status: "Approved", submittedAt: "2026-05-18", approvedAt: "2026-05-19" },
  { id: "ms-003", name: "Thermal Analysis", description: "Complete TGA, DSC, and DMA analysis per ISO 11357", amount: 25000, dueDate: "2026-06-10", status: "Submitted", submittedAt: "2026-06-08", approvedAt: null },
  { id: "ms-004", name: "Final Report & Data Package", description: "Comprehensive report with all test data, analysis, and recommendations", amount: 20000, dueDate: "2026-07-01", status: "Pending", submittedAt: null, approvedAt: null },
]

const invoices: Invoice[] = [
  { id: "inv-001", invoiceNumber: "LC-2026-0142", milestoneId: "ms-001", milestoneName: "Test Plan & Setup", amount: 12000, gstAmount: 1200, totalAmount: 13200, status: "Paid", submittedAt: "2026-04-29", paidAt: "2026-05-05" },
  { id: "inv-002", invoiceNumber: "LC-2026-0158", milestoneId: "ms-002", milestoneName: "Tensile Testing Complete", amount: 25000, gstAmount: 2500, totalAmount: 27500, status: "Approved", submittedAt: "2026-05-19", paidAt: null },
  { id: "inv-003", invoiceNumber: "LC-2026-0171", milestoneId: "ms-003", milestoneName: "Thermal Analysis", amount: 25000, gstAmount: 2500, totalAmount: 27500, status: "Submitted", submittedAt: "2026-06-09", paidAt: null },
]

const milestoneStatusColors: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-700",
  Submitted: "bg-blue-100 text-blue-700",
  Approved: "bg-indigo-100 text-indigo-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Disputed: "bg-red-100 text-red-700",
}

const invoiceStatusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Submitted: "bg-blue-100 text-blue-700",
  Approved: "bg-indigo-100 text-indigo-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
}

export default function ContractDetailPage() {
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [showReviewForm, setShowReviewForm] = useState(false)

  function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    setShowReviewForm(false)
    setReviewRating(0)
    setReviewComment("")
  }

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const totalPaid = invoices.filter((inv) => inv.status === "Paid").reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/marketplace/contracts" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Contracts
      </Link>

      {/* Contract Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-mono text-slate-400">{contract.contractNumber}</span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${milestoneStatusColors[contract.status] || "bg-emerald-100 text-emerald-700"}`}>
            {contract.status}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{contract.title}</h1>
        <p className="text-sm text-slate-600 mb-4">{contract.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-1">Provider</p>
            <p className="font-medium text-slate-900">{contract.providerName}</p>
            <p className="text-xs text-slate-500">{contract.providerBusiness}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Agreed Amount</p>
            <p className="font-semibold text-slate-900">${contract.agreedAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Timeline</p>
            <p className="font-medium text-slate-900">{contract.startDate}</p>
            <p className="text-xs text-slate-500">to {contract.endDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Payment Terms</p>
            <p className="font-medium text-slate-900">{contract.paymentTerms}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Overall Progress</span>
            <span>{contract.progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${contract.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>${totalInvoiced.toLocaleString()} invoiced</span>
            <span>${totalPaid.toLocaleString()} paid</span>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="p-5 hover:bg-slate-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    milestone.status === "Paid" ? "bg-emerald-100 text-emerald-700" :
                    milestone.status === "Approved" ? "bg-indigo-100 text-indigo-700" :
                    milestone.status === "Submitted" ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {milestone.status === "Paid" ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{milestone.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{milestone.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due: {milestone.dueDate}</span>
                      {milestone.submittedAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Submitted: {milestone.submittedAt}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">${milestone.amount.toLocaleString()}</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${milestoneStatusColors[milestone.status]}`}>
                    {milestone.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Milestone</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">GST</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-mono text-slate-600">{inv.invoiceNumber}</td>
                  <td className="px-6 py-3 text-sm text-slate-700">{inv.milestoneName}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-slate-900">${inv.amount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm text-right text-slate-500">${inv.gstAmount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold text-slate-900">${inv.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${invoiceStatusColors[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-500">{inv.submittedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Provider Review</h2>
          {!showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Star className="h-4 w-4" /> Write Review
            </button>
          )}
        </div>

        {showReviewForm && (
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Overall Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 cursor-pointer transition-colors ${
                        star <= reviewRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300 hover:text-amber-300"
                      }`}
                    />
                  </button>
                ))}
                {reviewRating > 0 && <span className="ml-2 text-sm text-slate-500">{reviewRating}/5</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comment</label>
              <textarea
                rows={4}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Share your experience working with this provider..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Send className="h-4 w-4" /> Submit Review
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!showReviewForm && (
          <p className="text-sm text-slate-500">Rate and review the provider after contract completion.</p>
        )}
      </div>
    </div>
  )
}
