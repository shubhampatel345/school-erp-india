import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  GraduationCap,
  HelpCircle,
  Lock,
  User,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // login() checks local credentials first, then falls back to the server API.
      // It handles JWT storage and dispatch internally.
      const ok = await login(username.trim(), password.trim());
      if (!ok) {
        setError(
          "Invalid username or password. Please check your credentials and try again.",
        );
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.18 0.12 260) 0%, oklch(0.26 0.16 250) 50%, oklch(0.20 0.10 255) 100%)",
      }}
    >
      <div className="w-full max-w-md animate-slide-up">
        {/* Branding */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-18 h-18 rounded-2xl mb-4"
            style={{
              background: "oklch(0.55 0.14 200 / 0.25)",
              border: "2px solid oklch(0.55 0.14 200 / 0.35)",
            }}
          >
            <GraduationCap
              className="w-10 h-10"
              style={{ color: "oklch(0.82 0.14 200)" }}
            />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "white" }}
          >
            SCHOOL LEDGER ERP
          </h1>
          <p style={{ color: "oklch(1 0 0 / 0.55)" }} className="mt-1 text-sm">
            Complete School Management System
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl shadow-strong overflow-hidden"
          style={{
            background: "oklch(1 0 0 / 0.06)",
            border: "1px solid oklch(1 0 0 / 0.12)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            className="px-6 py-4 border-b"
            style={{
              borderColor: "oklch(1 0 0 / 0.10)",
              background: "oklch(1 0 0 / 0.04)",
            }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "white" }}
            >
              Sign In
            </h2>
            <p style={{ color: "oklch(1 0 0 / 0.55)" }} className="text-sm">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-sm font-medium"
                style={{ color: "oklch(1 0 0 / 0.80)" }}
              >
                Username
              </Label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "oklch(1 0 0 / 0.40)" }}
                />
                <Input
                  id="username"
                  data-ocid="login.username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  style={{
                    background: "oklch(1 0 0 / 0.08)",
                    border: "1px solid oklch(1 0 0 / 0.15)",
                    color: "white",
                  }}
                  autoComplete="username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: "oklch(1 0 0 / 0.80)" }}
              >
                Password
              </Label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "oklch(1 0 0 / 0.40)" }}
                />
                <Input
                  id="password"
                  data-ocid="login.password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  style={{
                    background: "oklch(1 0 0 / 0.08)",
                    border: "1px solid oklch(1 0 0 / 0.15)",
                    color: "white",
                  }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "oklch(1 0 0 / 0.40)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                data-ocid="login.error_state"
                className="text-sm rounded-lg px-3 py-2.5 animate-slide-up"
                style={{
                  background: "oklch(0.56 0.22 25 / 0.15)",
                  border: "1px solid oklch(0.56 0.22 25 / 0.35)",
                  color: "oklch(0.88 0.12 25)",
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              data-ocid="login.submit_button"
              className="w-full font-semibold"
              disabled={loading}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Forgot Password */}
            <button
              type="button"
              data-ocid="login.forgot_password"
              onClick={() => setShowForgot((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 text-sm transition-colors"
              style={{ color: "oklch(1 0 0 / 0.45)" }}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Forgot password?
            </button>

            {showForgot && (
              <div
                className="rounded-xl p-4 text-sm animate-slide-up"
                style={{
                  background: "oklch(1 0 0 / 0.06)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  color: "oklch(1 0 0 / 0.65)",
                }}
              >
                <p
                  className="font-medium mb-1"
                  style={{ color: "oklch(1 0 0 / 0.85)" }}
                >
                  Password Recovery
                </p>
                <p>
                  Please contact your{" "}
                  <strong style={{ color: "oklch(0.82 0.14 200)" }}>
                    Super Admin
                  </strong>{" "}
                  to reset your password. They can do this from{" "}
                  <em>Settings → User Management → Reset Password</em>.
                </p>
                <p className="mt-2">
                  For Super Admin access issues, visit:
                  <br />
                  <code
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: "oklch(1 0 0 / 0.08)",
                      color: "oklch(0.82 0.14 200)",
                    }}
                  >
                    /api/index.php?route=migrate/reset-superadmin
                  </code>
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Credential Hints */}
        <div
          className="mt-5 rounded-xl px-4 py-3"
          style={{
            background: "oklch(1 0 0 / 0.05)",
            border: "1px solid oklch(1 0 0 / 0.10)",
          }}
        >
          <p
            className="text-xs text-center font-medium mb-2"
            style={{ color: "oklch(1 0 0 / 0.50)" }}
          >
            Default Login Credentials
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span
                className="text-xs"
                style={{ color: "oklch(1 0 0 / 0.40)" }}
              >
                Super Admin
              </span>
              <code
                className="text-xs font-mono"
                style={{ color: "oklch(1 0 0 / 0.70)" }}
              >
                superadmin / admin123
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span
                className="text-xs"
                style={{ color: "oklch(1 0 0 / 0.40)" }}
              >
                Teacher / Staff
              </span>
              <code
                className="text-xs font-mono"
                style={{ color: "oklch(1 0 0 / 0.55)" }}
              >
                mobile / DOB (ddmmyyyy)
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span
                className="text-xs"
                style={{ color: "oklch(1 0 0 / 0.40)" }}
              >
                Student
              </span>
              <code
                className="text-xs font-mono"
                style={{ color: "oklch(1 0 0 / 0.55)" }}
              >
                Adm.No. / DOB (ddmmyyyy)
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span
                className="text-xs"
                style={{ color: "oklch(1 0 0 / 0.40)" }}
              >
                Parent
              </span>
              <code
                className="text-xs font-mono"
                style={{ color: "oklch(1 0 0 / 0.55)" }}
              >
                mobile / mobile
              </code>
            </div>
          </div>
        </div>

        <p
          className="text-center text-xs mt-5"
          style={{ color: "oklch(1 0 0 / 0.25)" }}
        >
          © {new Date().getFullYear()} SCHOOL LEDGER ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
