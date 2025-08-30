'use client';

import React from 'react';
import { Mic, MicOff, Users, Video, Settings } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const InterviewRoom: React.FC = () => {
  const {
    isRecording,
    transcript,
    interimTranscript,
    isSupported,
    toggleRecording,
    clearTranscript,
  } = useSpeechRecognition();

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <strong className="font-bold">Not Supported!</strong>
          <span className="block sm:inline"> 
            Speech recognition is not supported in this browser. Try Chrome or Edge.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Interview Practice Room
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>🟢 Next.js Environment</span>
            <Settings className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 h-screen">
        {/* Video/Meeting Area */}
        <div className="flex-1 flex flex-col">
          {/* Mock Video Area */}
          <div className="flex-1 bg-gray-800 m-4 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Interview Environment</p>
              <p className="text-sm text-gray-500">Future: AI Interviewer video/avatar will appear here</p>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 bg-gray-800 border-t border-gray-700">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
              
              <button
                onClick={clearTranscript}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Clear Transcript
              </button>
            </div>
            
            {isRecording && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 text-red-400">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  Recording... Speak now
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transcript Sidebar */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold">Live Transcript</h2>
            <p className="text-sm text-gray-400 mt-1">
              Speech recognition output (also logged to console)
            </p>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            {transcript || interimTranscript ? (
              <div className="space-y-2">
                {transcript.split('\n').filter(line => line.trim()).map((line, index) => (
                  <div key={index} className="text-sm bg-gray-700 p-2 rounded">
                    {line}
                  </div>
                ))}
                {interimTranscript && (
                  <div className="text-sm text-gray-400 italic p-2 border-l-2 border-blue-500">
                    {interimTranscript}...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm text-center mt-8">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No speech detected yet.
                <br />
                Click &quot;Start Recording&quot; to begin.
              </div>
            )}
          </div>
          
          {/* Future Integration Placeholder */}
          <div className="p-4 bg-gray-900 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              🚀 Future integrations:
              <br />• ASR: Web Speech API ✅
              <br />• LLM: OpenAI/Anthropic API
              <br />• TTS: Speech Synthesis API
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;