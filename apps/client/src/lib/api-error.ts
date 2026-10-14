import { isAxiosError } from "axios";

export function getApiErrorMessage(
  error: unknown,
  fallback = "An error occurred",
): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      const joined = message.filter(Boolean).join(", ");
      if (joined) return joined;
    } else if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

interface ResponseLike {
  response?: {
    data?: {
      message?: unknown;
    };
  };
}

/**
 * Returns true when an axios error is a 404 "workspace not found".
 *
 * Some responses (e.g. blob responses for file/docx exports) arrive with a Blob
 * body where `data.message` is undefined; reading it without a type guard would
 * throw `Cannot read properties of undefined (reading 'toLowerCase')`. We guard
 * the type before lowercasing so the interceptor never crashes on such errors.
 */
export function isWorkspaceNotFound(error: unknown): boolean {
  const message = (error as ResponseLike)?.response?.data?.message;
  return (
    typeof message === "string" &&
    message.toLowerCase().includes("workspace not found")
  );
}
