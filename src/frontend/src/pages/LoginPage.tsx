import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Building2,
  Bus,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FlaskConical,
  GraduationCap,
  LogIn,
  Monitor,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getSchoolProfile } from "../data/schoolProfile";
import type { Role } from "../types/auth";

const ROLES: { value: Role; label: string; color: string }[] = [
  { value: "super_admin", label: "Super Admin", color: "bg-red-500" },
  { value: "admin", label: "Admin", color: "bg-orange-500" },
  { value: "accountant", label: "Accountant", color: "bg-yellow-500" },
  { value: "librarian", label: "Librarian", color: "bg-blue-500" },
  { value: "teacher", label: "Teacher", color: "bg-green-500" },
  { value: "parent", label: "Parent", color: "bg-purple-500" },
  { value: "student", label: "Student", color: "bg-cyan-500" },
  { value: "driver", label: "Driver", color: "bg-teal-500" },
];

const DEMO_CREDS: Record<Role, { userId: string; password: string }> = {
  super_admin: { userId: "superadmin", password: "admin123" },
  admin: { userId: "admin", password: "admin123" },
  accountant: { userId: "accountant", password: "acc123" },
  librarian: { userId: "librarian", password: "lib123" },
  teacher: { userId: "teacher", password: "teacher123" },
  parent: { userId: "parent", password: "parent123" },
  student: { userId: "student", password: "student123" },
  driver: { userId: "driver", password: "driver123" },
};

const FEATURE_ICONS = [BookOpen, Monitor, FlaskConical, Bus, Trophy, Building2];

const SLIDE_KEYS = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"];

const PLACEHOLDER_GRADIENTS = [
  "from-blue-800 to-indigo-900",
  "from-teal-800 to-cyan-900",
  "from-violet-800 to-purple-900",
  "from-emerald-800 to-green-900",
];

export function LoginPage() {
  const { login } = useAuth();
  const profile = getSchoolProfile();

  const [role, setRole] = useState<Role>("admin");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [photoIdx, setPhotoIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const photos = profile.photos.length > 0 ? profile.photos : null;
  const totalSlides = photos ? photos.length : PLACEHOLDER_GRADIENTS.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setPhotoIdx((i) => (i + 1) % totalSlides);
    }, 3500);
    return () => clearInterval(timer);
  }, [totalSlides]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const success = login(userId, password, role);
    setIsLoading(false);
    if (!success)
      setError("Invalid User ID, Password, or Role. Please try again.");
  };

  const creds = DEMO_CREDS[role];

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "#0f1420" }}
    >
      {/* Left Panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col w-[60%] relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #111827 0%, #1a2744 60%, #0f2040 100%)",
        }}
      >
        {/* Header */}
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight">
                {profile.schoolName}
              </h1>
              <p className="text-blue-300 text-sm">{profile.tagline}</p>
            </div>
          </div>
        </div>

        {/* Photo Carousel */}
        <div
          className="mx-8 rounded-2xl overflow-hidden relative"
          style={{ height: 220 }}
        >
          {photos
            ? photos.map((src, i) => (
                <motion.img
                  key={src}
                  src={src}
                  alt={`Gallery slide ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: i === photoIdx ? 1 : 0 }}
                  transition={{ duration: 0.8 }}
                />
              ))
            : PLACEHOLDER_GRADIENTS.map((g, i) => (
                <motion.div
                  key={g}
                  className={`absolute inset-0 bg-gradient-to-br ${g} flex flex-col items-center justify-center gap-3`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: i === photoIdx ? 1 : 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <GraduationCap size={48} className="text-white/30" />
                  <p className="text-white/50 text-sm">School Photo Gallery</p>
                  <p className="text-white/30 text-xs">
                    Add photos in Settings → School Profile
                  </p>
                </motion.div>
              ))}
          {/* Carousel controls */}
          <button
            type="button"
            onClick={() =>
              setPhotoIdx((i) => (i - 1 + totalSlides) % totalSlides)
            }
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-1 text-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPhotoIdx((i) => (i + 1) % totalSlides)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-1 text-white transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {SLIDE_KEYS.slice(0, totalSlides).map((dotKey, i) => (
              <button
                type="button"
                key={dotKey}
                onClick={() => setPhotoIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === photoIdx ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div className="mx-8 mt-5">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">
            School Features
          </p>
          <div className="grid grid-cols-3 gap-3">
            {profile.features.slice(0, 6).map((feat, i) => {
              const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
              return (
                <motion.div
                  key={feat}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 0.4 }}
                  className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
                >
                  <Icon size={14} className="text-orange-400 flex-shrink-0" />
                  <span className="text-gray-300 text-xs">{feat}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-auto mx-8 pb-6 pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
            <span>📍 {profile.address}</span>
            <span>📞 {profile.phone}</span>
            <span>✉️ {profile.email}</span>
          </div>
        </div>
      </motion.div>

      {/* Right Panel */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-col items-center justify-center flex-1 px-8"
        style={{ background: "#141b2d" }}
      >
        <div className="w-full max-w-sm">
          {/* Logo for mobile */}
          <div className="flex justify-center mb-6 lg:hidden">
            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap size={28} className="text-white" />
            </div>
          </div>

          <div className="mb-8 text-center">
            <div className="hidden lg:flex justify-center mb-4">
              <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <GraduationCap size={28} className="text-white" />
              </div>
            </div>
            <h2 className="text-white text-2xl font-bold">Welcome Back</h2>
            <p className="text-gray-400 text-sm mt-1">
              Sign in to your account
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            data-ocid="login.modal"
          >
            {/* Role Select */}
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Login As</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger
                  className="bg-gray-800/80 border-gray-600 text-white"
                  data-ocid="login.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {ROLES.map((r) => (
                    <SelectItem
                      key={r.value}
                      value={r.value}
                      className="text-white hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${r.color}`} />
                        {r.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User ID */}
            <div className="space-y-1.5">
              <Label htmlFor="userId" className="text-gray-300 text-xs">
                User ID
              </Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your User ID"
                className="bg-gray-800/80 border-gray-600 text-white placeholder-gray-500"
                data-ocid="login.input"
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-300 text-xs">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-gray-800/80 border-gray-600 text-white placeholder-gray-500 pr-10"
                  data-ocid="login.input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2"
                data-ocid="login.error_state"
              >
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            {/* Demo hint */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
              <p className="text-blue-300 text-xs font-medium">
                Demo Credentials
              </p>
              <p className="text-blue-200/70 text-xs mt-0.5">
                User ID:{" "}
                <span className="font-mono text-blue-300">{creds.userId}</span>
                {" · "}
                Password:{" "}
                <span className="font-mono text-blue-300">
                  {creds.password}
                </span>
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              disabled={isLoading}
              data-ocid="login.submit_button"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={16} />
                  Sign In
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-gray-600 text-xs text-center mt-8">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-400 transition-colors"
            >
              Built with ❤️ using caffeine.ai
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
