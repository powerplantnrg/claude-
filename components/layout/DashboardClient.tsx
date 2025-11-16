'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { FiPlus, FiCalendar, FiUsers, FiLogOut, FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from 'next-themes';
import CreateTripModal from '@/components/trips/CreateTripModal';

interface DashboardClientProps {
  trips: any[];
  user: any;
  userId: string;
}

export default function DashboardClient({ trips, user, userId }: DashboardClientProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntil = (date: Date) => {
    const today = new Date();
    const target = new Date(date);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Holiday Planner
              </span>
            </Link>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
              </button>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  aria-label="Sign out"
                >
                  <FiLogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Trips
          </h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <FiPlus size={20} />
            <span>New Trip</span>
          </button>
        </div>

        {/* Trips Grid */}
        {trips.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCalendar size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No trips yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first trip to start planning your vacation
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const daysUntil = getDaysUntil(trip.startDate);
              const isOwner = trip.ownerId === userId;

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition overflow-hidden"
                >
                  {/* Trip Cover Image */}
                  <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 relative">
                    {trip.coverImage && (
                      <img
                        src={trip.coverImage}
                        alt={trip.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                      {daysUntil > 0 ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          {daysUntil} days
                        </span>
                      ) : daysUntil === 0 ? (
                        <span className="text-green-600 dark:text-green-400">
                          Today!
                        </span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">
                          Past
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trip Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {trip.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {trip.destination}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <span>
                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FiUsers size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {trip.collaborators.length + 1} member
                          {trip.collaborators.length !== 0 ? 's' : ''}
                        </span>
                      </div>

                      {trip.activities.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <FiCalendar size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {trip.activities.length} activit
                            {trip.activities.length === 1 ? 'y' : 'ies'}
                          </span>
                        </div>
                      )}
                    </div>

                    {!isOwner && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Shared by {trip.owner.name || trip.owner.email}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
