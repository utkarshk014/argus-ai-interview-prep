'use client';

import { useState, useCallback, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface UseGeminiSimpleReturn {
  isConnected: boolean;
  isAISpeaking: boolean;
  isProcessing: boolean;
  aiResponse: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: string) => Promise<void>;
}

export const useGeminiSimple = (): UseGeminiSimpleReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [genAI, setGenAI] = useState<GoogleGenerativeAI | null>(null);
  const [model, setModel] = useState<any>(null);
  const [chat, setChat] = useState<any>(null);
  
  // Refs to manage audio cleanup
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const connect = useCallback(async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not found');
      }

      // Initialize Gemini AI
      const ai = new GoogleGenerativeAI(apiKey);
      const geminiModel = ai.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: "You are a friendly AI interview assistant. Keep responses concise and natural. Always be encouraging and helpful."
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
      console.log('Connected to Gemini');

      // Send initial greeting
      setTimeout(() => {
        sendInitialGreeting(chatSession);
      }, 500);

    } catch (error) {
      console.error('Failed to connect to Gemini:', error);
      setIsConnected(false);
    }
  }, []);

  const sendInitialGreeting = useCallback(async (chatSession: any) => {
    try {
      setIsProcessing(true);
      const result = await chatSession.sendMessage("Please greet me and ask how you can help with interview preparation today. Keep it brief and friendly.");
      const response = result.response;
      const text = response.text();
      
      setAiResponse(text);
      console.log('AI:', text);
      
      setIsProcessing(false);
      
      // Convert to speech and play
      await speakText(text);
      
    } catch (error) {
      console.error('Error sending initial greeting:', error);
      setIsProcessing(false);
      setIsAISpeaking(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!chat) {
      console.error('Not connected to Gemini');
      return;
    }

    try {
      // Stop any current audio immediately
      stopCurrentAudio();
      
      setIsProcessing(true);
      setIsAISpeaking(false);
      setAiResponse('Thinking...');
      
      console.log('Sending to Gemini:', message);
      
      const result = await chat.sendMessage(message);
      const response = result.response;
      const text = response.text();
      
      setAiResponse(text);
      console.log('AI Response:', text);
      
      setIsProcessing(false);
      
      // Convert to speech and play
      await speakText(text);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsProcessing(false);
      setIsAISpeaking(false);
      setAiResponse('Sorry, I encountered an error. Please try again.');
    }
  }, [chat]);

  // Function to stop any current audio
  const stopCurrentAudio = useCallback(() => {
    // Stop ElevenLabs audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    // Stop browser TTS
    if (currentUtteranceRef.current) {
      speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    }
    
    setIsAISpeaking(false);
  }, []);

  const speakText = useCallback(async (text: string) => {
    try {
      // Stop any current audio first
      stopCurrentAudio();

      const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
      
      // Try ElevenLabs first
      if (apiKey) {
        try {
          console.log('Using ElevenLabs TTS');
          
          const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': apiKey,
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.6,
                similarity_boost: 0.8,
                style: 0.2,
                use_speaker_boost: true
              },
            }),
          });

          if (!response.ok) {
            if (response.status === 401) {
              console.warn('ElevenLabs API key invalid, falling back to browser TTS');
            } else if (response.status === 402) {
              console.warn('ElevenLabs quota exceeded, falling back to browser TTS');
            } else {
              console.warn(`ElevenLabs API error ${response.status}, falling back to browser TTS`);
            }
            throw new Error(`ElevenLabs API error: ${response.status}`);
          }

          // Convert response to audio blob
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          // Store reference for cleanup
          currentAudioRef.current = audio;

          // Set playback rate for better pacing
          audio.playbackRate = 0.95; // Slightly slower for better clarity

          audio.oncanplaythrough = () => {
            console.log('AI started speaking with ElevenLabs');
            setIsAISpeaking(true);
          };

          audio.onended = () => {
            console.log('AI finished speaking');
            setIsAISpeaking(false);
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
          };

          audio.onerror = (error) => {
            console.error('Audio playback error:', error);
            setIsAISpeaking(false);
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            // Fallback to browser TTS
            speakWithBrowserTTS(text);
          };

          // Play the audio
          await audio.play();
          return; // Success, exit function

        } catch (elevenLabsError) {
          console.warn('ElevenLabs failed, using browser TTS:', elevenLabsError);
          // Fall through to browser TTS
        }
      }

      // Fallback to browser TTS
      speakWithBrowserTTS(text);

    } catch (error) {
      console.error('Error in text-to-speech:', error);
      setIsAISpeaking(false);
    }
  }, [stopCurrentAudio]);

  // Fallback browser TTS function
  const speakWithBrowserTTS = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      setIsAISpeaking(false);
      return;
    }

    console.log('Using browser TTS');
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtteranceRef.current = utterance;
    
    // Configure voice settings for better quality
    utterance.rate = 0.85; // Slower for better clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to use the best available voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Enhanced') ||
      voice.name.includes('Premium') ||
      (voice.lang.startsWith('en-') && voice.name.includes('Female'))
    ) || voices.find(voice => voice.lang.startsWith('en-'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      console.log('AI started speaking with browser TTS');
      setIsAISpeaking(true);
    };

    utterance.onend = () => {
      console.log('AI finished speaking');
      setIsAISpeaking(false);
      currentUtteranceRef.current = null;
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      setIsAISpeaking(false);
      currentUtteranceRef.current = null;
    };

    speechSynthesis.speak(utterance);
  }, []);

  const disconnect = useCallback(() => {
    // Stop any current audio
    stopCurrentAudio();
    
    setGenAI(null);
    setModel(null);
    setChat(null);
    setIsConnected(false);
    setIsAISpeaking(false);
    setAiResponse('');
    console.log('Disconnected from Gemini');
  }, [stopCurrentAudio]);

  return {
    isConnected,
    isAISpeaking,
    isProcessing,
    aiResponse,
    connect,
    disconnect,
    sendMessage,
  };
};