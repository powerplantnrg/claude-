export type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"

export type JournalStatus = "Draft" | "Posted" | "Void"

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Void"

export type BillStatus = "Draft" | "Received" | "Paid" | "Overdue" | "Void"

export type RdProjectStatus = "Active" | "Completed" | "Cancelled"

export type RdActivityType = "Core" | "Supporting"

export type ExperimentStatus = "Planned" | "Running" | "Completed" | "Failed"

export type RdClassification = "CoreRD" | "SupportingRD" | "NonEligible" | "NeedsReview"

export type EligibilityStatus = "Pending" | "Eligible" | "Ineligible" | "NeedsReview"

export type GrantStatus = "Discovered" | "Applied" | "Awarded" | "Completed" | "Rejected"

export type UserRole = "Admin" | "Accountant" | "Researcher" | "Viewer"
