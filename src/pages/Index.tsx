import { useState, useEffect } from 'react';
import { Home, Users, Package, Building2, MessageCircle, Settings, Scan, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import Dashboard from '@/components/sections/Dashboard';
import HeroesSection from '@/components/sections/HeroesSection';
import EquipmentSection from '@/components/sections/EquipmentSection';
import BuildingsSection from '@/components/sections/BuildingsSection';
import OracleChat from '@/components/sections/OracleChat';
import SettingsSection from '@/components/sections/SettingsSection';
import UniversalScanner from '@/components/sections/UniversalScanner';
import { isPuterAvailable, isPuterSignedIn, getPuterUser, authenticatePuter } from '@/services/puterAI';
import { getSettings, updateSettings } from '@/services/storage';

type Section = 'dashboard' | 'heroes' | 'equipment' | 'buildings' | 'oracle' | 'settings' | 'scanner';

const navItems = [
  { id: 'dashboard' as Section, icon: Home, label: 'QG' },
  { id: 'heroes' as Section, icon: Users, label: 'Héros' },
  { id: 'equipment' as Section, icon: Package, label: 'Équip.' },
  { id: 'buildings' as Section, icon: Building2, label: 'Bâtiments' },
  { id: 'oracle' as Section, icon: MessageCircle, label: 'Oracle' },
];

const Index = () => {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [puterConnected, setPuterConnected] = useState(false);
  const [puterUser, setPuterUser] = useState<string | null>(null);

  useEffect(() => {
    // Load Puter SDK
    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.onload = async () => {
      const signedIn = await isPuterSignedIn();
      setPuterConnected(signedIn);
      if (signedIn) {
        const user = await getPuterUser();
        setPuterUser(user);
        updateSettings({ puterConnected: true, puterUsername: user || undefined });
      }
    };
    document.head.appendChild(script);
  }, []);

  const handleConnect = async () => {
    const success = await authenticatePuter();
    if (success) {
      setPuterConnected(true);
      const user = await getPuterUser();
      setPuterUser(user);
      updateSettings({ puterConnected: true, puterUsername: user || undefined });
    }
  };

  const handleNavigate = (section: string) => {
    setActiveSection(section as Section);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} onConnect={handleConnect} puterConnected={puterConnected} />;
      case 'heroes': return <HeroesSection />;
      case 'equipment': return <EquipmentSection />;
      case 'buildings': return <BuildingsSection />;
      case 'oracle': return <OracleChat />;
      case 'settings': return <SettingsSection puterUser={puterUser} onDisconnect={() => { setPuterConnected(false); setPuterUser(null); }} />;
      case 'scanner': return <UniversalScanner onComplete={() => setActiveSection('dashboard')} />;
      default: return <Dashboard onNavigate={handleNavigate} onConnect={handleConnect} puterConnected={puterConnected} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border-gold/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-warning flex items-center justify-center">
              <Swords className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-primary">AoE Companion</h1>
              <p className="text-xs text-muted-foreground">Oracle Stratégique</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSection('scanner')}
              className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            >
              <Scan className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveSection('settings')}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-20 safe-bottom">
        {renderSection()}
      </main>

      {/* Bottom Navigation */}
      <nav className="nav-bottom">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn('nav-item', activeSection === item.id && 'active')}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Index;
