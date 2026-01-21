import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Send, User, Loader2, Image as ImageIcon, X, Sparkles, History, ZoomIn } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getUser } from '@/lib/auth';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  isTyping?: boolean;
  images?: Array<{
    url: string;
    filename: string;
    label?: string;
    date?: string;
  }>;
  intent?: string;
}

interface ChatInterfaceProps {
  currentScanId?: string | null;
  historicalScanId?: string | null;
  historicalScanData?: {
    id: string;
    title: string;
    date: string;
    finding: string;
  } | null;
  onClearHistoricalScan?: () => void;
}

const API_BASE = 'http://localhost:8000';

const welcomeMessage = `## 👋 Welcome to Radiology-RAG Assistant

I can help you with:

1. **🔬 Diagnose Scans** - Upload a scan and ask me to analyze it
2. **📋 Fetch History** - Ask for your previous scans (e.g., "Show my lung scan from last year")
3. **📊 Compare Scans** - Compare your current scan with historical ones

**Try asking:**
- *"Analyze this scan and provide findings"*
- *"Fetch my previous chest X-ray"*
- *"Compare this scan with my previous one"*

---
*Upload a scan using the left panel to get started.*`;

const ChatInterface = ({ 
  currentScanId, 
  historicalScanId, 
  historicalScanData,
  onClearHistoricalScan 
}: ChatInterfaceProps) => {
  const user = getUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (!isInitialized) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
      }]);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Load chat history when historical scan is selected
  useEffect(() => {
    if (historicalScanId && user) {
      loadChatHistory(historicalScanId);
    }
  }, [historicalScanId, user?.patientId]);

  const loadChatHistory = async (scanId: string) => {
    try {
      const response = await fetch(`${API_BASE}/get-chat-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user?.patientId,
          scan_id: scanId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else if (historicalScanData) {
          // Start fresh chat context for this historical scan
          setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: `## 📂 Viewing: ${historicalScanData.title}

**Date:** ${historicalScanData.date}  
**Findings:** ${historicalScanData.finding}

---
You can now ask questions about this scan or compare it with your current scan.`,
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const saveChatHistory = async (scanId: string, messagesData: Message[]) => {
    try {
      await fetch(`${API_BASE}/save-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user?.patientId,
          scan_id: scanId,
          messages: messagesData.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            images: m.images,
            intent: m.intent
          }))
        })
      });
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-save chat when messages change
  useEffect(() => {
    const scanToSave = currentScanId || historicalScanId;
    if (scanToSave && messages.length > 1) {
      const timeoutId = setTimeout(() => {
        saveChatHistory(scanToSave, messages);
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, currentScanId, historicalScanId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user?.patientId || 'PID1',
          message: input,
          current_scan_id: currentScanId || null,
          scan_id: historicalScanId || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          images: data.images?.map((img: any) => ({
            url: `${API_BASE}${img.url}`,
            filename: img.filename,
            label: img.label,
            date: img.date
          })),
          intent: data.intent
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Chat request failed');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ I encountered an error processing your request. Please try again or check if the backend is running.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Card className="h-full flex flex-col border-border shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Brain className="h-4 w-4 text-primary" />
              AI Assistant
              {currentScanId && (
                <Badge variant="outline" className="ml-2 text-[10px] bg-primary/5">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  Scan Active
                </Badge>
              )}
            </CardTitle>
            
            {historicalScanData && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  <History className="h-2.5 w-2.5 mr-1" />
                  {historicalScanData.title} - {historicalScanData.date}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5"
                  onClick={onClearHistoricalScan}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    message.role === 'assistant' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {message.role === 'assistant' ? (
                      <Brain className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className={`flex-1 space-y-2 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {/* Intent badge */}
                    {message.intent && message.role === 'assistant' && (
                      <Badge variant="outline" className="text-[10px] mb-1">
                        {message.intent === 'diagnose' && '🔬 Diagnosis'}
                        {message.intent === 'fetch' && '📋 Fetch'}
                        {message.intent === 'compare' && '📊 Compare'}
                      </Badge>
                    )}
                    
                    <div className={`inline-block text-sm rounded-lg px-4 py-2 max-w-full ${
                      message.role === 'assistant'
                        ? 'bg-muted text-foreground text-left'
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                    
                    {/* Attached images */}
                    {message.images && message.images.length > 0 && (
                      <div className={`flex gap-2 flex-wrap ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.images.map((img, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative group"
                          >
                            <div className="relative rounded-lg overflow-hidden border bg-zinc-950/90 w-32 h-32">
                              <img 
                                src={img.url} 
                                alt={img.label || 'Scan'} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-8 w-8"
                                  onClick={() => setSelectedImage(img.url)}
                                >
                                  <ZoomIn className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {img.label && (
                              <p className="text-[10px] text-muted-foreground mt-1 text-center">
                                {img.label}
                                {img.date && ` (${img.date})`}
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-border bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentScanId 
                    ? "Ask about your scan (diagnose, compare, etc.)" 
                    : "Upload a scan or ask about your history..."
                }
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Powered by BioMedCLIP + Gemini • RAG-Enhanced Diagnosis
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-zinc-950">
          <DialogTitle className="sr-only">Scan Preview</DialogTitle>
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Scan preview" 
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatInterface;
