import { Activity, Trip, User, Comment, ChatMessage, TripCollaborator } from '@prisma/client';

export type TripWithCollaborators = Trip & {
  collaborators: (TripCollaborator & { user: User })[];
  activities: Activity[];
  owner: User;
};

export type ActivityWithDetails = Activity & {
  creator: User;
  comments: (Comment & { user: User })[];
};

export type CalendarView = 'month' | 'week' | 'day' | 'timeline';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: Activity;
}

export interface ChatContext {
  tripId: string;
  currentView?: CalendarView;
  selectedDate?: Date;
  recentActivities?: Activity[];
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface BudgetSummary {
  total: number;
  byCategory: Record<string, number>;
  byDay: Record<string, number>;
}
