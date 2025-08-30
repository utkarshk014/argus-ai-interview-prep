"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Users,
} from "lucide-react";
import { StreamVideo, StreamCall } from "@stream-io/video-react-sdk";
import { useGeminiSimple } from "../hooks/useGeminiSimple";
import { useStreamVideo } from "../hooks/useStreamVideo";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

const InterviewRoom: React.FC = () => {
  const [isMeetingStarted, setIsMeetingStarted] = useState(false);

  // Hooks
  const gemini = useGeminiSimple();
  const stream = useStreamVideo();
  const speech = useSpeechRecognition();

  // Auto-send speech to AI when user stops talking
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

  const startMeeting = async () => {
    try {
      setIsMeetingStarted(true);

      // Start video call
      await stream.startCall();

      // Connect to AI
      await gemini.connect();

      // Start speech recognition
      await speech.startRecording();

      console.log("🚀 Meeting started successfully!");
    } catch (error) {
      console.error("❌ Failed to start meeting:", error);
      setIsMeetingStarted(false);
    }
  };

  const endMeeting = async () => {
    try {
      setIsMeetingStarted(false);

      // Stop everything
      speech.stopRecording();
      gemini.disconnect();
      await stream.endCall();

      console.log("✋ Meeting ended");
    } catch (error) {
      console.error("❌ Failed to end meeting:", error);
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
            Start a voice conversation with an AI interviewer. Speak naturally
            and get real-time feedback on your responses.
          </p>

          <button
            onClick={startMeeting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center gap-3 mx-auto"
          >
            <Video className="w-6 h-6" />
            Start AI Interview
          </button>

          <div className="mt-6 text-sm text-gray-500">
            <p>✅ Voice recognition ready</p>
            <p>✅ AI interviewer ready</p>
            <p>✅ Video meeting ready</p>
          </div>
        </div>
      </div>
    );
  }

  // Meeting in progress
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">AI Interview Session</h1>
          <div className="flex items-center gap-4">
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                gemini.isConnected
                  ? "bg-green-900 text-green-300"
                  : "bg-red-900 text-red-300"
              }`}
            >
              {gemini.isConnected ? "🤖 AI Connected" : "🤖 AI Disconnected"}
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                stream.isCallActive
                  ? "bg-green-900 text-green-300"
                  : "bg-red-900 text-red-300"
              }`}
            >
              {stream.isCallActive ? "📹 Call Active" : "📹 Call Inactive"}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 h-screen">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-gray-800 m-4 rounded-lg overflow-hidden">
            {stream.client && stream.call ? (
              <StreamVideo client={stream.client}>
                <StreamCall call={stream.call}>
                  <div className="h-full flex items-center justify-center bg-gray-700 relative">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-300">Video Stream Active</p>
                      <div className="mt-4">
                        {gemini.isAISpeaking && (
                          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-blue-300">
                              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                              AI is speaking...
                            </div>
                            {gemini.aiResponse && (
                              <p className="text-sm text-gray-300 mt-2">
                                {gemini.aiResponse}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </StreamCall>
              </StreamVideo>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400">Connecting to video...</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-6 bg-gray-800 border-t border-gray-700">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={speech.toggleRecording}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  speech.isRecording
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {speech.isRecording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
                {speech.isRecording ? "Mute" : "Unmute"}
              </button>

              <button
                onClick={endMeeting}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                End Meeting
              </button>
            </div>

            {speech.isRecording && !gemini.isAISpeaking && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 text-green-400">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  Listening... You can speak now
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Sidebar */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold">Conversation</h2>
            <p className="text-sm text-gray-400 mt-1">
              Live transcript of your interview
            </p>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-3">
              {speech.transcript
                .split("\n")
                .filter((line) => line.trim())
                .map((line, index) => (
                  <div
                    key={index}
                    className="bg-blue-900/20 border-l-4 border-blue-500 p-3 rounded"
                  >
                    <div className="text-xs text-blue-300 mb-1">You said:</div>
                    <div className="text-sm text-white">
                      {line.replace(/\[\d+:\d+:\d+\s*[APM]*\]\s*/, "")}
                    </div>
                  </div>
                ))}

              {gemini.aiResponse && (
                <div className="bg-green-900/20 border-l-4 border-green-500 p-3 rounded">
                  <div className="text-xs text-green-300 mb-1">
                    AI Response:
                  </div>
                  <div className="text-sm text-white">{gemini.aiResponse}</div>
                </div>
              )}

              {speech.interimTranscript && (
                <div className="bg-gray-700 border-l-4 border-gray-500 p-3 rounded opacity-70">
                  <div className="text-xs text-gray-400 mb-1">Listening...</div>
                  <div className="text-sm text-gray-300 italic">
                    {speech.interimTranscript}...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
