import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma/client';
import TripClient from '@/components/trips/TripClient';

interface TripPageProps {
  params: {
    id: string;
  };
}

export default async function TripPage({ params }: TripPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const userId = (session.user as any).id;

  // Fetch trip with all details
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
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
        include: {
          creator: {
            select: { id: true, name: true, email: true, image: true },
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { startTime: 'asc' },
      },
      chatMessages: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
    },
  });

  if (!trip) {
    redirect('/dashboard');
  }

  // Check if user has access to this trip
  const isOwner = trip.ownerId === userId;
  const isCollaborator = trip.collaborators.some((c) => c.userId === userId);

  if (!isOwner && !isCollaborator) {
    redirect('/dashboard');
  }

  return (
    <TripClient
      trip={trip}
      user={session.user}
      userId={userId}
      isOwner={isOwner}
    />
  );
}
