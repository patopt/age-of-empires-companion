import { useState, useEffect } from 'react';
import { Building2, Camera, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getBuildings } from '@/services/storage';
import type { Building } from '@/types/game';

const BuildingsSection = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);

  useEffect(() => {
    setBuildings(getBuildings());
  }, []);

  if (buildings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-4">
        <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="font-display text-xl font-bold mb-2">Aucun Bâtiment</h2>
        <p className="text-muted-foreground text-center mb-6">
          Scannez vos bâtiments pour suivre leur progression
        </p>
        <Button className="btn-gold">
          <Camera className="w-4 h-4 mr-2" /> Scanner bâtiment
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">Bâtiments ({buildings.length})</h2>
        <Button size="sm" className="btn-gold">
          <Camera className="w-4 h-4 mr-1" /> Scanner
        </Button>
      </div>

      <div className="space-y-2">
        {buildings.map((building) => (
          <Card key={building.id} className="card-tactical p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{building.name}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary-glow"
                      style={{ width: `${(building.level / building.maxLevel) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {building.level}/{building.maxLevel}
                  </span>
                </div>
                {building.isProduction && building.productionRate && (
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    {building.productionRate.perHour}/h {building.productionRate.resource}
                  </p>
                )}
              </div>
              <Button size="sm" variant="ghost" className="text-primary">
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BuildingsSection;
