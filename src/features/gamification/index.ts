export {
  getPointsSummary,
  getWalkRewardsSummary,
  listAchievements,
  listChallengesWithProgress,
  updateChallengeDifficulty,
  type AchievementItem,
  type ChallengeInstanceItem,
  type ChallengesOverview,
  type PointsSummary,
  type WalkRewardLedgerLine,
  type WalkRewardsSummary,
} from './api';
export {
  ChallengeCard,
  type ChallengeCardProps,
} from './components/challenge-card';
export {
  PointsChip,
  type PointsChipProps,
} from './components/points-chip';
export {
  WalkRewardsCard,
  type WalkRewardsCardProps,
} from './components/walk-rewards-card';
export {
  GAMIFICATION_QUERY_KEYS,
  useAchievements,
  useChallengeDifficulty,
  useChallenges,
  usePointsSummary,
  useSetChallengeDifficultyMutation,
  useWalkRewards,
} from './hooks';
export {
  calculateDailyStepsMilestonePoints,
  calculateSightingPoints,
  calculateWalkPointsBreakdown,
  computeChallengeProgressRatio,
  DEFAULT_POINT_RULES,
  formatAchievementGoalLabel,
  formatChallengeProgressText,
  formatChallengeTimeRemaining,
  SEED_ACHIEVEMENTS,
  SEED_CHALLENGE_TEMPLATES,
  type AchievementMetric,
  type ChallengeDifficulty,
  type ChallengeMetric,
  type ChallengePeriod,
  type PointRulesConfig,
  type SeedAchievementDefinition,
  type SeedChallengeTemplate,
  type WalkPointsEstimateBreakdown,
  type WalkPointsEstimateInput,
} from './rules';
