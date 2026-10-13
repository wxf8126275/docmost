/**
 * Recover a human-readable error message from an export request failure.
 *
 * Export requests use `responseType: "blob"`. When the server responds with a
 * non-2xx status axios stores the error body as a Blob (not JSON), so reading
 * `err.response.data.message` yields `undefined` and the UI shows the literal
 * "Export failed:undefined". These helpers read that blob and surface the real
 * server message (or a safe fallback) instead.
 */

type AxiosLikeError = {
  response?: { data?: unknown };
  message?: string;
};

function isBlobLike(data: unknown): data is Blob {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Blob).text === "function"
  );
}

export async function parseExportError(err: unknown): Promise<string> {
  const axiosErr = err as AxiosLikeError;
  const data = axiosErr?.response?.data;

  if (isBlobLike(data)) {
    try {
      const text = await data.text();
      try {
        const parsed = JSON.parse(text) as { message?: unknown };
        if (typeof parsed?.message === "string" && parsed.message.length > 0) {
          return parsed.message;
        }
      } catch {
        // body was not JSON (e.g. an HTML error page) — fall through
      }
    } catch {
      // blob read failed — fall through
    }
  } else if (
    data &&
    typeof (data as { message?: unknown }).message === "string"
  ) {
    const msg = (data as { message: string }).message;
    if (msg.length > 0) return msg;
  }

  if (typeof axiosErr?.message === "string" && axiosErr.message.length > 0) {
    return axiosErr.message;
  }

  return "Export failed";
}

export async function buildExportFailureMessage(
  err: unknown,
): Promise<string> {
  const msg = await parseExportError(err);
  return msg === "Export failed" ? "Export failed" : `Export failed: ${msg}`;
}
