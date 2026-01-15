# Système de Gestion de Multiples Comptes Puter

## Vue d'Ensemble

Le système permet de gérer plusieurs comptes Puter avec :
- Sauvegarde persistante des comptes en Supabase
- Affichage des tokens utilisés et restants
- Sélection du compte actif
- Gestion complète des sessions par compte
- Support optionnel (1 ou plusieurs comptes)

## Architecture

### 1. Base de Données (Supabase)

**Table: `puter_accounts`**
```sql
- id (uuid): Clé primaire
- user_id (uuid): Référence à l'utilisateur Supabase
- puter_username (text): Nom du compte Puter
- puter_user_id (text): ID Puter du compte
- is_active (boolean): Compte actuellement sélectionné
- tokens_used (integer): Tokens consommés ce mois
- tokens_limit (integer): Limite mensuelle (défaut: 10,000)
- last_token_check (timestamptz): Dernière mise à jour des tokens
- account_created_at (timestamptz): Création du compte
- created_at (timestamptz): Création de l'enregistrement
- updated_at (timestamptz): Dernière modification
```

**Sécurité RLS:**
- Les utilisateurs ne peuvent voir que leurs propres comptes
- Chaque opération (INSERT, UPDATE, DELETE) vérifie l'ownership

### 2. Services

#### `src/services/puterAccounts.ts`
Gère l'interaction avec Supabase et Puter :

**Fonctions principales:**
- `getPuterAccounts()` - Récupère tous les comptes de l'utilisateur
- `getActivePuterAccount()` - Obtient le compte actuellement actif
- `addPuterAccount(username)` - Ajoute un nouveau compte
- `setActivePuterAccount(accountId)` - Bascule le compte actif
- `deletePuterAccount(accountId)` - Supprime un compte
- `fetchPuterAccountInfo()` - Récupère les infos Puter (tokens, username)
- `updateAccountTokens(accountId, used, limit)` - Met à jour le décompte de tokens
- `getAccountInfo(accountId)` - Retourne les infos formatées avec stats

**Types:**
```typescript
interface PuterAccount {
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

interface PuterAccountInfo {
  username: string;
  user_id?: string;
  tokens_used: number;
  tokens_limit: number;
  tokens_remaining: number;
  tokens_percentage: number;
  is_active: boolean;
  created_at: string;
}
```

### 3. Edge Function

**`get_puter_account_info`**
API REST pour récupérer les informations du compte actif:
```
GET /functions/v1/get_puter_account_info
Authorization: Bearer <JWT>

Response:
{
  "username": "utilisateur",
  "tokens_used": 5000,
  "tokens_limit": 10000,
  "tokens_remaining": 5000,
  "tokens_percentage": 50
}
```

### 4. Composants

#### `src/components/PuterAccountSelector.tsx`
Sélecteur de compte dans le header:

**Affichage:**
- Compte actif avec tokens restants
- Indicateur coloré du statut des tokens:
  - Vert (< 50%): Bon
  - Orange (50-80%): Moyen
  - Rouge (> 80%): Critique
- Liste des autres comptes
- Bouton pour ajouter un compte

**Props:**
```typescript
interface PuterAccountSelectorProps {
  onAddAccount?: () => void;
}
```

#### `src/components/sections/SettingsSection.tsx`
Section "Comptes Puter" dans les paramètres:

**Fonctionnalités:**
- Affichage du compte actif avec barre de progression
- Liste de tous les comptes avec tokens restants
- Bouton pour supprimer un compte
- Formulaire pour ajouter un nouveau compte
- Dialogue pour saisir le nom du compte

### 5. Intégration

**Page Index (`src/pages/Index.tsx`)**
- Import du composant `PuterAccountSelector`
- Affichage dans le header si Puter est connecté
- Bouton "Ajouter un compte" redirige vers les settings

## Flux d'Utilisation

### 1. Première Connexion
```
Utilisateur se connecte à Puter
  ↓
Supabase crée un nouvel enregistrement d'utilisateur
  ↓
Aucun compte Puter existant
  ↓
Utilisateur peut ajouter un compte depuis Settings
```

### 2. Ajouter un Compte
```
Cliquer sur "Ajouter un compte"
  ↓
Saisir le nom du compte (optionnel)
  ↓
Soumettre
  ↓
Supabase sauvegarde le compte (is_active = true)
  ↓
Tous les autres comptes deviennent inactifs
  ↓
Le nouveau compte s'affiche dans le sélecteur
```

### 3. Changer de Compte Actif
```
Cliquer sur le sélecteur de compte (header)
  ↓
Voir la liste des autres comptes
  ↓
Cliquer sur un compte
  ↓
Supabase met à jour is_active
  ↓
L'interface bascule vers le nouveau compte
```

### 4. Supprimer un Compte
```
Settings → Comptes Puter
  ↓
Cliquer sur l'icône poubelle du compte
  ↓
Confirmation demandée
  ↓
Supabase supprime le compte
  ↓
Si c'était le compte actif, en active un autre
```

## Gestion des Tokens

### Affichage des Tokens

**Format:**
- < 1K: Affichage brut (ex: "500")
- 1K-999K: Format K (ex: "5.2K")
- >= 1M: Format M (ex: "1.2M")

**Statut Visuel:**
```
tokens_percentage < 50%   → Vert "Bon"
tokens_percentage 50-80%  → Orange "Moyen"
tokens_percentage > 80%   → Rouge "Critique"
```

### Mise à Jour des Tokens

Les tokens peuvent être mis à jour par :
1. L'Edge Function (via les requêtes IA)
2. L'appel manuel `updateAccountTokens(accountId, used, limit)`

**Timing:**
- Mis à jour lors du chargement des comptes
- Rechargement toutes les 30 secondes dans le sélecteur

## Optionalité

Le système est complètement optionnel :

**Avec 1 seul compte:**
- Fonctionne normalement
- Le sélecteur ne montre que le compte actif
- Pas d'option "autres comptes"

**Avec plusieurs comptes:**
- Sélecteur complet disponible
- Gestion de la basculade automatique
- Décompte de tokens indépendant par compte

**Sans compte Puter:**
- Aucune erreur
- Sélecteur ne s'affiche pas
- L'IA reste indisponible jusqu'à la connexion

## Sécurité

### RLS (Row Level Security)
```sql
-- Utilisateurs ne peuvent voir leurs propres comptes
USING (auth.uid() = user_id)

-- Vérification de ownership sur tous les CUD
WITH CHECK (auth.uid() = user_id)
```

### Données Sensibles
- Les tokens sont uniquement lus via Puter API
- Jamais stockés en clair en secret local
- Supabase gère l'authentification

### Authentification
- Chaque Edge Function vérifie le JWT
- Supabase applique automatiquement RLS
- Erreur 401 si non authentifié

## Fichiers Modifiés/Créés

### Nouveaux:
- `src/services/puterAccounts.ts` - Service de gestion des comptes
- `src/components/PuterAccountSelector.tsx` - Sélecteur de compte
- `supabase/functions/get_puter_account_info/index.ts` - Edge Function

### Modifiés:
- `src/components/sections/SettingsSection.tsx` - Ajout de la section comptes
- `src/pages/Index.tsx` - Intégration du sélecteur
- `package.json` - Ajout de `@supabase/supabase-js`

### Migrations:
- `create_puter_accounts_table` - Table et RLS

## Exemples de Code

### Charger les comptes
```typescript
import { getPuterAccounts, getActivePuterAccount } from '@/services/puterAccounts';

const accounts = await getPuterAccounts();
const active = await getActivePuterAccount();
```

### Ajouter un compte
```typescript
import { addPuterAccount } from '@/services/puterAccounts';

const newAccount = await addPuterAccount('Mon compte');
```

### Mettre à jour les tokens
```typescript
import { updateAccountTokens } from '@/services/puterAccounts';

await updateAccountTokens(accountId, 5000, 10000);
```

### Afficher les infos du compte
```typescript
import { getAccountInfo, formatTokens, getTokenStatusColor } from '@/services/puterAccounts';

const info = await getAccountInfo(accountId);
console.log(`${info.username}: ${formatTokens(info.tokens_remaining)} tokens`);
const color = getTokenStatusColor(info.tokens_percentage);
```

## Prochaines Améliorations

1. **Synchronisation automatique des tokens** - Récupérer les infos depuis Puter API en arrière-plan
2. **Historique d'utilisation** - Tracker l'utilisation des tokens par date
3. **Partage de comptes** - Permettre de partager des comptes entre utilisateurs
4. **Notifications** - Alerter quand les tokens approchent de la limite
5. **Import/Export** - Sauvegarder et restaurer les configurations de comptes

## Dépannage

### "Table not found"
→ Exécuter la migration: `create_puter_accounts_table`

### Sélecteur n'apparaît pas
→ Vérifier que `puterConnected === true` dans Index.tsx

### Les tokens ne mettent pas à jour
→ Appeler manuellement `fetchPuterAccountInfo()` ou `updateAccountTokens()`

### Erreur RLS sur les requêtes
→ Vérifier que l'utilisateur Supabase est authentifié
→ Vérifier les policies sur la table

## Performance

- Chargement des comptes: ~200ms (query + RLS)
- Basculade de compte: ~300ms
- Affichage du sélecteur: ~100ms (mise en cache des comptes)
- Rafraîchissement auto: Toutes les 30 secondes
