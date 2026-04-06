import { useRef, useState } from "react";

interface DateInputProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (val: string) => void;
  className?: string;
  error?: boolean;
  "data-ocid"?: string;
}

export function DateInput({
  value,
  onChange,
  className,
  error,
  "data-ocid": dataOcid,
}: DateInputProps) {
  const mmRef = useRef<HTMLInputElement>(null);
  const yyyyRef = useRef<HTMLInputElement>(null);

  // Parse existing value
  const parts = value ? value.split("-") : ["", "", ""];
  const [dd, setDd] = useState(parts[2] || "");
  const [mm, setMm] = useState(parts[1] || "");
  const [yyyy, setYyyy] = useState(parts[0] || "");

  // Sync local state to parent when any segment changes
  function emit(newDd: string, newMm: string, newYyyy: string) {
    if (newDd.length === 2 && newMm.length === 2 && newYyyy.length === 4) {
      onChange(`${newYyyy}-${newMm}-${newDd}`);
    } else if (!newDd && !newMm && !newYyyy) {
      onChange("");
    }
  }

  function handleDd(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 2);
    setDd(clean);
    emit(clean, mm, yyyy);
    if (clean.length === 2) {
      mmRef.current?.focus();
    }
  }

  function handleMm(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 2);
    setMm(clean);
    emit(dd, clean, yyyy);
    if (clean.length === 2) {
      yyyyRef.current?.focus();
    }
  }

  function handleYyyy(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 4);
    setYyyy(clean);
    emit(dd, mm, clean);
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    seg: "dd" | "mm" | "yyyy",
  ) {
    if (e.key === "Backspace") {
      if (seg === "mm" && mm === "") {
        // don't need to go back, just let normal backspace work
      } else if (seg === "yyyy" && yyyy === "") {
        mmRef.current?.focus();
        e.preventDefault();
      }
    }
    if (e.key === "ArrowRight" || e.key === "Tab") {
      if (seg === "dd" && dd.length > 0) {
        mmRef.current?.focus();
        e.preventDefault();
      } else if (seg === "mm" && mm.length > 0) {
        yyyyRef.current?.focus();
        e.preventDefault();
      }
    }
  }

  const borderCls = error
    ? "border-red-500"
    : "border-gray-600 focus-within:border-blue-500";

  return (
    <div
      className={`flex items-center bg-gray-800 border rounded px-2 py-1.5 gap-1 ${borderCls} transition-colors ${className || ""}`}
      data-ocid={dataOcid}
    >
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD"
        value={dd}
        onChange={(e) => handleDd(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "dd")}
        className="w-7 bg-transparent text-white text-xs outline-none text-center"
        maxLength={2}
      />
      <span className="text-gray-500 text-xs">/</span>
      <input
        ref={mmRef}
        type="text"
        inputMode="numeric"
        placeholder="MM"
        value={mm}
        onChange={(e) => handleMm(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "mm")}
        className="w-7 bg-transparent text-white text-xs outline-none text-center"
        maxLength={2}
      />
      <span className="text-gray-500 text-xs">/</span>
      <input
        ref={yyyyRef}
        type="text"
        inputMode="numeric"
        placeholder="YYYY"
        value={yyyy}
        onChange={(e) => handleYyyy(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "yyyy")}
        className="w-10 bg-transparent text-white text-xs outline-none text-center"
        maxLength={4}
      />
    </div>
  );
}
