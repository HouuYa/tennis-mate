const AUTH_TOKEN_KEY = "tennis-mate-admin-token";

interface LoginResponse {
  token: string;
  expiresIn: number;
}

interface VerifyResponse {
  valid: boolean;
}

export async function adminLogin(
  adminId: string,
  adminPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId, adminPassword }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || "Authentication failed" };
    }

    const data: LoginResponse = await response.json();
    sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
    return { success: true };
  } catch (error) {
    console.error("Admin login error:", error);
    return { success: false, error: "Network error. Please try again." };
  }
}

export async function verifyAdminToken(): Promise<boolean> {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return false;

  try {
    const response = await fetch("/api/admin-auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      return false;
    }

    const data: VerifyResponse = await response.json();
    if (!data.valid) {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      return false;
    }
    return true;
  } catch {
    // Network error — keep token, don't invalidate (might be offline)
    return false;
  }
}

export function adminLogout(): void {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}
