/**
 * Shared CORS configuration for all Edge Functions.
 *
 * Reflects the request Origin when it is on the whitelist (multi-domain support).
 * Falls back to https://www.monefyi.com when Origin is missing or not allowed.
 */

const ALLOWED_ORIGINS = [
  "https://www.monefyi.com",
  "https://monefyi.com",
  "https://planner.monefyi.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "http://localhost:3000",
];

/** Bound request for legacy jsonResponse(body, status) calls after handleOptions. */
let _boundRequest: Request | undefined;

/**
 * @param {Request} request
 * @returns {Record<string, string>}
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-forwarded-for, x-lynk-signature, x-cron-secret",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

/**
 * @param {Request} request
 */
function bindRequest(request: Request) {
  _boundRequest = request;
}

/**
 * Handle CORS preflight — use at the start of every Edge Function.
 * @param {Request} request
 * @returns {Response|null}
 */
export function handleCorsPreflightRequest(request: Request): Response | null {
  bindRequest(request);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }
  return null;
}

/** @deprecated Use handleCorsPreflightRequest — kept for planner functions */
export function handleOptions(req: Request): Response | null {
  return handleCorsPreflightRequest(req);
}

/**
 * Build JSON response with CORS headers.
 * Supports jsonResponse(req, data, status) and legacy jsonResponse(data, status).
 */
export function jsonResponse(
  reqOrBody: Request | unknown,
  bodyOrStatus?: unknown,
  maybeStatus?: number,
): Response {
  if (reqOrBody instanceof Request) {
    bindRequest(reqOrBody);
    const status = typeof maybeStatus === "number" ? maybeStatus : 200;
    return new Response(JSON.stringify(bodyOrStatus), {
      status,
      headers: {
        ...getCorsHeaders(reqOrBody),
        "Content-Type": "application/json",
      },
    });
  }

  const req = _boundRequest ?? new Request("https://www.monefyi.com/");
  const body = reqOrBody;
  const status = typeof bodyOrStatus === "number" ? bodyOrStatus : 200;
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

/**
 * Build error JSON response with CORS headers.
 * @param {Request} request
 * @param {string} message
 * @param {number} [status]
 */
export function errorResponse(
  request: Request,
  message: string,
  status = 500,
): Response {
  return jsonResponse(request, { error: message }, status);
}

/** @deprecated Static headers — prefer getCorsHeaders(request) */
export const corsHeaders = getCorsHeaders(new Request("https://www.monefyi.com/"));

/** @deprecated Use origin reflection via getCorsHeaders */
export const APP_CORS_ORIGIN = ALLOWED_ORIGINS[0];
