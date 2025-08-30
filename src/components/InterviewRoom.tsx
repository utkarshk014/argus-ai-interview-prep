"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  PhoneOff,
  Users,
  Bot,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { StreamVideo, StreamCall } from "@stream-io/video-react-sdk";
import { useGeminiSimple } from "../hooks/useGeminiSimple";
import { useStreamVideo } from "../hooks/useStreamVideo";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

const InterviewRoom: React.FC = () => {
  const [isMeetingStarted, setIsMeetingStarted] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<string>("");

  // Hooks
  const gemini = useGeminiSimple();
  const stream = useStreamVideo();
  const speech = useSpeechRecognition();

  // Stop microphone when AI is speaking to prevent feedback
  useEffect(() => {
    if (gemini.isAISpeaking && speech.isRecording) {
      console.log("Muting microphone - AI is speaking");
      speech.stopRecording();
    }
  }, [gemini.isAISpeaking]);

  // Resume microphone when AI stops speaking
  useEffect(() => {
    if (
      !gemini.isAISpeaking &&
      isMeetingStarted &&
      !speech.isRecording &&
      isSetupComplete
    ) {
      console.log("Resuming microphone - AI finished speaking");
      setTimeout(() => {
        speech.startRecording().catch(console.error);
      }, 500);
    }
  }, [gemini.isAISpeaking, isMeetingStarted, isSetupComplete]);

  // Original logic for processing user input
  useEffect(() => {
    if (
      !speech.isRecording &&
      speech.transcript &&
      isMeetingStarted &&
      gemini.isConnected
    ) {
      const lastMessage = speech.transcript.split("\n").pop();
      if (lastMessage && lastMessage.trim()) {
        const cleanMessage = lastMessage
          .replace(/\[\d+:\d+:\d+\s*[APM]*\]\s*/, "")
          .trim();
        if (cleanMessage) {
          gemini.sendMessage(cleanMessage);
        }
      }
    }
  }, [
    speech.isRecording,
    speech.transcript,
    isMeetingStarted,
    gemini.isConnected,
  ]);

  // Check when setup is complete
  useEffect(() => {
    if (
      isMeetingStarted &&
      stream.isCallActive &&
      gemini.isConnected &&
      !gemini.isAISpeaking &&
      !gemini.isProcessing
    ) {
      setIsSetupComplete(true);
    }
  }, [
    isMeetingStarted,
    stream.isCallActive,
    gemini.isConnected,
    gemini.isAISpeaking,
    gemini.isProcessing,
  ]);

  const startMeeting = async () => {
    try {
      setIsMeetingStarted(true);
      setSetupError(null);

      setSetupStatus("Starting video call...");
      await stream.startCall();

      setSetupStatus("Connecting to AI...");
      await gemini.connect();

      setSetupStatus("Setting up microphone...");
      await speech.startRecording();

      setSetupStatus("AI is greeting you...");
      console.log("Meeting started successfully!");
    } catch (error: any) {
      console.error("Failed to start meeting:", error);

      // Handle specific errors
      if (error.message?.includes("quota") || error.message?.includes("429")) {
        setSetupError(
          "Gemini API quota exceeded. Please try again tomorrow or upgrade your plan."
        );
      } else if (error.message?.includes("Microphone")) {
        setSetupError(
          "Microphone permission required. Please allow microphone access and try again."
        );
      } else {
        setSetupError(
          "Failed to start meeting. Please check your internet connection and try again."
        );
      }

      setIsMeetingStarted(false);
      setIsSetupComplete(false);
    }
  };

  const endMeeting = async () => {
    try {
      setIsMeetingStarted(false);
      setIsSetupComplete(false);
      speech.stopRecording();
      gemini.disconnect();
      await stream.endCall();
      console.log("Meeting ended");
    } catch (error) {
      console.error("Failed to end meeting:", error);
    }
  };

  // Pre-meeting state
  if (!isMeetingStarted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <Users className="w-16 h-16 text-blue-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">AI Interview Practice</h1>
          <p className="text-gray-400 mb-8">
            Start a voice conversation with an AI interviewer.
          </p>

          {setupError && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-300 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Setup Error</span>
              </div>
              <p className="text-sm text-red-200">{setupError}</p>
            </div>
          )}

          <button
            onClick={startMeeting}
            disabled={!!setupError}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center gap-3 mx-auto"
          >
            <Video className="w-6 h-6" />
            Start AI Interview
          </button>
        </div>
      </div>
    );
  }

  // Loading state - blurred/loading screen
  if (!isSetupComplete) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">AI Interview Session</h1>
            <button
              onClick={endMeeting}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </header>

        {/* Loading overlay */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">
              Setting up your interview...
            </h2>
            <p className="text-gray-400 mb-6">{setupStatus}</p>

            <div className="space-y-2 text-sm text-gray-500">
              <div
                className={`flex items-center justify-center gap-2 ${
                  stream.isCallActive ? "text-green-400" : ""
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    stream.isCallActive ? "bg-green-500" : "bg-gray-500"
                  }`}
                ></div>
                Video connection{" "}
                {stream.isCallActive ? "ready" : "connecting..."}
              </div>
              <div
                className={`flex items-center justify-center gap-2 ${
                  gemini.isConnected ? "text-green-400" : ""
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    gemini.isConnected ? "bg-green-500" : "bg-gray-500"
                  }`}
                ></div>
                AI interviewer {gemini.isConnected ? "ready" : "connecting..."}
              </div>
              <div
                className={`flex items-center justify-center gap-2 ${
                  speech.isSupported ? "text-green-400" : ""
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    speech.isSupported ? "bg-green-500" : "bg-gray-500"
                  }`}
                ></div>
                Speech recognition{" "}
                {speech.isSupported ? "ready" : "checking..."}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Meeting in progress - Two video windows side by side
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">AI Interview Session</h1>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full text-xs bg-green-900 text-green-300">
              Live
            </div>
          </div>
        </div>
      </header>

      {/* Main Video Area - Two windows side by side */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 gap-6 h-full max-w-6xl mx-auto">
          {/* User Video Window */}
          <div
            className={`bg-gray-800 rounded-lg overflow-hidden relative ${
              speech.isRecording && !gemini.isAISpeaking
                ? "ring-4 ring-green-500 shadow-lg shadow-green-500/50"
                : ""
            }`}
          >
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-700">
              {stream.client && stream.call ? (
                <StreamVideo client={stream.client}>
                  <StreamCall call={stream.call}>
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-16 h-16 text-gray-400" />
                    </div>
                  </StreamCall>
                </StreamVideo>
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <Video className="w-16 h-16 mb-2" />
                  <span className="text-sm">You</span>
                </div>
              )}
            </div>

            {/* User info overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/60 rounded-lg px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">You</span>
                </div>
                <div className="flex items-center gap-2">
                  {speech.isRecording ? (
                    <div className="flex items-center gap-1 text-green-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <Mic className="w-4 h-4" />
                    </div>
                  ) : (
                    <MicOff className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Video Window */}
          <div
            className={`bg-gray-800 rounded-lg overflow-hidden relative ${
              gemini.isAISpeaking
                ? "ring-4 ring-blue-500 shadow-lg shadow-blue-500/50"
                : ""
            }`}
          >
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-900/30 to-purple-900/30 relative">
              <div className="text-center">
                <Bot className="w-20 h-20 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-blue-300">
                  AI Interviewer
                </h3>
              </div>
            </div>

            {/* AI info overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/60 rounded-lg px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium">AI Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  {gemini.isAISpeaking ? (
                    <div className="flex items-center gap-1 text-blue-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs">Speaking</span>
                    </div>
                  ) : gemini.isProcessing ? (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-xs">Thinking</span>
                    </div>
                  ) : (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center gap-4">
          {/* <button
            onClick={speech.toggleRecording}
            className={`p-4 rounded-full transition-all ${
              speech.isRecording
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {speech.isRecording ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </button> */}

          <button
            onClick={endMeeting}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center mt-3 text-sm text-gray-400">
          {speech.isRecording && !gemini.isAISpeaking ? (
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Listening...
            </div>
          ) : gemini.isAISpeaking ? (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              AI is speaking
            </div>
          ) : gemini.isProcessing ? (
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              AI is thinking...
            </div>
          ) : (
            <span>Ready</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
