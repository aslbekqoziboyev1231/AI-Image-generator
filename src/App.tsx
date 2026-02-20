/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  Download, 
  Image as ImageIcon, 
  Loader2, 
  History, 
  Trash2, 
  Maximize2,
  ChevronRight,
  Layout,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  timestamp: number;
}

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', icon: Square },
  { id: '16:9', label: 'Landscape', icon: RectangleHorizontal },
  { id: '9:16', label: 'Portrait', icon: RectangleVertical },
  { id: '4:3', label: 'Classic', icon: Layout },
];

const SAMPLE_PROMPTS = [
  "A futuristic city with neon lights and flying cars, digital art style",
  "A cozy cabin in the woods during a snowy winter night, oil painting",
  "Cyberpunk samurai in a rainy Tokyo street, cinematic lighting",
  "A majestic dragon perched on a mountain peak, fantasy illustration",
  "Minimalist abstract landscape with soft pastel colors",
  "A cute robot cat drinking coffee in a space station",
  "Surreal underwater world with glowing jellyfish and coral reefs",
];

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('lumina_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('lumina_history', JSON.stringify(history));
  }, [history]);

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
          },
        },
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          imageUrl = `data:image/png;base64,${base64Data}`;
          break;
        }
      }

      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: Math.random().toString(36).substring(7),
          url: imageUrl,
          prompt: prompt,
          aspectRatio: aspectRatio,
          timestamp: Date.now(),
        };
        setCurrentImage(newImage);
        setHistory(prev => [newImage, ...prev].slice(0, 50)); // Keep last 50
      } else {
        throw new Error("No image was generated. Please try a different prompt.");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `lumina-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteFromHistory = (id: string) => {
    setHistory(prev => prev.filter(img => img.id !== id));
    if (currentImage?.id === id) setCurrentImage(null);
  };

  const surpriseMe = () => {
    const randomPrompt = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
    setPrompt(randomPrompt);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Lumina</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors relative"
            title="History"
          >
            <History className="w-5 h-5" />
            {history.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full border-2 border-white" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
        {/* Left Column: Preview & Results */}
        <section className="space-y-8">
          <div className="relative aspect-square lg:aspect-auto lg:h-[600px] bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden flex items-center justify-center group">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-black/20" />
                    <Sparkles className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-black/40 animate-pulse">Dreaming up your masterpiece...</p>
                </motion.div>
              ) : currentImage ? (
                <motion.div 
                  key="image"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative w-full h-full flex items-center justify-center p-4"
                >
                  <img 
                    src={currentImage.url} 
                    alt={currentImage.prompt}
                    className={cn(
                      "max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]",
                      currentImage.aspectRatio === '1:1' && 'aspect-square',
                      currentImage.aspectRatio === '16:9' && 'aspect-video',
                      currentImage.aspectRatio === '9:16' && 'aspect-[9/16]',
                    )}
                  />
                  
                  {/* Image Actions Overlay */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                      onClick={() => downloadImage(currentImage)}
                      className="bg-white text-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-black hover:text-white transition-all active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button 
                      onClick={() => window.open(currentImage.url, '_blank')}
                      className="bg-white/90 backdrop-blur text-black p-2 rounded-full shadow-lg hover:bg-white transition-all active:scale-95"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-4 px-12"
                >
                  <div className="w-16 h-16 bg-black/5 rounded-2xl flex items-center justify-center mx-auto">
                    <ImageIcon className="w-8 h-8 text-black/20" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Ready to create?</h3>
                    <p className="text-sm text-black/40 max-w-xs mx-auto">
                      Enter a prompt on the right to start generating unique AI images.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-bold">!</span>
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Prompt Display (if image exists) */}
          {currentImage && !isGenerating && (
            <div className="bg-white p-6 rounded-2xl border border-black/5 space-y-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-black/30">Prompt</span>
              <p className="text-sm leading-relaxed text-black/70 italic">"{currentImage.prompt}"</p>
            </div>
          )}
        </section>

        {/* Right Column: Controls */}
        <aside className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Describe your vision</label>
                <button 
                  onClick={surpriseMe}
                  className="text-[11px] font-bold uppercase tracking-wider text-black/40 hover:text-black transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Surprise Me
                </button>
              </div>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic city with neon lights..."
                className="w-full h-32 bg-white border border-black/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none placeholder:text-black/20"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((ratio) => {
                  const Icon = ratio.icon;
                  return (
                    <button
                      key={ratio.id}
                      onClick={() => setAspectRatio(ratio.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        aspectRatio === ratio.id 
                          ? "bg-black border-black text-white shadow-md" 
                          : "bg-white border-black/5 text-black/60 hover:border-black/20"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{ratio.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={generateImage}
              disabled={isGenerating || !prompt.trim()}
              className={cn(
                "w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                isGenerating || !prompt.trim()
                  ? "bg-black/5 text-black/20 cursor-not-allowed"
                  : "bg-black text-white shadow-xl shadow-black/10 hover:shadow-black/20 hover:-translate-y-0.5"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Image
                </>
              )}
            </button>
          </div>

          {/* History Sidebar/Overlay */}
          <AnimatePresence>
            {showHistory && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-black/5 z-[60] flex flex-col"
              >
                <div className="p-6 border-b border-black/5 flex items-center justify-between">
                  <h2 className="font-semibold">Recent Creations</h2>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="p-1 hover:bg-black/5 rounded-full"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                      <History className="w-12 h-12 mb-2" />
                      <p className="text-sm">No history yet</p>
                    </div>
                  ) : (
                    history.map((img) => (
                      <div 
                        key={img.id} 
                        className="group relative bg-black/5 rounded-xl overflow-hidden cursor-pointer"
                        onClick={() => {
                          setCurrentImage(img);
                          setPrompt(img.prompt);
                          setAspectRatio(img.aspectRatio);
                        }}
                      >
                        <img 
                          src={img.url} 
                          alt={img.prompt}
                          className="w-full aspect-square object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(img);
                            }}
                            className="p-2 bg-white rounded-full hover:scale-110 transition-transform"
                          >
                            <Download className="w-4 h-4 text-black" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFromHistory(img.id);
                            }}
                            className="p-2 bg-white rounded-full hover:scale-110 transition-transform"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-black/30 font-medium tracking-wide uppercase">
          Powered by Gemini 2.5 Flash Image
        </p>
        <div className="flex items-center gap-6">
          <a href="#" className="text-xs text-black/40 hover:text-black transition-colors">Terms</a>
          <a href="#" className="text-xs text-black/40 hover:text-black transition-colors">Privacy</a>
          <a href="#" className="text-xs text-black/40 hover:text-black transition-colors">API Status</a>
        </div>
      </footer>
    </div>
  );
}
