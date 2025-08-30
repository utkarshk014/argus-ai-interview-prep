"use client";

import { useState, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface UseGeminiSimpleReturn {
  isConnected: boolean;
  isAISpeaking: boolean;
  aiResponse: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: string) => Promise<void>;
}

export const useGeminiSimple = (): UseGeminiSimpleReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [genAI, setGenAI] = useState<GoogleGenerativeAI | null>(null);
  const [model, setModel] = useState<any>(null);
  const [chat, setChat] = useState<any>(null);

  const connect = useCallback(async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not found");
      }

      // Initialize Gemini AI
      const ai = new GoogleGenerativeAI(apiKey);
      const geminiModel = ai.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction:
          "You are a friendly AI interview assistant. Keep responses concise and natural. Always be encouraging and helpful.",
      });

      setGenAI(ai);
      setModel(geminiModel);

      // Start chat session
      const chatSession = geminiModel.startChat({
        history: [],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 150,
        },
      });

      setChat(chatSession);
      setIsConnected(true);
      console.log("🤖 Connected to Gemini");

      // Send initial greeting
      setTimeout(() => {
        sendInitialGreeting(chatSession);
      }, 500);
    } catch (error) {
      console.error("❌ Failed to connect to Gemini:", error);
      setIsConnected(false);
    }
  }, []);

  const sendInitialGreeting = useCallback(async (chatSession: any) => {
    try {
      setIsAISpeaking(true);
      const result = await chatSession.sendMessage(
        "Please greet me and ask how you can help with interview preparation today. Keep it brief and friendly."
      );
      const response = result.response;
      const text = response.text();

      setAiResponse(text);
      console.log("🤖 AI:", text);

      // Convert to speech and play
      await speakText(text);
    } catch (error) {
      console.error("❌ Error sending initial greeting:", error);
      setIsAISpeaking(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!chat) {
        console.error("❌ Not connected to Gemini");
        return;
      }

      try {
        setIsAISpeaking(true);
        setAiResponse("");

        const result = await chat.sendMessage(message);
        const response = result.response;
        const text = response.text();

        setAiResponse(text);
        console.log("🤖 AI Response:", text);

        // Convert to speech and play
        await speakText(text);
      } catch (error) {
        console.error("❌ Failed to send message:", error);
        setIsAISpeaking(false);
      }
    },
    [chat]
  );

  const speakText = useCallback(async (text: string) => {
    try {
      // Check if speech synthesis is supported
      if (!("speechSynthesis" in window)) {
        console.warn("Speech synthesis not supported");
        setIsAISpeaking(false);
        return;
      }

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice settings
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Try to use a nice voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (voice) =>
          voice.name.includes("Google") ||
          voice.name.includes("Enhanced") ||
          voice.lang.startsWith("en-")
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        console.log("🗣️ AI started speaking");
        setIsAISpeaking(true);
      };

      utterance.onend = () => {
        console.log("🔇 AI finished speaking");
        setIsAISpeaking(false);
      };

      utterance.onerror = (error) => {
        console.error("❌ Speech synthesis error:", error);
        setIsAISpeaking(false);
      };

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("❌ Error in text-to-speech:", error);
      setIsAISpeaking(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    // Cancel any ongoing speech
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }

    setGenAI(null);
    setModel(null);
    setChat(null);
    setIsConnected(false);
    setIsAISpeaking(false);
    setAiResponse("");
    console.log("🤖 Disconnected from Gemini");
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
