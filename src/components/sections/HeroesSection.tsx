import { useState, useEffect } from 'react';
import { Plus, Sparkles, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getHeroes } from '@/services/storage';
import type { Hero } from '@/types/game';
import { cn } from '@/lib/utils';

const HeroesSection = () => {
  const [heroes, setHeroes] = useState<Hero[]>([]);

  useEffect(() => {
    setHeroes(getHeroes());
  }, []);

  const getStatusBadge = (status: Hero['optimizationStatus']) => {
    switch (status) {
      case 'optimal': return <div className="badge-success">✓</div>;
      case 'needs-talents': return <div className="badge-warning" />;
      case 'needs-equipment': return <div className="badge-info" />;
      case 'needs-both': return <div className="badge-warning" />;
    }
  };

  const getRarityClass = (rarity: Hero['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'legendary border-primary/50';
      case 'epic': return 'epic border-epic/50';
      default: return '';
    }
  };

  if (heroes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Camera className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Aucun Héros</h2>
        <p className="text-muted-foreground text-center mb-6">
          Scannez vos captures d'écran pour ajouter vos héros
        </p>
        <Button className="btn-gold">
          <Camera className="w-4 h-4 mr-2" /> Scanner des héros
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">Mes Héros ({heroes.length})</h2>
        <Button size="sm" className="btn-gold">
          <Plus className="w-4 h-4 mr-1" /> Scanner
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {heroes.map((hero) => (
          <Card 
            key={hero.id} 
            className={cn('hero-card p-2 relative', getRarityClass(hero.rarity))}
          >
            {getStatusBadge(hero.optimizationStatus)}
            
            <div className="aspect-square rounded-lg bg-muted mb-2 flex items-center justify-center overflow-hidden">
              {hero.imageUrl ? (
                <img src={hero.imageUrl} alt={hero.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{hero.name[0]}</span>
              )}
            </div>
            
            <div className="text-center">
              <p className="font-semibold text-xs truncate">{hero.name}</p>
              <p className="text-[10px] text-muted-foreground">Niv {hero.level} • {hero.stars}★</p>
            </div>

            <Button 
              size="sm" 
              variant="ghost" 
              className="w-full mt-1 h-6 text-[10px] text-primary"
            >
              <Sparkles className="w-3 h-3 mr-1" /> IA
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HeroesSection;
