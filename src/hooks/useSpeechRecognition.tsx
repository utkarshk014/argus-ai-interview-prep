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
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManualStopRef = useRef(false);

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

    // Configure recognition settings for faster response
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("🎤 Speech recognition started");
      setIsRecording(true);
      isManualStopRef.current = false;
    };

    recognition.onend = () => {
      console.log("🔇 Speech recognition ended");
      setIsRecording(false);
      
      // Clear any pending silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // Auto-restart if not manually stopped (for continuous conversation)
      if (!isManualStopRef.current) {
        console.log("🔄 Auto-restarting speech recognition");
        setTimeout(() => {
          if (recognitionRef.current && !isManualStopRef.current) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.log("Recognition already running or error:", error);
            }
          }
        }, 500);
      }
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

      // Clear previous silence timer since user is speaking
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (finalTranscript) {
        const timestampedText = `[${new Date().toLocaleTimeString()}] ${finalTranscript.trim()}`;
        console.log("📝 Final Transcript:", timestampedText);

        setTranscript((prev) => prev + (prev ? "\n" : "") + timestampedText);
        setInterimTranscript("");

        // Start silence detection timer for faster response
        silenceTimerRef.current = setTimeout(() => {
          console.log("⏰ Silence detected - stopping recognition for processing");
          if (!isManualStopRef.current) {
            isManualStopRef.current = true;
            recognition.stop();
          }
        }, 1500); // Reduced from default to 1.5 seconds of silence
      } else {
        setInterimTranscript(interimText);
        
        // If we have interim results, reset silence timer
        if (interimText.trim()) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Start new silence timer
          silenceTimerRef.current = setTimeout(() => {
            console.log("⏰ Interim silence detected - processing");
            if (!isManualStopRef.current) {
              isManualStopRef.current = true;
              recognition.stop();
            }
          }, 2000); // Slightly longer for interim results
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("🚨 Speech recognition error:", event.error);
      
      // Clear any pending timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      setIsRecording(false);
      
      // Auto-restart on certain errors (like network issues)
      if (event.error === 'network' || event.error === 'service-not-allowed') {
        setTimeout(() => {
          if (!isManualStopRef.current) {
            startRecording();
          }
        }, 2000);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (recognitionRef.current) {
        isManualStopRef.current = false;
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error("❌ Microphone access denied:", error);
      alert("Microphone access is required for speech recognition");
    }
  }, []);

  const stopRecording = useCallback(() => {
    isManualStopRef.current = true;
    
    // Clear any pending silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      isManualStopRef.current = true;
    };
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