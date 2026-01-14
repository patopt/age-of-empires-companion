// ========================================
// PUTER AI SERVICE - Gemini Integration
// ========================================

import { STRATEGY_KNOWLEDGE } from '@/data/strategyKnowledge';
import { getHeroes, getEquipment, getBuildings, getPlayerProfile, getSettings } from './storage';
import type { Hero, EquipmentItem, Building, OCRResult, AIModelId } from '@/types/game';

declare global {
  interface Window {
    puter: {
      ui: {
        authenticateWithPuter: () => Promise<void>;
      };
      auth: {
        isSignedIn: () => Promise<boolean>;
        getUser: () => Promise<{ username: string } | null>;
        signOut: () => Promise<void>;
      };
      ai: {
        chat: (
          prompt: string | any[],
          imageUrlOrOptions?: string | { model?: string },
          options?: { model?: string }
        ) => Promise<string>;
      };
      fs: {
        write: (path: string, content: Blob) => Promise<{ path: string }>;
      };
    };
  }
}

// Check if Puter is loaded
export function isPuterAvailable(): boolean {
  return typeof window !== 'undefined' && window.puter !== undefined;
}

// Check if user is signed in
export async function isPuterSignedIn(): Promise<boolean> {
  if (!isPuterAvailable()) return false;
  try {
    return await window.puter.auth.isSignedIn();
  } catch {
    return false;
  }
}

// Get Puter user
export async function getPuterUser(): Promise<string | null> {
  if (!isPuterAvailable()) return null;
  try {
    const user = await window.puter.auth.getUser();
    return user?.username || null;
  } catch {
    return null;
  }
}

// Authenticate with Puter
export async function authenticatePuter(): Promise<boolean> {
  if (!isPuterAvailable()) {
    console.error('Puter SDK not loaded');
    return false;
  }
  try {
    await window.puter.ui.authenticateWithPuter();
    return await isPuterSignedIn();
  } catch (error) {
    console.error('Puter auth error:', error);
    return false;
  }
}

// Sign out from Puter
export async function signOutPuter(): Promise<void> {
  if (!isPuterAvailable()) return;
  try {
    await window.puter.auth.signOut();
  } catch (error) {
    console.error('Puter signout error:', error);
  }
}

// Build context with all user data
function buildUserContext(): string {
  const player = getPlayerProfile();
  const heroes = getHeroes();
  const equipment = getEquipment();
  const buildings = getBuildings();
  
  let context = `\n\n=== DONNÉES DU JOUEUR ===\n`;
  
  if (player) {
    context += `
PROFIL:
- Nom: ${player.name}
- Niveau: ${player.level}
- Puissance: ${player.power.toLocaleString()}
- Civilisation: ${player.civilization}
- Alliance: ${player.alliance || 'Aucune'}

RESSOURCES:
- Bois: ${player.resources.wood.toLocaleString()}
- Nourriture: ${player.resources.food.toLocaleString()}
- Pierre: ${player.resources.stone.toLocaleString()}
- Or: ${player.resources.gold.toLocaleString()}
`;
  }
  
  if (heroes.length > 0) {
    context += `\nHÉROS (${heroes.length} total):\n`;
    heroes.forEach(hero => {
      context += `- ${hero.name} (Niv ${hero.level}, ${hero.stars}★, ${hero.role}, ${hero.specialty})
  Puissance: ${hero.power.toLocaleString()} | Force: ${hero.might} | Stratégie: ${hero.strategy}
  Status: ${hero.optimizationStatus}${hero.talentIssues?.length ? ` | Problèmes: ${hero.talentIssues.join(', ')}` : ''}\n`;
    });
  }
  
  if (equipment.length > 0) {
    context += `\nÉQUIPEMENT (${equipment.length} total):\n`;
    const byRarity = {
      gold: equipment.filter(e => e.rarity === 'gold'),
      purple: equipment.filter(e => e.rarity === 'purple'),
      blue: equipment.filter(e => e.rarity === 'blue'),
      green: equipment.filter(e => e.rarity === 'green'),
    };
    context += `- Légendaire (Or): ${byRarity.gold.length}\n`;
    context += `- Épique (Violet): ${byRarity.purple.length}\n`;
    context += `- Rare (Bleu): ${byRarity.blue.length}\n`;
    context += `- Commun (Vert): ${byRarity.green.length}\n`;
  }
  
  if (buildings.length > 0) {
    context += `\nBÂTIMENTS (${buildings.length} total):\n`;
    buildings.forEach(b => {
      context += `- ${b.name}: Niveau ${b.level}/${b.maxLevel}`;
      if (b.isProduction && b.productionRate) {
        context += ` (Produit: ${b.productionRate.perHour}/h ${b.productionRate.resource})`;
      }
      context += '\n';
    });
  }
  
  return context;
}

// System prompt for AI
function getSystemPrompt(context: 'general' | 'ocr' | 'hero' | 'equipment' | 'building' | 'team'): string {
  const basePrompt = `Tu es l'Oracle Stratégique, un Grand Stratège militaire vétéran d'Age of Empires Mobile.

RÈGLES STRICTES:
1. Tu dois UNIQUEMENT utiliser les informations du document stratégique fourni pour tes explications théoriques. N'invente rien.
2. Tu dois TOUJOURS croiser les informations du document avec la liste des héros/équipements que l'utilisateur possède.
3. Ton ton est direct, impératif et précis. Pas de blabla.
4. Tu proposes des ACTIONS CONCRÈTES basées sur ce que l'utilisateur possède réellement.
5. Si l'utilisateur n'a pas les ressources nécessaires, tu proposes des alternatives avec ce qu'il a.

DOCUMENT STRATÉGIQUE:
${STRATEGY_KNOWLEDGE}

${buildUserContext()}`;

  const contextPrompts = {
    general: basePrompt,
    ocr: `${basePrompt}

TÂCHE SPÉCIALE - OCR/ANALYSE D'IMAGE:
Tu dois analyser la capture d'écran fournie et extraire TOUTES les informations visibles:
- Pour un héros: nom, niveau, étoiles, rôle, spécialité, stats, équipement visible, talents
- Pour l'équipement: nom, rareté (couleur), niveau, étoiles, stats, gemmes
- Pour un bâtiment: nom, niveau, coûts upgrade, temps, production si applicable
- Pour l'inventaire: liste COMPLÈTE de tous les items visibles

IMPORTANT: Si tu détectes que l'image ne montre pas TOUS les éléments (ex: inventaire tronqué), indique quels éléments manquent et demande des captures supplémentaires.

Réponds en JSON structuré avec le format approprié.`,
    hero: `${basePrompt}

FOCUS HÉROS:
Analyse et conseille sur les héros. Vérifie:
- Configuration des talents (correct ou à réinitialiser?)
- Équipement optimal (as-t-il le meilleur disponible?)
- Synergies avec d'autres héros possédés
- Priorités d'investissement`,
    equipment: `${basePrompt}

FOCUS ÉQUIPEMENT:
Analyse l'équipement. Applique les règles:
- Épique 3★ > Légendaire 0★
- Vérifie les gemmes par rôle
- Propose des échanges optimaux entre héros`,
    building: `${basePrompt}

FOCUS BÂTIMENTS:
Analyse les bâtiments. Indique:
- Priorités d'upgrade
- Coûts et temps estimés
- Production actuelle vs potentielle`,
    team: `${basePrompt}

FOCUS ÉQUIPES/SYNERGIES:
Crée des compositions optimales selon les règles:
- NE JAMAIS mélanger types d'unités
- 1 Maréchal + DPS/Tacticiens
- Vérifie les synergies documentées`,
  };
  
  return contextPrompts[context];
}

// Main AI chat function
export async function chatWithAI(
  message: string,
  imageBase64?: string,
  context: 'general' | 'ocr' | 'hero' | 'equipment' | 'building' | 'team' = 'general',
  model?: AIModelId
): Promise<string> {
  if (!isPuterAvailable()) {
    throw new Error('Puter SDK non disponible. Veuillez vous connecter à Puter.');
  }
  
  const isSignedIn = await isPuterSignedIn();
  if (!isSignedIn) {
    throw new Error('Veuillez vous connecter à Puter pour utiliser l\'IA.');
  }
  
  const settings = getSettings();
  const selectedModel = model || settings.ai.defaultModel || 'gemini-2.0-flash';
  const systemPrompt = getSystemPrompt(context);
  
  try {
    let response: string;
    
    if (imageBase64) {
      // Vision request with image
      response = await window.puter.ai.chat(
        `${systemPrompt}\n\nUtilisateur: ${message}`,
        imageBase64,
        { model: selectedModel }
      );
    } else {
      // Text-only request
      response = await window.puter.ai.chat(
        `${systemPrompt}\n\nUtilisateur: ${message}`,
        { model: selectedModel }
      );
    }
    
    return response;
  } catch (error) {
    console.error('AI chat error:', error);
    throw new Error(`Erreur IA: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

// Multi-model AI request
export async function chatWithMultipleModels(
  message: string,
  imageBase64?: string,
  context: 'general' | 'ocr' | 'hero' | 'equipment' | 'building' | 'team' = 'general'
): Promise<{ model: string; response: string }[]> {
  const settings = getSettings();
  
  if (!settings.ai.multimodalEnabled || settings.ai.selectedModels.length <= 1) {
    const response = await chatWithAI(message, imageBase64, context);
    return [{ model: settings.ai.defaultModel, response }];
  }
  
  const results = await Promise.allSettled(
    settings.ai.selectedModels.slice(0, settings.ai.modelCount).map(async (model) => {
      const response = await chatWithAI(message, imageBase64, context, model as AIModelId);
      return { model, response };
    })
  );
  
  return results
    .filter((r): r is PromiseFulfilledResult<{ model: string; response: string }> => r.status === 'fulfilled')
    .map(r => r.value);
}

// OCR Analysis function
export async function analyzeScreenshot(
  imageBase64: string,
  expectedType: 'hero' | 'equipment' | 'building' | 'profile' | 'inventory' | 'auto'
): Promise<OCRResult> {
  const prompt = expectedType === 'auto'
    ? `Analyse cette capture d'écran d'Age of Empires Mobile. Détermine le type de contenu (héros, équipement, bâtiment, profil, inventaire) et extrais TOUTES les informations visibles. Réponds en JSON avec la structure:
{
  "type": "hero|equipment|building|profile|inventory",
  "confidence": 0.0-1.0,
  "data": { /* données extraites selon le type */ },
  "complete": true|false,
  "missingElements": ["liste des éléments non visibles si incomplet"]
}`
    : `Analyse cette capture d'écran d'Age of Empires Mobile contenant un ${expectedType}. Extrais TOUTES les informations visibles. Réponds en JSON structuré.`;

  try {
    const response = await chatWithAI(prompt, imageBase64, 'ocr');
    
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        type: parsed.type || expectedType,
        data: parsed.data || parsed,
        confidence: parsed.confidence || 0.8,
        rawText: response,
        needsMoreScreenshots: parsed.complete === false,
        missingElements: parsed.missingElements,
      };
    }
    
    // If no JSON, return raw text
    return {
      success: true,
      type: expectedType === 'auto' ? 'unknown' : expectedType,
      data: { rawResponse: response },
      confidence: 0.5,
      rawText: response,
    };
  } catch (error) {
    return {
      success: false,
      type: 'unknown',
      data: null,
      confidence: 0,
      rawText: error instanceof Error ? error.message : 'Erreur d\'analyse',
    };
  }
}

// Quick action helpers
export async function getHeroAdvice(heroId: string): Promise<string> {
  const heroes = getHeroes();
  const hero = heroes.find(h => h.id === heroId);
  if (!hero) throw new Error('Héros non trouvé');
  
  return chatWithAI(
    `Analyse mon héros ${hero.name} (Niveau ${hero.level}, ${hero.stars}★). 
    Donne-moi:
    1. Son état d'optimisation actuel
    2. Les talents recommandés selon son rôle (${hero.role})
    3. L'équipement idéal pour lui
    4. Les synergies avec mes autres héros
    5. Actions prioritaires à faire MAINTENANT`,
    undefined,
    'hero'
  );
}

export async function getTeamSuggestion(mode: 'pvp' | 'siege' | 'harvest'): Promise<string> {
  return chatWithAI(
    `Génère la MEILLEURE équipe ${mode.toUpperCase()} possible avec mes héros actuels.
    Inclus:
    1. Le Commander (Chef)
    2. Les 3 Lieutenants
    3. L'explication de la synergie
    4. Le pourcentage de victoire estimé
    5. Les faiblesses de cette composition`,
    undefined,
    'team'
  );
}

export async function getUpgradePriorities(): Promise<string> {
  return chatWithAI(
    `Analyse mon compte complet et donne-moi mes 5 PRIORITÉS ABSOLUES maintenant:
    1. Quel héros upgrader en premier?
    2. Quel équipement améliorer?
    3. Quel bâtiment construire?
    4. Quelle ressource farmer?
    5. Quelle erreur corriger immédiatement?
    
    Base tes recommandations sur la méta actuelle et mes ressources disponibles.`,
    undefined,
    'general'
  );
}
