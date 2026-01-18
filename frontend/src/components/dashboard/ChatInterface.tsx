import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Send, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  isTyping?: boolean;
}

const initialAnalysis = `## Preliminary Findings

**Imaging Modality:** Chest X-Ray (PA View)  
**Date:** ${new Date().toLocaleDateString()}

### Observations

1. **Cardiac Silhouette:** Within normal limits. Cardiothoracic ratio approximately 0.45.

2. **Lung Fields:**
   - **Right Lung:** Subtle opacity observed in the right lower lobe, approximately 2.5cm in diameter. May represent:
     - Consolidation (infectious etiology)
     - Atelectasis
     - Early mass lesion (less likely given margins)
   
   - **Left Lung:** Clear with normal vascular markings.

3. **Mediastinum:** Trachea midline. No mediastinal widening.

4. **Pleural Spaces:** No pleural effusion or pneumothorax identified.

5. **Bony Structures:** No acute osseous abnormality.

### Impression

**Right lower lobe opacity** — recommend correlation with clinical symptoms. Consider follow-up CT if clinically indicated.

---
*This is an AI-assisted preliminary finding. Final interpretation by attending radiologist required.*`;

const followUpResponses: Record<string, string> = {
  'compare': `## Longitudinal Comparison

Comparing current study with **Jan 2022 CT Chest**:

| Finding | Jan 2022 | Current |
|---------|----------|---------|
| RLL Opacity | Ground-glass pattern | Consolidative |
| Location | Diffuse bilateral | Focal RLL |
| Size | N/A | ~2.5cm |

### Analysis
The current finding appears **distinct** from the 2022 viral pneumonia pattern. The focal, consolidative nature suggests a different etiology — possibly:
- Community-acquired pneumonia
- Aspiration
- Post-obstructive process

**Recommendation:** Clinical correlation with symptoms and inflammatory markers.`,
  
  'pneumonia': `## Differential Diagnosis: Pneumonia Workup

Based on the imaging characteristics:

### Favoring Infectious Etiology:
- ✓ Lobar distribution
- ✓ Air bronchograms visible
- ✓ Responds to typical pneumonia patterns

### Laboratory Correlation Suggested:
- CBC with differential
- CRP / Procalcitonin
- Sputum culture if productive cough
- COVID-19 / Respiratory viral panel

### Treatment Consideration:
If community-acquired pneumonia suspected, empiric coverage per local guidelines pending culture results.`,
  
  'default': `Thank you for your question. Based on the current imaging study:

The findings require careful clinical correlation. The AI system has analyzed the available imaging data and patient history to provide context.

Would you like me to:
1. Compare with historical imaging studies?
2. Provide differential diagnosis analysis?
3. Suggest recommended follow-up studies?

Please specify your clinical question for a more targeted response.`
};

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingText, setTypingText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  // Initial analysis on mount
  useEffect(() => {
    const initialMessage: Message = {
      id: '1',
      role: 'assistant',
      content: '',
      isTyping: true,
    };
    setMessages([initialMessage]);
    
    // Simulate typing effect
    let index = 0;
    const interval = setInterval(() => {
      if (index < initialAnalysis.length) {
        setTypingText(initialAnalysis.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setMessages([{ id: '1', role: 'assistant', content: initialAnalysis }]);
        setIsTypingComplete(true);
      }
    }, 5);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingText]);

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

    // Simulate AI response delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    let responseContent = followUpResponses.default;
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('compare') || lowerInput.includes('2022') || lowerInput.includes('history')) {
      responseContent = followUpResponses.compare;
    } else if (lowerInput.includes('pneumonia') || lowerInput.includes('infection') || lowerInput.includes('treatment')) {
      responseContent = followUpResponses.pneumonia;
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseContent,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  return (
    <Card className="h-full flex flex-col border-border shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-border">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Brain className="h-4 w-4 text-primary" />
          AI Analysis & Reasoning
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
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
                <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block text-sm rounded-lg px-4 py-2 max-w-full ${
                    message.role === 'assistant'
                      ? 'bg-muted text-foreground text-left'
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {message.isTyping ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{typingText}</ReactMarkdown>
                        <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
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
              placeholder="Ask about the scan (e.g., 'Compare with 2022 scan')"
              disabled={!isTypingComplete || isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || !isTypingComplete || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatInterface;
