import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description?: string;
  onNavigate?: (page: string) => void;
}

export default function Placeholder({
  title,
  description,
  onNavigate,
}: PlaceholderProps) {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="p-10 text-center max-w-md w-full shadow-card">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Construction className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description ??
            "This module is being set up. Please check back soon."}
        </p>
        {onNavigate && (
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => onNavigate("dashboard")}
          >
            ← Back to Dashboard
          </Button>
        )}
      </Card>
    </div>
  );
}
