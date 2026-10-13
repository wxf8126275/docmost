/**
 * Server-side row filtering and sorting for `/bases/rows`. The frontend also
 * re-applies client-side ordering when no view sort is active, but the server
 * must honour the active view's filter/sort so kanban grouping and server
 * pagination behave correctly.
 *
 * Best-effort: relation/rollup operators (`any`/`none`/`all`) and date-range
 * presets (`isWithin`) have no server-side source of truth yet and are treated
 * as "no constraint".
 */

export type FilterCondition = {
  propertyId: string;
  op: string;
  value?: unknown;
};
export type FilterNode =
  | FilterCondition
  | { op: 'and' | 'or'; children: FilterNode[] };
export type ViewSortConfig = { propertyId: string; direction: 'asc' | 'desc' };

export function hasPredicate(node: FilterNode): boolean {
  if ('children' in node) {
    return node.children.some((c) => hasPredicate(c));
  }
  return true;
}

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function compareScalar(a: unknown, b: unknown): number {
  if (isEmptyValue(a) && isEmptyValue(b)) return 0;
  if (isEmptyValue(a)) return -1;
  if (isEmptyValue(b)) return 1;
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && asString(a) !== asString(b)) {
    return na - nb;
  }
  const da = Date.parse(asString(a));
  const db = Date.parse(asString(b));
  if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  return asString(a).localeCompare(asString(b));
}

function isEqual(cell: unknown, value: unknown): boolean {
  if (Array.isArray(cell)) return cell.includes(value);
  if (Array.isArray(value)) return value.includes(cell);
  return cell === value;
}

function contains(cell: unknown, value: unknown): boolean {
  const needle = asString(value).toLowerCase();
  if (Array.isArray(cell)) {
    return cell.some((c) => asString(c).toLowerCase().includes(needle));
  }
  return asString(cell).toLowerCase().includes(needle);
}

function evaluateCondition(
  op: string,
  cell: unknown,
  value: unknown,
): boolean {
  switch (op) {
    case 'isEmpty':
      return isEmptyValue(cell);
    case 'isNotEmpty':
      return !isEmptyValue(cell);
    case 'eq':
      return isEqual(cell, value);
    case 'neq':
      return !isEqual(cell, value);
    case 'contains':
      return contains(cell, value);
    case 'ncontains':
      return !contains(cell, value);
    case 'startsWith':
      return asString(cell).startsWith(asString(value));
    case 'endsWith':
      return asString(cell).endsWith(asString(value));
    case 'gt':
      return compareScalar(cell, value) > 0;
    case 'gte':
      return compareScalar(cell, value) >= 0;
    case 'lt':
      return compareScalar(cell, value) < 0;
    case 'lte':
      return compareScalar(cell, value) <= 0;
    case 'before':
      return compareScalar(cell, value) < 0;
    case 'after':
      return compareScalar(cell, value) > 0;
    case 'onOrBefore':
      return compareScalar(cell, value) <= 0;
    case 'onOrAfter':
      return compareScalar(cell, value) >= 0;
    case 'any':
    case 'none':
    case 'all':
    case 'isWithin':
      return true;
    default:
      return true;
  }
}

export function evaluateNode(
  node: FilterNode,
  row: Record<string, unknown>,
  propTypeById: Map<string, string>,
): boolean {
  if ('children' in node) {
    if (node.children.length === 0) return true;
    if (node.op === 'or') {
      return node.children.some((c) => evaluateNode(c, row, propTypeById));
    }
    return node.children.every((c) => evaluateNode(c, row, propTypeById));
  }
  const cell = (row.cells as Record<string, unknown> | undefined)?.[
    node.propertyId
  ];
  return evaluateCondition(node.op, cell, node.value);
}

export function sortRows(
  rows: Record<string, unknown>[],
  sorts: ViewSortConfig[],
): Record<string, unknown>[] {
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const av = (a.cells as Record<string, unknown> | undefined)?.[
        sort.propertyId
      ];
      const bv = (b.cells as Record<string, unknown> | undefined)?.[
        sort.propertyId
      ];
      const cmp = compareScalar(av, bv);
      if (cmp !== 0) {
        return sort.direction === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  });
}
