import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId

  const q = request.nextUrl.searchParams.get("q")?.trim()

  if (!q || q.length === 0) {
    return NextResponse.json({
      contacts: [],
      invoices: [],
      bills: [],
      projects: [],
      experiments: [],
      accounts: [],
    })
  }

  const [contacts, invoices, bills, projects, experiments, accounts] =
    await Promise.all([
      prisma.contact.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        },
        select: { id: true, name: true, email: true, contactType: true },
        take: 5,
      }),

      prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { invoiceNumber: { contains: q } },
            { notes: { contains: q } },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
        },
        take: 5,
      }),

      prisma.bill.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { billNumber: { contains: q } },
            { notes: { contains: q } },
          ],
        },
        select: {
          id: true,
          billNumber: true,
          total: true,
          status: true,
        },
        take: 5,
      }),

      prisma.rdProject.findMany({
        where: {
          organizationId: orgId,
          name: { contains: q },
        },
        select: { id: true, name: true, status: true },
        take: 5,
      }),

      prisma.experiment.findMany({
        where: {
          name: { contains: q },
          rdActivity: {
            rdProject: { organizationId: orgId },
          },
        },
        select: { id: true, name: true, status: true },
        take: 5,
      }),

      prisma.account.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
          ],
        },
        select: { id: true, name: true, code: true, type: true },
        take: 5,
      }),
    ])

  return NextResponse.json({
    contacts,
    invoices,
    bills,
    projects,
    experiments,
    accounts,
  })
}
