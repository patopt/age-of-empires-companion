import { createClient } from '@supabase/supabase-js';
import type { AIModelId } from '@/types/game';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
}

export interface PuterAccountInfo {
  username: string;
  user_id?: string;
  tokens_used: number;
  tokens_limit: number;
  tokens_remaining: number;
  tokens_percentage: number;
  is_active: boolean;
  created_at: string;
}

declare global {
  interface Window {
    puter: {
      ui: {
        authenticateWithPuter: () => Promise<void>;
      };
      auth: {
        isSignedIn: () => boolean;
        getUser: () => Promise<{ username: string; user_id?: string } | null>;
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
    };
  }
}

// Check if user is authenticated via Supabase
export async function isSupabaseAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

// Get current Supabase user
export async function getSupabaseUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Add a new Puter account to Supabase
export async function addPuterAccount(puter_username: string, puter_user_id: string | null = null): Promise<PuterAccount | null> {
  const user = await getSupabaseUser();
  if (!user) {
    console.error('No Supabase user logged in');
    return null;
  }

  try {
    // First, deactivate all other accounts for this user
    await supabase
      .from('puter_accounts')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Insert new account as active
    const { data, error } = await supabase
      .from('puter_accounts')
      .insert({
        user_id: user.id,
        puter_username,
        puter_user_id,
        is_active: true,
        account_created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding Puter account:', error);
      return null;
    }

    console.log('Puter account added:', data);
    return data;
  } catch (err) {
    console.error('Error in addPuterAccount:', err);
    return null;
  }
}

// Get all Puter accounts for current user
export async function getPuterAccounts(): Promise<PuterAccount[]> {
  const user = await getSupabaseUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('puter_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching Puter accounts:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getPuterAccounts:', err);
    return [];
  }
}

// Get active Puter account
export async function getActivePuterAccount(): Promise<PuterAccount | null> {
  const user = await getSupabaseUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('puter_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching active account:', error);
    }

    return data || null;
  } catch (err) {
    console.error('Error in getActivePuterAccount:', err);
    return null;
  }
}

// Set active Puter account
export async function setActivePuterAccount(accountId: string): Promise<boolean> {
  const user = await getSupabaseUser();
  if (!user) return false;

  try {
    // Deactivate all
    await supabase
      .from('puter_accounts')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Activate selected
    const { error } = await supabase
      .from('puter_accounts')
      .update({ is_active: true })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error setting active account:', error);
      return false;
    }

    console.log('Account activated:', accountId);
    return true;
  } catch (err) {
    console.error('Error in setActivePuterAccount:', err);
    return false;
  }
}

// Delete Puter account
export async function deletePuterAccount(accountId: string): Promise<boolean> {
  const user = await getSupabaseUser();
  if (!user) return false;

  try {
    const { error } = await supabase
      .from('puter_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting account:', error);
      return false;
    }

    // If we deleted the active account, activate another one
    const accounts = await getPuterAccounts();
    if (accounts.length > 0 && !accounts.some(a => a.is_active)) {
      await setActivePuterAccount(accounts[0].id);
    }

    console.log('Account deleted:', accountId);
    return true;
  } catch (err) {
    console.error('Error in deletePuterAccount:', err);
    return false;
  }
}

// Fetch Puter user info and update tokens
export async function fetchPuterAccountInfo(): Promise<PuterAccountInfo | null> {
  if (typeof window === 'undefined' || !window.puter) {
    console.error('Puter SDK not available');
    return null;
  }

  try {
    const puterUser = await window.puter.auth.getUser();
    if (!puterUser) {
      console.error('Not signed in to Puter');
      return null;
    }

    // Get account from Supabase
    const accounts = await getPuterAccounts();
    const activeAccount = accounts.find(a => a.is_active) || accounts[0];

    if (!activeAccount) {
      return null;
    }

    // Update tokens info
    const tokens_used = activeAccount.tokens_used || 0;
    const tokens_limit = activeAccount.tokens_limit || 10000;
    const tokens_remaining = Math.max(0, tokens_limit - tokens_used);
    const tokens_percentage = (tokens_used / tokens_limit) * 100;

    // Update last check
    await supabase
      .from('puter_accounts')
      .update({
        last_token_check: new Date().toISOString(),
        puter_user_id: puterUser.user_id || null,
      })
      .eq('id', activeAccount.id);

    return {
      username: puterUser.username || activeAccount.puter_username,
      user_id: puterUser.user_id,
      tokens_used,
      tokens_limit,
      tokens_remaining,
      tokens_percentage,
      is_active: activeAccount.is_active,
      created_at: activeAccount.created_at,
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
  tokens_limit: number = 10000
): Promise<boolean> {
  const user = await getSupabaseUser();
  if (!user) return false;

  try {
    const { error } = await supabase
      .from('puter_accounts')
      .update({
        tokens_used,
        tokens_limit,
        last_token_check: new Date().toISOString(),
      })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating tokens:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in updateAccountTokens:', err);
    return false;
  }
}

// Get account info with token data
export async function getAccountInfo(accountId?: string): Promise<PuterAccountInfo | null> {
  try {
    const accounts = await getPuterAccounts();
    const account = accountId
      ? accounts.find(a => a.id === accountId)
      : accounts.find(a => a.is_active) || accounts[0];

    if (!account) return null;

    const tokens_used = account.tokens_used || 0;
    const tokens_limit = account.tokens_limit || 10000;
    const tokens_remaining = Math.max(0, tokens_limit - tokens_used);
    const tokens_percentage = (tokens_used / tokens_limit) * 100;

    return {
      username: account.puter_username,
      user_id: account.puter_user_id || undefined,
      tokens_used,
      tokens_limit,
      tokens_remaining,
      tokens_percentage,
      is_active: account.is_active,
      created_at: account.created_at,
    };
  } catch (err) {
    console.error('Error in getAccountInfo:', err);
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
