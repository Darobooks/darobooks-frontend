async function proxySupportRequest(request: Request, method: "GET" | "POST") {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ message: "Sign in to access support tickets." }, { status: 401 });
  }

  const configuredApiUrl =
    process.env.NEST_API_URL ?? process.env.NEXT_PUBLIC_NEST_API_URL;
  const apiUrl = (
    configuredApiUrl?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "")
  ).replace(/\/+$/, "");
  if (!apiUrl) {
    return Response.json({ message: "The dashboard service URL is not configured." }, { status: 503 });
  }

  try {
    const upstreamResponse = await fetch(`${apiUrl}/dashboard/support/tickets`, {
      method,
      headers: {
        Authorization: authorization,
        ...(method === "POST" ? { "Content-Type": request.headers.get("content-type") ?? "application/json" } : {}),
      },
      ...(method === "POST" ? { body: await request.text() } : {}),
      cache: "no-store",
    });
    return new Response(await upstreamResponse.text(), {
      status: upstreamResponse.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json({ message: "Could not reach the dashboard service." }, { status: 502 });
  }
}

export function GET(request: Request) {
  return proxySupportRequest(request, "GET");
}

export function POST(request: Request) {
  return proxySupportRequest(request, "POST");
}
