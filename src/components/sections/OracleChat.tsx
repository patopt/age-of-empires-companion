import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { chatWithAI, isPuterSignedIn, authenticatePuter } from '@/services/puterAI';
import { getAIHistory, addAIMessage } from '@/services/storage';
import type { AIMessage } from '@/types/game';
import { cn } from '@/lib/utils';

const OracleChat = () => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    setMessages(getAIHistory());
    isPuterSignedIn().then(setConnected);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleConnect = async () => {
    const success = await authenticatePuter();
    setConnected(success);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    if (!connected) {
      await handleConnect();
      if (!connected) return;
    }

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      imageUrl: selectedImage || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    addAIMessage(userMessage);
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const response = await chatWithAI(
        input || 'Analyse cette image',
        selectedImage || undefined,
        selectedImage ? 'ocr' : 'general'
      );

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        model: 'gemini-2.0-flash',
      };

      setMessages(prev => [...prev, aiMessage]);
      addAIMessage(aiMessage);
    } catch (error) {
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-4">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Oracle Stratégique</h2>
        <p className="text-muted-foreground text-center mb-6">
          Connectez-vous à Puter pour accéder à l'IA
        </p>
        <Button onClick={handleConnect} className="btn-gold">
          Connecter Puter
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <span className="font-display font-semibold">Oracle IA</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">Connecté</span>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Posez une question au stratège...</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['Meilleure équipe PvP?', 'Optimiser mes héros', 'Priorités upgrade'].map(q => (
                  <Button key={q} variant="outline" size="sm" onClick={() => setInput(q)} className="text-xs">
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%]', msg.role === 'user' ? 'user-bubble' : 'ai-bubble')}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="" className="rounded-lg mb-2 max-h-40 object-cover" />
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[10px] mt-1 opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                  {msg.model && ` • ${msg.model}`}
                </p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="ai-bubble flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyse en cours...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {selectedImage && (
        <div className="px-4 py-2 border-t border-border">
          <div className="relative inline-block">
            <img src={selectedImage} alt="" className="h-16 rounded-lg" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white text-xs"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border flex gap-2">
        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
        <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
          <Image className="w-5 h-5" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Demandez au stratège..."
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={loading}
        />
        <Button onClick={handleSend} disabled={loading || (!input.trim() && !selectedImage)} className="btn-gold">
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default OracleChat;
