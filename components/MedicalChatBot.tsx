
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, ChevronDown, Sparkles, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import { sendChatMessage, validateApiKey } from '../services/gemini';
import { Medication } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  disableAnimation?: boolean; // Prevents re-typing on reload/history
}

interface Props {
  medications?: Medication[];
}

const SUGGESTIONS = [
  "What foods should I avoid with antibiotics?",
  "Common side effects of Metformin?",
  "How to lower blood pressure naturally?",
  "Can I take Ibuprofen with Aspirin?"
];

const STORAGE_KEY = 'medscript_chat_context_v2';

// --- Sub-Components ---

// 1. Message Content Renderer (Handles Bold, Lists, Headers, etc.)
const FormattedText = ({ text }: { text: string }) => {
  const lines = text.split('\n');

  const parseInline = (text: string) => {
    // Regex to capture bold (**text** or __text__), italic (*text* or _text_), and inline code (`text`)
    const parts = text.split(/(\*\*.+?\*\*|__.+?__|\*.+?\*|_.+?_|`{1,3}.+?`{1,3})/g);

    return parts.map((part, index) => {
      // Bold
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
        return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      // Italic
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        return <em key={index} className="italic text-slate-600 font-medium">{part.slice(1, -1)}</em>;
      }
      // Inline Code
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-teal-700 border border-slate-200">{part.replace(/`/g, '')}</code>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;

        // 1. Headers (### H3, ## H2, # H1)
        if (trimmed.startsWith('### ')) {
          return <h3 key={i} className="text-sm font-bold text-teal-700 mt-3 mb-1 uppercase tracking-wide border-b border-teal-50 pb-1">{parseInline(trimmed.substring(4))}</h3>;
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={i} className="text-base font-bold text-slate-800 mt-4 mb-2">{parseInline(trimmed.substring(3))}</h2>;
        }
        if (trimmed.startsWith('# ')) {
            return <h1 key={i} className="text-lg font-bold text-slate-900 mt-4 mb-2 border-b border-slate-100 pb-2">{parseInline(trimmed.substring(2))}</h1>;
        }

        // 2. Blockquotes (> quote)
        if (trimmed.startsWith('> ')) {
            return (
                <div key={i} className="border-l-4 border-teal-300 pl-3 py-1 my-2 italic text-slate-600 bg-slate-50 rounded-r text-sm">
                    {parseInline(trimmed.substring(2))}
                </div>
            );
        }

        // 3. Unordered Lists (* item or - item)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 items-start pl-2 group">
               <span className="mt-2 w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0 group-hover:bg-teal-500 transition-colors" />
               <div className="flex-1">{parseInline(trimmed.substring(2))}</div>
            </div>
          );
        }

        // 4. Ordered Lists (1. item)
        if (/^\d+\.\s/.test(trimmed)) {
            const dotIndex = trimmed.indexOf('.');
            const number = trimmed.substring(0, dotIndex + 1);
            const content = trimmed.substring(dotIndex + 1).trim();
            return (
                <div key={i} className="flex gap-2 items-start pl-1">
                    <span className="font-bold text-teal-600 min-w-[1.5rem] text-right mr-1 tabular-nums">{number}</span>
                    <div className="flex-1">{parseInline(content)}</div>
                </div>
            )
        }

        // 5. Standard Paragraph
        return <div key={i}>{parseInline(trimmed)}</div>;
      })}
    </div>
  );
};

// 2. Typing Effect for AI Response
const Typewriter = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText(''); 
    let index = 0;
    
    // Faster typing speed (8ms)
    const intervalId = setInterval(() => {
      index += Math.floor(Math.random() * 4) + 1; 
      if (index >= text.length) {
        setDisplayedText(text);
        clearInterval(intervalId);
        if (onComplete) onComplete();
        return;
      }
      setDisplayedText(text.slice(0, index));
    }, 8);

    return () => clearInterval(intervalId);
  }, [text]); 

  return <FormattedText text={displayedText} />;
};

// 3. Thinking Indicator
const ThinkingIndicator = () => (
  <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 pl-2">
    <div className="flex-none w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
        <Bot className="w-5 h-5 text-teal-600 animate-pulse" />
    </div>
    <div className="px-4 py-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 h-[46px]">
      <span className="text-xs font-medium text-slate-400 mr-1">Analyzing</span>
      <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></div>
    </div>
  </div>
);

// --- Main Component ---

export const MedicalChatBot: React.FC<Props> = ({ medications = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(SUGGESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: Message[] = JSON.parse(saved);
        // Mark all loaded messages as having animations disabled so they don't re-type
        const history = parsed.map(m => ({ ...m, disableAnimation: true }));
        setMessages(history);
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    }
  }, []);

  // Update suggestions based on medications
  useEffect(() => {
    if (medications.length > 0) {
      const uniqueNames = Array.from(new Set(medications.map(m => m.name).filter(Boolean)));
      const newSuggestions: string[] = [];
      
      if (uniqueNames.length === 1) {
         const name = uniqueNames[0];
         newSuggestions.push(`What are the side effects of ${name}?`);
         newSuggestions.push(`Best time to take ${name}?`);
         newSuggestions.push(`Foods to avoid with ${name}?`);
         newSuggestions.push(`Explain how ${name} works.`);
      } else if (uniqueNames.length > 1) {
         const med1 = uniqueNames[0];
         const med2 = uniqueNames[1];
         newSuggestions.push(`Any interactions between ${med1} and ${med2}?`);
         newSuggestions.push(`Side effects of ${med1}?`);
         newSuggestions.push(`Diet plan for my medications.`);
         newSuggestions.push(`General safety check for my cabinet.`);
      } else {
         setActiveSuggestions(SUGGESTIONS);
         return;
      }
      
      setActiveSuggestions(newSuggestions.slice(0, 4));
    } else {
      setActiveSuggestions(SUGGESTIONS);
    }
  }, [medications]);

  // Save to LocalStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      // When saving, we can mark them as disableAnimation: true for the next reload
      const toSave = messages.map(m => ({ ...m, disableAnimation: true }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  }, [messages]);

  // Scroll logic
  const scrollToBottom = () => {
    // Small delay to allow DOM to update
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, isLoading]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { 
        id: generateId(), 
        role: 'user', 
        text, 
        timestamp: Date.now(),
        disableAnimation: true 
    };

    if (!validateApiKey()) {
        const errorMsg: Message = {
            id: generateId(),
            role: 'model',
            text: '**System Error:** API Key is missing. Please check your configuration.',
            timestamp: Date.now(),
            disableAnimation: false
        };
        setMessages(prev => [...prev, userMsg, errorMsg]);
        return;
    }

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Include current medications in context if available
      let contextPrompt = text;
      if (medications.length > 0) {
          const medList = medications.map(m => `${m.name} (${m.dosage || 'N/A'})`).join(', ');
          contextPrompt = `[Current Patient Medications: ${medList}] ${text}`;
      }

      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const responseText = await sendChatMessage(contextPrompt, history);
      
      const aiMsg: Message = {
          id: generateId(),
          role: 'model',
          text: responseText,
          timestamp: Date.now(),
          disableAnimation: false // Allow typing for new message
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: Message = {
          id: generateId(),
          role: 'model',
          text: "I'm having trouble connecting right now. Please try again.",
          timestamp: Date.now(),
          disableAnimation: false
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setIsLoading(false);
    // Suggestion bubbles will reappear automatically because messages.length === 0
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end font-sans pointer-events-none">
      
      {/* Chat Window - Always rendered but toggled via CSS for smooth animation */}
      <div 
        className={`
            bg-slate-50/95 backdrop-blur-md w-[90vw] sm:w-[400px] h-[600px] max-h-[80vh] rounded-2xl shadow-2xl border border-white/50 flex flex-col mb-4 overflow-hidden ring-1 ring-slate-900/5 origin-bottom-right
            transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isOpen 
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto visible' 
                : 'opacity-0 scale-95 translate-y-10 pointer-events-none invisible'}
        `}
      >
          
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-700 p-4 flex items-center justify-between text-white flex-none shadow-lg z-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">MedScript AI</h3>
                <div className="flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
                   <p className="text-[10px] text-teal-100 font-medium opacity-90">Assistant Online</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 relative z-10">
                <button 
                  onClick={handleClearChat}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-teal-100 hover:text-white"
                  title="Clear Conversation History"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-teal-100 hover:text-white"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
            </div>
          </div>

          {/* Messages Area */}
          <div 
             ref={chatContainerRef}
             className="flex-1 overflow-y-auto p-4 space-y-6 relative bg-gradient-to-b from-slate-50 to-white scroll-smooth"
          >
            {/* Zero State */}
            {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-indigo-100 rounded-full flex items-center justify-center shadow-sm">
                        <Sparkles className="w-8 h-8 text-teal-600" />
                    </div>
                    <div className="max-w-[80%]">
                        <h3 className="text-slate-900 font-bold text-lg mb-1">How can I help you?</h3>
                        <p className="text-slate-500 text-sm">
                           {medications.length > 0 
                             ? "Ask specific questions about your scanned medications." 
                             : "Ask about interactions, side effects, or general wellness advice."}
                        </p>
                    </div>
                    <div className="grid gap-2 w-full px-4">
                        {activeSuggestions.map((s, i) => (
                            <button 
                                key={i}
                                onClick={() => handleSendMessage(s)}
                                className="text-left px-4 py-3 bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md hover:bg-teal-50 rounded-xl text-sm text-slate-700 transition-all duration-200 group flex justify-between items-center"
                            >
                                <span className="line-clamp-1">{s}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat History */}
            {messages.map((msg, idx) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
              >
                {msg.role === 'model' && (
                  <div className="flex-none w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm mt-1">
                    <Bot className="w-4 h-4 text-teal-600" />
                  </div>
                )}

                <div 
                  className={`max-w-[85%] p-4 text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'model' && !msg.disableAnimation ? (
                    <Typewriter 
                        text={msg.text} 
                        // Once typing is done, we could theoretically update state to disableAnimation: true
                        // but simply leaving it is fine since we persist to LS with disableAnimation: true
                        onComplete={scrollToBottom}
                    />
                  ) : msg.role === 'user' ? (
                     <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <FormattedText text={msg.text} />
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && <ThinkingIndicator />}
            
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 flex gap-2 flex-none relative z-10">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your health question..."
              className="flex-1 px-5 py-3 bg-slate-100/50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none placeholder-slate-400 transition-all shadow-inner"
            />
            <button 
              type="submit" 
              disabled={isLoading || !inputText.trim()}
              className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg shadow-teal-500/30 flex items-center justify-center aspect-square"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>
          
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
             <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                AI can make mistakes. Consult a doctor for medical decisions.
             </p>
          </div>
      </div>

      {/* Toggle Button */}
      <button
        id="chatbot-fab"
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center relative group z-50
          ${isOpen ? 'bg-white text-slate-600 border border-slate-200 rotate-90' : 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white rotate-0'}
        `}
      >
        {!isOpen && (
            <div className="absolute inset-0 rounded-full bg-teal-400 blur-lg opacity-40 group-hover:opacity-60 transition-opacity animate-pulse"></div>
        )}

        <div className="relative z-10">
            {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </div>
        
        {/* Notification Badge */}
        {!isOpen && messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-bounce shadow-sm z-20"></span>
        )}
      </button>
    </div>
  );
};
