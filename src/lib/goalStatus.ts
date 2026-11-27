import type { Goal, GoalStatus, Route } from '#lib/types.ts';

export function goalStatus(route: Route, goal: Goal): GoalStatus {
  if (route.mode === 'unavailable' || route.timeMinutes > goal.maxMinutes) {
    return 'unmet';
  }
  return route.timeMinutes <= (goal.idealMinutes ?? goal.maxMinutes) ? 'met' : 'partial';
}
