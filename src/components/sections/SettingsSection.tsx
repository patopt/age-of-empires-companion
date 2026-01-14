import { useState, useEffect } from 'react';
import { Settings, LogOut, Variable, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSettings, updateSettings, getVariables, clearAllData } from '@/services/storage';
import { signOutPuter } from '@/services/puterAI';
import { AI_MODELS } from '@/types/game';
import type { AppSettings, Variable as VariableType } from '@/types/game';

interface SettingsSectionProps {
  puterUser: string | null;
  onDisconnect: () => void;
}

const SettingsSection = ({ puterUser, onDisconnect }: SettingsSectionProps) => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [variables, setVariables] = useState<VariableType[]>([]);
  const [showVariables, setShowVariables] = useState(false);

  useEffect(() => {
    setVariables(getVariables());
  }, []);

  const handleDisconnect = async () => {
    await signOutPuter();
    updateSettings({ puterConnected: false, puterUsername: undefined });
    onDisconnect();
  };

  const handleMultimodalToggle = (enabled: boolean) => {
    const newSettings = { ...settings, ai: { ...settings.ai, multimodalEnabled: enabled } };
    setSettings(newSettings);
    updateSettings(newSettings);
  };

  const handleModelCountChange = (count: string) => {
    const newSettings = { ...settings, ai: { ...settings.ai, modelCount: parseInt(count) } };
    setSettings(newSettings);
    updateSettings(newSettings);
  };

  const handleDefaultModelChange = (model: string) => {
    const newSettings = { ...settings, ai: { ...settings.ai, defaultModel: model } };
    setSettings(newSettings);
    updateSettings(newSettings);
  };

  const toggleModel = (modelId: string) => {
    const current = settings.ai.selectedModels;
    const updated = current.includes(modelId)
      ? current.filter(m => m !== modelId)
      : [...current, modelId];
    const newSettings = { ...settings, ai: { ...settings.ai, selectedModels: updated } };
    setSettings(newSettings);
    updateSettings(newSettings);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="font-display text-xl font-bold">Paramètres</h2>

      {/* Puter Connection */}
      <Card className="card-tactical p-4">
        <h3 className="font-semibold mb-3">Connexion Puter</h3>
        {puterUser ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Connecté: <span className="text-primary">{puterUser}</span></p>
              <p className="text-xs text-muted-foreground">IA activée via Puter</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDisconnect}>
              <LogOut className="w-4 h-4 mr-1" /> Déconnexion
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Non connecté</p>
        )}
      </Card>

      {/* AI Settings */}
      <Card className="card-tactical p-4">
        <h3 className="font-semibold mb-3">Configuration IA</h3>
        
        <div className="space-y-4">
          {/* Default Model */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Modèle par défaut</p>
              <p className="text-xs text-muted-foreground">Pour les requêtes simples</p>
            </div>
            <Select value={settings.ai.defaultModel} onValueChange={handleDefaultModelChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Multimodal */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Mode Multimodal</p>
              <p className="text-xs text-muted-foreground">Utiliser plusieurs modèles</p>
            </div>
            <Switch checked={settings.ai.multimodalEnabled} onCheckedChange={handleMultimodalToggle} />
          </div>

          {settings.ai.multimodalEnabled && (
            <>
              {/* Model Count */}
              <div className="flex items-center justify-between">
                <p className="text-sm">Nombre de modèles</p>
                <Select value={settings.ai.modelCount.toString()} onValueChange={handleModelCountChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Modèles actifs</p>
                {AI_MODELS.map(model => (
                  <div 
                    key={model.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 cursor-pointer"
                    onClick={() => toggleModel(model.id)}
                  >
                    <div>
                      <p className="text-sm">{model.name}</p>
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                    </div>
                    {settings.ai.selectedModels.includes(model.id) && (
                      <Check className="w-4 h-4 text-success" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Variables */}
      <Card className="card-tactical p-4">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowVariables(!showVariables)}
        >
          <div className="flex items-center gap-2">
            <Variable className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold">Variables Système</p>
              <p className="text-xs text-muted-foreground">{variables.length} variables actives</p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 transition-transform ${showVariables ? 'rotate-90' : ''}`} />
        </div>

        {showVariables && (
          <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {variables.map((v, idx) => (
              <div key={idx} className="p-2 rounded bg-muted/50 text-xs">
                <div className="flex justify-between">
                  <span className="font-mono text-primary">${v.key}</span>
                  <span className="text-muted-foreground">{v.type}</span>
                </div>
                <p className="text-muted-foreground">{v.description}</p>
                <p className="font-medium mt-1">= {JSON.stringify(v.value)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Danger Zone */}
      <Card className="card-tactical p-4 border-destructive/30">
        <h3 className="font-semibold text-destructive mb-3">Zone Danger</h3>
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={() => {
            if (confirm('Supprimer toutes les données?')) {
              clearAllData();
              window.location.reload();
            }
          }}
        >
          Réinitialiser toutes les données
        </Button>
      </Card>
    </div>
  );
};

export default SettingsSection;
