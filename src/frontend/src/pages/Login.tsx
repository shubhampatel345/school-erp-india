import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, GraduationCap, Lock, User } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    const ok = login(username.trim(), password);
    setLoading(false);
    if (!ok)
      setError(
        "Invalid username or password. Please check your credentials and try again.",
      );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.20 0.10 260) 0%, oklch(0.28 0.14 260) 50%, oklch(0.22 0.10 250) 100%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4 ring-2 ring-white/20">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1
            className="text-3xl font-bold text-white tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SHUBH SCHOOL ERP
          </h1>
          <p className="text-white/60 mt-1 text-sm">School Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl shadow-strong border border-white/10 overflow-hidden">
          <div className="bg-muted/40 border-b border-border px-6 py-4">
            <h2
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sign In
            </h2>
            <p className="text-muted-foreground text-sm">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  data-ocid="login-username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  autoComplete="username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  data-ocid="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                className="text-destructive text-sm rounded-lg px-3 py-2.5 border"
                style={{
                  backgroundColor: "oklch(var(--destructive) / 0.08)",
                  borderColor: "oklch(var(--destructive) / 0.25)",
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              data-ocid="login-submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>

        {/* Role hint */}
        <div className="mt-5 bg-white/8 backdrop-blur rounded-xl border border-white/15 px-4 py-3">
          <p className="text-white/50 text-xs text-center">
            Super Admin:{" "}
            <span className="font-mono text-white/75 tracking-wide">
              superadmin / admin123
            </span>
          </p>
          <p className="text-white/40 text-[11px] text-center mt-1">
            Teacher: mobile / DOB (ddmmyyyy) &nbsp;|&nbsp; Student: Adm.No. /
            DOB
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-5">
          © {new Date().getFullYear()} SHUBH SCHOOL ERP
        </p>
      </div>
    </div>
  );
}
