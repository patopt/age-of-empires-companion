import { useEffect, useState } from 'react';
import { ChevronDown, Plus, LogOut, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getPuterAccounts,
  getActivePuterAccount,
  setActivePuterAccount,
  getAccountInfo,
  formatTokens,
  getTokenStatusColor,
  type PuterAccount,
  type PuterAccountInfo,
} from '@/services/puterAccounts';

interface PuterAccountSelectorProps {
  onAddAccount?: () => void;
}

export const PuterAccountSelector = ({ onAddAccount }: PuterAccountSelectorProps) => {
  const [accounts, setAccounts] = useState<PuterAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<PuterAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
    const interval = setInterval(loadAccounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAccounts = async () => {
    try {
      const accts = await getPuterAccounts();
      setAccounts(accts);

      const active = accts.find(a => a.is_active);
      if (active) {
        const info = await getAccountInfo(active.id);
        setActiveAccount(info);
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async (accountId: string) => {
    try {
      await setActivePuterAccount(accountId);
      await loadAccounts();
    } catch (err) {
      console.error('Error switching account:', err);
    }
  };

  if (loading || !activeAccount) {
    return (
      <Button variant="ghost" disabled>
        Chargement...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 text-sm hover:bg-primary/10"
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-semibold text-foreground">{activeAccount.username}</span>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span className={`text-xs font-medium ${getTokenStatusColor(activeAccount.tokens_percentage)}`}>
                  {formatTokens(activeAccount.tokens_remaining)} / {formatTokens(activeAccount.tokens_limit)}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Comptes Puter
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Current Account */}
        <div className="px-3 py-2 mb-1 bg-primary/5 rounded-md border border-primary/20">
          <div className="text-sm font-semibold text-foreground mb-1">
            {activeAccount.username}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tokens utilisés:</span>
              <span className="font-medium">{formatTokens(activeAccount.tokens_used)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restants:</span>
              <span className={`font-medium ${getTokenStatusColor(activeAccount.tokens_percentage)}`}>
                {formatTokens(activeAccount.tokens_remaining)}
              </span>
            </div>
            <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  activeAccount.tokens_percentage < 50
                    ? 'bg-success'
                    : activeAccount.tokens_percentage < 80
                    ? 'bg-warning'
                    : 'bg-destructive'
                }`}
                style={{ width: `${Math.min(100, activeAccount.tokens_percentage)}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Utilisation:</span>
              <span className="font-medium">{activeAccount.tokens_percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Other Accounts */}
        {accounts.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Autres comptes</DropdownMenuLabel>
            {accounts
              .filter(a => !a.is_active)
              .map(account => (
                <DropdownMenuItem
                  key={account.id}
                  onClick={() => handleSwitchAccount(account.id)}
                  className="cursor-pointer flex justify-between items-center"
                >
                  <span className="text-sm">{account.puter_username}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTokens(account.tokens_limit - account.tokens_used)} restants
                  </span>
                </DropdownMenuItem>
              ))}
          </>
        )}

        <DropdownMenuSeparator />

        {/* Add Account */}
        <DropdownMenuItem
          onClick={onAddAccount}
          className="cursor-pointer flex items-center gap-2 text-primary"
        >
          <Plus className="w-4 h-4" />
          Ajouter un compte
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PuterAccountSelector;
