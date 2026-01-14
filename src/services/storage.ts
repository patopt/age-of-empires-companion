// ========================================
// LOCAL STORAGE SERVICE - PERSISTENT DATA
// ========================================

import { 
  Hero, 
  EquipmentItem, 
  Building, 
  PlayerProfile, 
  AppSettings,
  Team,
  Variable,
  AIMessage 
} from '@/types/game';

const STORAGE_KEYS = {
  PLAYER: 'aoe_player_profile',
  HEROES: 'aoe_heroes',
  EQUIPMENT: 'aoe_equipment',
  BUILDINGS: 'aoe_buildings',
  SETTINGS: 'aoe_settings',
  TEAMS: 'aoe_teams',
  AI_HISTORY: 'aoe_ai_history',
  VARIABLES: 'aoe_variables',
};

// Generic storage helpers
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Storage error:', error);
  }
}

// Player Profile
export function getPlayerProfile(): PlayerProfile | null {
  return getItem<PlayerProfile | null>(STORAGE_KEYS.PLAYER, null);
}

export function setPlayerProfile(profile: PlayerProfile): void {
  setItem(STORAGE_KEYS.PLAYER, profile);
  updateVariables();
}

// Heroes
export function getHeroes(): Hero[] {
  return getItem<Hero[]>(STORAGE_KEYS.HEROES, []);
}

export function setHeroes(heroes: Hero[]): void {
  setItem(STORAGE_KEYS.HEROES, heroes);
  updateVariables();
}

export function addHero(hero: Hero): void {
  const heroes = getHeroes();
  const existing = heroes.findIndex(h => h.id === hero.id);
  if (existing >= 0) {
    heroes[existing] = hero;
  } else {
    heroes.push(hero);
  }
  setHeroes(heroes);
}

export function updateHero(id: string, updates: Partial<Hero>): void {
  const heroes = getHeroes();
  const index = heroes.findIndex(h => h.id === id);
  if (index >= 0) {
    heroes[index] = { ...heroes[index], ...updates, lastUpdated: new Date().toISOString() };
    setHeroes(heroes);
  }
}

export function deleteHero(id: string): void {
  const heroes = getHeroes().filter(h => h.id !== id);
  setHeroes(heroes);
}

// Equipment
export function getEquipment(): EquipmentItem[] {
  return getItem<EquipmentItem[]>(STORAGE_KEYS.EQUIPMENT, []);
}

export function setEquipment(equipment: EquipmentItem[]): void {
  setItem(STORAGE_KEYS.EQUIPMENT, equipment);
  updateVariables();
}

export function addEquipment(item: EquipmentItem): void {
  const equipment = getEquipment();
  const existing = equipment.findIndex(e => e.id === item.id);
  if (existing >= 0) {
    equipment[existing] = item;
  } else {
    equipment.push(item);
  }
  setEquipment(equipment);
}

export function updateEquipment(id: string, updates: Partial<EquipmentItem>): void {
  const equipment = getEquipment();
  const index = equipment.findIndex(e => e.id === id);
  if (index >= 0) {
    equipment[index] = { ...equipment[index], ...updates, lastUpdated: new Date().toISOString() };
    setEquipment(equipment);
  }
}

// Buildings
export function getBuildings(): Building[] {
  return getItem<Building[]>(STORAGE_KEYS.BUILDINGS, []);
}

export function setBuildings(buildings: Building[]): void {
  setItem(STORAGE_KEYS.BUILDINGS, buildings);
  updateVariables();
}

export function addBuilding(building: Building): void {
  const buildings = getBuildings();
  const existing = buildings.findIndex(b => b.id === building.id);
  if (existing >= 0) {
    buildings[existing] = building;
  } else {
    buildings.push(building);
  }
  setBuildings(buildings);
}

export function updateBuilding(id: string, updates: Partial<Building>): void {
  const buildings = getBuildings();
  const index = buildings.findIndex(b => b.id === id);
  if (index >= 0) {
    buildings[index] = { ...buildings[index], ...updates, lastUpdated: new Date().toISOString() };
    setBuildings(buildings);
  }
}

// Teams
export function getTeams(): Team[] {
  return getItem<Team[]>(STORAGE_KEYS.TEAMS, []);
}

export function setTeams(teams: Team[]): void {
  setItem(STORAGE_KEYS.TEAMS, teams);
}

export function addTeam(team: Team): void {
  const teams = getTeams();
  teams.push(team);
  setTeams(teams);
}

// Settings
export function getSettings(): AppSettings {
  return getItem<AppSettings>(STORAGE_KEYS.SETTINGS, {
    puterConnected: false,
    ai: {
      multimodalEnabled: false,
      selectedModels: ['gemini-2.0-flash'],
      modelCount: 1,
      defaultModel: 'gemini-2.0-flash',
    },
  });
}

export function setSettings(settings: AppSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

export function updateSettings(updates: Partial<AppSettings>): void {
  const settings = getSettings();
  setSettings({ ...settings, ...updates });
}

// AI Chat History
export function getAIHistory(): AIMessage[] {
  return getItem<AIMessage[]>(STORAGE_KEYS.AI_HISTORY, []);
}

export function setAIHistory(messages: AIMessage[]): void {
  setItem(STORAGE_KEYS.AI_HISTORY, messages);
}

export function addAIMessage(message: AIMessage): void {
  const history = getAIHistory();
  history.push(message);
  // Keep last 100 messages
  if (history.length > 100) {
    history.splice(0, history.length - 100);
  }
  setAIHistory(history);
}

export function clearAIHistory(): void {
  setAIHistory([]);
}

// Variables System
export function getVariables(): Variable[] {
  return getItem<Variable[]>(STORAGE_KEYS.VARIABLES, []);
}

function updateVariables(): void {
  const player = getPlayerProfile();
  const heroes = getHeroes();
  const equipment = getEquipment();
  const buildings = getBuildings();
  
  const variables: Variable[] = [];
  
  // Player variables
  if (player) {
    variables.push(
      { key: 'player_name', name: 'Nom du joueur', value: player.name, type: 'player', description: 'Votre nom de joueur', linkedTo: 'Profil' },
      { key: 'player_level', name: 'Niveau', value: player.level, type: 'player', description: 'Niveau du compte', linkedTo: 'Profil' },
      { key: 'player_power', name: 'Puissance', value: player.power, type: 'player', description: 'Puissance totale', linkedTo: 'Profil' },
      { key: 'player_civ', name: 'Civilisation', value: player.civilization, type: 'player', description: 'Civilisation actuelle', linkedTo: 'Profil' },
      { key: 'resource_wood', name: 'Bois', value: player.resources.wood, type: 'resource', description: 'Stock de bois', linkedTo: 'Ressources' },
      { key: 'resource_food', name: 'Nourriture', value: player.resources.food, type: 'resource', description: 'Stock de nourriture', linkedTo: 'Ressources' },
      { key: 'resource_stone', name: 'Pierre', value: player.resources.stone, type: 'resource', description: 'Stock de pierre', linkedTo: 'Ressources' },
      { key: 'resource_gold', name: 'Or', value: player.resources.gold, type: 'resource', description: 'Stock d\'or', linkedTo: 'Ressources' },
    );
  }
  
  // Hero variables
  heroes.forEach((hero, idx) => {
    variables.push(
      { key: `hero_${idx}_name`, name: `Héros ${idx + 1}`, value: hero.name, type: 'hero', description: `Nom du héros`, linkedTo: `Héros: ${hero.name}` },
      { key: `hero_${idx}_level`, name: `Niveau ${hero.name}`, value: hero.level, type: 'hero', description: `Niveau du héros`, linkedTo: `Héros: ${hero.name}` },
      { key: `hero_${idx}_power`, name: `Puissance ${hero.name}`, value: hero.power, type: 'hero', description: `Puissance du héros`, linkedTo: `Héros: ${hero.name}` },
      { key: `hero_${idx}_status`, name: `Status ${hero.name}`, value: hero.optimizationStatus, type: 'hero', description: `État d'optimisation`, linkedTo: `Héros: ${hero.name}` },
    );
  });
  
  // Equipment count
  variables.push(
    { key: 'equipment_total', name: 'Total équipements', value: equipment.length, type: 'equipment', description: 'Nombre total d\'équipements', linkedTo: 'Inventaire' },
    { key: 'equipment_legendary', name: 'Équipements Légendaires', value: equipment.filter(e => e.rarity === 'gold').length, type: 'equipment', description: 'Équipements dorés', linkedTo: 'Inventaire' },
    { key: 'equipment_epic', name: 'Équipements Épiques', value: equipment.filter(e => e.rarity === 'purple').length, type: 'equipment', description: 'Équipements violets', linkedTo: 'Inventaire' },
  );
  
  // Building variables
  buildings.forEach((building, idx) => {
    variables.push(
      { key: `building_${idx}_name`, name: building.name, value: building.level, type: 'building', description: `Niveau du bâtiment`, linkedTo: `Bâtiments: ${building.name}` },
    );
  });
  
  // Strategy variables
  variables.push(
    { key: 'strategy_hero_count', name: 'Nombre de héros', value: heroes.length, type: 'strategy', description: 'Total héros scannés', linkedTo: 'Stratégie' },
    { key: 'strategy_optimal_heroes', name: 'Héros optimisés', value: heroes.filter(h => h.optimizationStatus === 'optimal').length, type: 'strategy', description: 'Héros 100% optimaux', linkedTo: 'Stratégie' },
    { key: 'strategy_needs_work', name: 'Héros à optimiser', value: heroes.filter(h => h.optimizationStatus !== 'optimal').length, type: 'strategy', description: 'Héros nécessitant attention', linkedTo: 'Stratégie' },
  );
  
  setItem(STORAGE_KEYS.VARIABLES, variables);
}

// Export all data (for backup)
export function exportAllData(): string {
  return JSON.stringify({
    player: getPlayerProfile(),
    heroes: getHeroes(),
    equipment: getEquipment(),
    buildings: getBuildings(),
    teams: getTeams(),
    settings: getSettings(),
    aiHistory: getAIHistory(),
    exportDate: new Date().toISOString(),
  });
}

// Import data (from backup)
export function importData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);
    if (data.player) setPlayerProfile(data.player);
    if (data.heroes) setHeroes(data.heroes);
    if (data.equipment) setEquipment(data.equipment);
    if (data.buildings) setBuildings(data.buildings);
    if (data.teams) setTeams(data.teams);
    if (data.settings) setSettings(data.settings);
    if (data.aiHistory) setAIHistory(data.aiHistory);
    return true;
  } catch {
    return false;
  }
}

// Clear all data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
