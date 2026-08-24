/** Debug navigation — session 58f783 (remove after verification). */
export function debugNavLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  // #region agent log
  fetch('http://127.0.0.1:7456/ingest/64ec47ef-1a63-485e-909c-4ab70260afe3', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '58f783',
    },
    body: JSON.stringify({
      sessionId: '58f783',
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
      runId: 'post-fix',
    }),
  }).catch(() => {});
  // #endregion
}
