"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Extend Window interface to include webkit speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleRecording: () => void;
  clearTranscript: () => void;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check if speech recognition is supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        recognitionRef.current = new SpeechRecognition();
        setupSpeechRecognition();
      } else {
        console.error("Speech recognition not supported in this browser");
        setIsSupported(false);
      }
    }
  }, []);

  const setupSpeechRecognition = useCallback(() => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;

    // Configure recognition settings
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("🎤 Speech recognition started");
      setIsRecording(true);
    };

    recognition.onend = () => {
      console.log("🔇 Speech recognition ended");
      setIsRecording(false);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalTranscript) {
        const timestampedText = `[${new Date().toLocaleTimeString()}] ${finalTranscript.trim()}`;
        console.log("📝 Transcribed:", timestampedText);

        setTranscript((prev) => prev + (prev ? "\n" : "") + timestampedText);
        setInterimTranscript("");
      } else {
        setInterimTranscript(interimText);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("🚨 Speech recognition error:", event.error);
      setIsRecording(false);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current?.start();
    } catch (error) {
      console.error("❌ Microphone access denied:", error);
      alert("Microphone access is required for speech recognition");
    }
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    console.clear();
  }, []);

  return {
    isRecording,
    transcript,
    interimTranscript,
    isSupported,
    startRecording,
    stopRecording,
    toggleRecording,
    clearTranscript,
  };
};
