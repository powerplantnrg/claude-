/**
 * Approval Workflow Engine
 * Handles multi-step approval workflows for bills, expenses,
 * purchase orders, pay runs, and journal entries.
 */

import { prisma } from "@/lib/prisma";

/**
 * Find the applicable approval workflow for a given entity type and amount.
 * Matches on organization, entity type, and amount range.
 */
export async function getApplicableWorkflow(
  orgId: string,
  entityType: string,
  amount: number
) {
  const workflow = await prisma.approvalWorkflow.findFirst({
    where: {
      organizationId: orgId,
      entityType,
      active: true,
      OR: [
        {
          minAmount: { lte: amount },
          maxAmount: { gte: amount },
        },
        {
          minAmount: { lte: amount },
          maxAmount: null,
        },
        {
          minAmount: null,
          maxAmount: { gte: amount },
        },
        {
          minAmount: null,
          maxAmount: null,
        },
      ],
    },
    include: {
      steps: {
        orderBy: { stepOrder: "asc" },
      },
    },
  });

  return workflow;
}

/**
 * Create an approval request with the appropriate steps from the matching workflow.
 * Returns null if no applicable workflow is found or if the amount is auto-approved.
 */
export async function createApprovalRequest(
  orgId: string,
  entityType: string,
  entityId: string,
  requestedById: string
) {
  // First check for auto-approval
  // Get the entity amount - we need to look it up based on type
  const amount = await getEntityAmount(entityType, entityId);

  if (amount !== null) {
    const autoApproved = await isAutoApproved(orgId, entityType, amount);
    if (autoApproved) {
      return { autoApproved: true, request: null };
    }
  }

  const workflow = amount !== null
    ? await getApplicableWorkflow(orgId, entityType, amount)
    : await prisma.approvalWorkflow.findFirst({
        where: { organizationId: orgId, entityType, active: true },
        include: { steps: { orderBy: { stepOrder: "asc" } } },
      });

  if (!workflow || workflow.steps.length === 0) {
    return { autoApproved: false, request: null, reason: "No applicable workflow found" };
  }

  const request = await prisma.approvalRequest.create({
    data: {
      organizationId: orgId,
      workflowId: workflow.id,
      entityType,
      entityId,
      requestedById,
      currentStep: 1,
      status: "Pending",
      totalSteps: workflow.steps.length,
    },
    include: {
      workflow: {
        include: {
          steps: { orderBy: { stepOrder: "asc" } },
        },
      },
    },
  });

  return { autoApproved: false, request };
}

/**
 * Process an approval action (approve, reject, delegate, or comment).
 * Advances the workflow to the next step on approval, or rejects the entire request on rejection.
 */
export async function processApprovalAction(
  requestId: string,
  userId: string,
  action: string,
  comment?: string
) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: {
      workflow: {
        include: {
          steps: { orderBy: { stepOrder: "asc" } },
        },
      },
      actions: true,
    },
  });

  if (!request) {
    throw new Error("Approval request not found");
  }

  if (request.status === "Approved" || request.status === "Rejected" || request.status === "Cancelled") {
    throw new Error(`Cannot process action on a ${request.status.toLowerCase()} request`);
  }

  // Verify the user can approve at the current step
  const canApprove = await canUserApprove(requestId, userId);
  if (!canApprove && action !== "Comment") {
    throw new Error("User is not authorized to approve at the current step");
  }

  // Record the action
  const approvalAction = await prisma.approvalAction.create({
    data: {
      approvalRequestId: requestId,
      stepOrder: request.currentStep,
      userId,
      action,
      comment: comment || null,
      actionDate: new Date(),
    },
  });

  // Update request status based on action
  if (action === "Approved") {
    if (request.currentStep >= request.totalSteps) {
      // Final step approved - mark entire request as approved
      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: { status: "Approved" },
      });
    } else {
      // Move to next step
      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          currentStep: request.currentStep + 1,
          status: "InProgress",
        },
      });
    }
  } else if (action === "Rejected") {
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: "Rejected" },
    });
  } else if (action === "Delegated") {
    // Delegation is recorded but doesn't change the step
    // The delegated-to user would be referenced in the comment
  }

  return approvalAction;
}

/**
 * Check if a user is the current approver for an approval request.
 */
export async function canUserApprove(
  requestId: string,
  userId: string
): Promise<boolean> {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: {
      workflow: {
        include: {
          steps: { orderBy: { stepOrder: "asc" } },
        },
      },
    },
  });

  if (!request) return false;

  if (request.status === "Approved" || request.status === "Rejected" || request.status === "Cancelled") {
    return false;
  }

  const currentStepDef = request.workflow.steps.find(
    (s) => s.stepOrder === request.currentStep
  );

  if (!currentStepDef) return false;

  return currentStepDef.approverId === userId;
}

/**
 * Get the current approval status for an entity.
 */
export async function getApprovalStatus(
  entityType: string,
  entityId: string
) {
  const request = await prisma.approvalRequest.findFirst({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      actions: {
        orderBy: { actionDate: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      workflow: {
        include: {
          steps: {
            orderBy: { stepOrder: "asc" },
            include: { approver: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      requestedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!request) {
    return { hasApproval: false, status: null, request: null };
  }

  return {
    hasApproval: true,
    status: request.status,
    currentStep: request.currentStep,
    totalSteps: request.totalSteps,
    request,
  };
}

/**
 * Check if an entity amount is below the auto-approve threshold for the org and entity type.
 */
export async function isAutoApproved(
  orgId: string,
  entityType: string,
  amount: number
): Promise<boolean> {
  const workflows = await prisma.approvalWorkflow.findMany({
    where: {
      organizationId: orgId,
      entityType,
      active: true,
      autoApproveBelow: { not: null },
    },
  });

  for (const workflow of workflows) {
    if (workflow.autoApproveBelow !== null && amount < workflow.autoApproveBelow) {
      return true;
    }
  }

  return false;
}

/**
 * Helper to get the amount of an entity based on its type and ID.
 */
async function getEntityAmount(
  entityType: string,
  entityId: string
): Promise<number | null> {
  switch (entityType) {
    case "Bill": {
      const bill = await prisma.bill.findUnique({ where: { id: entityId } });
      return bill?.total ?? null;
    }
    case "Expense": {
      const claim = await prisma.expenseClaim.findUnique({ where: { id: entityId } });
      return claim?.totalAmount ?? null;
    }
    case "PurchaseOrder": {
      const po = await prisma.purchaseOrder.findUnique({ where: { id: entityId } });
      return po?.total ?? null;
    }
    case "PayRun": {
      const payRun = await prisma.payRun.findUnique({ where: { id: entityId } });
      return payRun?.totalGross ?? null;
    }
    case "JournalEntry": {
      // Sum debits for the journal entry
      const lines = await prisma.journalLine.findMany({
        where: { journalEntryId: entityId },
      });
      const total = lines.reduce((sum, l) => sum + l.debit, 0);
      return total > 0 ? total : null;
    }
    default:
      return null;
  }
}
