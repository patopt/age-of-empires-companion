import { useState, useEffect } from 'react';
import { Settings, LogOut, Variable, Check, ChevronRight, BookOpen, Code, Sparkles, ChevronDown, ExternalLink, Trash2, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSettings, updateSettings, getVariables, clearAllData } from '@/services/storage';
import { signOutPuter, getStrategyCodex, SYSTEM_PROMPTS, AIContext, isPuterSignedIn, authenticatePuter } from '@/services/puterAI';
import { AI_MODELS } from '@/types/game';
import type { AppSettings, Variable as VariableType } from '@/types/game';
import {
  getPuterAccounts,
  addPuterAccount,
  deletePuterAccount,
  getAccountInfo,
  formatTokens,
  getTokenStatusColor,
  type PuterAccount,
  type PuterAccountInfo,
} from '@/services/puterAccounts';

interface SettingsSectionProps {
  puterUser: string | null;
  onDisconnect: () => void;
}

// Parse prompt template and highlight variables
function renderPromptWithVariables(template: string): JSX.Element {
  const parts = template.split(/(\{\{[^}]+\}\})/g);
  
  return (
    <div className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
      {parts.map((part, idx) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          const varName = part.slice(2, -2);
          return (
            <span 
              key={idx}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-semibold cursor-help"
              title={getVariableDescription(varName)}
            >
              ${varName}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </div>
  );
}

function getVariableDescription(varName: string): string {
  const descriptions: Record<string, string> = {
    'STRATEGY_KNOWLEDGE': 'Document stratégique complet contenant toutes les informations du jeu (civilisations, héros, équipement, etc.)',
    'USER_CONTEXT': 'Données actuelles du joueur (profil, héros, équipement, bâtiments, ressources)',
    'HERO_SYNERGIES': 'Liste des synergies de héros recommandées avec commander + lieutenant',
    'TALENT_PRIORITIES': 'Priorités de talents pour chaque rôle (Guerrier, Tacticien, Maréchal)',
    'EQUIPMENT_PRIORITY': 'Gemmes et stats recommandées par rôle de héros',
    'CIVILIZATION_TIPS': 'Conseils et bonus par civilisation',
  };
  return descriptions[varName] || 'Variable système';
}

const SettingsSection = ({ puterUser, onDisconnect }: SettingsSectionProps) => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [variables, setVariables] = useState<VariableType[]>([]);
  const [activeSection, setActiveSection] = useState<'ai' | 'codex' | 'prompts' | 'variables' | 'accounts' | null>(null);
  const [puterAccounts, setPuterAccounts] = useState<PuterAccount[]>([]);
  const [accountInfo, setAccountInfo] = useState<PuterAccountInfo | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [loading, setLoading] = useState(true);
  const codex = getStrategyCodex();

  useEffect(() => {
    setVariables(getVariables());
    loadPuterAccounts();
  }, []);

  const loadPuterAccounts = async () => {
    try {
      const accounts = await getPuterAccounts();
      setPuterAccounts(accounts);

      const active = accounts.find(a => a.is_active);
      if (active) {
        const info = await getAccountInfo(active.id);
        setAccountInfo(info);
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return;

    try {
      const isPuter = await isPuterSignedIn();
      if (!isPuter) {
        const auth = await authenticatePuter();
        if (!auth) {
          alert('Veuillez vous connecter à Puter');
          return;
        }
      }

      await addPuterAccount(newAccountName);
      setNewAccountName('');
      setShowAddAccount(false);
      await loadPuterAccounts();
    } catch (err) {
      console.error('Error adding account:', err);
      alert('Erreur lors de l\'ajout du compte');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce compte?')) return;

    try {
      await deletePuterAccount(accountId);
      await loadPuterAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Erreur lors de la suppression');
    }
  };

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

  const toggleSection = (section: 'ai' | 'codex' | 'prompts' | 'variables') => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <div className="px-4 py-4 space-y-4">
        <h2 className="font-display text-xl font-bold">Paramètres</h2>

        {/* Puter Accounts Management */}
        <Card className="card-tactical p-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('accounts')}
          >
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Comptes Puter
            </h3>
            <ChevronRight className={`w-5 h-5 transition-transform ${activeSection === 'accounts' ? 'rotate-90' : ''}`} />
          </div>

          {activeSection === 'accounts' && (
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
              ) : puterAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun compte ajouté</p>
              ) : (
                <>
                  {accountInfo && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <h4 className="font-semibold text-sm mb-2">Compte actif</h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Utilisateur:</span>
                          <span className="font-semibold">{accountInfo.username}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tokens utilisés:</span>
                          <span>{formatTokens(accountInfo.tokens_used)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Restants:</span>
                          <span className={`font-semibold ${getTokenStatusColor(accountInfo.tokens_percentage)}`}>
                            {formatTokens(accountInfo.tokens_remaining)}
                          </span>
                        </div>
                        <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden mt-2">
                          <div
                            className={`h-full transition-all ${
                              accountInfo.tokens_percentage < 50
                                ? 'bg-success'
                                : accountInfo.tokens_percentage < 80
                                ? 'bg-warning'
                                : 'bg-destructive'
                            }`}
                            style={{ width: `${Math.min(100, accountInfo.tokens_percentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Utilisation:</span>
                          <span>{accountInfo.tokens_percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Tous les comptes ({puterAccounts.length})</h4>
                    {puterAccounts.map(account => (
                      <div
                        key={account.id}
                        className={`p-3 rounded-lg border ${
                          account.is_active
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-muted/50 border-border/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{account.puter_username}</span>
                            {account.is_active && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                                Actif
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAccount(account.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTokens(account.tokens_limit - account.tokens_used)} tokens restants
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Button
                onClick={() => setShowAddAccount(true)}
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter un compte
              </Button>
            </div>
          )}
        </Card>

        {/* Puter Connection */}
        <Card className="card-tactical p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Connexion Puter
          </h3>
          {puterUser ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Connecté: <span className="text-primary font-semibold">{puterUser}</span></p>
                <p className="text-xs text-muted-foreground">IA activée via Puter</p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                <LogOut className="w-4 h-4 mr-1" /> Déconnexion
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Non connecté - L'IA nécessite une connexion Puter</p>
          )}
        </Card>

        {/* Add Account Dialog */}
        <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un compte Puter</DialogTitle>
              <DialogDescription>
                Entrez le nom de votre compte Puter (optionnel, sera généré si vide)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Ex: Compte principal, Compte test..."
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAccount()}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddAccount(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddAccount}
                  disabled={!newAccountName.trim()}
                  className="flex-1"
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Settings */}
        <Card className="card-tactical p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('ai')}
          >
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Configuration IA
            </h3>
            <ChevronRight className={`w-5 h-5 transition-transform ${activeSection === 'ai' ? 'rotate-90' : ''}`} />
          </div>

          {activeSection === 'ai' && (
            <div className="mt-4 space-y-4">
              {/* Default Model */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Modèle par défaut</p>
                  <p className="text-xs text-muted-foreground">Pour les requêtes simples</p>
                </div>
                <Select value={settings.ai.defaultModel} onValueChange={handleDefaultModelChange}>
                  <SelectTrigger className="w-44">
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
                  <p className="text-xs text-muted-foreground">Utiliser plusieurs modèles simultanément</p>
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
                          <p className="text-xs text-muted-foreground">{model.provider} - {model.description}</p>
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
          )}
        </Card>

        {/* Strategy Codex */}
        <Card className="card-tactical p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('codex')}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Codex Stratégique</p>
                <p className="text-xs text-muted-foreground">Base de connaissances de l'IA</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 transition-transform ${activeSection === 'codex' ? 'rotate-90' : ''}`} />
          </div>

          {activeSection === 'codex' && (
            <div className="mt-4">
              <Accordion type="single" collapsible className="w-full">
                {codex.map((section, idx) => (
                  <AccordionItem key={idx} value={`codex-${idx}`}>
                    <AccordionTrigger className="text-sm py-2">
                      {section.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-60">
                        <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded-lg">
                          {section.content}
                        </pre>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </Card>

        {/* System Prompts */}
        <Card className="card-tactical p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('prompts')}
          >
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Prompts Système</p>
                <p className="text-xs text-muted-foreground">Instructions pour chaque fonction IA</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 transition-transform ${activeSection === 'prompts' ? 'rotate-90' : ''}`} />
          </div>

          {activeSection === 'prompts' && (
            <div className="mt-4">
              <Accordion type="single" collapsible className="w-full">
                {(Object.entries(SYSTEM_PROMPTS) as [AIContext, { name: string; template: string }][]).map(([key, prompt]) => (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger className="text-sm py-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-mono">
                          {key}
                        </span>
                        {prompt.name}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-60">
                        <div className="bg-muted/30 p-3 rounded-lg">
                          {renderPromptWithVariables(prompt.template)}
                        </div>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              
              <div className="mt-3 p-3 rounded-lg bg-info/10 border border-info/30">
                <p className="text-xs text-info flex items-start gap-2">
                  <span className="text-info mt-0.5">ℹ️</span>
                  Les variables en <span className="font-mono text-primary">$NOM</span> sont remplacées dynamiquement par les données réelles lors de chaque requête.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Variables */}
        <Card className="card-tactical p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('variables')}
          >
            <div className="flex items-center gap-2">
              <Variable className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Variables Système</p>
                <p className="text-xs text-muted-foreground">{variables.length} variables actives</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 transition-transform ${activeSection === 'variables' ? 'rotate-90' : ''}`} />
          </div>

          {activeSection === 'variables' && (
            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
              {variables.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune donnée scannée. Les variables seront créées après l'analyse d'images.
                </p>
              ) : (
                variables.map((v, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-primary text-sm font-semibold">${v.key}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {v.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-medium truncate max-w-[70%]">
                        = {typeof v.value === 'object' ? JSON.stringify(v.value) : String(v.value)}
                      </p>
                      <span className="text-xs text-muted-foreground">→ {v.linkedTo}</span>
                    </div>
                  </div>
                ))
              )}
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
              if (confirm('Supprimer toutes les données? Cette action est irréversible.')) {
                clearAllData();
                window.location.reload();
              }
            }}
          >
            Réinitialiser toutes les données
          </Button>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default SettingsSection;
