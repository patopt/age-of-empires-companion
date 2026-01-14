// ========================================
// AGE OF EMPIRES MOBILE - STRATEGY KNOWLEDGE BASE
// All strategy info from the research document
// ========================================

export const STRATEGY_KNOWLEDGE = `
# RAPPORT TECHNIQUE EXHAUSTIF : AGE OF EMPIRES MOBILE

## 1. CIVILISATIONS ET BONUS

### Tableau des Civilisations
| Civilisation | Spécialisation | Bonus Économique | Unité Unique | Profil Recommandé |
|--------------|----------------|------------------|--------------|-------------------|
| Chinoise | Défense Archers +5% | Capacité Villageois +8, Murs +10% | Chu Ko Nu | Boom économique (Start) |
| Française | Défense Cavalerie +5% | Échange +5%, Défense Récolte +10% | Lanceur de Haches | Cavalerie/Commerce |
| Romaine | Défense Piquiers +5% | Soin +5%, Production +30 | Phalange | Guerre d'usure |
| Byzantine | Défense Épéistes +5% | Siège +5%, Pierre +5% | Cataphracte | Leader de Rallye |
| Japonaise | Défense Épéistes +5% | Citadelles +5%, Tribus +10% | Samouraï | PvE/Raid |
| Coréenne | Défense Cavalerie +5% | Pillage +500k, Entrepôt +10% | N/A | Pillard |
| Britannique | Défense Archers +5% | Citadelle +10%, Moulins +5% | Longbowman | Défense |
| Égyptienne | Défense Piquiers +5% | Charge +5%, Pertes Récolte -5% | N/A | Support/Farm |

### Stratégies Civiles
- **Start Chinois** : OBLIGATOIRE pour les 30 premiers jours (+8 villageois = snowball économique)
- **Migration niveau 20-25** : Changer vers France/Rome/Byzance pour la spécialisation militaire
- **Siège Byzantin** : +5% dégâts de siège s'applique à TOUTES les unités, pas seulement les machines
- **Romains pour Whales** : Le bonus soin +5% réduit le downtime pour les gros dépenseurs

## 2. SYSTÈME DE HÉROS

### Taxonomie des Rôles
- **Maréchal (Marshal)** : Bonus passifs à l'armée (santé, défense, capacité) → Position Leader
  - Exemples : Frédéric Barberousse, Ram Khamhaeng
- **Guerrier (Warrior)** : Dégâts physiques, attaques normales, frappes secondaires
  - Exemples : Miyamoto Musashi, Attila, Lu Bu
- **Tacticien (Tactician)** : Dégâts de compétence, régénération rage
  - Exemples : Sun Tzu, Theodora, Cléopâtre VII

### Spécialités d'Unité (NE JAMAIS MÉLANGER)
- Cavalerie → Archers → Épéistes → Piquiers → Cavalerie

### Héros Meta-Defining
1. **Attila le Hun (S-Tier)** : 35% double attaque, multiplicateur de force, investissement prioritaire
2. **Theodora (S-Tier)** : Anti-nuke, purification, -30% dégâts première compétence
3. **Miyamoto Musashi (A-Tier)** : Best F2P, frappe secondaire massive, mais fragile

### Arbres de Talents
- **Guerriers** : Dégâts Attaque Normale + Force (Might)
- **Tacticiens** : Régénération Rage + Dégâts Compétence Active
- **RÈGLE D'OR** : Ne JAMAIS mélanger Combat Ouvert et Rallye

## 3. SYSTÈME D'ÉQUIPEMENT

### Stratégie du "Pont Épique"
- Épique 3★ > Légendaire 0★ TOUJOURS
- Maximiser Épique PUIS utiliser Reset pour récupérer 100% des matériaux
- Transition vers Légendaire seulement à 1-2★ minimum

### Gemmes par Rôle
| Rôle | Rouge | Jaune | Bleue |
|------|-------|-------|-------|
| Guerrier | Force | Critique/Frappe Secondaire | PV |
| Tacticien | Stratégie | Dégâts Compétence | Défense |
| Maréchal | Armure | Capacité Unité | PV |

### Farming Équipement
- Source principale : Tactiques de l'Île → viser niveau 800+
- Boutique hebdomadaire : TOUJOURS acheter Points Compétence + Plans

## 4. FORMULES DE COMBAT

### Coefficients d'Attributs
| Attribut | Effet | Coefficient | Notes |
|----------|-------|-------------|-------|
| Force | Attaque/Défense Physique | 0.15%/pt | Standard |
| Stratégie | Attaque/Défense Tactique | 0.15%/pt | Standard |
| Siège | Dégâts Bâtiments | 0.30%/pt | DOUBLE! Prioritaire pour sièges |
| Armure | Mitigation | 0.15% (stats) / 0.30% (skills) | Double pour skills défensifs |

### Système de Contre
- Épéistes > Piquiers > Cavalerie > Archers > Épéistes
- Les Épéistes ont la défense la plus élevée (Tanks)
- Les Archers ont l'attaque la plus élevée mais fragiles

## 5. MODES DE JEU

### Guerre de Siège
- Machines de Guerre : Trébuchets (murs) + Béliers (portes)
- **Triple Formation** : Josephine + Hammurabi + King Derrick
- King Derrick : 40% morts → blessés (économie massive)
- Zeroing : Durabilité 0 = téléportation forcée + debuff 1h

### Événements Clés
- **Avènement Légendaire** : Source de médailles héros, NE PAS dépenser hors événement
- **Troubles de Troie** : PvE hebdo, coordination alliance requise

## 6. SYNERGIES HÉROS RECOMMANDÉES

| Principal | Secondaire | Unité | Objectif |
|-----------|------------|-------|----------|
| Attila | Miyamoto | Cavalerie | AOE + Double Attaque |
| Richard I | Barberousse | Piquiers | Tanking pur |
| Theodora | Cléopâtre | Épéistes | Anti-Nuke + Soin |
| Josephine | Hammurabi | Siège | Destruction murs |

## 7. OPTIMISATIONS PARAMÈTRES
- Mode High FPS : ACTIVÉ (réduit input lag)
- Auto Qualité : DÉSACTIVÉ (évite freezes)
- Économie Énergie : DÉSACTIVÉ en PvP

## 8. RÈGLES D'OR DE L'IA

1. Priorité civile : Chine → migration vers guerre
2. Équipement : Épique 3★ > Légendaire 0★
3. Synergies : NE JAMAIS mélanger types d'unités
4. Durabilité : Siège lineup (Hammurabi) vs bâtiments, DPS (Miyamoto) vs unités
5. Saisonnalité : Attila et Theodora sont future-proof
`;

export const HERO_SYNERGIES = [
  { commander: 'Attila', lieutenant: 'Miyamoto Musashi', specialty: 'cavalry', objective: 'AOE + Double Attaque fréquente' },
  { commander: 'Richard I', lieutenant: 'Frédéric Barberousse', specialty: 'pikeman', objective: 'Tanking pur, tenir position' },
  { commander: 'Theodora', lieutenant: 'Cléopâtre VII', specialty: 'swordsman', objective: 'Anti-Nuke + Soin continu' },
  { commander: 'Josephine', lieutenant: 'Hammurabi', specialty: 'siege', objective: 'Destruction rapide de murs' },
  { commander: 'Jeanne d\'Arc', lieutenant: 'Harald III', specialty: 'cavalry', objective: 'Buff zone + Burst damage' },
  { commander: 'Sun Tzu', lieutenant: 'Yi Seong-Gye', specialty: 'archer', objective: 'Dégâts de compétence massifs' },
];

export const TALENT_PRIORITIES = {
  warrior: ['Dégâts Attaque Normale', 'Force (Might)', 'Critique', 'Frappe Secondaire'],
  tactician: ['Régénération Rage', 'Dégâts Compétence Active', 'Stratégie', 'Cooldown Réduction'],
  marshal: ['Capacité Unité', 'Défense', 'PV', 'Armure'],
};

export const EQUIPMENT_PRIORITY = {
  warrior: { mainStat: 'Force', gems: { red: 'Force', yellow: 'Critique', blue: 'PV' } },
  tactician: { mainStat: 'Stratégie', gems: { red: 'Stratégie', yellow: 'Dégâts Compétence', blue: 'Défense' } },
  marshal: { mainStat: 'Armure', gems: { red: 'Armure', yellow: 'Capacité Unité', blue: 'PV' } },
};

export const CIVILIZATION_TIPS = {
  chinese: { start: true, bonus: '+8 Villageois', recommendation: 'Obligatoire pour démarrer' },
  french: { start: false, bonus: 'Cavalerie +5%', recommendation: 'Migration niveau 20+' },
  roman: { start: false, bonus: 'Soin +5%', recommendation: 'Pour whales/guerre longue' },
  byzantine: { start: false, bonus: 'Siège +5%', recommendation: 'Leader de rallye' },
};
