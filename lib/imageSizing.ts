export const MAX_SOLVE_IMAGE_SIDE = 1600;
export const SOLVE_IMAGE_QUALITY = 0.78;

export function fitWithinMaxSide(
  width: number,
  height: number,
  maxSide = MAX_SOLVE_IMAGE_SIDE,
) {
  if (width <= 0 || height <= 0) {
    return { width, height };
  }
  const longest = Math.max(width, height);
  if (longest <= maxSide) {
    return { width, height };
  }
  const scale = maxSide / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
