// ========================================
// PUTER ACCOUNTS SERVICE - Multi-Account Management
// ========================================

import type { AIModelId } from '@/types/game';

const STORAGE_KEY = 'aoe_puter_accounts';

export interface PuterAccount {
  id: string;
  puter_username: string;
  puter_user_id: string | null;
  is_active: boolean;
  tokens_used: number;
  tokens_limit: number;
  last_token_check: string | null;
  account_created_at: string | null;
  created_at: string;
  updated_at: string;
  // Stocker les données réelles de l'API Puter
  email?: string;
  quota?: {
    used: number;
    limit: number;
    storage_used?: number;
    storage_limit?: number;
  };
  subscription?: string;
  // Stocker les tokens d'authentification si nécessaire
  auth_token?: string;
}

export interface PuterAccountInfo {
  username: string;
  user_id?: string;
  email?: string;
  tokens_used: number;
  tokens_limit: number;
  tokens_remaining: number;
  tokens_percentage: number;
  is_active: boolean;
  created_at: string;
  quota?: {
    used: number;
    limit: number;
    storage_used?: number;
    storage_limit?: number;
  };
  subscription?: string;
}

declare global {
  interface Window {
    puter: {
      ui: {
        authenticateWithPuter: () => Promise<void>;
      };
      auth: {
        isSignedIn: () => boolean;
        getUser: () => Promise<{ 
          username: string; 
          user_id?: string;
          email?: string;
          uuid?: string;
          [key: string]: any;
        } | null>;
        signOut: () => Promise<void>;
        signIn: () => Promise<void>;
      };
      ai: {
        chat: (
          prompt: string | any[],
          imageUrlOrOptions?: string | { model?: string; stream?: boolean },
          options?: { model?: string; stream?: boolean }
        ) => Promise<string | { message?: { content: string }; text?: string }>;
      };
      // API pour obtenir les informations du compte
      getUser?: () => Promise<any>;
      quota?: {
        get: () => Promise<{
          used: number;
          limit: number;
          storage_used?: number;
          storage_limit?: number;
        }>;
      };
    };
  }
}

// Storage helpers for localStorage
function getAccounts(): PuterAccount[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading accounts from localStorage:', error);
    return [];
  }
}

function saveAccounts(accounts: PuterAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (error) {
    console.error('Error saving accounts to localStorage:', error);
  }
}

// Generate unique ID
function generateId(): string {
  return `puter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Add a new Puter account to localStorage
export async function addPuterAccount(puter_username: string, puter_user_id: string | null = null): Promise<PuterAccount | null> {
  try {
    const accounts = getAccounts();
    
    // Désactiver tous les autres comptes
    accounts.forEach(acc => acc.is_active = false);

    // Récupérer les infos réelles du compte Puter
    let puterUser = null;
    let quota = null;
    
    if (typeof window !== 'undefined' && window.puter) {
      try {
        puterUser = await window.puter.auth.getUser();
        
        // Tenter de récupérer le quota si disponible
        if (window.puter.quota && typeof window.puter.quota.get === 'function') {
          quota = await window.puter.quota.get();
        }
      } catch (err) {
        console.warn('Could not fetch Puter user info:', err);
      }
    }

    // Créer le nouveau compte avec les vraies données
    const newAccount: PuterAccount = {
      id: generateId(),
      puter_username: puter_username || puterUser?.username || 'Unknown User',
      puter_user_id: puter_user_id || puterUser?.user_id || puterUser?.uuid || null,
      is_active: true,
      tokens_used: quota?.used || 0,
      tokens_limit: quota?.limit || 100000, // Default limit
      last_token_check: new Date().toISOString(),
      account_created_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email: puterUser?.email,
      quota: quota || undefined,
      subscription: puterUser?.subscription || 'free',
    };

    accounts.push(newAccount);
    saveAccounts(accounts);

    console.log('Puter account added to localStorage:', newAccount);
    return newAccount;
  } catch (err) {
    console.error('Error in addPuterAccount:', err);
    return null;
  }
}

// Get all Puter accounts
export async function getPuterAccounts(): Promise<PuterAccount[]> {
  return getAccounts();
}

// Get active Puter account
export async function getActivePuterAccount(): Promise<PuterAccount | null> {
  try {
    const accounts = getAccounts();
    const active = accounts.find(a => a.is_active);
    return active || null;
  } catch (err) {
    console.error('Error in getActivePuterAccount:', err);
    return null;
  }
}

// Set active Puter account
export async function setActivePuterAccount(accountId: string): Promise<boolean> {
  try {
    const accounts = getAccounts();
    
    // Désactiver tous les comptes
    accounts.forEach(acc => acc.is_active = false);
    
    // Activer le compte sélectionné
    const targetAccount = accounts.find(a => a.id === accountId);
    if (targetAccount) {
      targetAccount.is_active = true;
      targetAccount.updated_at = new Date().toISOString();
      saveAccounts(accounts);
      console.log('Account activated:', accountId);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Error in setActivePuterAccount:', err);
    return false;
  }
}

// Delete Puter account
export async function deletePuterAccount(accountId: string): Promise<boolean> {
  try {
    let accounts = getAccounts();
    const initialLength = accounts.length;
    
    accounts = accounts.filter(a => a.id !== accountId);
    
    if (accounts.length < initialLength) {
      // Si on a supprimé le compte actif, activer le premier disponible
      if (accounts.length > 0 && !accounts.some(a => a.is_active)) {
        accounts[0].is_active = true;
      }
      
      saveAccounts(accounts);
      console.log('Account deleted:', accountId);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Error in deletePuterAccount:', err);
    return false;
  }
}

// Fetch REAL Puter user information from API
export async function fetchPuterAccountInfo(): Promise<PuterAccountInfo | null> {
  if (typeof window === 'undefined' || !window.puter) {
    console.error('Puter SDK not available');
    return null;
  }

  try {
    // Récupérer les vraies informations de l'utilisateur Puter
    const puterUser = await window.puter.auth.getUser();
    if (!puterUser) {
      console.error('Not signed in to Puter');
      return null;
    }

    // Récupérer le quota si disponible
    let quota = null;
    if (window.puter.quota && typeof window.puter.quota.get === 'function') {
      try {
        quota = await window.puter.quota.get();
      } catch (err) {
        console.warn('Could not fetch quota:', err);
      }
    }

    // Récupérer ou créer le compte local
    let accounts = getAccounts();
    let activeAccount = accounts.find(a => a.is_active);
    
    // Si pas de compte actif correspondant, créer un nouveau
    if (!activeAccount || activeAccount.puter_user_id !== (puterUser.user_id || puterUser.uuid)) {
      activeAccount = await addPuterAccount(
        puterUser.username,
        puterUser.user_id || puterUser.uuid || null
      );
      
      if (!activeAccount) {
        return null;
      }
    }

    // Mettre à jour les informations du compte avec les vraies données
    accounts = getAccounts();
    const accountIndex = accounts.findIndex(a => a.id === activeAccount!.id);
    if (accountIndex >= 0) {
      accounts[accountIndex] = {
        ...accounts[accountIndex],
        puter_username: puterUser.username || accounts[accountIndex].puter_username,
        puter_user_id: puterUser.user_id || puterUser.uuid || accounts[accountIndex].puter_user_id,
        email: puterUser.email || accounts[accountIndex].email,
        tokens_used: quota?.used || accounts[accountIndex].tokens_used,
        tokens_limit: quota?.limit || accounts[accountIndex].tokens_limit,
        quota: quota || accounts[accountIndex].quota,
        last_token_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveAccounts(accounts);
      activeAccount = accounts[accountIndex];
    }

    const tokens_used = activeAccount.tokens_used || 0;
    const tokens_limit = activeAccount.tokens_limit || 100000;
    const tokens_remaining = Math.max(0, tokens_limit - tokens_used);
    const tokens_percentage = tokens_limit > 0 ? (tokens_used / tokens_limit) * 100 : 0;

    return {
      username: puterUser.username || activeAccount.puter_username,
      user_id: puterUser.user_id || puterUser.uuid,
      email: puterUser.email || activeAccount.email,
      tokens_used,
      tokens_limit,
      tokens_remaining,
      tokens_percentage,
      is_active: activeAccount.is_active,
      created_at: activeAccount.created_at,
      quota: quota || activeAccount.quota,
      subscription: puterUser.subscription || activeAccount.subscription,
    };
  } catch (err) {
    console.error('Error fetching Puter account info:', err);
    return null;
  }
}

// Update token count for account
export async function updateAccountTokens(
  accountId: string,
  tokens_used: number,
  tokens_limit: number = 100000
): Promise<boolean> {
  try {
    const accounts = getAccounts();
    const accountIndex = accounts.findIndex(a => a.id === accountId);
    
    if (accountIndex >= 0) {
      accounts[accountIndex] = {
        ...accounts[accountIndex],
        tokens_used,
        tokens_limit,
        last_token_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveAccounts(accounts);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Error in updateAccountTokens:', err);
    return false;
  }
}

// Get account info with token data
export async function getAccountInfo(accountId?: string): Promise<PuterAccountInfo | null> {
  try {
    const accounts = getAccounts();
    const account = accountId
      ? accounts.find(a => a.id === accountId)
      : accounts.find(a => a.is_active) || accounts[0];

    if (!account) return null;

    const tokens_used = account.tokens_used || 0;
    const tokens_limit = account.tokens_limit || 100000;
    const tokens_remaining = Math.max(0, tokens_limit - tokens_used);
    const tokens_percentage = tokens_limit > 0 ? (tokens_used / tokens_limit) * 100 : 0;

    return {
      username: account.puter_username,
      user_id: account.puter_user_id || undefined,
      email: account.email,
      tokens_used,
      tokens_limit,
      tokens_remaining,
      tokens_percentage,
      is_active: account.is_active,
      created_at: account.created_at,
      quota: account.quota,
      subscription: account.subscription,
    };
  } catch (err) {
    console.error('Error in getAccountInfo:', err);
    return null;
  }
}

// Refresh account info from Puter API
export async function refreshAccountInfo(accountId?: string): Promise<PuterAccountInfo | null> {
  if (typeof window === 'undefined' || !window.puter) {
    return null;
  }

  try {
    const puterUser = await window.puter.auth.getUser();
    if (!puterUser) return null;

    let quota = null;
    if (window.puter.quota && typeof window.puter.quota.get === 'function') {
      try {
        quota = await window.puter.quota.get();
      } catch (err) {
        console.warn('Could not fetch quota:', err);
      }
    }

    const accounts = getAccounts();
    const account = accountId
      ? accounts.find(a => a.id === accountId)
      : accounts.find(a => a.is_active);

    if (!account) return null;

    // Update account with fresh data
    const accountIndex = accounts.findIndex(a => a.id === account.id);
    if (accountIndex >= 0) {
      accounts[accountIndex] = {
        ...accounts[accountIndex],
        puter_username: puterUser.username || accounts[accountIndex].puter_username,
        email: puterUser.email || accounts[accountIndex].email,
        tokens_used: quota?.used || accounts[accountIndex].tokens_used,
        tokens_limit: quota?.limit || accounts[accountIndex].tokens_limit,
        quota: quota || accounts[accountIndex].quota,
        last_token_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveAccounts(accounts);
    }

    return getAccountInfo(account.id);
  } catch (err) {
    console.error('Error refreshing account info:', err);
    return null;
  }
}

// Format tokens for display
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

// Get token status color
export function getTokenStatusColor(percentage: number): string {
  if (percentage < 50) return 'text-success';
  if (percentage < 80) return 'text-warning';
  return 'text-destructive';
}

// Get token status label
export function getTokenStatusLabel(percentage: number): string {
  if (percentage < 50) return 'Bon';
  if (percentage < 80) return 'Moyen';
  return 'Critique';
}

// Clear all accounts (for debugging/reset)
export function clearAllAccounts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('All Puter accounts cleared');
  } catch (error) {
    console.error('Error clearing accounts:', error);
  }
}

// Export accounts (for backup)
export function exportAccounts(): string {
  const accounts = getAccounts();
  return JSON.stringify(accounts, null, 2);
}

// Import accounts (from backup)
export function importAccounts(jsonData: string): boolean {
  try {
    const accounts = JSON.parse(jsonData);
    if (Array.isArray(accounts)) {
      saveAccounts(accounts);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error importing accounts:', error);
    return false;
  }
}