"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/**
 * Auth callback handler.
 *
 * This is a CLIENT page on purpose. Supabase email links (password recovery,
 * invites) come back via the implicit flow with the session in the URL *hash*
 * (`#access_token=…&refresh_token=…&type=recovery`). Hash fragments are never
 * sent to the server, so a server route can't read them. We read the hash here
 * and persist the session through the browser SSR client, which writes it to
 * cookies the server can then see.
 *
 * We also handle the PKCE `?code=` flow (OAuth) and the `?token_hash=` verifyOtp
 * flow so every Supabase link shape resolves through one route.
 */
export default function CallbackPage() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against React StrictMode double-invoke
    ran.current = true;

    const fail = () => router.replace("/login?error=auth_callback_failed");

    (async () => {
      try {
        const url = new URL(window.location.href);
        const query = url.searchParams;
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

        // Supabase may report an error in either the query or the hash.
        if (query.get("error") || hash.get("error") || hash.get("error_code")) {
          fail();
          return;
        }

        const type = query.get("type") || hash.get("type");
        const next = query.get("next") || "/dashboard";
        const supabase = createBrowserSupabaseClient();

        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const code = query.get("code");
        const tokenHash = query.get("token_hash");

        if (accessToken && refreshToken) {
          // Implicit flow — tokens delivered in the URL fragment.
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) return fail();
        } else if (code) {
          // PKCE / OAuth flow.
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) return fail();
        } else if (tokenHash && type) {
          // token_hash (verifyOtp) flow.
          const { error } = await supabase.auth.verifyOtp({
            type: type as EmailOtpType,
            token_hash: tokenHash,
          });
          if (error) return fail();
        } else {
          return fail();
        }

        // Strip the tokens from the address bar before navigating on.
        window.history.replaceState({}, "", "/callback");

        if (type === "recovery" || type === "invite") {
          router.replace("/reset-password");
        } else {
          router.replace(next);
        }
      } catch {
        fail();
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-11 h-11 bg-navy rounded-lg flex items-center justify-center">
          <Shield size={22} className="text-white" strokeWidth={2} />
        </div>
        <p className="text-ink-3 text-sm font-sans">Completing sign-in…</p>
      </div>
    </div>
  );
}
