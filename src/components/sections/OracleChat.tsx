import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Image, Loader2, Bot, User, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { chatWithAI, chatWithMultipleModels, isPuterSignedIn, authenticatePuter } from '@/services/puterAI';
import { getAIHistory, addAIMessage, clearAIHistory, getSettings } from '@/services/storage';
import type { AIMessage } from '@/types/game';
import { cn } from '@/lib/utils';

const OracleChat = () => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    setMessages(getAIHistory());
    setConnected(isPuterSignedIn());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleConnect = async () => {
    setError(null);
    try {
      const success = await authenticatePuter();
      setConnected(success);
      if (!success) {
        setError('Échec de la connexion à Puter');
      }
    } catch (e) {
      setError('Erreur lors de la connexion');
      console.error(e);
    }
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
      if (!isPuterSignedIn()) {
        setError('Veuillez vous connecter à Puter');
        return;
      }
      setConnected(true);
    }

    setError(null);
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input || 'Analyse cette image',
      timestamp: new Date().toISOString(),
      imageUrl: selectedImage || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    addAIMessage(userMessage);
    setInput('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setLoading(true);

    try {
      const settings = getSettings();
      
      if (settings.ai.multimodalEnabled && settings.ai.selectedModels.length > 1) {
        // Multi-model response
        const responses = await chatWithMultipleModels(
          userMessage.content,
          imageToSend || undefined,
          imageToSend ? 'ocr' : 'general'
        );
        
        // Create a combined message showing all model responses
        const combinedContent = responses.map(r => 
          `**📊 ${r.model}:**\n${r.response}`
        ).join('\n\n---\n\n');
        
        const aiMessage: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: combinedContent,
          timestamp: new Date().toISOString(),
          model: `Multimodal (${responses.length} modèles)`,
        };

        setMessages(prev => [...prev, aiMessage]);
        addAIMessage(aiMessage);
      } else {
        // Single model response
        const response = await chatWithAI(
          userMessage.content,
          imageToSend || undefined,
          imageToSend ? 'ocr' : 'general'
        );

        const aiMessage: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
          model: settings.ai.defaultModel,
        };

        setMessages(prev => [...prev, aiMessage]);
        addAIMessage(aiMessage);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Erreur de communication avec l\'IA');
      
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Effacer l\'historique de conversation?')) {
      clearAIHistory();
      setMessages([]);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-4">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Oracle Stratégique</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-xs">
          Connectez-vous à Puter pour accéder à l'IA avec tous les modèles Gemini gratuitement
        </p>
        {error && (
          <Card className="p-3 mb-4 bg-destructive/10 border-destructive/50 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </Card>
        )}
        <Button onClick={handleConnect} className="btn-gold">
          <Sparkles className="w-4 h-4 mr-2" />
          Connecter Puter
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-display font-semibold">Oracle IA</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">Connecté</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClearHistory} title="Effacer l'historique">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/30">
          <p className="text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">Posez une question au stratège...</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['Meilleure équipe PvP?', 'Optimiser mes héros', 'Priorités upgrade', 'Analyser image'].map(q => (
                  <Button key={q} variant="outline" size="sm" onClick={() => setInput(q)} className="text-xs">
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3',
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                  : 'bg-muted rounded-bl-sm'
              )}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="" className="rounded-lg mb-2 max-h-40 object-cover" />
                )}
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div className="text-[10px] mt-2 opacity-60 flex items-center gap-2">
                  {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  {new Date(msg.timestamp).toLocaleTimeString()}
                  {msg.model && <span className="bg-background/20 px-1.5 py-0.5 rounded">{msg.model}</span>}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">L'Oracle réfléchit...</span>
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
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border flex gap-2">
        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
        <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} title="Ajouter une image">
          <Image className="w-5 h-5" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Demandez au stratège..."
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={loading || (!input.trim() && !selectedImage)} className="btn-gold">
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default OracleChat;
