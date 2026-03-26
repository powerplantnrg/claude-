import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ReconciliationView from "./ReconciliationView"

export default async function BankingPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return <ReconciliationView />
}
