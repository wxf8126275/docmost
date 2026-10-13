import {
  evaluateNode,
  hasPredicate,
  sortRows,
  FilterNode,
  ViewSortConfig,
} from './base-filter.util';

const propTypes = new Map<string, string>([
  ['p1', 'text'],
  ['p2', 'number'],
  ['p3', 'select'],
]);

function row(id: string, cells: Record<string, unknown>) {
  return { id, cells };
}

describe('base-filter.util', () => {
  it('eq matches scalar and array cells', () => {
    const node: FilterNode = { propertyId: 'p1', op: 'eq', value: 'hi' };
    expect(evaluateNode(node, row('a', { p1: 'hi' }), propTypes)).toBe(true);
    expect(evaluateNode(node, row('b', { p1: 'bye' }), propTypes)).toBe(false);
    // multiSelect (array) cell: eq means "includes"
    const arr: FilterNode = { propertyId: 'p3', op: 'eq', value: 'x' };
    expect(evaluateNode(arr, row('c', { p3: ['x', 'y'] }), propTypes)).toBe(true);
  });

  it('neq negates eq', () => {
    const node: FilterNode = { propertyId: 'p1', op: 'neq', value: 'hi' };
    expect(evaluateNode(node, row('a', { p1: 'hi' }), propTypes)).toBe(false);
    expect(evaluateNode(node, row('b', { p1: 'bye' }), propTypes)).toBe(true);
  });

  it('isEmpty / isNotEmpty', () => {
    const empty: FilterNode = { propertyId: 'p1', op: 'isEmpty' };
    const notEmpty: FilterNode = { propertyId: 'p1', op: 'isNotEmpty' };
    expect(evaluateNode(empty, row('a', { p1: '' }), propTypes)).toBe(true);
    expect(evaluateNode(empty, row('b', { p1: null }), propTypes)).toBe(true);
    expect(evaluateNode(empty, row('c', { p1: 'x' }), propTypes)).toBe(false);
    expect(evaluateNode(notEmpty, row('c', { p1: 'x' }), propTypes)).toBe(true);
    expect(evaluateNode(notEmpty, row('a', { p1: '' }), propTypes)).toBe(false);
  });

  it('contains is case-insensitive', () => {
    const node: FilterNode = { propertyId: 'p1', op: 'contains', value: 'ELL' };
    expect(evaluateNode(node, row('a', { p1: 'Hello' }), propTypes)).toBe(true);
    expect(evaluateNode(node, row('b', { p1: 'world' }), propTypes)).toBe(false);
  });

  it('numeric gt / lt', () => {
    const gt: FilterNode = { propertyId: 'p2', op: 'gt', value: 5 };
    const lt: FilterNode = { propertyId: 'p2', op: 'lt', value: 5 };
    expect(evaluateNode(gt, row('a', { p2: 10 }), propTypes)).toBe(true);
    expect(evaluateNode(gt, row('b', { p2: 3 }), propTypes)).toBe(false);
    expect(evaluateNode(lt, row('b', { p2: 3 }), propTypes)).toBe(true);
  });

  it('group and / or combine conditions', () => {
    const and: FilterNode = {
      op: 'and',
      children: [
        { propertyId: 'p2', op: 'gt', value: 1 },
        { propertyId: 'p1', op: 'eq', value: 'a' },
      ],
    };
    expect(
      evaluateNode(and, row('a', { p2: 5, p1: 'a' }), propTypes),
    ).toBe(true);
    expect(
      evaluateNode(and, row('b', { p2: 5, p1: 'b' }), propTypes),
    ).toBe(false);

    const or: FilterNode = {
      op: 'or',
      children: [{ propertyId: 'p2', op: 'gt', value: 100 }, { propertyId: 'p1', op: 'eq', value: 'a' }],
    };
    expect(evaluateNode(or, row('a', { p2: 1, p1: 'a' }), propTypes)).toBe(true);
    expect(evaluateNode(or, row('b', { p2: 1, p1: 'b' }), propTypes)).toBe(false);
  });

  it('hasPredicate reports whether a node filters', () => {
    expect(hasPredicate({ op: 'and', children: [] })).toBe(false);
    expect(hasPredicate({ propertyId: 'p1', op: 'eq', value: 'x' })).toBe(true);
  });

  it('sorts rows ascending and descending', () => {
    const rows = [
      row('a', { p2: 3 }),
      row('b', { p2: 1 }),
      row('c', { p2: 2 }),
    ];
    const asc: ViewSortConfig[] = [{ propertyId: 'p2', direction: 'asc' }];
    expect(
      sortRows(rows, asc).map((r) => (r.cells as Record<string, unknown>).p2),
    ).toEqual([1, 2, 3]);
    const desc: ViewSortConfig[] = [{ propertyId: 'p2', direction: 'desc' }];
    expect(
      sortRows(rows, desc).map((r) => (r.cells as Record<string, unknown>).p2),
    ).toEqual([3, 2, 1]);
  });
});
