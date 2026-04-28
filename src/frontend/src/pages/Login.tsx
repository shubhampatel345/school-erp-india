import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  HelpCircle,
  Lock,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { setLoginTime } from "../context/AppContext";
import phpApiService from "../utils/phpApiService";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  teacher: "Teacher",
  accountant: "Accountant",
  parent: "Parent",
  student: "Student",
  driver: "Driver",
  receptionist: "Receptionist",
  librarian: "Librarian",
};

export default function Login() {
  // IMPORTANT: No token checks here. NEVER call verifyToken(), NEVER check expiry.
  // This component only displays a login form. Token logic lives in AppContext.

  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [welcomeBadge, setWelcomeBadge] = useState<{
    name: string;
    role: string;
  } | null>(null);

  // Clear stale auth errors on mount
  useEffect(() => {
    setError("");
  }, []);

  // Welcome badge auto-dismiss
  useEffect(() => {
    if (!welcomeBadge) return;
    const t = setTimeout(() => setWelcomeBadge(null), 2500);
    return () => clearTimeout(t);
  }, [welcomeBadge]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const trimmedUser = username.trim();
      const trimmedPass = password.trim();

      // Store credentials for silent re-auth (non-superadmin only)
      if (trimmedUser !== "superadmin") {
        phpApiService.storeCredentials(trimmedUser, trimmedPass);
      }

      // setLoginTime FIRST — before login() call — ensures grace period starts
      // even if AppContext.login() has any async delay before setting it internally
      setLoginTime(Date.now());

      const ok = await login(trimmedUser, trimmedPass);
      if (ok) {
        // Show welcome badge using data from sessionStorage (written by AppContext)
        try {
          const stored = sessionStorage.getItem("shubh_current_user");
          if (stored) {
            const u = JSON.parse(stored) as {
              name?: string;
              fullName?: string;
              role?: string;
            };
            const displayName = (u.fullName ?? u.name ?? trimmedUser).split(
              " ",
            )[0];
            const roleName = ROLE_LABELS[u.role ?? ""] ?? u.role ?? "User";
            setWelcomeBadge({ name: displayName, role: roleName });
          }
        } catch {
          /* ignore */
        }
      } else {
        // Reset loginTime on failed login
        setLoginTime(0);
        setError(
          "Invalid username or password. Please check your credentials and try again.",
        );
      }
    } catch {
      setLoginTime(0);
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
          "linear-gradient(135deg, oklch(0.15 0.05 265) 0%, oklch(0.22 0.08 260) 50%, oklch(0.18 0.06 265) 100%)",
      }}
    >
      <div className="w-full max-w-md animate-slide-up">
        {/* Branding */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5"
            style={{
              background: "oklch(0.55 0.14 200 / 0.25)",
              border: "2px solid oklch(0.55 0.14 200 / 0.40)",
            }}
          >
            <GraduationCap
              className="w-10 h-10"
              style={{ color: "oklch(0.82 0.14 200)" }}
            />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight font-display"
            style={{ color: "white" }}
          >
            SHUBH SCHOOL ERP
          </h1>
          <p
            className="mt-1 text-base font-semibold"
            style={{ color: "oklch(0.82 0.14 200)" }}
          >
            Complete School Management System
          </p>
        </div>

        {/* Welcome badge */}
        {welcomeBadge && (
          <div
            className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3 animate-slide-up"
            style={{
              background: "oklch(0.7 0.16 142 / 0.18)",
              border: "1px solid oklch(0.7 0.16 142 / 0.40)",
            }}
          >
            <CheckCircle2
              className="w-5 h-5 flex-shrink-0"
              style={{ color: "oklch(0.7 0.16 142)" }}
            />
            <div>
              <p
                className="font-semibold text-sm"
                style={{ color: "oklch(0.9 0.1 142)" }}
              >
                Welcome, {welcomeBadge.name}!
              </p>
              <p
                className="text-xs"
                style={{ color: "oklch(0.9 0.1 142 / 0.75)" }}
              >
                Signed in as {welcomeBadge.role} — redirecting…
              </p>
            </div>
          </div>
        )}

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
              className="text-lg font-semibold font-display"
              style={{ color: "white" }}
            >
              Sign In
            </h2>
            <p style={{ color: "oklch(1 0 0 / 0.55)" }} className="text-sm">
              Enter your credentials to continue
            </p>
          </div>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="p-6 space-y-5"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="login-username"
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
                  id="login-username"
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
                htmlFor="login-password"
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
                  id="login-password"
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
              className="w-full font-semibold font-display"
              disabled={loading}
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
                  Contact your{" "}
                  <strong style={{ color: "oklch(0.82 0.14 200)" }}>
                    Super Admin
                  </strong>{" "}
                  to reset your password from{" "}
                  <em>Settings → User Management → Reset Password</em>.
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
          <div className="space-y-1.5">
            {[
              { role: "Super Admin", cred: "superadmin / admin123" },
              { role: "Admin", cred: "admin / admin123" },
              { role: "Teacher / Staff", cred: "mobile / DOB (ddmmyyyy)" },
              { role: "Student", cred: "Adm.No. / DOB (ddmmyyyy)" },
              { role: "Parent", cred: "mobile / mobile" },
            ].map(({ role, cred }) => (
              <div key={role} className="flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: "oklch(1 0 0 / 0.40)" }}
                >
                  {role}
                </span>
                <code
                  className="text-xs font-mono"
                  style={{ color: "oklch(1 0 0 / 0.70)" }}
                >
                  {cred}
                </code>
              </div>
            ))}
          </div>
        </div>

        <p
          className="text-center text-xs mt-5"
          style={{ color: "oklch(1 0 0 / 0.25)" }}
        >
          © {new Date().getFullYear()} SHUBH SCHOOL ERP. Built with{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
            style={{ color: "oklch(1 0 0 / 0.35)" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
