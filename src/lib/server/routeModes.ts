// No imports, so `scripts/capture-fixtures.ts` can load this under plain Node and capture fixtures
// with the same field masks production sends.
export const MODES = {
  walk: {
    travelMode: 'WALK',
    fieldMask: 'routes.duration,routes.distanceMeters',
    bufferMinutes: 0,
  },
  // The buffer is time to get the bike out and locked up.
  bike: {
    travelMode: 'BICYCLE',
    fieldMask: 'routes.duration,routes.distanceMeters',
    bufferMinutes: 2,
  },
  // `routingPreference` is valid only for driving and two-wheeler trips; on other modes Google
  // rejects the request. Only `TRAFFIC_AWARE` reads `departureTime`, and it bills at a higher rate.
  // The buffer is time to park.
  drive: {
    travelMode: 'DRIVE',
    fieldMask: 'routes.duration,routes.distanceMeters',
    routingPreference: 'TRAFFIC_AWARE',
    bufferMinutes: 5,
  },
  // A step's `travelMode` is always present, unlike `transitDetails`, which a field mask can leave
  // empty. Metro-North lines have a `name` but no `nameShort`. Bee-Line buses report `BUS`. The
  // last ride's arrival and the walks after it give when the trip arrives, to count the wait.
  transit: {
    travelMode: 'TRANSIT',
    fieldMask:
      'routes.duration,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails.stopDetails.arrivalTime,routes.legs.steps.transitDetails.transitLine.name,routes.legs.steps.transitDetails.transitLine.nameShort,routes.legs.steps.transitDetails.transitLine.vehicle.type',
    bufferMinutes: 0,
  },
} as const;
