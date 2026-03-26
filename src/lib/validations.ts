import { z } from "zod"

// ---------- Contacts ----------

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  contactType: z.enum(["Customer", "Supplier", "Both"]),
  abn: z
    .string()
    .regex(/^\d{11}$/, "ABN must be 11 digits")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  isRdContractor: z.boolean().optional(),
})

export type ContactFormValues = z.infer<typeof contactSchema>

// ---------- Invoice Lines ----------

export const invoiceLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  accountId: z.string().min(1, "Account is required"),
  taxType: z.enum(["GST", "GST-Free", "BAS-Excluded"]),
})

export type InvoiceLineFormValues = z.infer<typeof invoiceLineSchema>

// ---------- Invoices ----------

export const invoiceSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  date: z.string().min(1, "Date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  lines: z
    .array(invoiceLineSchema)
    .min(1, "At least one line item is required"),
  notes: z.string().optional(),
  reference: z.string().optional(),
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>

// ---------- Bill Lines ----------

export const billLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  accountId: z.string().min(1, "Account is required"),
  taxType: z.enum(["GST", "GST-Free", "BAS-Excluded"]),
})

export type BillLineFormValues = z.infer<typeof billLineSchema>

// ---------- Bills ----------

export const billSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  date: z.string().min(1, "Date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  lines: z.array(billLineSchema).min(1, "At least one line item is required"),
  notes: z.string().optional(),
  reference: z.string().optional(),
})

export type BillFormValues = z.infer<typeof billSchema>

// ---------- Journal Entries ----------

export const journalEntryLineSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  debit: z.coerce.number().min(0, "Debit must be non-negative"),
  credit: z.coerce.number().min(0, "Credit must be non-negative"),
  description: z.string().optional(),
})

export const journalEntrySchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    narration: z.string().min(1, "Narration is required"),
    lines: z
      .array(journalEntryLineSchema)
      .min(2, "At least two lines are required"),
  })
  .refine(
    (data) => {
      const totalDebits = data.lines.reduce((sum, l) => sum + l.debit, 0)
      const totalCredits = data.lines.reduce((sum, l) => sum + l.credit, 0)
      return Math.abs(totalDebits - totalCredits) < 0.005
    },
    { message: "Total debits must equal total credits" }
  )

export type JournalEntryFormValues = z.infer<typeof journalEntrySchema>

// ---------- R&D Projects ----------

export const rdProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
  hypothesis: z.string().min(1, "Hypothesis is required"),
  knowledgeGap: z.string().optional(),
  expectedOutcome: z.string().optional(),
})

export type RdProjectFormValues = z.infer<typeof rdProjectSchema>

// ---------- R&D Activities ----------

export const rdActivitySchema = z.object({
  name: z.string().min(1, "Activity name is required"),
  activityType: z.enum(["Core", "Supporting"]),
  hypothesis: z.string().min(1, "Hypothesis is required"),
  methodology: z.string().min(1, "Methodology is required"),
  rdProjectId: z.string().optional(),
})

export type RdActivityFormValues = z.infer<typeof rdActivitySchema>

// ---------- Experiments ----------

export const experimentSchema = z.object({
  name: z.string().min(1, "Experiment name is required"),
  hypothesis: z.string().min(1, "Hypothesis is required"),
  rdActivityId: z.string().min(1, "R&D activity is required"),
  methodology: z.string().optional(),
  expectedOutcome: z.string().optional(),
})

export type ExperimentFormValues = z.infer<typeof experimentSchema>
