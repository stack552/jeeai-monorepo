import React, { useState } from "react";

function Login({ onClose, onLoginSuccess, onSwitchToSignup, onForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in both fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // required so the browser stores the httpOnly cookie
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.detail || "Login failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // data = { id, email }
      onLoginSuccess(data);
    } catch (err) {
      console.error("Login request failed:", err);
      setError("Could not reach the server. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">Log in to JEEAI</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-zinc-800 rounded-full px-4 py-2.5 outline-none placeholder:text-zinc-500 text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-zinc-800 rounded-full px-4 py-2.5 outline-none placeholder:text-zinc-500 text-zinc-100"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 px-1">{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors rounded-full py-2.5 text-sm font-medium text-white"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={onForgotPassword}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <div className="mt-3 text-center text-sm text-zinc-400">
          Don't have an account?{" "}
          <button
            onClick={onSwitchToSignup}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
