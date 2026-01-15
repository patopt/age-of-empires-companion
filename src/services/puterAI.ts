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
    template: `Tu es un expert OCR spécialisé dans Age of Empires Mobile.

RÈGLE ABSOLUE: Tu DOIS répondre UNIQUEMENT en JSON valide. Rien d'autre.

TÂCHE: Extrais TOUTES les informations visibles de l'image.

FORMAT DE RÉPONSE (JSON uniquement):
{
  "type": "hero|equipment|building|profile|inventory",
  "confidence": 0.0-1.0,
  "data": {
    // Pour hero: name, level, stars, role, specialty, rarity, might, strategy, siege, armor, power
    // Pour equipment: name, slot, rarity, level, stars, mainStat, mainStatValue
    // Pour building: name, level, maxLevel, category
    // Pour profile: name, level, power, civilization, resources
  }
}

EXEMPLES VALIDES:
Hero: {"type":"hero","confidence":0.95,"data":{"name":"Attila","level":30,"stars":4,"role":"warrior","specialty":"cavalry","might":450,"strategy":200}}
Equipment: {"type":"equipment","confidence":0.9,"data":{"name":"Épée Divine","slot":"weapon","rarity":"gold","level":50}}
Profile: {"type":"profile","confidence":0.95,"data":{"name":"Player123","level":45,"power":1250000,"civilization":"France"}}

NE RÉPONDS QU'AVEC LE JSON. PAS DE TEXTE AVANT OU APRÈS.`,
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

// Helper to prepare image for AI
function prepareImageForAI(imageBase64: string): string {
  if (imageBase64.startsWith('data:image')) {
    return imageBase64;
  }
  if (!imageBase64.includes('data:')) {
    return `data:image/png;base64,${imageBase64}`;
  }
  return imageBase64;
}

// Build optimized OCR prompt
function buildOCRPrompt(expectedType: string): string {
  const baseInstruction = `Tu es un expert OCR pour Age of Empires Mobile.

CRITIQUE: Tu DOIS répondre UNIQUEMENT avec du JSON valide. Pas de texte avant ou après.

`;

  const typeInstructions: Record<string, string> = {
    hero: `Analyse ce HÉROS et retourne ce JSON:
{
  "type": "hero",
  "confidence": 0.95,
  "data": {
    "name": "Nom exact du héros",
    "level": nombre,
    "stars": nombre,
    "role": "marshal|warrior|tactician",
    "specialty": "cavalry|archer|swordsman|pikeman",
    "rarity": "legendary|epic|rare|common",
    "might": nombre,
    "strategy": nombre,
    "siege": nombre,
    "armor": nombre,
    "power": nombre_total
  }
}`,

    equipment: `Analyse cet ÉQUIPEMENT et retourne ce JSON:
{
  "type": "equipment",
  "confidence": 0.95,
  "data": {
    "name": "Nom équipement",
    "slot": "weapon|helmet|armor|boots|accessory|ring",
    "rarity": "gold|purple|blue|green",
    "level": nombre,
    "stars": nombre,
    "mainStat": "stat principale",
    "mainStatValue": nombre
  }
}`,

    building: `Analyse ce BÂTIMENT et retourne ce JSON:
{
  "type": "building",
  "confidence": 0.95,
  "data": {
    "name": "Nom bâtiment",
    "level": nombre,
    "maxLevel": nombre,
    "category": "military|economic|research|defensive|production"
  }
}`,

    profile: `Analyse ce PROFIL et retourne ce JSON:
{
  "type": "profile",
  "confidence": 0.95,
  "data": {
    "name": "Nom joueur",
    "level": nombre,
    "power": nombre,
    "civilization": "civilisation",
    "resources": {
      "wood": nombre,
      "food": nombre,
      "stone": nombre,
      "gold": nombre
    }
  }
}`,

    auto: `Détermine le type (hero, equipment, building, profile, inventory) puis extrais les données en JSON.

Format:
{
  "type": "type_détecté",
  "confidence": 0.0-1.0,
  "data": { /* selon type */ }
}`
  };

  return baseInstruction + (typeInstructions[expectedType] || typeInstructions.auto) + '\n\nJSON UNIQUEMENT:';
}

// Parse OCR response with multiple strategies
function parseOCRResponse(response: string, expectedType: string): OCRResult {
  console.log('Parsing OCR response...');

  // Strategy 1: Direct JSON
  try {
    const parsed = JSON.parse(response);
    if (parsed.type && parsed.data) {
      console.log('✓ Direct JSON parse');
      return {
        success: true,
        type: parsed.type,
        data: parsed.data,
        confidence: parsed.confidence || 0.85,
        rawText: response,
        needsMoreScreenshots: parsed.complete === false,
        missingElements: parsed.missingElements,
      };
    }
  } catch (e) {
    console.log('✗ Direct JSON failed');
  }

  // Strategy 2: Code block JSON
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      console.log('✓ Code block JSON parse');
      return {
        success: true,
        type: parsed.type || expectedType,
        data: parsed.data || parsed,
        confidence: parsed.confidence || 0.8,
        rawText: response,
        needsMoreScreenshots: parsed.complete === false,
        missingElements: parsed.missingElements,
      };
    } catch (e) {
      console.log('✗ Code block JSON failed');
    }
  }

  // Strategy 3: Find any JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✓ Regex JSON parse');
      return {
        success: true,
        type: parsed.type || expectedType,
        data: parsed.data || parsed,
        confidence: parsed.confidence || 0.75,
        rawText: response,
        needsMoreScreenshots: parsed.complete === false,
        missingElements: parsed.missingElements,
      };
    } catch (e) {
      console.log('✗ Regex JSON failed');
    }
  }

  // Strategy 4: Text extraction
  console.log('Attempting text extraction...');
  const extractedData = extractDataFromText(response, expectedType);
  if (extractedData && Object.keys(extractedData).length > 0) {
    console.log('✓ Text extraction successful');
    return {
      success: true,
      type: expectedType === 'auto' ? 'unknown' : expectedType,
      data: extractedData,
      confidence: 0.6,
      rawText: response,
    };
  }

  // Fallback
  console.log('⚠ All strategies failed');
  return {
    success: true,
    type: expectedType === 'auto' ? 'unknown' : expectedType,
    data: { rawResponse: response },
    confidence: 0.5,
    rawText: response,
  };
}

// Extract data from text
function extractDataFromText(text: string, expectedType: string): any | null {
  const data: any = {};

  const nameMatch = text.match(/(?:nom|name)[:\s]+([^\n,]+)/i);
  if (nameMatch) data.name = nameMatch[1].trim();

  const levelMatch = text.match(/(?:niveau|level|niv|lv)[:\s]+(\d+)/i);
  if (levelMatch) data.level = parseInt(levelMatch[1]);

  const starsMatch = text.match(/(?:étoiles?|stars?)[:\s]+(\d+)/i);
  if (starsMatch) data.stars = parseInt(starsMatch[1]);

  const powerMatch = text.match(/(?:puissance|power)[:\s]+([\d,]+)/i);
  if (powerMatch) data.power = parseInt(powerMatch[1].replace(/,/g, ''));

  if (expectedType === 'hero') {
    const mightMatch = text.match(/(?:force|might)[:\s]+(\d+)/i);
    if (mightMatch) data.might = parseInt(mightMatch[1]);

    const strategyMatch = text.match(/(?:stratégie|strategy)[:\s]+(\d+)/i);
    if (strategyMatch) data.strategy = parseInt(strategyMatch[1]);

    const roleMatch = text.match(/(?:rôle|role)[:\s]+(marshal|warrior|tactician)/i);
    if (roleMatch) data.role = roleMatch[1].toLowerCase();
  }

  return Object.keys(data).length > 0 ? data : null;
}

// OCR Analysis function - IMPROVED
export async function analyzeScreenshot(
  imageBase64: string,
  expectedType: 'hero' | 'equipment' | 'building' | 'profile' | 'inventory' | 'auto'
): Promise<OCRResult> {
  console.log('=== OCR START ===');
  console.log('Type:', expectedType);
  console.log('Image length:', imageBase64.length);

  const preparedImage = prepareImageForAI(imageBase64);
  const prompt = buildOCRPrompt(expectedType);

  try {
    const response = await chatWithAI(prompt, preparedImage, 'ocr', 'gemini-2.0-flash');
    console.log('=== OCR RESPONSE ===');
    console.log('Length:', response.length);
    console.log('Preview:', response.substring(0, 200));

    const parsed = parseOCRResponse(response, expectedType);
    console.log('=== PARSED ===', parsed);

    return parsed;
  } catch (error) {
    console.error('=== OCR ERROR ===', error);
    return {
      success: false,
      type: 'unknown',
      data: null,
      confidence: 0,
      rawText: error instanceof Error ? error.message : 'Erreur analyse',
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
