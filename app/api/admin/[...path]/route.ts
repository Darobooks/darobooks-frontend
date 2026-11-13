type RouteContext = { params: Promise<{ path: string[] }> };
type ProxyMethod = "GET" | "PUT" | "POST" | "PATCH" | "DELETE";

const DEVELOPMENT_API_URL = "http://localhost:5000";

async function proxyAdminRequest(
  request: Request,
  context: RouteContext,
  method: ProxyMethod,
) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json(
      { message: "Sign in to access super-admin settings." },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const { path } = await context.params;
  const validPath =
    (path.length === 1 &&
      (path[0] === "pricing" ||
        path[0] === "plans" ||
        path[0] === "users" ||
        path[0] === "clients" ||
        path[0] === "roles" ||
        path[0] === "website-settings" ||
        path[0] === "website-info") &&
      (path[0] !== "pricing" || method === "GET" || method === "PUT") &&
      (path[0] !== "plans" ||
        method === "GET" ||
        method === "PUT" ||
        method === "POST") &&
      (path[0] !== "users" || method === "GET" || method === "POST") &&
      (path[0] !== "clients" || method === "GET") &&
      (path[0] !== "roles" ||
        method === "GET" ||
        method === "PUT" ||
        method === "POST") &&
      (path[0] !== "website-settings" || method === "GET") &&
      (path[0] !== "website-info" || method === "PUT")) ||
    (path.length === 2 &&
      path[0] === "notifications" &&
      ((path[1] === "settings" && (method === "GET" || method === "PUT")) ||
        (path[1] === "broadcast" && method === "POST"))) ||
    (path.length === 2 && path[0] === "support" && path[1] === "tickets" && method === "GET") ||
    (path.length === 3 && path[0] === "support" && path[1] === "tickets" && /^[1-9]\d{0,18}$/.test(path[2]) && method === "PATCH") ||
    (path.length === 2 && path[0] === "support" && path[1] === "console" && method === "GET") ||
    (path.length === 3 && path[0] === "support" && path[1] === "console" && ["analytics", "unanswered"].includes(path[2]) && method === "GET") ||
    (path.length === 3 && path[0] === "support" && path[1] === "console" && /^[1-9]\d{0,18}$/.test(path[2]) && (method === "GET" || method === "PATCH")) ||
    (path.length === 4 && path[0] === "support" && path[1] === "console" && /^[1-9]\d{0,18}$/.test(path[2]) && ((path[3] === "messages" || path[3] === "two-step-reset") && method === "POST")) ||
    (path.length === 4 && path[0] === "support" && path[1] === "2fa-resets" && /^[1-9]\d{0,18}$/.test(path[2]) && path[3] === "review" && method === "POST") ||
    (path.length === 5 && path[0] === "support" && path[1] === "console" && path[2] === "unanswered" && /^[1-9]\d{0,18}$/.test(path[3]) && path[4] === "draft" && method === "POST") ||
    (path.length === 2 &&
      path[0] === "knowledge-base" &&
      path[1] === "articles" &&
      (method === "GET" || method === "POST")) ||
    (path.length === 3 &&
      path[0] === "knowledge-base" &&
      path[1] === "articles" &&
      /^[1-9]\d{0,18}$/.test(path[2]) &&
      (method === "PATCH" || method === "DELETE")) ||
    (path.length === 2 &&
      path[0] === "clients" &&
      /^[1-9]\d{0,18}$/.test(path[1]) &&
      method === "GET") ||
    (path.length === 3 &&
      path[0] === "users" &&
      /^[1-9]\d{0,18}$/.test(path[1]) &&
      path[2] === "role" &&
      method === "PATCH") ||
    (path.length === 2 &&
      path[0] === "plans" &&
      /^[a-z0-9][a-z0-9_-]{1,39}$/.test(path[1]) &&
      method === "DELETE") ||
    (path.length === 2 &&
      path[0] === "website-info" &&
      path[1] === "logo" &&
      (method === "PUT" || method === "DELETE"));
  if (!validPath) {
    return Response.json(
      { message: "This super-admin operation is not available." },
      {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const configuredApiUrl =
    process.env.NEST_API_URL ?? process.env.NEXT_PUBLIC_NEST_API_URL;
  const apiUrl =
    configuredApiUrl?.trim() ||
    (process.env.NODE_ENV === "development" ? DEVELOPMENT_API_URL : "");
  if (!apiUrl) {
    return Response.json(
      {
        message:
          "The admin service URL is not configured. Set NEST_API_URL for the dashboard server.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(
      `${apiUrl.replace(/\/+$/, "")}/admin/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`,
    );
  } catch {
    return Response.json(
      { message: "The configured billing service URL is invalid." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (upstreamUrl.protocol !== "http:" && upstreamUrl.protocol !== "https:") {
    return Response.json(
      { message: "The configured billing service URL must use HTTP or HTTPS." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers: {
        Authorization: authorization,
        ...(method === "GET"
          ? {}
          : {
              "Content-Type":
                request.headers.get("content-type") ?? "application/json",
            }),
      },
      ...(method === "GET" || method === "DELETE"
        ? {}
        : { body: await request.text() }),
      cache: "no-store",
    });
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
      {
        message:
          "Could not reach the admin service. Check the dashboard server's API URL and try again.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function GET(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context, "GET");
}

export function PUT(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context, "PUT");
}

export function POST(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context, "POST");
}

export function PATCH(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context, "PATCH");
}

export function DELETE(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context, "DELETE");
}
