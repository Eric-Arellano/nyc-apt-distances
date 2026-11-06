export type Route =
  | { mode: 'walk' | 'bike'; timeMinutes: number; distanceMiles: number }
  | { mode: 'transit'; timeMinutes: number; summary: string | null } // null: all walking
  | { mode: 'unavailable'; tripMode: 'walk' | 'bike' | 'transit' }; // Google found no route.

export interface Goal {
  strictness: 'must' | 'should';
  idealMinutes: number;
  maxMinutes: number;
}

export interface Place {
  name: string;
  additionalInfo?: string;
}

export interface DestinationResult {
  id: string;
  title: string;
  goal: Goal;
  closest: Place | null; // null: the destination is one fixed address, so the card needn't name it.
  routes: Route[];
}

export type GoalStatus = 'met' | 'partial' | 'unmet';
