import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { ls } from "../utils/localStorage";

// ── Types ────────────────────────────────────────────────────────────────────

type TemplateType =
  | "id_card"
  | "fee_receipt"
  | "admission"
  | "result"
  | "admit_card"
  | "bonafide"
  | "transfer"
  | "experience";

interface TemplateField {
  id: string;
  label: string;
  x: number;
  y: number;
  fontSize: number;
  bold: boolean;
  align: "left" | "center" | "right";
}

interface Template {
  id: string;
  type: TemplateType;
  name: string;
  paperSize: "A4" | "A5" | "Letter";
  orientation: "portrait" | "landscape";
  bgColor: string;
  bgImage?: string;
  fields: TemplateField[];
  isDefault: boolean;
  watermark?: string;
  stamp?: boolean;
}

// ── Template types config ────────────────────────────────────────────────────

const TEMPLATE_TYPES: {
  id: TemplateType;
  label: string;
  icon: string;
  defaultFields: string[];
}[] = [
  {
    id: "id_card",
    label: "ID Card",
    icon: "🪪",
    defaultFields: [
      "School Name",
      "Student Name",
      "Class & Section",
      "Adm No",
      "Father Name",
      "Mobile",
      "Blood Group",
      "Session",
    ],
  },
  {
    id: "fee_receipt",
    label: "Fee Receipt",
    icon: "🧾",
    defaultFields: [
      "Receipt No",
      "Student Name",
      "Class",
      "Adm No",
      "Date",
      "Amount Paid",
      "Payment Mode",
      "Received By",
    ],
  },
  {
    id: "admission",
    label: "Admission Form",
    icon: "📝",
    defaultFields: [
      "Student Name",
      "Father Name",
      "Mother Name",
      "DOB",
      "Address",
      "Mobile",
      "Class",
      "Adm No",
    ],
  },
  {
    id: "result",
    label: "Result Card",
    icon: "📊",
    defaultFields: [
      "Student Name",
      "Roll No",
      "Class",
      "Subject Marks",
      "Total",
      "Percentage",
      "Grade",
      "Exam Name",
    ],
  },
  {
    id: "admit_card",
    label: "Admit Card",
    icon: "🎫",
    defaultFields: [
      "Exam Name",
      "Student Name",
      "Roll No",
      "Class",
      "Exam Dates",
      "Centre",
      "Adm No",
    ],
  },
  {
    id: "bonafide",
    label: "Bonafide Cert.",
    icon: "📜",
    defaultFields: [
      "Student Name",
      "Adm No",
      "Class",
      "DOB",
      "Issue Date",
      "Purpose",
      "Principal Signature",
    ],
  },
  {
    id: "transfer",
    label: "Transfer Cert.",
    icon: "🔀",
    defaultFields: [
      "Student Name",
      "Adm No",
      "Class",
      "Date of Leaving",
      "Conduct",
      "TC No",
      "Reason",
    ],
  },
  {
    id: "experience",
    label: "Experience Cert.",
    icon: "🏆",
    defaultFields: [
      "Staff Name",
      "Designation",
      "Joining Date",
      "Leaving Date",
      "Conduct",
      "Principal Signature",
    ],
  },
];

function makeDefaultTemplate(type: TemplateType): Template {
  const meta = TEMPLATE_TYPES.find((t) => t.id === type);
  return {
    id: `default_${type}`,
    type,
    name: `${meta?.label ?? type} Template`,
    paperSize: "A4",
    orientation: type === "id_card" ? "landscape" : "portrait",
    bgColor: "#ffffff",
    fields: (meta?.defaultFields ?? []).map((label, i) => ({
      id: `f${i}`,
      label,
      x: 40,
      y: 60 + i * 35,
      fontSize: i === 0 ? 16 : 12,
      bold: i === 0,
      align: "left" as const,
    })),
    isDefault: true,
    watermark: "",
    stamp: false,
  };
}

// ── Preview ───────────────────────────────────────────────────────────────────

function TemplatePreview({
  template,
  scale = 1,
}: { template: Template; scale?: number }) {
  const w = template.orientation === "landscape" ? 560 : 340;
  const h = template.orientation === "landscape" ? 300 : 480;

  return (
    <div
      className="relative border border-border rounded-lg overflow-hidden bg-white shadow-sm"
      style={{
        width: w * scale,
        height: h * scale,
        background: template.bgColor || "#fff",
      }}
    >
      {template.bgImage && (
        <img
          src={template.bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
      )}
      {template.watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span
            className="font-black opacity-10 rotate-[-30deg]"
            style={{ fontSize: 32 * scale, color: "#1a1a2e" }}
          >
            {template.watermark}
          </span>
        </div>
      )}
      {template.fields.slice(0, 7).map((field) => (
        <div
          key={field.id}
          className="absolute whitespace-nowrap"
          style={{
            left: field.x * scale,
            top: field.y * scale,
            fontSize: field.fontSize * scale,
            fontWeight: field.bold ? 700 : 400,
            textAlign: field.align,
            color: "#1a1a2e",
          }}
        >
          {field.label}: <span style={{ opacity: 0.45 }}>[sample]</span>
        </div>
      ))}
      {template.stamp && (
        <div
          className="absolute border-2 border-primary/40 rounded-full flex items-center justify-center text-center text-primary/50 font-semibold"
          style={{
            width: 60 * scale,
            height: 60 * scale,
            bottom: 16 * scale,
            right: 16 * scale,
            fontSize: 8 * scale,
          }}
        >
          School
          <br />
          STAMP
        </div>
      )}
    </div>
  );
}

// ── Field Editor Row ──────────────────────────────────────────────────────────

function FieldRow({
  field,
  onChange,
}: { field: TemplateField; onChange: (f: TemplateField) => void }) {
  const upd = (k: keyof TemplateField, v: unknown) =>
    onChange({ ...field, [k]: v });
  return (
    <div className="flex items-center gap-1.5 text-xs bg-muted/30 rounded px-2 py-1.5">
      <span className="w-28 font-medium text-foreground truncate shrink-0">
        {field.label}
      </span>
      <Input
        value={field.x}
        onChange={(e) => upd("x", Number.parseInt(e.target.value, 10) || 0)}
        className="w-14 h-6 text-xs px-1"
        inputMode="numeric"
        placeholder="X"
      />
      <Input
        value={field.y}
        onChange={(e) => upd("y", Number.parseInt(e.target.value, 10) || 0)}
        className="w-14 h-6 text-xs px-1"
        inputMode="numeric"
        placeholder="Y"
      />
      <Input
        value={field.fontSize}
        onChange={(e) =>
          upd("fontSize", Number.parseInt(e.target.value, 10) || 12)
        }
        className="w-12 h-6 text-xs px-1"
        inputMode="numeric"
        placeholder="Sz"
      />
      <button
        type="button"
        onClick={() => upd("bold", !field.bold)}
        className={`w-6 h-6 rounded text-[10px] font-bold border transition-colors ${field.bold ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
      >
        B
      </button>
      <select
        value={field.align}
        onChange={(e) => upd("align", e.target.value)}
        className="h-6 text-[10px] rounded border border-input bg-background px-0.5"
      >
        <option value="left">L</option>
        <option value="center">C</option>
        <option value="right">R</option>
      </select>
    </div>
  );
}

// ── Template Editor ───────────────────────────────────────────────────────────

function TemplateEditor({ type }: { type: TemplateType }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useApp();
  const [previewOpen, setPreviewOpen] = useState(false);

  const [templates, setTemplates] = useState<Template[]>(() => {
    const all = ls.get<Template[]>("cert_templates", []);
    const existing = all.filter((t) => t.type === type);
    return existing.length > 0 ? existing : [makeDefaultTemplate(type)];
  });

  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const tpl = templates.find((t) => t.id === selectedId) ?? templates[0];

  const persistAll = (next: Template[]) => {
    setTemplates(next);
    const all = ls.get<Template[]>("cert_templates", []);
    ls.set("cert_templates", [...all.filter((t) => t.type !== type), ...next]);
  };

  const updateTpl = (changes: Partial<Template>) => {
    persistAll(
      templates.map((t) => (t.id === selectedId ? { ...t, ...changes } : t)),
    );
  };

  const setDefault = (id: string) => {
    persistAll(templates.map((t) => ({ ...t, isDefault: t.id === id })));
    addNotification("Default template updated", "success");
  };

  const uploadBg = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => updateTpl({ bgImage: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const exportTpl = () => {
    const blob = new Blob([JSON.stringify(tpl, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!tpl) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          data-ocid={`certificates.template_select.${type}`}
          className="h-8 text-sm rounded border border-input bg-background px-2"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.isDefault ? " ★" : ""}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDefault(selectedId)}
          data-ocid={`certificates.set_default.${type}`}
          className="h-8 text-xs"
        >
          ★ Default
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPreviewOpen(true)}
          data-ocid={`certificates.preview_button.${type}`}
          className="h-8 text-xs"
        >
          Preview
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={exportTpl}
          data-ocid={`certificates.export_button.${type}`}
          className="h-8 text-xs"
        >
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Controls */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Layout Options
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Paper Size
                </Label>
                <select
                  value={tpl.paperSize}
                  onChange={(e) =>
                    updateTpl({
                      paperSize: e.target.value as Template["paperSize"],
                    })
                  }
                  className="w-full h-8 text-xs rounded border border-input bg-background px-2"
                >
                  {["A4", "A5", "Letter"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Orientation
                </Label>
                <select
                  value={tpl.orientation}
                  onChange={(e) =>
                    updateTpl({
                      orientation: e.target.value as Template["orientation"],
                    })
                  }
                  className="w-full h-8 text-xs rounded border border-input bg-background px-2"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Background Color
                </Label>
                <Input
                  type="color"
                  value={tpl.bgColor}
                  onChange={(e) =>
                    updateTpl({ bgColor: e.target.value, bgImage: undefined })
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Watermark
                </Label>
                <Input
                  value={tpl.watermark ?? ""}
                  onChange={(e) => updateTpl({ watermark: e.target.value })}
                  placeholder="e.g. OFFICIAL"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadBg(f);
                }}
              />
              <Button
                size="sm"
                variant="outline"
                data-ocid={`certificates.upload_bg.${type}`}
                onClick={() => fileRef.current?.click()}
                className="h-8 text-xs"
              >
                Upload BG Image
              </Button>
              {tpl.bgImage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateTpl({ bgImage: undefined })}
                  className="h-8 text-xs text-destructive"
                >
                  Remove
                </Button>
              )}
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={tpl.stamp ?? false}
                  onChange={(e) => updateTpl({ stamp: e.target.checked })}
                  className="rounded"
                />
                School Stamp
              </label>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-foreground">Fields</h4>
              <span className="text-[10px] text-muted-foreground">
                X · Y · Size · Bold · Align
              </span>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {tpl.fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  onChange={(f) =>
                    updateTpl({
                      fields: tpl.fields.map((x) =>
                        x.id === field.id ? f : x,
                      ),
                    })
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="flex flex-col items-start">
          <p className="text-xs text-muted-foreground mb-2">Live Preview</p>
          <TemplatePreview template={tpl} scale={0.65} />
        </div>
      </div>

      {/* Full preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="max-w-3xl"
          data-ocid={`certificates.preview_dialog.${type}`}
        >
          <DialogHeader>
            <DialogTitle>{tpl.name} — Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4 overflow-auto">
            <TemplatePreview template={tpl} scale={1} />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
              data-ocid={`certificates.print_button.${type}`}
            >
              🖨 Print Sample
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPreviewOpen(false)}
              data-ocid={`certificates.close_preview.${type}`}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Certificates() {
  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="certificates.page">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Certificate Studio
        </h1>
        <p className="text-muted-foreground text-sm">
          Design, customize, and print all school certificates and cards
        </p>
      </div>

      <Tabs defaultValue="id_card">
        <TabsList className="mb-4 flex-wrap h-auto gap-0.5">
          {TEMPLATE_TYPES.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              data-ocid={`certificates.tab.${t.id}`}
              className="text-xs gap-1"
            >
              {t.icon} {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TEMPLATE_TYPES.map((t) => (
          <TabsContent key={t.id} value={t.id}>
            <TemplateEditor type={t.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
