export interface Ride {
  line: string;
  vehicle: 'bus' | 'train';
}

export type TripMode = 'walk' | 'bike' | 'transit' | 'drive';

export type Route =
  | { mode: 'walk' | 'bike' | 'drive'; timeMinutes: number; distanceMiles: number }
  | { mode: 'transit'; timeMinutes: number; rides: readonly Ride[] } // Empty: all walking
  | { mode: 'unavailable'; tripMode: TripMode }; // Google found no route.

export interface Goal {
  strictness: 'must' | 'should';
  idealMinutes?: number; // Absent: any time within the max is as good as any other.
  maxMinutes: number;
}

export interface Place {
  name: string;
}

export interface TripResult {
  label?: string;
  goal?: Goal; // Absent: the trip is shown for reference and never judged.
  route: Route;
}

export interface DestinationResult {
  id: string;
  title: string;
  closest: Place | null; // null: the destination is one fixed address, so the card needn't name it.
  trips: TripResult[];
}

export type GoalStatus = 'met' | 'partial' | 'unmet';

export function goalStatus(route: Route, goal: Goal): GoalStatus {
  if (route.mode === 'unavailable' || route.timeMinutes > goal.maxMinutes) {
    return 'unmet';
  }
  return route.timeMinutes <= (goal.idealMinutes ?? goal.maxMinutes) ? 'met' : 'partial';
}
