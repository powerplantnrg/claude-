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
      rdActivities: [],
      employees: [],
      fixedAssets: [],
      inventoryItems: [],
      costingProjects: [],
      documents: [],
      marketplaceProviders: [],
      marketplaceListings: [],
      marketplaceContracts: [],
      migrationJobs: [],
    })
  }

  const [
    contacts,
    invoices,
    bills,
    projects,
    experiments,
    accounts,
    rdActivities,
    employees,
    fixedAssets,
    inventoryItems,
    costingProjects,
    documents,
    marketplaceProviders,
    marketplaceListings,
    marketplaceContracts,
    migrationJobs,
  ] = await Promise.all([
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

      prisma.rdActivity.findMany({
        where: {
          name: { contains: q },
          rdProject: { organizationId: orgId },
        },
        select: { id: true, name: true, status: true, rdProjectId: true },
        take: 5,
      }),

      prisma.employee.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, email: true, status: true },
        take: 5,
      }),

      prisma.fixedAsset.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q } },
            { assetNumber: { contains: q } },
          ],
        },
        select: { id: true, name: true, assetNumber: true, status: true },
        take: 5,
      }),

      prisma.inventoryItem.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q } },
            { sku: { contains: q } },
          ],
        },
        select: { id: true, name: true, sku: true, quantityOnHand: true },
        take: 5,
      }),

      prisma.project.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
          ],
        },
        select: { id: true, name: true, code: true, status: true },
        take: 5,
      }),

      prisma.document.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
          ],
        },
        select: { id: true, name: true, type: true },
        take: 5,
      }),

      prisma.marketplaceProvider.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { companyName: { contains: q } },
            { description: { contains: q } },
          ],
        },
        select: { id: true, companyName: true, status: true },
        take: 5,
      }),

      prisma.marketplaceListing.findMany({
        where: {
          title: { contains: q },
          provider: { organizationId: orgId },
        },
        select: { id: true, title: true, status: true },
        take: 5,
      }),

      prisma.marketplaceContract.findMany({
        where: {
          OR: [
            { title: { contains: q } },
          ],
          listing: {
            provider: { organizationId: orgId },
          },
        },
        select: { id: true, title: true, status: true },
        take: 5,
      }),

      prisma.migrationJob.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q } },
            { sourceSystem: { contains: q } },
          ],
        },
        select: { id: true, name: true, status: true, sourceSystem: true },
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
    rdActivities,
    employees,
    fixedAssets,
    inventoryItems,
    costingProjects,
    documents,
    marketplaceProviders,
    marketplaceListings,
    marketplaceContracts,
    migrationJobs,
  })
}
