import { SignJWT, jwtVerify } from "jose";

// CORS headers
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export default async (request: Request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response("", { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/\.netlify\/functions\/admin-auth/, "");

  if (path === "/verify") {
    return handleVerify(request);
  }

  // Default: login
  return handleLogin(request);
};

async function handleLogin(request: Request) {
  try {
    const { adminId, adminPassword } = await request.json();

    const envId = process.env.ADMIN_ID;
    const envPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.ADMIN_JWT_SECRET;

    if (!envId || !envPassword || !jwtSecret) {
      console.error("Admin env vars not configured (ADMIN_ID, ADMIN_PASSWORD, ADMIN_JWT_SECRET)");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers }
      );
    }

    if (adminId !== envId || adminPassword !== envPassword) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers }
      );
    }

    // Generate JWT (4-hour expiry)
    const secret = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("4h")
      .sign(secret);

    return new Response(
      JSON.stringify({ token, expiresIn: 4 * 60 * 60 }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers }
    );
  }
}

async function handleVerify(request: Request) {
  try {
    const { token } = await request.json();
    const jwtSecret = process.env.ADMIN_JWT_SECRET;

    if (!jwtSecret || !token) {
      return new Response(
        JSON.stringify({ valid: false }),
        { status: 401, headers }
      );
    }

    const secret = new TextEncoder().encode(jwtSecret);
    await jwtVerify(token, secret);

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers }
    );
  } catch {
    return new Response(
      JSON.stringify({ valid: false }),
      { status: 401, headers }
    );
  }
}

export const config = {
  path: ["/api/admin-auth", "/api/admin-auth/*"],
};
