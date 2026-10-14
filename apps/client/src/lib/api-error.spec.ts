import { describe, it, expect } from 'vitest';
import { isWorkspaceNotFound } from './api-error';

describe('isWorkspaceNotFound', () => {
  it('does not throw and returns false when the response body is a Blob (no message)', () => {
    const blobError = {
      response: { status: 404, data: new Blob(['not found']) },
    } as unknown as Parameters<typeof isWorkspaceNotFound>[0];

    let threw = false;
    let result = false;
    try {
      result = isWorkspaceNotFound(blobError);
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBe(false);
  });

  it('returns true for a JSON "workspace not found" message', () => {
    const error = {
      response: { status: 404, data: { message: 'workspace not found' } },
    } as unknown as Parameters<typeof isWorkspaceNotFound>[0];

    expect(isWorkspaceNotFound(error)).toBe(true);
  });

  it('returns false for a different message', () => {
    const error = {
      response: { status: 404, data: { message: 'page not found' } },
    } as unknown as Parameters<typeof isWorkspaceNotFound>[0];

    expect(isWorkspaceNotFound(error)).toBe(false);
  });

  it('returns false when there is no response', () => {
    expect(isWorkspaceNotFound({})).toBe(false);
    expect(isWorkspaceNotFound(undefined)).toBe(false);
  });
});
