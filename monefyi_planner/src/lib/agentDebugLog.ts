/** Debug session b04e14 — signup email delivery */
export function agentDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  const payload = {
    sessionId: 'b04e14',
    runId: 'signup-email',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  fetch('http://127.0.0.1:7456/ingest/64ec47ef-1a63-485e-909c-4ab70260afe3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b04e14' },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}
