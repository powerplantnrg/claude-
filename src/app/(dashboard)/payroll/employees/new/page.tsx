"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function NewEmployeePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Personal Details
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postcode, setPostcode] = useState("")

  // Employment Details
  const [startDate, setStartDate] = useState("")
  const [role, setRole] = useState("")
  const [department, setDepartment] = useState("")
  const [employmentType, setEmploymentType] = useState("Full-time")
  const [salary, setSalary] = useState("")
  const [payFrequency, setPayFrequency] = useState("Fortnightly")
  const [hoursPerWeek, setHoursPerWeek] = useState("38")

  // Tax Details
  const [tfn, setTfn] = useState("")
  const [taxFreeThreshold, setTaxFreeThreshold] = useState(true)
  const [helpDebt, setHelpDebt] = useState(false)
  const [sfssDebt, setSfssDebt] = useState(false)
  const [taxFileDecLodged, setTaxFileDecLodged] = useState(false)

  // Superannuation
  const [superFundName, setSuperFundName] = useState("")
  const [superMemberNumber, setSuperMemberNumber] = useState("")
  const [superRate, setSuperRate] = useState("11.5")
  const [superFundUSI, setSuperFundUSI] = useState("")

  // Bank Details
  const [bsb, setBsb] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!firstName.trim()) errors.firstName = "First name is required"
    if (!lastName.trim()) errors.lastName = "Last name is required"
    if (!email.trim()) errors.email = "Email is required"
    if (email && !/\S+@\S+\.\S+/.test(email)) errors.email = "Invalid email address"
    if (!startDate) errors.startDate = "Start date is required"
    if (!role.trim()) errors.role = "Role is required"
    if (!salary || parseFloat(salary) <= 0) errors.salary = "Valid salary is required"
    if (!bsb.trim()) errors.bsb = "BSB is required"
    if (!accountNumber.trim()) errors.accountNumber = "Account number is required"
    if (!accountName.trim()) errors.accountName = "Account name is required"
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields.")
      return
    }

    setSubmitting(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push("/payroll/employees")
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
      fieldErrors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-red-500"
        : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
    }`

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/payroll/employees"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Employees
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Employee</h1>
          <p className="mt-1 text-sm text-slate-500">Enter employee details for payroll setup</p>
        </div>
        <Link
          href="/payroll/employees"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Personal Details</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass("firstName")} />
              {fieldErrors.firstName && <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass("lastName")} />
              {fieldErrors.lastName && <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass("email")} />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass("phone")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Birth</label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass("dateOfBirth")} />
            </div>
            <div>{/* spacer */}</div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Street Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass("address")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass("city")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                <select value={state} onChange={(e) => setState(e.target.value)} className={inputClass("state")}>
                  <option value="">Select...</option>
                  <option>NSW</option><option>VIC</option><option>QLD</option>
                  <option>WA</option><option>SA</option><option>TAS</option>
                  <option>ACT</option><option>NT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Postcode</label>
                <input type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputClass("postcode")} />
              </div>
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Employment Details</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass("startDate")} />
              {fieldErrors.startDate && <p className="mt-1 text-xs text-red-600">{fieldErrors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role / Job Title *</label>
              <input type="text" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass("role")} />
              {fieldErrors.role && <p className="mt-1 text-xs text-red-600">{fieldErrors.role}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass("department")} placeholder="e.g. Engineering, R&D" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Employment Type</label>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={inputClass("employmentType")}>
                <option>Full-time</option><option>Part-time</option>
                <option>Contractor</option><option>Casual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Annual Salary *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input type="number" step="0.01" min="0" value={salary} onChange={(e) => setSalary(e.target.value)} className={`${inputClass("salary")} pl-7`} placeholder="0.00" />
              </div>
              {fieldErrors.salary && <p className="mt-1 text-xs text-red-600">{fieldErrors.salary}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay Frequency</label>
              <select value={payFrequency} onChange={(e) => setPayFrequency(e.target.value)} className={inputClass("payFrequency")}>
                <option>Weekly</option><option>Fortnightly</option><option>Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hours Per Week</label>
              <input type="number" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} className={inputClass("hoursPerWeek")} />
            </div>
          </div>
        </div>

        {/* Tax Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Tax Details</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tax File Number (TFN)</label>
              <input type="text" value={tfn} onChange={(e) => setTfn(e.target.value)} className={inputClass("tfn")} placeholder="000 000 000" />
            </div>
            <div className="flex flex-col justify-end gap-3 pt-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={taxFreeThreshold} onChange={(e) => setTaxFreeThreshold(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Claim tax-free threshold
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={helpDebt} onChange={(e) => setHelpDebt(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                HELP / HECS debt
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={sfssDebt} onChange={(e) => setSfssDebt(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                SFSS debt
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={taxFileDecLodged} onChange={(e) => setTaxFileDecLodged(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Tax file declaration lodged
              </label>
            </div>
          </div>
        </div>

        {/* Superannuation */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Superannuation</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Super Fund Name</label>
              <input type="text" value={superFundName} onChange={(e) => setSuperFundName(e.target.value)} className={inputClass("superFundName")} placeholder="e.g. Australian Super" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Fund USI</label>
              <input type="text" value={superFundUSI} onChange={(e) => setSuperFundUSI(e.target.value)} className={inputClass("superFundUSI")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Member Number</label>
              <input type="text" value={superMemberNumber} onChange={(e) => setSuperMemberNumber(e.target.value)} className={inputClass("superMemberNumber")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Super Rate (%)</label>
              <input type="number" step="0.5" min="0" value={superRate} onChange={(e) => setSuperRate(e.target.value)} className={inputClass("superRate")} />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Bank Details</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">BSB *</label>
              <input type="text" value={bsb} onChange={(e) => setBsb(e.target.value)} className={inputClass("bsb")} placeholder="000-000" />
              {fieldErrors.bsb && <p className="mt-1 text-xs text-red-600">{fieldErrors.bsb}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Number *</label>
              <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputClass("accountNumber")} />
              {fieldErrors.accountNumber && <p className="mt-1 text-xs text-red-600">{fieldErrors.accountNumber}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Name *</label>
              <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass("accountName")} />
              {fieldErrors.accountName && <p className="mt-1 text-xs text-red-600">{fieldErrors.accountName}</p>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/payroll/employees"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && (
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitting ? "Adding..." : "Add Employee"}
          </button>
        </div>
      </form>
    </div>
  )
}
