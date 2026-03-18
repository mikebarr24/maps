export const mapDistanceRange = {
  minKm: 5,
  maxKm: 50,
  stepKm: 5,
  defaultKm: 25,
} as const;

export const distanceBoundsMessage = `Distance must be between ${mapDistanceRange.minKm}km and ${mapDistanceRange.maxKm}km.`;
export const distanceStepMessage = `Distance must be in ${mapDistanceRange.stepKm}km steps.`;

export const isSupportedDistanceKm = (value: number) =>
  value % mapDistanceRange.stepKm === 0;
