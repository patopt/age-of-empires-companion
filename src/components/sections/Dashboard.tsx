import { useState, useEffect } from 'react';
import { Sparkles, Camera, AlertTriangle, CheckCircle2, ChevronRight, Zap, Shield, Sword } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getHeroes, getPlayerProfile, getBuildings, getEquipment } from '@/services/storage';
import type { Hero, PlayerProfile } from '@/types/game';

interface DashboardProps {
  onNavigate: (section: string) => void;
  onConnect: () => void;
  puterConnected: boolean;
}

const Dashboard = ({ onNavigate, onConnect, puterConnected }: DashboardProps) => {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [alerts, setAlerts] = useState<{ type: 'warning' | 'info' | 'success'; message: string; action?: string }[]>([]);

  useEffect(() => {
    setPlayer(getPlayerProfile());
    setHeroes(getHeroes());
    
    // Generate alerts based on data
    const heroesData = getHeroes();
    const newAlerts: typeof alerts = [];
    
    const needsTalents = heroesData.filter(h => h.optimizationStatus === 'needs-talents' || h.optimizationStatus === 'needs-both');
    if (needsTalents.length > 0) {
      newAlerts.push({ type: 'warning', message: `${needsTalents.length} héros ont des talents mal configurés`, action: 'heroes' });
    }
    
    const needsEquip = heroesData.filter(h => h.optimizationStatus === 'needs-equipment' || h.optimizationStatus === 'needs-both');
    if (needsEquip.length > 0) {
      newAlerts.push({ type: 'info', message: `${needsEquip.length} héros peuvent être mieux équipés`, action: 'equipment' });
    }
    
    if (heroesData.length === 0) {
      newAlerts.push({ type: 'info', message: 'Scannez vos héros pour commencer', action: 'scanner' });
    }
    
    setAlerts(newAlerts);
  }, []);

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Connection Alert */}
      {!puterConnected && (
        <Card className="p-4 bg-gradient-to-r from-primary/20 to-warning/20 border-primary/50">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            <div className="flex-1">
              <h3 className="font-display font-semibold text-primary">Connectez l'IA</h3>
              <p className="text-sm text-muted-foreground">Activez l'Oracle pour des conseils personnalisés</p>
            </div>
            <Button onClick={onConnect} className="btn-gold">
              Connecter
            </Button>
          </div>
        </Card>
      )}

      {/* Player Stats */}
      <Card className="card-tactical p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold">Quartier Général</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('scanner')} className="text-primary">
            <Camera className="w-4 h-4 mr-1" /> Scanner
          </Button>
        </div>
        
        {player ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Commandant</p>
              <p className="font-semibold">{player.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Puissance</p>
              <p className="font-semibold text-primary">{player.power.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Niveau</p>
              <p className="font-semibold">{player.level}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Civilisation</p>
              <p className="font-semibold">{player.civilization}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Aucun profil scanné</p>
            <Button onClick={() => onNavigate('scanner')} className="btn-gold">
              <Camera className="w-4 h-4 mr-2" /> Scanner mon profil
            </Button>
          </div>
        )}
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="card-tactical p-3 text-center cursor-pointer" onClick={() => onNavigate('heroes')}>
          <Sword className="w-6 h-6 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{heroes.length}</p>
          <p className="text-xs text-muted-foreground">Héros</p>
        </Card>
        <Card className="card-tactical p-3 text-center cursor-pointer" onClick={() => onNavigate('equipment')}>
          <Shield className="w-6 h-6 mx-auto mb-1 text-epic" />
          <p className="text-2xl font-bold">{getEquipment().length}</p>
          <p className="text-xs text-muted-foreground">Équipements</p>
        </Card>
        <Card className="card-tactical p-3 text-center cursor-pointer" onClick={() => onNavigate('buildings')}>
          <Zap className="w-6 h-6 mx-auto mb-1 text-warning" />
          <p className="text-2xl font-bold">{getBuildings().length}</p>
          <p className="text-xs text-muted-foreground">Bâtiments</p>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display font-semibold">Alertes</h3>
          {alerts.map((alert, idx) => (
            <Card
              key={idx}
              className={`p-3 flex items-center gap-3 cursor-pointer ${
                alert.type === 'warning' ? 'border-war/50 bg-war/10' :
                alert.type === 'info' ? 'border-info/50 bg-info/10' :
                'border-success/50 bg-success/10'
              }`}
              onClick={() => alert.action && onNavigate(alert.action)}
            >
              {alert.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-war" /> :
               alert.type === 'info' ? <Sparkles className="w-5 h-5 text-info" /> :
               <CheckCircle2 className="w-5 h-5 text-success" />}
              <span className="flex-1 text-sm">{alert.message}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Card>
          ))}
        </div>
      )}

      {/* Oracle CTA */}
      <Card className="p-4 bg-gradient-to-br from-card to-card-elevated border-primary/30 cursor-pointer" onClick={() => onNavigate('oracle')}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold">Oracle IA</h3>
            <p className="text-sm text-muted-foreground">Demandez conseil au stratège</p>
          </div>
          <ChevronRight className="w-5 h-5 text-primary" />
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
