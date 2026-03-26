"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface ContactData {
  id: string
  name: string
  email: string | null
  phone: string | null
  abn: string | null
  contactType: string
  address: string | null
  city: string | null
  state: string | null
  postcode: string | null
  isRdContractor: boolean
}

export default function EditContactPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [abn, setAbn] = useState("")
  const [contactType, setContactType] = useState("Customer")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postcode, setPostcode] = useState("")
  const [isRdContractor, setIsRdContractor] = useState(false)

  useEffect(() => {
    async function fetchContact() {
      try {
        const res = await fetch(`/api/contacts/${params.id}`)
        if (!res.ok) {
          setError("Failed to load contact")
          return
        }
        const data: ContactData = await res.json()
        setName(data.name)
        setEmail(data.email || "")
        setPhone(data.phone || "")
        setAbn(data.abn || "")
        setContactType(data.contactType)
        setAddress(data.address || "")
        setCity(data.city || "")
        setState(data.state || "")
        setPostcode(data.postcode || "")
        setIsRdContractor(data.isRdContractor)
      } catch {
        setError("Failed to load contact")
      } finally {
        setLoading(false)
      }
    }
    fetchContact()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/contacts/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          abn,
          contactType,
          address,
          city,
          state,
          postcode,
          isRdContractor,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to update contact")
        return
      }

      router.push(`/contacts/${params.id}`)
      router.refresh()
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading contact...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/contacts" className="hover:text-indigo-600">Contacts</Link>
        <span>/</span>
        <Link href={`/contacts/${params.id}`} className="hover:text-indigo-600">{name}</Link>
        <span>/</span>
        <span className="text-slate-700">Edit</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Contact</h1>
        <p className="mt-1 text-sm text-slate-500">Update contact information</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Phone</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* ABN & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="abn" className="block text-sm font-medium text-slate-700">ABN</label>
              <input
                id="abn"
                type="text"
                value={abn}
                onChange={(e) => setAbn(e.target.value)}
                placeholder="11 digit ABN"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="contactType" className="block text-sm font-medium text-slate-700">Type</label>
              <select
                id="contactType"
                value={contactType}
                onChange={(e) => setContactType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Customer">Customer</option>
                <option value="Supplier">Supplier</option>
                <option value="Both">Both (Customer & Supplier)</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-slate-700">Address</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-700">City</label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-slate-700">State</label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="postcode" className="block text-sm font-medium text-slate-700">Postcode</label>
              <input
                id="postcode"
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* R&D Contractor Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isRdContractor}
              onClick={() => setIsRdContractor(!isRdContractor)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                isRdContractor ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isRdContractor ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <label className="text-sm font-medium text-slate-700">R&D Contractor</label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/contacts/${params.id}`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
