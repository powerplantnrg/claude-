'use client';

import { useMemo } from 'react';
import { Activity } from '@prisma/client';

interface BudgetSummaryProps {
  activities: Activity[];
}

export default function BudgetSummary({ activities }: BudgetSummaryProps) {
  const budgetData = useMemo(() => {
    const byCategory: Record<string, number> = {
      LODGING: 0,
      DINING: 0,
      ACTIVITY: 0,
      TRANSPORT: 0,
      OTHER: 0,
    };

    const byDay: Record<string, number> = {};
    let total = 0;

    activities.forEach((activity) => {
      if (activity.cost) {
        total += activity.cost;
        byCategory[activity.category] += activity.cost;

        const day = new Date(activity.startTime).toLocaleDateString();
        byDay[day] = (byDay[day] || 0) + activity.cost;
      }
    });

    return { total, byCategory, byDay };
  }, [activities]);

  const categoryColors: Record<string, string> = {
    LODGING: '#8B5CF6',
    DINING: '#F59E0B',
    ACTIVITY: '#10B981',
    TRANSPORT: '#3B82F6',
    OTHER: '#6B7280',
  };

  const categoryLabels: Record<string, string> = {
    LODGING: 'Lodging',
    DINING: 'Dining',
    ACTIVITY: 'Activities',
    TRANSPORT: 'Transport',
    OTHER: 'Other',
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Budget Overview
        </h3>

        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white mb-6">
          <p className="text-sm opacity-90 mb-1">Total Budget</p>
          <p className="text-4xl font-bold">${budgetData.total.toFixed(2)}</p>
          <p className="text-sm opacity-75 mt-1">
            Across {activities.filter((a) => a.cost).length} activities
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(budgetData.byCategory).map(([category, amount]) => (
            <div
              key={category}
              className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center space-x-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: categoryColors[category] }}
                />
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {categoryLabels[category]}
                </p>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ${amount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {budgetData.total > 0
                  ? ((amount / budgetData.total) * 100).toFixed(0)
                  : 0}
                % of total
              </p>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(budgetData.byDay).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Daily Breakdown
          </h3>
          <div className="space-y-2">
            {Object.entries(budgetData.byDay)
              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
              .map(([day, amount]) => (
                <div
                  key={day}
                  className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {day}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${amount.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
