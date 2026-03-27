"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Tag,
  Wrench,
  DollarSign,
  Landmark,
  FileCheck,
  Check,
  CircleDot,
} from "lucide-react"

const steps = [
  { id: 1, label: "Business Details", icon: Building2 },
  { id: 2, label: "Category & Skills", icon: Tag },
  { id: 3, label: "Capabilities & Equipment", icon: Wrench },
  { id: 4, label: "Rates & Availability", icon: DollarSign },
  { id: 5, label: "Bank Details", icon: Landmark },
  { id: 6, label: "Terms & Conditions", icon: FileCheck },
]

const categoryOptions = [
  "Research Scientists",
  "Lab Technicians",
  "Engineering Consultants",
  "IP / Patent Specialists",
  "Testing & QA",
  "Project Managers",
  "Data Scientists",
  "Regulatory Consultants",
]

const skillSuggestions = [
  "Polymer Chemistry", "Materials Testing", "Cell Culture", "Bioassays",
  "Data Pipelines", "Machine Learning", "Patent Filing", "IP Strategy",
  "Mechanical Design", "Prototyping", "Environmental Testing", "Compliance Audits",
  "SEM/TEM Microscopy", "Spectroscopy", "Rheology", "Failure Analysis",
  "Drug Discovery", "Pharmacology", "Surface Analysis", "Nanotechnology",
]

const paymentPreferences = [
  { value: "Standard", label: "Standard", description: "Payment within 30 days of invoice approval" },
  { value: "QuarterlyFinancing", label: "Quarterly Financing", description: "Spread payments across quarterly installments" },
  { value: "Milestone", label: "Milestone-Based", description: "Payments released upon milestone completion and approval" },
]

export default function ProviderRegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Step 1 - Business Details
  const [businessName, setBusinessName] = useState("")
  const [abn, setAbn] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postcode, setPostcode] = useState("")

  // Step 2 - Category & Skills
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState("")

  // Step 3 - Capabilities & Equipment
  const [capabilities, setCapabilities] = useState<string[]>([""])
  const [equipment, setEquipment] = useState<string[]>([""])
  const [certifications, setCertifications] = useState("")
  const [insurancePi, setInsurancePi] = useState("")
  const [insurancePl, setInsurancePl] = useState("")

  // Step 4 - Rates & Availability
  const [hourlyRate, setHourlyRate] = useState("")
  const [dailyRate, setDailyRate] = useState("")
  const [minimumEngagement, setMinimumEngagement] = useState("")
  const [leadTime, setLeadTime] = useState("")
  const [remoteAvailable, setRemoteAvailable] = useState(true)
  const [onsiteAvailable, setOnsiteAvailable] = useState(true)
  const [paymentPreference, setPaymentPreference] = useState("Standard")

  // Step 5 - Bank Details
  const [bankName, setBankName] = useState("")
  const [bsb, setBsb] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")

  // Step 6 - Terms
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPlatformFee, setAcceptPlatformFee] = useState(false)

  function validateStep(): boolean {
    const newErrors: Record<string, string> = {}
    if (currentStep === 1) {
      if (!businessName.trim()) newErrors.businessName = "Business name is required"
      if (!abn.trim()) newErrors.abn = "ABN is required"
      if (!contactName.trim()) newErrors.contactName = "Contact name is required"
      if (!email.trim()) newErrors.email = "Email is required"
      if (!city.trim()) newErrors.city = "City is required"
      if (!state) newErrors.state = "State is required"
    }
    if (currentStep === 2) {
      if (selectedCategories.length === 0) newErrors.categories = "Select at least one category"
      if (selectedSkills.length === 0) newErrors.skills = "Add at least one skill"
    }
    if (currentStep === 3) {
      if (capabilities.filter((c) => c.trim()).length === 0) newErrors.capabilities = "Add at least one capability"
    }
    if (currentStep === 4) {
      if (!hourlyRate) newErrors.hourlyRate = "Hourly rate is required"
      if (!dailyRate) newErrors.dailyRate = "Daily rate is required"
    }
    if (currentStep === 5) {
      if (!bankName.trim()) newErrors.bankName = "Bank name is required"
      if (!bsb.trim()) newErrors.bsb = "BSB is required"
      if (!accountNumber.trim()) newErrors.accountNumber = "Account number is required"
      if (!accountName.trim()) newErrors.accountName = "Account name is required"
    }
    if (currentStep === 6) {
      if (!acceptTerms) newErrors.terms = "You must accept the terms and conditions"
      if (!acceptPlatformFee) newErrors.platformFee = "You must accept the platform service fee"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function nextStep() {
    if (validateStep()) {
      setCurrentStep((s) => Math.min(6, s + 1))
    }
  }

  function prevStep() {
    setErrors({})
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  function addCustomSkill() {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills((prev) => [...prev, customSkill.trim()])
      setCustomSkill("")
    }
  }

  function addCapability() {
    setCapabilities((prev) => [...prev, ""])
  }

  function updateCapability(index: number, value: string) {
    setCapabilities((prev) => prev.map((c, i) => (i === index ? value : c)))
  }

  function addEquipment() {
    setEquipment((prev) => [...prev, ""])
  }

  function updateEquipment(index: number, value: string) {
    setEquipment((prev) => prev.map((e, i) => (i === index ? value : e)))
  }

  function handleSubmit() {
    if (validateStep()) {
      alert("Registration submitted successfully! Your profile will be reviewed within 2-3 business days.")
    }
  }

  const inputClasses = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Marketplace
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Provider Registration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Register as an R&D specialist on the marketplace
        </p>
      </div>

      {/* Step Indicator */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isCompleted = currentStep > step.id
            const isCurrent = currentStep === step.id
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={`mt-1 text-xs font-medium ${
                      isCurrent ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-slate-400"
                    } hidden sm:block`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`hidden sm:block w-12 lg:w-20 h-0.5 mx-1 ${
                      currentStep > step.id ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Step 1: Business Details */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Business Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClasses} placeholder="Your business name" />
                {errors.businessName && <p className="mt-1 text-xs text-red-500">{errors.businessName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ABN *</label>
                <input type="text" value={abn} onChange={(e) => setAbn(e.target.value)} className={inputClasses} placeholder="XX XXX XXX XXX" />
                {errors.abn && <p className="mt-1 text-xs text-red-500">{errors.abn}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClasses} placeholder="Primary contact" />
                {errors.contactName && <p className="mt-1 text-xs text-red-500">{errors.contactName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} placeholder="contact@business.com" />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClasses} placeholder="+61 XXX XXX XXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClasses} placeholder="Street address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClasses} placeholder="City" />
                {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
                  <select value={state} onChange={(e) => setState(e.target.value)} className={inputClasses}>
                    <option value="">Select</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                  {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Postcode</label>
                  <input type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputClasses} placeholder="0000" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Category & Skills */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Category & Skills</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Service Categories *</label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedCategories.includes(cat)
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {errors.categories && <p className="mt-1 text-xs text-red-500">{errors.categories}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Skills & Specialties *</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {skillSuggestions.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedSkills.includes(skill)
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {selectedSkills.includes(skill) && <Check className="inline h-3 w-3 mr-1" />}
                    {skill}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                  className={inputClasses}
                  placeholder="Add a custom skill..."
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
              {errors.skills && <p className="mt-1 text-xs text-red-500">{errors.skills}</p>}
            </div>
          </div>
        )}

        {/* Step 3: Capabilities & Equipment */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Capabilities & Equipment</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Capabilities *</label>
              {capabilities.map((cap, i) => (
                <div key={i} className="mb-2">
                  <input
                    type="text"
                    value={cap}
                    onChange={(e) => updateCapability(i, e.target.value)}
                    className={inputClasses}
                    placeholder={`Capability ${i + 1} (e.g., "ISO 17025 accredited testing")`}
                  />
                </div>
              ))}
              <button type="button" onClick={addCapability} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                + Add Capability
              </button>
              {errors.capabilities && <p className="mt-1 text-xs text-red-500">{errors.capabilities}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Equipment</label>
              {equipment.map((eq, i) => (
                <div key={i} className="mb-2">
                  <input
                    type="text"
                    value={eq}
                    onChange={(e) => updateEquipment(i, e.target.value)}
                    className={inputClasses}
                    placeholder={`Equipment ${i + 1} (e.g., "SEM Microscope - JEOL JSM-7800F")`}
                  />
                </div>
              ))}
              <button type="button" onClick={addEquipment} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                + Add Equipment
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Certifications</label>
              <textarea
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                className={inputClasses}
                rows={3}
                placeholder="List relevant certifications (one per line)"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Professional Indemnity Insurance</label>
                <input type="text" value={insurancePi} onChange={(e) => setInsurancePi(e.target.value)} className={inputClasses} placeholder="e.g., $5,000,000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Public Liability Insurance</label>
                <input type="text" value={insurancePl} onChange={(e) => setInsurancePl(e.target.value)} className={inputClasses} placeholder="e.g., $20,000,000" />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Rates & Availability */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Rates & Availability</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate (AUD) *</label>
                <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className={inputClasses} placeholder="0.00" />
                {errors.hourlyRate && <p className="mt-1 text-xs text-red-500">{errors.hourlyRate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Daily Rate (AUD) *</label>
                <input type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} className={inputClasses} placeholder="0.00" />
                {errors.dailyRate && <p className="mt-1 text-xs text-red-500">{errors.dailyRate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Engagement</label>
                <select value={minimumEngagement} onChange={(e) => setMinimumEngagement(e.target.value)} className={inputClasses}>
                  <option value="">Select</option>
                  <option value="1 hour">1 hour</option>
                  <option value="Half day">Half day</option>
                  <option value="1 day">1 day</option>
                  <option value="2 days">2 days</option>
                  <option value="1 week">1 week</option>
                  <option value="2 weeks">2 weeks</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lead Time</label>
                <select value={leadTime} onChange={(e) => setLeadTime(e.target.value)} className={inputClasses}>
                  <option value="">Select</option>
                  <option value="Immediate">Immediate</option>
                  <option value="1-3 days">1-3 days</option>
                  <option value="1-2 weeks">1-2 weeks</option>
                  <option value="2-4 weeks">2-4 weeks</option>
                  <option value="1+ month">1+ month</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Work Mode</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={remoteAvailable} onChange={(e) => setRemoteAvailable(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Remote available
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={onsiteAvailable} onChange={(e) => setOnsiteAvailable(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  On-site available
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Preference</label>
              <div className="space-y-2">
                {paymentPreferences.map((pref) => (
                  <label
                    key={pref.value}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${
                      paymentPreference === pref.value
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <CircleDot className={`h-5 w-5 mt-0.5 shrink-0 ${paymentPreference === pref.value ? "text-indigo-600" : "text-slate-300"}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{pref.label}</p>
                      <p className="text-xs text-slate-500">{pref.description}</p>
                    </div>
                    <input
                      type="radio"
                      name="paymentPreference"
                      value={pref.value}
                      checked={paymentPreference === pref.value}
                      onChange={(e) => setPaymentPreference(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Bank Details */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Bank Details</h2>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
              Your bank details are stored securely and only used for payment processing. They are never shared with clients.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name *</label>
                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClasses} placeholder="e.g., Commonwealth Bank" />
                {errors.bankName && <p className="mt-1 text-xs text-red-500">{errors.bankName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Name *</label>
                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClasses} placeholder="Account holder name" />
                {errors.accountName && <p className="mt-1 text-xs text-red-500">{errors.accountName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">BSB *</label>
                <input type="text" value={bsb} onChange={(e) => setBsb(e.target.value)} className={inputClasses} placeholder="XXX-XXX" />
                {errors.bsb && <p className="mt-1 text-xs text-red-500">{errors.bsb}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Number *</label>
                <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputClasses} placeholder="XXXX XXXX" />
                {errors.accountNumber && <p className="mt-1 text-xs text-red-500">{errors.accountNumber}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Terms & Conditions */}
        {currentStep === 6 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Terms & Conditions</h2>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 max-h-64 overflow-y-auto text-sm text-slate-600 leading-relaxed">
              <h3 className="font-semibold text-slate-900 mb-2">Platform Service Agreement</h3>
              <p className="mb-2">
                By registering as a Provider on the R&D Specialist Marketplace, you agree to the following terms:
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>Service Standards:</strong> You agree to deliver all contracted services to the highest professional standard, meeting agreed timelines and specifications.</li>
                <li><strong>Verification:</strong> All qualifications, certifications, and capabilities declared during registration are subject to verification. Providing false information may result in account termination.</li>
                <li><strong>Platform Fee:</strong> A platform service fee of 5% applies to all transactions processed through the marketplace. This fee is deducted from payments before settlement.</li>
                <li><strong>Insurance:</strong> You confirm that you maintain appropriate professional indemnity and public liability insurance for the services you provide.</li>
                <li><strong>Confidentiality:</strong> You agree to maintain confidentiality of all client information and project details shared through the platform.</li>
                <li><strong>Intellectual Property:</strong> Unless otherwise agreed in writing, intellectual property created during an engagement shall be assigned to the client upon full payment.</li>
                <li><strong>Dispute Resolution:</strong> Any disputes will be resolved through the platform&apos;s dispute resolution process before external legal action.</li>
                <li><strong>Payment Terms:</strong> Payments are processed within 7 business days of invoice approval, subject to the agreed payment schedule (Standard, Quarterly Financing, or Milestone-based).</li>
                <li><strong>Cancellation:</strong> Either party may cancel with 14 days written notice. Early termination fees may apply as specified in individual contracts.</li>
                <li><strong>Data Protection:</strong> Your personal and business information is handled in accordance with the Australian Privacy Principles and our Privacy Policy.</li>
              </ol>
            </div>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  I have read and agree to the <strong>Platform Service Agreement</strong> and{" "}
                  <strong>Terms & Conditions</strong>.
                </span>
              </label>
              {errors.terms && <p className="text-xs text-red-500">{errors.terms}</p>}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptPlatformFee}
                  onChange={(e) => setAcceptPlatformFee(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  I acknowledge the <strong>5% platform service fee</strong> on all transactions.
                </span>
              </label>
              {errors.platformFee && <p className="text-xs text-red-500">{errors.platformFee}</p>}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-200">
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>
          ) : (
            <div />
          )}
          {currentStep < 6 ? (
            <button
              onClick={nextStep}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Check className="h-4 w-4" /> Submit Registration
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
