"use client";

import { useState, useCallback } from "react";
import { StreamVideoClient, User, Call } from "@stream-io/video-react-sdk";

interface UseStreamVideoReturn {
  client: StreamVideoClient | null;
  call: Call | null;
  isCallActive: boolean;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
}

export const useStreamVideo = (): UseStreamVideoReturn => {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);

  const startCall = useCallback(async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
      if (!apiKey) {
        throw new Error("Stream API key not found");
      }

      // Create user object
      const user: User = {
        id: "user-" + Math.random().toString(36).substr(2, 9),
        name: "Interview Candidate",
        image: `https://getstream.io/random_svg/?name=Candidate`,
      };

      // For demo, we'll use a simple token (in production, generate this server-side)
      const token = await generateUserToken(user.id);

      // Initialize Stream client
      const videoClient = new StreamVideoClient({
        apiKey,
        user,
        token,
      });

      setClient(videoClient);

      // Create and join call
      const callId = "interview-" + Date.now();
      const videoCall = videoClient.call("default", callId);

      await videoCall.join({ create: true });
      setCall(videoCall);
      setIsCallActive(true);

      console.log("📹 Stream video call started");
    } catch (error) {
      console.error("❌ Failed to start Stream call:", error);
    }
  }, []);

  const endCall = useCallback(async () => {
    try {
      if (call) {
        await call.leave();
        setCall(null);
      }

      if (client) {
        await client.disconnectUser();
        setClient(null);
      }

      setIsCallActive(false);
      console.log("📹 Stream video call ended");
    } catch (error) {
      console.error("❌ Failed to end Stream call:", error);
    }
  }, [call, client]);

  return {
    client,
    call,
    isCallActive,
    startCall,
    endCall,
  };
};

// Simple token generation for demo (use server-side in production)
const generateUserToken = async (userId: string): Promise<string> => {
  // In production, call your backend to generate a proper JWT token
  // For demo purposes, we'll create a simple token
  const response = await fetch("/api/generate-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate token");
  }

  const { token } = await response.json();
  return token;
};
