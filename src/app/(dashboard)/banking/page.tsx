import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ReconciliationView from "./ReconciliationView"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Banking",
}

export default async function BankingPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return <ReconciliationView />
}
