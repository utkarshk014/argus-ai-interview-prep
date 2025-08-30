import { NextRequest, NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
    const apiSecret = process.env.STREAM_API_SECRET!;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Stream credentials not configured' }, { status: 500 });
    }

    // Create Stream client (server-side)
    const serverClient = StreamChat.getInstance(apiKey, apiSecret);

    // Generate user token
    const token = serverClient.createToken(userId);

    return NextResponse.json({ token });

  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}