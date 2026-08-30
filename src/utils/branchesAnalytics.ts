export function getNextBranchOffset(
  offset: number,
  rowCount: number,
  totalCount: number,
): number | null {
  const loadedThrough = offset + rowCount;
  return rowCount > 0 && loadedThrough < totalCount ? loadedThrough : null;
}
