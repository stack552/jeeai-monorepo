import React, { useState } from "react";

function Signup({ onClose, onSignupSuccess, onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in both fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.detail || "Signup failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Signup succeeded, but doesn't log the user in automatically —
      // the backend only issues a cookie on /auth/login. So after a
      // successful signup, we hand back the created account and let
      // the parent decide to prompt for login next.
      onSignupSuccess(data);
    } catch (err) {
      console.error("Signup request failed:", err);
      setError("Could not reach the server. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">Create your account</h2>
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
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="w-full bg-zinc-800 rounded-full px-4 py-2.5 outline-none placeholder:text-zinc-500 text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
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
            {isSubmitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}

export default Signup;
