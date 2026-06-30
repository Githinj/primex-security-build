import { LoginClient } from "./login-client";

// Force dynamic rendering — never serve from CDN cache
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginClient />;
}
