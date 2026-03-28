import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const orgId = (session.user as any).organizationId

    const body = await request.json()
    const { baseCurrency, revaluationDate, transactions } = body

    if (!baseCurrency || !revaluationDate) {
      return NextResponse.json(
        { error: "Base currency and revaluation date are required" },
        { status: 400 }
      )
    }

    const revalDate = new Date(revaluationDate)
    const results: any[] = []
    let totalGainLoss = 0

    // Process each foreign currency transaction for revaluation
    const txns = transactions || []
    for (const txn of txns) {
      const {
        transactionType,
        transactionId,
        originalAmount,
        originalCurrency,
        previousConvertedAmount,
      } = txn

      if (originalCurrency === baseCurrency) continue

      // Get the current exchange rate
      const currentRate = await prisma.exchangeRate.findFirst({
        where: {
          organizationId: orgId,
          fromCurrency: originalCurrency.toUpperCase(),
          toCurrency: baseCurrency.toUpperCase(),
          effectiveDate: { lte: revalDate },
        },
        orderBy: { effectiveDate: "desc" },
      })

      if (!currentRate) continue

      const newConvertedAmount = originalAmount * currentRate.rate
      const gainLoss = newConvertedAmount - (previousConvertedAmount || 0)

      if (Math.abs(gainLoss) < 0.01) continue

      const fxEntry = await prisma.fxGainLoss.create({
        data: {
          organizationId: orgId,
          transactionType,
          transactionId,
          originalAmount,
          originalCurrency: originalCurrency.toUpperCase(),
          convertedAmount: Math.round(newConvertedAmount * 100) / 100,
          baseCurrency: baseCurrency.toUpperCase(),
          exchangeRateUsed: currentRate.rate,
          gainLoss: Math.round(gainLoss * 100) / 100,
          recognizedDate: revalDate,
          journalEntryId: null,
        },
      })

      totalGainLoss += gainLoss
      results.push(fxEntry)
    }

    // Create a journal entry for the net FX gain/loss if there are entries
    let journalEntry = null
    if (results.length > 0) {
      const lastEntry = await prisma.journalEntry.findFirst({
        where: { organizationId: orgId },
        orderBy: { entryNumber: "desc" },
      })
      const entryNumber = (lastEntry?.entryNumber ?? 0) + 1

      const roundedGainLoss = Math.round(totalGainLoss * 100) / 100

      // Find FX gain/loss accounts
      const fxGainLossAccount = await prisma.account.findFirst({
        where: {
          organizationId: orgId,
          name: { contains: "Foreign Exchange" },
        },
      })

      const unrealizedFxAccount = await prisma.account.findFirst({
        where: {
          organizationId: orgId,
          name: { contains: "Unrealized" },
        },
      })

      if (fxGainLossAccount) {
        const lines = []

        if (roundedGainLoss > 0) {
          // FX Gain: Debit unrealized/asset account, Credit FX gain account
          lines.push({
            accountId: unrealizedFxAccount?.id || fxGainLossAccount.id,
            description: "Foreign currency revaluation - gain",
            debit: roundedGainLoss,
            credit: 0,
            taxCode: null,
          })
          lines.push({
            accountId: fxGainLossAccount.id,
            description: "Foreign currency revaluation - gain",
            debit: 0,
            credit: roundedGainLoss,
            taxCode: null,
          })
        } else {
          // FX Loss: Debit FX loss account, Credit unrealized/asset account
          const absLoss = Math.abs(roundedGainLoss)
          lines.push({
            accountId: fxGainLossAccount.id,
            description: "Foreign currency revaluation - loss",
            debit: absLoss,
            credit: 0,
            taxCode: null,
          })
          lines.push({
            accountId: unrealizedFxAccount?.id || fxGainLossAccount.id,
            description: "Foreign currency revaluation - loss",
            debit: 0,
            credit: absLoss,
            taxCode: null,
          })
        }

        journalEntry = await prisma.journalEntry.create({
          data: {
            entryNumber,
            date: revalDate,
            reference: `FX-REVAL-${revalDate.toISOString().slice(0, 10)}`,
            narration: `Foreign currency revaluation as at ${revalDate.toLocaleDateString("en-AU")}`,
            status: "Posted",
            sourceType: "FxRevaluation",
            sourceId: null,
            organizationId: orgId,
            lines: { create: lines },
          },
        })

        // Update FX gain/loss entries with journal entry ID
        for (const result of results) {
          await prisma.fxGainLoss.update({
            where: { id: result.id },
            data: { journalEntryId: journalEntry.id },
          })
        }
      }
    }

    return NextResponse.json({
      revaluationDate: revalDate,
      entriesCreated: results.length,
      totalGainLoss: Math.round(totalGainLoss * 100) / 100,
      entries: results,
      journalEntryId: journalEntry?.id || null,
    })
  } catch (error) {
    console.error("Error performing revaluation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
