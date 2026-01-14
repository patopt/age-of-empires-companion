// ========================================
// PUTER AI SERVICE - Gemini Integration
// ========================================

import { STRATEGY_KNOWLEDGE, HERO_SYNERGIES, TALENT_PRIORITIES, EQUIPMENT_PRIORITY, CIVILIZATION_TIPS } from '@/data/strategyKnowledge';
import { getHeroes, getEquipment, getBuildings, getPlayerProfile, getSettings } from './storage';
import type { Hero, EquipmentItem, Building, OCRResult, AIModelId } from '@/types/game';

declare global {
  interface Window {
    puter: {
      ui: {
        authenticateWithPuter: () => Promise<void>;
      };
      auth: {
        isSignedIn: () => boolean;
        getUser: () => Promise<{ username: string } | null>;
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
export function isPuterSignedIn(): boolean {
  if (!isPuterAvailable()) return false;
  try {
    return window.puter.auth.isSignedIn();
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
    await window.puter.auth.signIn();
    return isPuterSignedIn();
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

// Context types for AI prompts
export type AIContext = 'general' | 'ocr' | 'hero' | 'equipment' | 'building' | 'team';

// System prompts object for display in settings
export const SYSTEM_PROMPTS: Record<AIContext, { name: string; template: string }> = {
  general: {
    name: 'Oracle Général',
    template: `Tu es l'Oracle Stratégique, un Grand Stratège militaire vétéran d'Age of Empires Mobile.

RÈGLES STRICTES:
1. Tu dois UNIQUEMENT utiliser les informations du document stratégique fourni pour tes explications théoriques. N'invente rien.
2. Tu dois TOUJOURS croiser les informations du document avec la liste des héros/équipements que l'utilisateur possède.
3. Ton ton est direct, impératif et précis. Pas de blabla.
4. Tu proposes des ACTIONS CONCRÈTES basées sur ce que l'utilisateur possède réellement.
5. Si l'utilisateur n'a pas les ressources nécessaires, tu proposes des alternatives avec ce qu'il a.

VARIABLES DISPONIBLES:
- {{STRATEGY_KNOWLEDGE}} : Document stratégique complet
- {{USER_CONTEXT}} : Données du joueur (héros, équipement, bâtiments)`,
  },
  ocr: {
    name: 'Analyse OCR/Image',
    template: `Tu es l'Oracle Stratégique, expert en analyse d'images du jeu Age of Empires Mobile.

TÂCHE SPÉCIALE - OCR/ANALYSE D'IMAGE:
Tu dois analyser la capture d'écran fournie et extraire TOUTES les informations visibles:
- Pour un héros: nom, niveau, étoiles, rôle, spécialité, stats, équipement visible, talents
- Pour l'équipement: nom, rareté (couleur), niveau, étoiles, stats, gemmes
- Pour un bâtiment: nom, niveau, coûts upgrade, temps, production si applicable
- Pour l'inventaire: liste COMPLÈTE de tous les items visibles

IMPORTANT: Si tu détectes que l'image ne montre pas TOUS les éléments (ex: inventaire tronqué), 
indique "complete": false et liste les "missingElements".

VARIABLES DISPONIBLES:
- {{STRATEGY_KNOWLEDGE}} : Document stratégique pour validation
- {{USER_CONTEXT}} : Données actuelles du joueur

RÉPONDS EN JSON STRUCTURÉ avec ce format exact:
{
  "type": "hero|equipment|building|profile|inventory",
  "confidence": 0.0-1.0,
  "data": { /* données extraites selon le type */ },
  "complete": true|false,
  "missingElements": ["liste des éléments non visibles si incomplet"]
}`,
  },
  hero: {
    name: 'Conseiller Héros',
    template: `Tu es l'Oracle Stratégique, expert en optimisation de héros d'Age of Empires Mobile.

FOCUS HÉROS - Tu dois:
1. Vérifier la configuration des talents (correct ou à réinitialiser?)
2. Analyser l'équipement optimal (a-t-il le meilleur disponible?)
3. Identifier les synergies avec d'autres héros possédés
4. Établir les priorités d'investissement

VARIABLES DISPONIBLES:
- {{STRATEGY_KNOWLEDGE}} : Stratégies et méta du jeu
- {{HERO_SYNERGIES}} : Synergies de héros documentées
- {{TALENT_PRIORITIES}} : Priorités de talents par rôle
- {{USER_CONTEXT}} : Héros et équipement du joueur`,
  },
  equipment: {
    name: 'Expert Équipement',
    template: `Tu es l'Oracle Stratégique, expert en équipement d'Age of Empires Mobile.

FOCUS ÉQUIPEMENT - Applique les règles:
- Épique 3★ > Légendaire 0★ TOUJOURS
- Vérifie les gemmes par rôle (Rouge/Jaune/Bleu)
- Propose des échanges optimaux entre héros
- Utilise la stratégie du "Pont Épique"

VARIABLES DISPONIBLES:
- {{STRATEGY_KNOWLEDGE}} : Règles d'équipement
- {{EQUIPMENT_PRIORITY}} : Gemmes recommandées par rôle
- {{USER_CONTEXT}} : Équipement actuel du joueur`,
  },
  building: {
    name: 'Architecte Bâtiments',
    template: `Tu es l'Oracle Stratégique, expert en construction d'Age of Empires Mobile.

FOCUS BÂTIMENTS - Tu dois analyser:
- Priorités d'upgrade (quel bâtiment améliorer en premier)
- Coûts et temps estimés
- Production actuelle vs potentielle
- ROI de chaque amélioration

VARIABLES DISPONIBLES:
- {{STRATEGY_KNOWLEDGE}} : Conseils de construction
- {{CIVILIZATION_TIPS}} : Bonus de civilisation
- {{USER_CONTEXT}} : Bâtiments et ressources du joueur`,
  },
  team: {
    name: 'Stratège Équipes',
    template: `Tu es l'Oracle Stratégique, expert en composition d'équipes d'Age of Empires Mobile.

FOCUS ÉQUIPES/SYNERGIES - Règles absolues:
- NE JAMAIS mélanger types d'unités (Cavalerie/Archers/Épéistes/Piquiers)
- 1 Maréchal (Leader) + DPS/Tacticiens
- Vérifie les synergies documentées avant de proposer

VARIABLES DISPONIBLES:
- {{STRATEGY_KNOWLEDGE}} : Meta et synergies
- {{HERO_SYNERGIES}} : Compositions recommandées
- {{USER_CONTEXT}} : Héros disponibles du joueur`,
  },
};

// Generate the actual system prompt with data
export function getSystemPrompt(context: AIContext): string {
  const basePrompt = SYSTEM_PROMPTS[context].template
    .replace('{{STRATEGY_KNOWLEDGE}}', STRATEGY_KNOWLEDGE)
    .replace('{{USER_CONTEXT}}', buildUserContext())
    .replace('{{HERO_SYNERGIES}}', JSON.stringify(HERO_SYNERGIES, null, 2))
    .replace('{{TALENT_PRIORITIES}}', JSON.stringify(TALENT_PRIORITIES, null, 2))
    .replace('{{EQUIPMENT_PRIORITY}}', JSON.stringify(EQUIPMENT_PRIORITY, null, 2))
    .replace('{{CIVILIZATION_TIPS}}', JSON.stringify(CIVILIZATION_TIPS, null, 2));
  
  return basePrompt;
}

// Get all strategy knowledge for display
export function getStrategyCodex(): { title: string; content: string }[] {
  return [
    { title: 'Civilisations & Bonus', content: extractSection(STRATEGY_KNOWLEDGE, '## 1. CIVILISATIONS', '## 2.') },
    { title: 'Système de Héros', content: extractSection(STRATEGY_KNOWLEDGE, '## 2. SYSTÈME', '## 3.') },
    { title: 'Système d\'Équipement', content: extractSection(STRATEGY_KNOWLEDGE, '## 3. SYSTÈME', '## 4.') },
    { title: 'Formules de Combat', content: extractSection(STRATEGY_KNOWLEDGE, '## 4. FORMULES', '## 5.') },
    { title: 'Modes de Jeu', content: extractSection(STRATEGY_KNOWLEDGE, '## 5. MODES', '## 6.') },
    { title: 'Synergies Héros', content: extractSection(STRATEGY_KNOWLEDGE, '## 6. SYNERGIES', '## 7.') },
    { title: 'Optimisations', content: extractSection(STRATEGY_KNOWLEDGE, '## 7. OPTIMISATIONS', '## 8.') },
    { title: 'Règles d\'Or de l\'IA', content: extractSection(STRATEGY_KNOWLEDGE, '## 8. RÈGLES', 'END') },
  ];
}

function extractSection(text: string, start: string, end: string): string {
  const startIdx = text.indexOf(start);
  if (startIdx === -1) return '';
  
  const endIdx = end === 'END' ? text.length : text.indexOf(end, startIdx);
  if (endIdx === -1) return text.slice(startIdx);
  
  return text.slice(startIdx, endIdx).trim();
}

// Helper to extract response content from Puter AI
function extractResponseContent(response: any): string {
  if (typeof response === 'string') {
    return response;
  }
  if (response?.message?.content) {
    return response.message.content;
  }
  if (response?.text) {
    return response.text;
  }
  if (response?.content) {
    return response.content;
  }
  return JSON.stringify(response);
}

// Main AI chat function
export async function chatWithAI(
  message: string,
  imageBase64?: string,
  context: AIContext = 'general',
  model?: AIModelId
): Promise<string> {
  if (!isPuterAvailable()) {
    throw new Error('Puter SDK non disponible. Veuillez recharger la page.');
  }
  
  const isSignedIn = isPuterSignedIn();
  if (!isSignedIn) {
    throw new Error('Veuillez vous connecter à Puter pour utiliser l\'IA.');
  }
  
  const settings = getSettings();
  const selectedModel = model || settings.ai.defaultModel || 'gemini-2.0-flash';
  const systemPrompt = getSystemPrompt(context);
  
  console.log('ChatWithAI:', { message: message.slice(0, 50), hasImage: !!imageBase64, model: selectedModel, context });
  
  try {
    let response: any;
    const fullPrompt = `${systemPrompt}\n\n---\nUtilisateur: ${message}`;
    
    if (imageBase64) {
      // Vision request with image - pass as second parameter
      console.log('Sending vision request with image...');
      response = await window.puter.ai.chat(
        fullPrompt,
        imageBase64,
        { model: selectedModel }
      );
    } else {
      // Text-only request
      console.log('Sending text request...');
      response = await window.puter.ai.chat(
        fullPrompt,
        { model: selectedModel }
      );
    }
    
    console.log('AI Response received:', typeof response, response);
    return extractResponseContent(response);
  } catch (error) {
    console.error('AI chat error:', error);
    throw new Error(`Erreur IA: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

// Multi-model AI request
export async function chatWithMultipleModels(
  message: string,
  imageBase64?: string,
  context: AIContext = 'general'
): Promise<{ model: string; response: string }[]> {
  const settings = getSettings();
  
  if (!settings.ai.multimodalEnabled || settings.ai.selectedModels.length <= 1) {
    const response = await chatWithAI(message, imageBase64, context);
    return [{ model: settings.ai.defaultModel, response }];
  }
  
  const modelsToUse = settings.ai.selectedModels.slice(0, settings.ai.modelCount);
  console.log('Multi-model request with:', modelsToUse);
  
  const results = await Promise.allSettled(
    modelsToUse.map(async (model) => {
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
    ? `Analyse cette capture d'écran d'Age of Empires Mobile. Détermine le type de contenu (héros, équipement, bâtiment, profil, inventaire) et extrais TOUTES les informations visibles en détail.`
    : `Analyse cette capture d'écran d'Age of Empires Mobile contenant un ${expectedType}. Extrais TOUTES les informations visibles en détail.`;

  console.log('Analyzing screenshot:', { expectedType, imageLength: imageBase64.length });

  try {
    const response = await chatWithAI(prompt, imageBase64, 'ocr');
    console.log('OCR Response:', response);
    
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
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
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    }
    
    // If no JSON, return raw text with basic analysis
    return {
      success: true,
      type: expectedType === 'auto' ? 'unknown' : expectedType,
      data: { rawResponse: response },
      confidence: 0.6,
      rawText: response,
    };
  } catch (error) {
    console.error('OCR error:', error);
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
