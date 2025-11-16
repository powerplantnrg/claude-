import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma/client';
import DashboardClient from '@/components/layout/DashboardClient';

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const userId = (session.user as any).id;

  // Fetch user's trips
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
        take: 5,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <DashboardClient
      trips={trips}
      user={session.user}
      userId={userId}
    />
  );
}
