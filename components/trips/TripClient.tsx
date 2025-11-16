'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  FiCalendar,
  FiPlus,
  FiUsers,
  FiMessageSquare,
  FiSettings,
  FiDollarSign,
  FiDownload,
  FiArrowLeft,
} from 'react-icons/fi';
import { Activity, Trip, User } from '@prisma/client';
import ActivityModal from '@/components/activities/ActivityModal';
import ActivityDetails from '@/components/activities/ActivityDetails';
import ChatSidebar from '@/components/chat/ChatSidebar';
import BudgetSummary from '@/components/budget/BudgetSummary';
import { CalendarView } from '@/types';

const localizer = momentLocalizer(moment);

interface TripClientProps {
  trip: any;
  user: any;
  userId: string;
  isOwner: boolean;
}

export default function TripClient({
  trip,
  user,
  userId,
  isOwner,
}: TripClientProps) {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>('month');
  const [date, setDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showBudget, setShowBudget] = useState(false);

  // Convert activities to calendar events
  const events = useMemo(() => {
    return trip.activities.map((activity: Activity) => ({
      id: activity.id,
      title: activity.title,
      start: new Date(activity.startTime),
      end: new Date(activity.endTime),
      resource: activity,
    }));
  }, [trip.activities]);

  const handleSelectSlot = useCallback((slotInfo: any) => {
    setDate(slotInfo.start);
    setIsActivityModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: any) => {
    setSelectedActivity(event.resource);
  }, []);

  const eventStyleGetter = useCallback((event: any) => {
    const activity = event.resource as Activity;
    const categoryColors: Record<string, string> = {
      LODGING: '#8B5CF6',
      DINING: '#F59E0B',
      ACTIVITY: '#10B981',
      TRANSPORT: '#3B82F6',
      OTHER: '#6B7280',
    };

    const backgroundColor = categoryColors[activity.category] || '#6B7280';

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 5px',
      },
    };
  }, []);

  // Calculate budget total
  const budgetTotal = trip.activities.reduce(
    (sum: number, activity: Activity) => sum + (activity.cost || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Main Content */}
      <div className={`flex-1 ${isChatOpen ? 'mr-96' : ''} transition-all`}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <FiArrowLeft size={24} />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {trip.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {trip.destination} •{' '}
                    {moment(trip.startDate).format('MMM D')} -{' '}
                    {moment(trip.endDate).format('MMM D, YYYY')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowBudget(!showBudget)}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <FiDollarSign size={18} />
                  <span className="font-medium">${budgetTotal.toFixed(2)}</span>
                </button>

                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <FiMessageSquare size={18} />
                  <span>AI Assistant</span>
                </button>

                <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <FiDownload size={20} />
                </button>

                <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <FiSettings size={20} />
                </button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsActivityModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <FiPlus size={18} />
                  <span>Add Activity</span>
                </button>

                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <FiCalendar size={16} />
                  <span className="text-sm">
                    {trip.activities.length} activit
                    {trip.activities.length === 1 ? 'y' : 'ies'}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <FiUsers size={16} />
                  <span className="text-sm">
                    {trip.collaborators.length + 1} member
                    {trip.collaborators.length !== 0 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* View Switcher */}
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {['month', 'week', 'day', 'agenda'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v as CalendarView)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      view === v
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Budget Summary (if shown) */}
        {showBudget && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="container mx-auto px-4 py-4">
              <BudgetSummary activities={trip.activities} />
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="container mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4" style={{ height: '700px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view as View}
              onView={(newView) => setView(newView as CalendarView)}
              date={date}
              onNavigate={(newDate) => setDate(newDate)}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              eventPropGetter={eventStyleGetter}
              style={{ height: '100%' }}
              className="dark-calendar"
            />
          </div>

          {/* Activity List (Agenda View Alternative) */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              All Activities
            </h2>
            <div className="space-y-2">
              {trip.activities.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No activities yet. Click "Add Activity" to get started!
                  </p>
                </div>
              ) : (
                trip.activities.map((activity: any) => (
                  <button
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    className="w-full bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: {
                                LODGING: '#8B5CF6',
                                DINING: '#F59E0B',
                                ACTIVITY: '#10B981',
                                TRANSPORT: '#3B82F6',
                                OTHER: '#6B7280',
                              }[activity.category],
                            }}
                          />
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {activity.title}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            {activity.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {moment(activity.startTime).format('MMM D, YYYY [at] h:mm A')}
                          {activity.location && ` • ${activity.location}`}
                        </p>
                      </div>
                      {activity.cost && (
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            ${activity.cost.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.currency}
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      {isChatOpen && (
        <ChatSidebar
          trip={trip}
          onClose={() => setIsChatOpen(false)}
          messages={trip.chatMessages || []}
        />
      )}

      {/* Activity Modal */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        tripId={trip.id}
        initialDate={date}
      />

      {/* Activity Details */}
      {selectedActivity && (
        <ActivityDetails
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          isOwner={isOwner}
          userId={userId}
        />
      )}
    </div>
  );
}
