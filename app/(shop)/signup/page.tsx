"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured yet. See SETUP.md.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${SITE_URL}/auth/callback?next=/account/profile`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is enabled, there is no active session yet.
    if (!data.session) {
      setDone(true);
    } else {
      window.location.href = "/account/profile";
    }
  }

  if (done) {
    return (
      <div className="page page-narrow">
        <div className="form-card">
          <h1 className="page-title" style={{ textAlign: "center" }}>
            Check your email
          </h1>
          <div className="alert alert-success">
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            verify your account, then log in.
          </div>
          <Link className="btn btn-primary btn-block" href="/login">
            GO TO LOGIN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <div className="form-card">
        <h1 className="page-title" style={{ textAlign: "center" }}>
          Create account
        </h1>
        <p className="page-subtitle" style={{ textAlign: "center" }}>
          Join WEARONSTREET to checkout and track your orders.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <span className="field-hint">At least 6 characters.</span>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Creating…" : "SIGN UP"}
          </button>
        </form>

        <p className="form-footer-link">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
