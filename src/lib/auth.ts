export function validateApiKey(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "").trim();
  const secretKey = process.env.API_SECRET_KEY;

  if (!secretKey) {
    console.error("API_SECRET_KEY not configured");
    return false;
  }

  return token === secretKey;
}
