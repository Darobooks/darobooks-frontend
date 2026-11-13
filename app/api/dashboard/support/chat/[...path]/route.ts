type RouteContext = { params: Promise<{ path: string[] }> };
type ProxyMethod = "GET" | "POST";

async function proxyChatRequest(
  request: Request,
  context: RouteContext,
  method: ProxyMethod,
) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json(
      { message: "Sign in to access support chat." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { path } = await context.params;
  const validPath =
    (path.length === 1 && path[0] === "conversations" && (method === "GET" || method === "POST")) ||
    (path.length === 2 && path[0] === "conversations" && /^[1-9]\d{0,18}$/.test(path[1]) && method === "GET") ||
    (path.length === 3 && path[0] === "conversations" && /^[1-9]\d{0,18}$/.test(path[1]) && ["messages", "csat"].includes(path[2]) && method === "POST");
  if (!validPath) {
    return Response.json(
      { message: "This support chat operation is not available." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const configuredApiUrl =
    process.env.NEST_API_URL ?? process.env.NEXT_PUBLIC_NEST_API_URL;
  const apiUrl =
    configuredApiUrl?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");
  if (!apiUrl) {
    return Response.json(
      { message: "The dashboard service URL is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const upstreamResponse = await fetch(
      `${apiUrl.replace(/\/+$/, "")}/dashboard/support/chat/${path.map(encodeURIComponent).join("/")}`,
      {
        method,
        headers: {
          Authorization: authorization,
          ...(method === "POST"
            ? {
                "Content-Type":
                  request.headers.get("content-type") ?? "application/json",
              }
            : {}),
        },
        ...(method === "POST" ? { body: await request.text() } : {}),
        cache: "no-store",
      },
    );
    return new Response(await upstreamResponse.text(), {
      status: upstreamResponse.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type":
          upstreamResponse.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json(
      { message: "Could not reach the support service." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function GET(request: Request, context: RouteContext) {
  return proxyChatRequest(request, context, "GET");
}

export function POST(request: Request, context: RouteContext) {
  return proxyChatRequest(request, context, "POST");
}
