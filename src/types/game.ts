// ========================================
// AGE OF EMPIRES MOBILE - TYPE DEFINITIONS
// ========================================

export type HeroRole = 'marshal' | 'warrior' | 'tactician';
export type HeroSpecialty = 'cavalry' | 'archer' | 'swordsman' | 'pikeman';
export type HeroRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type EquipmentSlot = 'weapon' | 'helmet' | 'armor' | 'boots' | 'accessory' | 'ring';
export type EquipmentRarity = 'green' | 'blue' | 'purple' | 'gold';
export type BuildingCategory = 'military' | 'economic' | 'research' | 'defensive' | 'production';

export interface Hero {
  id: string;
  name: string;
  level: number;
  stars: number;
  role: HeroRole;
  specialty: HeroSpecialty;
  rarity: HeroRarity;
  power: number;
  imageUrl?: string;
  
  // Stats
  might: number;
  strategy: number;
  siege: number;
  armor: number;
  
  // Equipment
  equipment: EquipmentItem[];
  
  // Talents
  talentsConfigured: boolean;
  talentBuild?: string;
  talentIssues?: string[];
  
  // Optimization status
  optimizationStatus: 'optimal' | 'needs-talents' | 'needs-equipment' | 'needs-both';
  
  // Additional info
  notes?: string;
  lastUpdated: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  level: number;
  stars: number;
  maxStars: number;
  
  // Stats
  mainStat: string;
  mainStatValue: number;
  secondaryStats?: Record<string, number>;
  
  // Gems
  gemSlots: number;
  gems?: Gem[];
  
  // Equipped to
  equippedTo?: string;
  
  notes?: string;
  lastUpdated: string;
}

export interface Gem {
  id: string;
  name: string;
  type: 'red' | 'yellow' | 'blue';
  level: number;
  stat: string;
  value: number;
}

export interface Building {
  id: string;
  name: string;
  category: BuildingCategory;
  level: number;
  maxLevel: number;
  
  // Upgrade info
  upgradeRequirements?: {
    wood?: number;
    food?: number;
    stone?: number;
    gold?: number;
    time?: string;
  };
  
  // Production buildings
  isProduction: boolean;
  productionRate?: {
    resource: string;
    perHour: number;
    capacity: number;
  };
  
  // Benefits
  benefits?: string[];
  
  notes?: string;
  lastUpdated: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  level: number;
  power: number;
  civilization: string;
  alliance?: string;
  
  // Resources
  resources: {
    wood: number;
    food: number;
    stone: number;
    gold: number;
    gems?: number;
  };
  
  // Stats
  heroCount: number;
  buildingCount: number;
  equipmentCount: number;
  
  lastUpdated: string;
}

export interface AISettings {
  multimodalEnabled: boolean;
  selectedModels: string[];
  modelCount: number;
  defaultModel: string;
}

export interface AppSettings {
  puterConnected: boolean;
  puterUsername?: string;
  ai: AISettings;
  lastSync?: string;
}

export interface Variable {
  key: string;
  name: string;
  value: any;
  type: 'player' | 'hero' | 'equipment' | 'building' | 'resource' | 'strategy';
  description: string;
  linkedTo: string;
}

export interface OCRResult {
  success: boolean;
  type: 'hero' | 'equipment' | 'building' | 'profile' | 'inventory' | 'unknown';
  data: any;
  confidence: number;
  rawText?: string;
  needsMoreScreenshots?: boolean;
  missingElements?: string[];
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  imageUrl?: string;
  actions?: AIAction[];
}

export interface AIAction {
  id: string;
  type: 'update_hero' | 'update_equipment' | 'update_building' | 'suggest_team' | 'fix_talents';
  label: string;
  description: string;
  data: any;
  confirmed: boolean;
}

export interface Team {
  id: string;
  name: string;
  mode: 'pvp' | 'siege' | 'harvest' | 'pve';
  commander: Hero | null;
  lieutenants: (Hero | null)[];
  synergies: string[];
  winRate?: number;
  notes?: string;
}

// Available AI Models via Puter
export const AI_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Fast & efficient for OCR' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', description: 'Balanced performance' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', provider: 'Google', description: 'Latest & most capable' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', provider: 'Google', description: 'Most accurate analysis' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Excellent reasoning' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Great for complex tasks' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast & cost-effective' },
] as const;

export type AIModelId = typeof AI_MODELS[number]['id'];
