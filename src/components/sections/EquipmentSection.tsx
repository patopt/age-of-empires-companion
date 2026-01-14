import { useState, useEffect } from 'react';
import { Package, Camera, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getEquipment } from '@/services/storage';
import type { EquipmentItem } from '@/types/game';
import { cn } from '@/lib/utils';

const EquipmentSection = () => {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);

  useEffect(() => {
    setEquipment(getEquipment());
  }, []);

  const getRarityColor = (rarity: EquipmentItem['rarity']) => {
    switch (rarity) {
      case 'gold': return 'border-primary bg-primary/10';
      case 'purple': return 'border-epic bg-epic/10';
      case 'blue': return 'border-info bg-info/10';
      default: return 'border-success bg-success/10';
    }
  };

  if (equipment.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-4">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="font-display text-xl font-bold mb-2">Aucun Équipement</h2>
        <p className="text-muted-foreground text-center mb-6">
          Scannez votre inventaire pour voir vos équipements
        </p>
        <Button className="btn-gold">
          <Camera className="w-4 h-4 mr-2" /> Scanner inventaire
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">Équipements ({equipment.length})</h2>
        <Button size="sm" className="btn-gold">
          <Camera className="w-4 h-4 mr-1" /> Scanner
        </Button>
      </div>

      <div className="space-y-2">
        {equipment.map((item) => (
          <Card key={item.id} className={cn('p-3 flex items-center gap-3', getRarityColor(item.rarity))}>
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                Niv {item.level} • {item.stars}★/{item.maxStars}★
              </p>
              {item.equippedTo && (
                <p className="text-xs text-primary">Équipé: {item.equippedTo}</p>
              )}
            </div>
            <Button size="sm" variant="ghost" className="text-primary">
              <Sparkles className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EquipmentSection;
