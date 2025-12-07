import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, ChevronDown } from 'lucide-react';
import { sendChatMessage, validateApiKey } from '../services/gemini';

interface Message {
  role: 'user' | 'model';
  text: string;
}

// Helper to render text with bold formatting and newlines
const renderMessageContent = (text: string) => {
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-bold text-teal-800">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
      {i < text.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
};

// Component for typing effect
const Typewriter = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText(''); 
    let index = 0;
    const intervalId = setInterval(() => {
      index++;
      if (index > text.length) {
        clearInterval(intervalId);
        return;
      }
      setDisplayedText(text.slice(0, index));
    }, 10); // Faster typing speed (10ms)

    return () => clearInterval(intervalId);
  }, [text]);

  return <>{renderMessageContent(displayedText)}</>;
};

// Component for Thinking State (Bouncing Dots)
const ThinkingIndicator = () => (
  <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="flex-none w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-[0_0_10px_rgba(20,184,166,0.5)]">
        <Bot className="w-5 h-5 text-white" />
    </div>
    <div className="px-4 py-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm w-fit flex items-center gap-1 h-[46px]">
      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
    </div>
  </div>
);

export const MedicalChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am MedScript Assistant. How can I help you with your health questions today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    if (!validateApiKey()) {
        setMessages(prev => [...prev, { role: 'model', text: 'System Error: API Key is missing. Please check your configuration.' }]);
        return;
    }

    const userMessage = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Pass history excluding the very last user message which is sent as current
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const responseText = await sendChatMessage(userMessage, history);
      
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto bg-slate-50 w-80 sm:w-96 h-[550px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-4 flex items-center justify-between text-white flex-none shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-full backdrop-blur-sm border border-white/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">MedScript AI</h3>
                <p className="text-[10px] text-teal-100 flex items-center gap-1.5 opacity-90">
                   <span className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_5px_rgba(74,222,128,0.8)]"></span>
                   Online
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Bot Icon */}
                {msg.role === 'model' && (
                  <div className="flex-none w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-[0_0_10px_rgba(20,184,166,0.4)] mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}

                <div 
                  className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-teal-600 text-white rounded-br-none' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                  }`}
                >
                  {msg.role === 'model' && idx === messages.length - 1 && !isLoading ? (
                    <Typewriter text={msg.text} />
                  ) : (
                    renderMessageContent(msg.text)
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && <ThinkingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-100 flex gap-2 flex-none relative z-10">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a health question..."
              className="flex-1 px-4 py-2.5 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-slate-400 transition-shadow"
            />
            <button 
              type="submit" 
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          
          <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 text-center">
             <p className="text-[10px] text-slate-400 font-medium">AI can make mistakes. Please consult a doctor.</p>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto p-4 rounded-full shadow-lg shadow-teal-900/20 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center relative
          ${isOpen ? 'bg-white text-slate-600 border border-slate-200' : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'}
        `}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
        
        {!isOpen && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>
    </div>
  );
};