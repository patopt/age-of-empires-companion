/*
  # Puter Accounts Management

  1. New Tables
    - `puter_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `puter_username` (text, unique per user)
      - `puter_user_id` (text, Puter's user ID)
      - `is_active` (boolean, tracks which account is currently active)
      - `tokens_used` (integer, API tokens consumed)
      - `tokens_limit` (integer, monthly token limit)
      - `last_token_check` (timestamptz, when token info was last updated)
      - `account_created_at` (timestamptz, when Puter account was created)
      - `created_at` (timestamptz, when record was created)
      - `updated_at` (timestamptz, when record was last updated)

  2. Security
    - Enable RLS on `puter_accounts` table
    - Add policies for users to manage their own accounts

  3. Indexes
    - Index on user_id for fast lookups
    - Index on puter_username for uniqueness checks
*/

CREATE TABLE IF NOT EXISTS puter_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  puter_username text NOT NULL,
  puter_user_id text,
  is_active boolean DEFAULT false,
  tokens_used integer DEFAULT 0,
  tokens_limit integer DEFAULT 10000,
  last_token_check timestamptz,
  account_created_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_puter_account_per_user UNIQUE(user_id, puter_username)
);

CREATE INDEX idx_puter_accounts_user_id ON puter_accounts(user_id);
CREATE INDEX idx_puter_accounts_active ON puter_accounts(user_id, is_active);
CREATE INDEX idx_puter_accounts_username ON puter_accounts(puter_username);

ALTER TABLE puter_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Puter accounts"
  ON puter_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Puter accounts"
  ON puter_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Puter accounts"
  ON puter_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Puter accounts"
  ON puter_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
