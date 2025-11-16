'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiX, FiMapPin, FiClock, FiDollarSign, FiLink, FiTrash2 } from 'react-icons/fi';
import moment from 'moment';
import { Activity } from '@prisma/client';

interface ActivityDetailsProps {
  activity: any;
  onClose: () => void;
  isOwner: boolean;
  userId: string;
}

export default function ActivityDetails({
  activity,
  onClose,
  isOwner,
  userId,
}: ActivityDetailsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const categoryColors: Record<string, string> = {
    LODGING: '#8B5CF6',
    DINING: '#F59E0B',
    ACTIVITY: '#10B981',
    TRANSPORT: '#3B82F6',
    OTHER: '#6B7280',
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/activities/${activity.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
        onClose();
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: categoryColors[activity.category] }}
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {activity.category}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {activity.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Time */}
            <div className="flex items-start space-x-3">
              <FiClock className="mt-1 text-gray-400" size={20} />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {moment(activity.startTime).format('dddd, MMMM D, YYYY')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {moment(activity.startTime).format('h:mm A')} -{' '}
                  {moment(activity.endTime).format('h:mm A')}
                  {activity.duration && ` (${activity.duration} minutes)`}
                </p>
              </div>
            </div>

            {/* Location */}
            {activity.location && (
              <div className="flex items-start space-x-3">
                <FiMapPin className="mt-1 text-gray-400" size={20} />
                <div>
                  <p className="text-gray-900 dark:text-white">{activity.location}</p>
                </div>
              </div>
            )}

            {/* Cost */}
            {activity.cost && (
              <div className="flex items-start space-x-3">
                <FiDollarSign className="mt-1 text-gray-400" size={20} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ${activity.cost.toFixed(2)} {activity.currency}
                  </p>
                </div>
              </div>
            )}

            {/* Booking URL */}
            {activity.bookingUrl && (
              <div className="flex items-start space-x-3">
                <FiLink className="mt-1 text-gray-400" size={20} />
                <div>
                  <a
                    href={activity.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Open booking link
                  </a>
                </div>
              </div>
            )}

            {/* Description */}
            {activity.description && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {activity.description}
                </p>
              </div>
            )}

            {/* Notes */}
            {activity.notes && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Notes
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{activity.notes}</p>
              </div>
            )}

            {/* Creator Info */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Created by {activity.creator?.name || activity.creator?.email} on{' '}
                {moment(activity.createdAt).format('MMM D, YYYY')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Close
            </button>
            {(isOwner || activity.creatorId === userId) && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                <FiTrash2 size={18} />
                <span>{loading ? 'Deleting...' : 'Delete'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
