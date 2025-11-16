import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { tripId, message, context } = body;

    // Verify user has access to trip
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
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

    // Build context for AI
    const systemPrompt = `You are a helpful AI travel assistant for a vacation planning app called Holiday Planner.
You help users plan their trips by answering questions about their itinerary, suggesting activities, calculating travel times, and providing travel advice.

Current trip context:
- Destination: ${context.trip.destination}
- Dates: ${new Date(context.trip.startDate).toLocaleDateString()} to ${new Date(context.trip.endDate).toLocaleDateString()}
- Number of activities: ${context.activities.length}

Activities:
${context.activities.map((a: any, i: number) =>
  `${i + 1}. ${a.title} (${a.category}) - ${new Date(a.startTime).toLocaleDateString()} at ${new Date(a.startTime).toLocaleTimeString()}${a.location ? ` at ${a.location}` : ''}${a.cost ? ` - $${a.cost}` : ''}`
).join('\n')}

Provide helpful, concise, and friendly responses. Be specific when referencing activities from the itinerary.`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Sorry, I could not generate a response.';

    // Save messages to database
    await prisma.chatMessage.createMany({
      data: [
        {
          tripId,
          userId,
          role: 'user',
          content: message,
        },
        {
          tripId,
          userId,
          role: 'assistant',
          content: assistantMessage,
        },
      ],
    });

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
