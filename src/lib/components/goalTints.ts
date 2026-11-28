import type { GoalStatus } from '#lib/types.ts';

// No legend explains these, so they must read on their own: green good, yellow okay, red bad.
export const GOAL_TINTS: Record<GoalStatus, string> = {
  met: 'bg-green-600/30',
  partial: 'bg-yellow-600/30',
  unmet: 'bg-red-600/30',
};

// For a time with nothing to judge it by, so it still reads as a cell beside tinted ones.
export const UNJUDGED_TINT = 'bg-white/4';
