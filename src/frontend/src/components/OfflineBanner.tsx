import { WifiOff } from "lucide-react";
/**
 * OfflineBanner — full-width yellow banner shown when navigator.onLine is false.
 * Disappears automatically when the connection returns.
 */
import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-ocid="offline.banner"
      className="w-full py-2 px-4 flex items-center justify-center gap-2 text-xs font-medium bg-yellow-50 text-yellow-800 border-b border-yellow-200 z-[60] print:hidden"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>
        You are offline — changes are saved locally and will sync when your
        connection returns.
      </span>
    </div>
  );
}
