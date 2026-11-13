export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return Response.json({ message: "Sign in to access the knowledge base." }, { status: 401 });
  const apiUrl = (process.env.NEST_API_URL ?? process.env.NEXT_PUBLIC_NEST_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!apiUrl) return Response.json({ message: "The dashboard service URL is not configured." }, { status: 503 });
  try {
    const response = await fetch(`${apiUrl}/dashboard/knowledge-base/articles`, { headers: { Authorization: authorization }, cache: "no-store" });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" } });
  } catch { return Response.json({ message: "Could not reach the dashboard service." }, { status: 502 }); }
}
