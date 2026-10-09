import type { Experience, QuestItemKind, QuestUnit, Rank } from '../domain/types';

/**
 * ALL game-balance numbers live here. Change them to rebalance the game;
 * the unit tests read these values, so they keep passing after tweaks
 * unless a rule itself breaks.
 */

export interface TierItem {
  kind: QuestItemKind;
  label: string;
  easier: string;
  target: number;
  unit: QuestUnit;
}

export interface TierPenalty {
  label: string;
  easier: string;
  target: number;
  unit: QuestUnit;
}

export interface ProgressionConfig {
  xpCurve: { base: number; exponent: number };
  rankThresholds: ReadonlyArray<{ rank: Rank; minLevel: number }>;
  statPointsPerLevel: number;
  statPointsPerRankUp: number;
  startingStatValue: number;
  defaultTitle: string;
  dailyQuest: {
    baseXp: number;
    xpPerLevel: number;
    scalePerLevel: number;
    maxScale: number;
    weeklyGrowthCap: number;
  };
  tiers: Record<Experience, TierItem[]>;
  penalty: { xp: number; byTier: Record<Experience, TierPenalty> };
  urgent: { chance: number; xp: number; tasks: readonly string[] };
  sideQuest: { minXp: number; maxXp: number; completionsPerStatPoint: number };
  exerciseRank: ReadonlyArray<{ rank: Rank; minRatio: number }>;
  training: {
    setsByTier: Record<Experience, number>;
    repsByTier: Record<Experience, number>;
    weeklyVolumeCap: number;
  };
  boss: {
    sessionsToWin: number;
    sessionDamage: number;
    weaknessMultiplier: number;
    chip: { sideQuest: number; penalty: number };
    trainingDailyCapSessions: number;
    defaultSetsPerDay: number;
    scale: { perLevel: number; byTier: Record<Experience, number> };
    xpReward: { base: number; perLevel: number };
  };
  items: {
    /** Streak Shields a player can hold at once. */
    maxShields: number;
    /** A drop every N days of streak (7, 14, 21 …). */
    streakDropEvery: number;
    /** Chance of each kind per drop, by source. Each row adds up to 1. */
    dropRates: Record<'boss' | 'streak' | 'rankUp', { theme: number; frame: number; title: number; shield: number }>;
  };
  classes: {
    /** Level at which the Class Change Trial unlocks. */
    unlockLevel: number;
    /** Days between class choices. */
    changeCooldownDays: number;
    /** Trial targets = daily targets × this. */
    trialScale: number;
    /** Daily target change for the class's focus item (+) and the other items (−). */
    focusBoost: number;
    otherCut: number;
    /** Extra XP share on side quests for the class's stat. */
    sideQuestXpBonus: number;
  };
}

export const progression: ProgressionConfig = {
  /** XP needed to go from level L to L+1 = round(base × L^exponent). */
  xpCurve: { base: 80, exponent: 1.3 },
  /** Checked top-down: the first entry whose minLevel ≤ level wins. */
  rankThresholds: [
    { rank: 'S', minLevel: 70 },
    { rank: 'A', minLevel: 50 },
    { rank: 'B', minLevel: 35 },
    { rank: 'C', minLevel: 20 },
    { rank: 'D', minLevel: 10 },
    { rank: 'E', minLevel: 1 },
  ],
  statPointsPerLevel: 3,
  statPointsPerRankUp: 5,
  startingStatValue: 10,
  defaultTitle: 'Novice',
  dailyQuest: {
    /** Full daily quest XP = baseXp + xpPerLevel × level */
    baseXp: 60,
    xpPerLevel: 5,
    /** Targets grow 5 % per level above 1, up to 2× the tier's base */
    scalePerLevel: 0.05,
    maxScale: 2,
    /** No target may exceed the reference quest from ≥ 7 days earlier by more than 10 % (min +1) */
    weeklyGrowthCap: 0.1,
  },
  tiers: {
    never: [
      { kind: 'pushups', label: 'Knee or wall push-ups', easier: 'Wall push-ups', target: 5, unit: 'reps' },
      { kind: 'situps', label: 'Crunches', easier: 'Half crunches', target: 10, unit: 'reps' },
      { kind: 'squats', label: 'Chair squats', easier: 'Sit-to-stand from a high chair', target: 10, unit: 'reps' },
      { kind: 'cardio', label: 'Walk', easier: 'Slow walk', target: 10, unit: 'min' },
    ],
    beginner: [
      { kind: 'pushups', label: 'Push-ups', easier: 'Knee or wall push-ups', target: 10, unit: 'reps' },
      { kind: 'situps', label: 'Sit-ups', easier: 'Crunches', target: 15, unit: 'reps' },
      { kind: 'squats', label: 'Squats', easier: 'Chair squats', target: 15, unit: 'reps' },
      { kind: 'cardio', label: 'Walk', easier: 'Slow walk', target: 15, unit: 'min' },
    ],
    intermediate: [
      { kind: 'pushups', label: 'Push-ups', easier: 'Knee push-ups', target: 20, unit: 'reps' },
      { kind: 'situps', label: 'Sit-ups', easier: 'Crunches', target: 25, unit: 'reps' },
      { kind: 'squats', label: 'Squats', easier: 'Chair squats', target: 30, unit: 'reps' },
      { kind: 'cardio', label: 'Jog', easier: 'Brisk walk', target: 20, unit: 'min' },
    ],
    advanced: [
      { kind: 'pushups', label: 'Push-ups', easier: 'Knee push-ups', target: 30, unit: 'reps' },
      { kind: 'situps', label: 'Sit-ups', easier: 'Crunches', target: 40, unit: 'reps' },
      { kind: 'squats', label: 'Squats', easier: 'Chair squats', target: 40, unit: 'reps' },
      { kind: 'cardio', label: 'Run', easier: 'Jog or brisk walk', target: 25, unit: 'min' },
    ],
  },
  penalty: {
    xp: 20,
    byTier: {
      never: { label: 'Walk', easier: 'Slow walk', target: 10, unit: 'min' },
      beginner: { label: 'Squats', easier: 'Chair squats', target: 15, unit: 'reps' },
      intermediate: { label: 'Squats', easier: 'Chair squats', target: 20, unit: 'reps' },
      advanced: { label: 'Squats', easier: 'Chair squats', target: 25, unit: 'reps' },
    },
  },
  urgent: {
    chance: 0.3,
    xp: 25,
    tasks: [
      'Hold a plank for 30 seconds',
      'Drink a full glass of water',
      'Stretch for 5 minutes',
      'Take a 10-minute walk',
      'Do 10 slow squats',
    ],
  },
  sideQuest: { minXp: 10, maxXp: 50, completionsPerStatPoint: 5 },
  /** Best result ÷ your first-session best. Checked top-down. */
  exerciseRank: [
    { rank: 'S', minRatio: 2 },
    { rank: 'A', minRatio: 1.75 },
    { rank: 'B', minRatio: 1.5 },
    { rank: 'C', minRatio: 1.25 },
    { rank: 'D', minRatio: 1.1 },
    { rank: 'E', minRatio: 0 },
  ],
  training: {
    setsByTier: { never: 2, beginner: 2, intermediate: 3, advanced: 4 },
    repsByTier: { never: 8, beginner: 10, intermediate: 10, advanced: 10 },
    /** Planned weekly volume (sets × reps) may grow at most 10 % week over week */
    weeklyVolumeCap: 0.1,
  },
  boss: {
    /** Full sessions (a whole daily quest, or a training day) needed to beat a Boss, for everyone. */
    sessionsToWin: 3,
    /** Damage one full session deals before scaling (a daily item deals sessionDamage ÷ item count). */
    sessionDamage: 100,
    /** Hits that match the Boss's weakness deal this many times the damage. */
    weaknessMultiplier: 2,
    /**
     * Chip damage, as a fraction of a session: side quest, penalty quest.
     * No daily limit on side-quest chips — owner's decision (2026-09-28).
     */
    chip: { sideQuest: 0.1, penalty: 0.25 },
    /** Most base training damage one day of logged sets can deal, in sessions. */
    trainingDailyCapSessions: 1,
    /** Sets per training day assumed when there is no plan for the week. */
    defaultSetsPerDay: 8,
    /** HP and damage both grow by this scale (so effort stays the same): tier × (1 + perLevel × (level − 1)). */
    scale: { perLevel: 0.05, byTier: { never: 1, beginner: 1.2, intermediate: 1.5, advanced: 1.8 } },
    /** Bonus XP for a victory: base + perLevel × level. */
    xpReward: { base: 100, perLevel: 10 },
  },
  items: {
    maxShields: 2,
    streakDropEvery: 7,
    /** Earned only, never bought. Within a kind the item is a random one the player does not own yet. */
    dropRates: {
      boss: { theme: 0.35, frame: 0.35, title: 0.2, shield: 0.1 },
      streak: { theme: 0.2, frame: 0.2, title: 0.3, shield: 0.3 },
      rankUp: { theme: 0.3, frame: 0.3, title: 0.35, shield: 0.05 },
    },
  },
  classes: {
    unlockLevel: 10,
    changeCooldownDays: 30,
    trialScale: 1.5,
    focusBoost: 0.3,
    otherCut: 0.1,
    sideQuestXpBonus: 0.1,
  },
};
