import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma/client';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const createTripSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  destination: z.string().min(1, 'Destination is required'),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { title, destination, startDate, endDate, description } =
      createTripSchema.parse(body);

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Create trip with unique share code
    const trip = await prisma.trip.create({
      data: {
        title,
        destination,
        startDate: start,
        endDate: end,
        description,
        shareCode: nanoid(10),
        ownerId: userId,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        collaborators: true,
      },
    });

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create trip error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const trips = await prisma.trip.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        activities: {
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ trips });
  } catch (error) {
    console.error('Get trips error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
