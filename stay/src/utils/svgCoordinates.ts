/** Grid snap untuk penempatan kamar di denah (px). */
export const FLOOR_PLAN_GRID_SIZE = 20;

/**
 * Konversi koordinat pointer (viewport) ke ruang SVG.
 */
export function clientPointToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const transformed = point.matrixTransform(matrix.inverse());
  return { x: transformed.x, y: transformed.y };
}

export function snapToGrid(value: number, grid = FLOOR_PLAN_GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}

export function clampRoomPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const maxX = Math.max(0, canvasWidth - width);
  const maxY = Math.max(0, canvasHeight - height);
  return {
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(0, y)),
  };
}
