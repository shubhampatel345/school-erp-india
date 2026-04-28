import { GraduationCap } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = "Loading…",
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-elevated"
          style={{ background: "oklch(0.3 0.12 260)" }}
        >
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground font-display tracking-tight">
            SHUBH SCHOOL ERP
          </p>
          <p className="text-sm text-muted-foreground mt-2">{message}</p>
          <div className="flex items-center gap-1.5 justify-center mt-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
