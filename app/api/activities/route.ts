import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma/client';
import { z } from 'zod';

const createActivitySchema = z.object({
  tripId: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  cost: z.number().nullable().optional(),
  category: z.enum(['LODGING', 'DINING', 'ACTIVITY', 'TRANSPORT', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  notes: z.string().optional(),
  bookingUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const data = createActivitySchema.parse(body);

    // Verify user has access to trip
    const trip = await prisma.trip.findFirst({
      where: {
        id: data.tripId,
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId } } },
        ],
      },
    });

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found or access denied' },
        { status: 404 }
      );
    }

    // Validate dates
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end < start) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Calculate duration in minutes
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    // Create activity
    const activity = await prisma.activity.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startTime: start,
        endTime: end,
        duration,
        cost: data.cost,
        category: data.category,
        priority: data.priority || 'MEDIUM',
        notes: data.notes,
        bookingUrl: data.bookingUrl,
        tripId: data.tripId,
        creatorId: userId,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create activity error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
