import { useEffect, useState } from 'react';
import { ChevronDown, Plus, Zap, RefreshCw } from 'lucide-react';
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
  refreshAccountInfo,
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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAccounts();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      loadAccounts(true);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAccounts = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      
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
      if (!silent) setLoading(false);
    }
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setRefreshing(true);
      const active = accounts.find(a => a.is_active);
      if (active) {
        const info = await refreshAccountInfo(active.id);
        if (info) {
          setActiveAccount(info);
          await loadAccounts(true);
        }
      }
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setRefreshing(false);
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
      <Button variant="ghost" disabled size="sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 animate-pulse" />
          <span className="text-xs">Chargement...</span>
        </div>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 text-sm hover:bg-primary/10 px-3 h-9"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-semibold text-foreground text-xs">{activeAccount.username}</span>
              <span className={`text-xs font-medium ${getTokenStatusColor(activeAccount.tokens_percentage)}`}>
                {formatTokens(activeAccount.tokens_remaining)}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Comptes Puter
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Current Account - Detailed Info */}
        <div className="px-3 py-3 mb-1 bg-gradient-to-br from-primary/10 to-primary/5 rounded-md border-2 border-primary/20 mx-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-semibold text-foreground mb-0.5">
                {activeAccount.username}
              </div>
              {activeAccount.email && (
                <div className="text-xs text-muted-foreground">{activeAccount.email}</div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium text-success">Actif</span>
            </div>
          </div>
          
          <div className="space-y-1.5 text-xs">
            {activeAccount.subscription && (
              <div className="flex justify-between items-center pb-1.5 border-b border-primary/10">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium capitalize">{activeAccount.subscription}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tokens utilisés:</span>
              <span className="font-medium">{formatTokens(activeAccount.tokens_used)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Disponibles:</span>
              <span className={`font-semibold ${getTokenStatusColor(activeAccount.tokens_percentage)}`}>
                {formatTokens(activeAccount.tokens_remaining)}
              </span>
            </div>
            
            <div className="flex justify-between items-center mb-1">
              <span className="text-muted-foreground">Limite:</span>
              <span className="font-medium">{formatTokens(activeAccount.tokens_limit)}</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  activeAccount.tokens_percentage < 50
                    ? 'bg-gradient-to-r from-success to-success/80'
                    : activeAccount.tokens_percentage < 80
                    ? 'bg-gradient-to-r from-warning to-warning/80'
                    : 'bg-gradient-to-r from-destructive to-destructive/80'
                }`}
                style={{ width: `${Math.min(100, activeAccount.tokens_percentage)}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-muted-foreground">Utilisation:</span>
              <span className={`font-medium ${getTokenStatusColor(activeAccount.tokens_percentage)}`}>
                {activeAccount.tokens_percentage.toFixed(1)}%
              </span>
            </div>

            {activeAccount.quota && activeAccount.quota.storage_used !== undefined && (
              <div className="flex justify-between items-center pt-1 border-t border-primary/10 mt-1">
                <span className="text-muted-foreground">Stockage:</span>
                <span className="font-medium">
                  {formatTokens(activeAccount.quota.storage_used)} / {formatTokens(activeAccount.quota.storage_limit || 0)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Other Accounts */}
        {accounts.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Changer de compte
            </DropdownMenuLabel>
            {accounts
              .filter(a => !a.is_active)
              .map(account => (
                <DropdownMenuItem
                  key={account.id}
                  onClick={() => handleSwitchAccount(account.id)}
                  className="cursor-pointer flex justify-between items-center mx-1 rounded-md"
                >
                  <div>
                    <span className="text-sm font-medium">{account.puter_username}</span>
                    {account.email && (
                      <div className="text-xs text-muted-foreground">{account.email}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatTokens(account.tokens_limit - account.tokens_used)}
                    </span>
                    <span className="text-xs text-muted-foreground opacity-70">
                      restants
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
          </>
        )}

        <DropdownMenuSeparator />

        {/* Add Account */}
        <DropdownMenuItem
          onClick={onAddAccount}
          className="cursor-pointer flex items-center gap-2 text-primary font-medium mx-1 rounded-md"
        >
          <Plus className="w-4 h-4" />
          Ajouter un compte
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PuterAccountSelector;