import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const activityId = params.id;

    // Find activity and check permissions
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        trip: true,
      },
    });

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Check if user is trip owner or activity creator
    const isOwner = activity.trip.ownerId === userId;
    const isCreator = activity.creatorId === userId;

    if (!isOwner && !isCreator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete activity
    await prisma.activity.delete({
      where: { id: activityId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete activity error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
