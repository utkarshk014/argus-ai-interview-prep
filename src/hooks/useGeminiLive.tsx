"use client";

import { useState, useRef, useCallback } from "react";

interface UseGeminiLiveReturn {
  isConnected: boolean;
  isAISpeaking: boolean;
  aiResponse: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: string) => Promise<void>;
}

export const useGeminiLive = (): UseGeminiLiveReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const connect = useCallback(async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not found");
      }

      // Initialize audio context
      audioContextRef.current = new AudioContext();

      // Connect to Gemini Live API
      const ws = new WebSocket(
        `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.StreamGenerateContent?key=${apiKey}`
      );

      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🤖 Connected to Gemini Live");
        setIsConnected(true);

        // Send initial setup message
        ws.send(
          JSON.stringify({
            setup: {
              model: "models/gemini-2.0-flash-exp",
              generation_config: {
                response_modalities: ["AUDIO"],
                speech_config: {
                  voice_config: {
                    prebuilt_voice_config: {
                      voice_name: "Puck",
                    },
                  },
                },
              },
            },
          })
        );

        // AI greets first
        setTimeout(() => {
          sendInitialGreeting();
        }, 1000);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleGeminiResponse(data);
      };

      ws.onclose = () => {
        console.log("🤖 Disconnected from Gemini Live");
        setIsConnected(false);
        setIsAISpeaking(false);
      };

      ws.onerror = (error) => {
        console.error("🚨 Gemini Live error:", error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error("❌ Failed to connect to Gemini Live:", error);
    }
  }, []);

  const sendInitialGreeting = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          client_content: {
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text: "Hello! Welcome to the interview practice session. Please introduce yourself and let me know how I can help you prepare for your interview today.",
                  },
                ],
              },
            ],
            turn_complete: true,
          },
        })
      );
    }
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("❌ Not connected to Gemini Live");
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          client_content: {
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text: message,
                  },
                ],
              },
            ],
            turn_complete: true,
          },
        })
      );
    } catch (error) {
      console.error("❌ Failed to send message:", error);
    }
  }, []);

  const handleGeminiResponse = useCallback((data: any) => {
    try {
      // Handle different response types
      if (data.server_content?.model_turn?.parts) {
        const parts = data.server_content.model_turn.parts;

        for (const part of parts) {
          // Handle text response
          if (part.text) {
            setAiResponse((prev) => prev + part.text);
          }

          // Handle audio response
          if (part.inline_data?.data) {
            playAudioResponse(part.inline_data.data);
          }
        }
      }

      // Handle turn completion
      if (data.server_content?.turn_complete) {
        setIsAISpeaking(false);
      }

      // Handle turn start
      if (data.server_content?.model_turn) {
        setIsAISpeaking(true);
        setAiResponse(""); // Clear previous response
      }
    } catch (error) {
      console.error("❌ Error handling Gemini response:", error);
    }
  }, []);

  const playAudioResponse = useCallback(async (audioData: string) => {
    try {
      if (!audioContextRef.current) return;

      // Decode base64 audio data
      const audioBytes = Uint8Array.from(atob(audioData), (c) =>
        c.charCodeAt(0)
      );
      const audioBuffer = await audioContextRef.current.decodeAudioData(
        audioBytes.buffer
      );

      // Play the audio
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();

      setIsAISpeaking(true);

      // Set speaking to false when audio ends
      source.onended = () => {
        setIsAISpeaking(false);
      };
    } catch (error) {
      console.error("❌ Error playing audio:", error);
      setIsAISpeaking(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsAISpeaking(false);
    setAiResponse("");
  }, []);

  return {
    isConnected,
    isAISpeaking,
    aiResponse,
    connect,
    disconnect,
    sendMessage,
  };
};
