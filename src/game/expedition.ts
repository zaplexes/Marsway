import type { TripDraft } from '../planning/trip';
import { distanceKm, validPosition } from '../planning/ranking';

export interface GamePoint {
  x: number;
  z: number;
  name: string;
  tasks: readonly string[];
}
export interface Expedition {
  kind: 'plan' | 'practice';
  points: GamePoint[];
}
export interface DriveInput {
  forward: boolean;
  reverse: boolean;
  left: boolean;
  right: boolean;
}
export const emptyInput = (): DriveInput => ({
  forward: false,
  reverse: false,
  left: false,
  right: false,
});
export interface RoverState {
  x: number;
  z: number;
  heading: number;
  speed: number;
  target: number;
  scans: number;
  phase: 'driving' | 'arrived' | 'complete';
}
export const checkpointRadius = 10;
export function practiceExpedition(): Expedition {
  return {
    kind: 'practice',
    points: [
      { x: 0, z: 0, name: 'Practice base', tasks: [] },
      {
        x: 0,
        z: 85,
        name: 'Copper crater',
        tasks: ['Look around the crater rim. What catches your eye?'],
      },
      {
        x: 80,
        z: 140,
        name: 'Echo ridge',
        tasks: ['Find a layered rock and imagine the story behind it.'],
      },
      {
        x: 120,
        z: 40,
        name: 'Signal rock',
        tasks: ['Take one last panorama before heading home.'],
      },
      { x: 0, z: 0, name: 'Practice base', tasks: [] },
    ],
  };
}

// A schematic arena preserves names and visit order, not geographic scale.
// Log-compressed leg lengths keep both local and planet-wide plans playable.
export function expeditionFromPlan(draft: TripDraft): Expedition | null {
  if (
    !draft.base ||
    !validPosition(draft.base) ||
    !draft.stops.length ||
    draft.stops.some((stop) => !validPosition(stop))
  )
    return null;
  const points: GamePoint[] = [{ x: 0, z: 0, name: 'Your base', tasks: [] }];
  let previous = draft.base;
  for (const stop of draft.stops) {
    const latitudeA = (previous.latitude * Math.PI) / 180;
    const latitudeB = (stop.latitude * Math.PI) / 180;
    const longitude = ((stop.longitude - previous.longitude) * Math.PI) / 180;
    const bearing = Math.atan2(
      Math.sin(longitude) * Math.cos(latitudeB),
      Math.cos(latitudeA) * Math.sin(latitudeB) -
        Math.sin(latitudeA) * Math.cos(latitudeB) * Math.cos(longitude),
    );
    const length =
      65 + Math.min(90, Math.log1p(distanceKm(previous, stop)) * 14);
    const last = points[points.length - 1];
    points.push({
      x: last.x + Math.sin(bearing) * length,
      z: last.z + Math.cos(bearing) * length,
      name: stop.name,
      tasks: [...stop.tasks],
    });
    previous = stop;
  }
  points.push({ x: 0, z: 0, name: 'Your base', tasks: [] });
  return { kind: 'plan', points };
}
export function initialRover(expedition: Expedition): RoverState {
  const start = expedition.points[0];
  const next = expedition.points[1];
  return {
    x: start.x,
    z: start.z,
    heading: Math.atan2(next.x - start.x, next.z - start.z),
    speed: 0,
    target: 1,
    scans: 0,
    phase: 'driving',
  };
}
export function targetDistance(state: RoverState, expedition: Expedition) {
  const target = expedition.points[state.target];
  return Math.hypot(target.x - state.x, target.z - state.z);
}
export function stepRover(
  state: RoverState,
  input: DriveInput,
  seconds: number,
  expedition: Expedition,
  assist: boolean,
): RoverState {
  if (state.phase !== 'driving') return state;
  const dt = Math.max(0, Math.min(seconds, 0.05));
  let heading = state.heading;
  let throttle = Number(input.forward) - Number(input.reverse);
  const steering = Number(input.right) - Number(input.left);
  if (assist && !throttle && !steering) {
    const target = expedition.points[state.target];
    const desired = Math.atan2(target.x - state.x, target.z - state.z);
    const difference = Math.atan2(
      Math.sin(desired - heading),
      Math.cos(desired - heading),
    );
    heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, difference));
    throttle = Math.abs(difference) < 0.65 ? 1 : 0;
  } else heading += steering * dt * 1.9 * (state.speed < -1 ? -1 : 1);
  const desiredSpeed = throttle * (throttle < 0 ? 12 : 28);
  const speed =
    state.speed + (desiredSpeed - state.speed) * Math.min(1, dt * 4);
  const next = {
    ...state,
    heading,
    speed,
    x: state.x + Math.sin(heading) * speed * dt,
    z: state.z + Math.cos(heading) * speed * dt,
  };
  // Keep free exploration bounded without trapping a rover at the edge.
  const limit =
    Math.max(
      ...expedition.points.flatMap((p) => [Math.abs(p.x), Math.abs(p.z)]),
    ) + 180;
  next.x = Math.max(-limit, Math.min(limit, next.x));
  next.z = Math.max(-limit, Math.min(limit, next.z));
  if (targetDistance(next, expedition) <= checkpointRadius) {
    next.speed = 0;
    next.phase =
      next.target === expedition.points.length - 1 ? 'complete' : 'arrived';
  }
  return next;
}
export function scanCheckpoint(state: RoverState): RoverState {
  if (state.phase !== 'arrived') return state;
  return {
    ...state,
    target: state.target + 1,
    scans: state.scans + 1,
    phase: 'driving',
  };
}

// Entirely fictional height field for the arcade scene, never DEM evidence.
export function terrainHeight(x: number, z: number) {
  return (
    Math.sin(x * 0.026) * 2.8 +
    Math.cos(z * 0.035) * 2.1 +
    Math.sin((x + z) * 0.055) * 1.2
  );
}
