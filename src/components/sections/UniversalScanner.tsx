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
    let itemsAdded = 0;

    results.forEach(result => {
      if (!result.success || !result.data) return;

      switch (result.type) {
        case 'hero':
          addHero({
            id: `hero_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
          itemsAdded++;
          break;

        case 'equipment':
          addEquipment({
            id: `equip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: result.data.name || 'Équipement inconnu',
            slot: result.data.slot || 'weapon',
            rarity: result.data.rarity || 'blue',
            level: result.data.level || 1,
            stars: result.data.stars || 0,
            maxStars: 5,
            mainStat: result.data.mainStat || 'Force',
            mainStatValue: result.data.mainStatValue || 0,
            secondaryStats: result.data.secondaryStats,
            gemSlots: result.data.gems?.length || 3,
            gems: result.data.gems,
            lastUpdated: new Date().toISOString(),
          });
          itemsAdded++;
          break;

        case 'building':
          addBuilding({
            id: `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: result.data.name || 'Bâtiment inconnu',
            category: result.data.category || 'military',
            level: result.data.level || 1,
            maxLevel: result.data.maxLevel || 25,
            upgradeRequirements: result.data.upgradeRequirements,
            isProduction: result.data.production ? true : false,
            productionRate: result.data.production,
            lastUpdated: new Date().toISOString(),
          });
          itemsAdded++;
          break;

        case 'profile':
          setPlayerProfile({
            id: '1',
            name: result.data.name || 'Joueur',
            level: result.data.level || 1,
            power: result.data.power || 0,
            civilization: result.data.civilization || 'Inconnue',
            alliance: result.data.alliance,
            resources: result.data.resources || { wood: 0, food: 0, stone: 0, gold: 0 },
            heroCount: 0,
            buildingCount: 0,
            equipmentCount: 0,
            lastUpdated: new Date().toISOString(),
          });
          itemsAdded++;
          break;
      }
    });

    console.log(`✓ ${itemsAdded} éléments ajoutés`);
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
        <div className="space-y-3 mb-4">
          <h3 className="font-semibold">Résultats de l'analyse:</h3>
          {results.map((result, idx) => (
            <Card key={idx} className={`p-4 ${result.success ? 'bg-success/10 border-success/50' : 'bg-destructive/10 border-destructive/50'}`}>
              <div className="flex items-center gap-2 mb-3">
                {result.success ? <Check className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-destructive" />}
                <span className="text-sm font-semibold capitalize">
                  {result.type === 'hero' && '🦸 Héros'}
                  {result.type === 'equipment' && '⚔️ Équipement'}
                  {result.type === 'building' && '🏰 Bâtiment'}
                  {result.type === 'profile' && '👤 Profil'}
                  {result.type === 'inventory' && '🎒 Inventaire'}
                  {result.type === 'unknown' && '❓ Type inconnu'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                  result.confidence > 0.8 ? 'bg-success/20 text-success' :
                  result.confidence > 0.6 ? 'bg-warning/20 text-warning' :
                  'bg-destructive/20 text-destructive'
                }`}>
                  {Math.round(result.confidence * 100)}% confiance
                </span>
              </div>

              {/* Data Preview */}
              {result.success && result.data && (
                <div className="bg-background/50 rounded-lg p-3 space-y-1.5">
                  {result.type === 'hero' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Nom:</span>
                        <span className="font-semibold">{result.data.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Niveau:</span>
                        <span>{result.data.level || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Étoiles:</span>
                        <span>{result.data.stars ? `${result.data.stars}★` : 'N/A'}</span>
                      </div>
                      {result.data.power && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Puissance:</span>
                          <span className="text-primary font-semibold">{result.data.power.toLocaleString()}</span>
                        </div>
                      )}
                      {result.data.role && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Rôle:</span>
                          <span className="capitalize">{result.data.role}</span>
                        </div>
                      )}
                    </>
                  )}

                  {result.type === 'equipment' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Nom:</span>
                        <span className="font-semibold">{result.data.name || 'N/A'}</span>
                      </div>
                      {result.data.rarity && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Rareté:</span>
                          <span className={`capitalize font-semibold ${
                            result.data.rarity === 'gold' ? 'text-primary' :
                            result.data.rarity === 'purple' ? 'text-epic' :
                            result.data.rarity === 'blue' ? 'text-info' :
                            'text-success'
                          }`}>
                            {result.data.rarity}
                          </span>
                        </div>
                      )}
                      {result.data.level && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Niveau:</span>
                          <span>{result.data.level}</span>
                        </div>
                      )}
                    </>
                  )}

                  {result.type === 'profile' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Nom:</span>
                        <span className="font-semibold">{result.data.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Niveau:</span>
                        <span>{result.data.level || 'N/A'}</span>
                      </div>
                      {result.data.power && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Puissance:</span>
                          <span className="text-primary font-semibold">{result.data.power.toLocaleString()}</span>
                        </div>
                      )}
                      {result.data.civilization && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Civilisation:</span>
                          <span>{result.data.civilization}</span>
                        </div>
                      )}
                    </>
                  )}

                  {result.type === 'building' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Nom:</span>
                        <span className="font-semibold">{result.data.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Niveau:</span>
                        <span>{result.data.level || 'N/A'}</span>
                      </div>
                    </>
                  )}

                  {result.type === 'unknown' && result.data.rawResponse && (
                    <div className="text-xs text-muted-foreground">
                      <p className="line-clamp-3">{result.data.rawResponse}</p>
                    </div>
                  )}
                </div>
              )}

              {result.needsMoreScreenshots && (
                <p className="text-xs text-warning mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Capture incomplète - {result.missingElements?.join(', ')}
                </p>
              )}

              {!result.success && (
                <p className="text-xs text-destructive mt-2">
                  {result.rawText || 'Erreur d\'analyse'}
                </p>
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
