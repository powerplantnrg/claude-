"use client"

interface ExpenseClaimActionsProps {
  claimId: string
  status: string
}

export function ExpenseClaimActions({ claimId, status }: ExpenseClaimActionsProps) {
  if (status === "Paid" || status === "Rejected") {
    return null
  }

  return (
    <div className="flex gap-2">
      {status === "Draft" && (
        <form action={`/api/expenses/${claimId}/submit`} method="POST">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Submit for Approval
          </button>
        </form>
      )}
      {status === "Submitted" && (
        <>
          <form action={`/api/expenses/${claimId}/approve`} method="POST">
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Approve
            </button>
          </form>
          <form action={`/api/expenses/${claimId}/reject`} method="POST">
            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Reject
            </button>
          </form>
        </>
      )}
      {status === "Approved" && (
        <form action={`/api/expenses/${claimId}/pay`} method="POST">
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Mark as Paid
          </button>
        </form>
      )}
    </div>
  )
}
