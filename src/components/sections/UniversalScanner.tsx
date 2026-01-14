import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { analyzeScreenshot, isPuterSignedIn, authenticatePuter } from '@/services/puterAI';
import { addHero, addEquipment, addBuilding, setPlayerProfile } from '@/services/storage';
import type { OCRResult } from '@/types/game';

interface UniversalScannerProps {
  onComplete: () => void;
}

const UniversalScanner = ({ onComplete }: UniversalScannerProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<OCRResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;

    const connected = await isPuterSignedIn();
    if (!connected) {
      const success = await authenticatePuter();
      if (!success) {
        setError('Veuillez vous connecter à Puter');
        return;
      }
    }

    setAnalyzing(true);
    setError(null);
    const newResults: OCRResult[] = [];

    try {
      for (const image of images) {
        const result = await analyzeScreenshot(image, 'auto');
        newResults.push(result);
      }
      setResults(newResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = () => {
    results.forEach(result => {
      if (!result.success) return;
      
      switch (result.type) {
        case 'hero':
          if (result.data) {
            addHero({
              id: Date.now().toString(),
              name: result.data.name || 'Héros inconnu',
              level: result.data.level || 1,
              stars: result.data.stars || 1,
              role: result.data.role || 'warrior',
              specialty: result.data.specialty || 'cavalry',
              rarity: result.data.rarity || 'epic',
              power: result.data.power || 0,
              might: result.data.might || 0,
              strategy: result.data.strategy || 0,
              siege: result.data.siege || 0,
              armor: result.data.armor || 0,
              equipment: [],
              talentsConfigured: false,
              optimizationStatus: 'needs-both',
              lastUpdated: new Date().toISOString(),
            });
          }
          break;
        case 'profile':
          if (result.data) {
            setPlayerProfile({
              id: '1',
              name: result.data.name || 'Joueur',
              level: result.data.level || 1,
              power: result.data.power || 0,
              civilization: result.data.civilization || 'Inconnue',
              resources: result.data.resources || { wood: 0, food: 0, stone: 0, gold: 0 },
              heroCount: 0,
              buildingCount: 0,
              equipmentCount: 0,
              lastUpdated: new Date().toISOString(),
            });
          }
          break;
      }
    });
    
    onComplete();
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">Scanner Universel</h2>
        <Button variant="ghost" onClick={onComplete}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Envoyez n'importe quelle capture du jeu. L'IA détectera automatiquement le contenu et extraira les informations.
      </p>

      {/* Upload Zone */}
      <Card 
        className="upload-zone p-8 text-center mb-4"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />
        <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="font-semibold">Glissez ou cliquez</p>
        <p className="text-sm text-muted-foreground">PNG, JPG jusqu'à 10MB</p>
      </Card>

      {/* Image Preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-white text-sm flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-3 mb-4 bg-destructive/10 border-destructive/50 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-sm">{error}</span>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2 mb-4">
          <h3 className="font-semibold">Résultats:</h3>
          {results.map((result, idx) => (
            <Card key={idx} className={`p-3 ${result.success ? 'bg-success/10 border-success/50' : 'bg-destructive/10 border-destructive/50'}`}>
              <div className="flex items-center gap-2">
                {result.success ? <Check className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-destructive" />}
                <span className="text-sm font-medium capitalize">{result.type} détecté</span>
                <span className="text-xs text-muted-foreground ml-auto">{Math.round(result.confidence * 100)}%</span>
              </div>
              {result.needsMoreScreenshots && (
                <p className="text-xs text-warning mt-1">⚠️ Capture incomplète - {result.missingElements?.join(', ')}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {results.length === 0 ? (
          <Button 
            onClick={handleAnalyze} 
            disabled={images.length === 0 || analyzing}
            className="flex-1 btn-gold"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Analyser ({images.length})
              </>
            )}
          </Button>
        ) : (
          <>
            <Button variant="outline" className="flex-1" onClick={() => { setResults([]); setImages([]); }}>
              Nouvelle analyse
            </Button>
            <Button onClick={handleConfirm} className="flex-1 btn-gold">
              <Check className="w-4 h-4 mr-2" /> Confirmer
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default UniversalScanner;
