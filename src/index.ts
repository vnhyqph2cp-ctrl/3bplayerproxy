const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export interface Env {}

function addCors(response: Response, extraHeaders: Record<string, string> = {}) {
  const headers = new Headers(response.headers);
  Object.entries({ ...CORS_HEADERS, ...extraHeaders }).forEach(([key, value]) =>
    headers.set(key, value),
  );
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request): Promise<Response> {
    const { method } = request;

    if (method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (method !== "GET" && method !== "HEAD") {
      return addCors(new Response("Method not allowed", { status: 405 }));
    }

    const requestUrl = new URL(request.url);
    const target = requestUrl.searchParams.get("url");

    if (!target) {
      return addCors(new Response("Missing 'url' query parameter", { status: 400 }));
    }

    let normalized: URL;
    try {
      normalized = new URL(target);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid URL";
      return addCors(new Response(`Invalid url parameter: ${message}`, { status: 400 }));
    }

    try {
      const upstream = await fetch(normalized.toString(), { method });
      const response = new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: upstream.headers,
      });
      return addCors(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return addCors(new Response(`Upstream fetch failed: ${message}`, { status: 502 }));
    }
  },
} satisfies ExportedHandler<Env>;
