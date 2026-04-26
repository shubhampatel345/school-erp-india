/**
 * Result Template Designer
 * Drag-and-drop template designer for exam result sheets.
 * Canvas: A4 preview (794×1123px scaled to fit screen)
 * Fields: draggable blocks with font/position customization
 * Background: image upload stored in canister
 * Template saved to exam_results_template collection
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Download,
  Image,
  Italic,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { generateId } from "../../utils/localStorage";
import { phpApiService } from "../../utils/phpApiService";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateField {
  id: string;
  type: string;
  label: string;
  x: number; // % of canvas width
  y: number; // % of canvas height
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: "left" | "center" | "right";
}

export interface ResultTemplate {
  id: string;
  name: string;
  fields: TemplateField[];
  backgroundImage: string;
  createdAt: string;
}

// ── Available field types ─────────────────────────────────────────────────────

const FIELD_TYPES = [
  { type: "studentName", label: "Student Name" },
  { type: "admNo", label: "Adm. No." },
  { type: "class", label: "Class" },
  { type: "rollNo", label: "Roll No." },
  { type: "examName", label: "Exam Name" },
  { type: "subjectMarks", label: "Subject / Marks Table" },
  { type: "totalMarks", label: "Total Marks" },
  { type: "percentage", label: "Percentage" },
  { type: "grade", label: "Grade" },
  { type: "result", label: "Result (Pass/Fail)" },
  { type: "date", label: "Date" },
  { type: "schoolName", label: "School Name" },
  { type: "schoolLogo", label: "School Logo" },
  { type: "principalSign", label: "Principal Signature" },
  { type: "freeText", label: "Free Text" },
];

// A4 aspect ratio: 794 / 1123
const A4_RATIO = 794 / 1123;

// ── Field Block (on canvas) ───────────────────────────────────────────────────

function FieldBlock({
  field,
  selected,
  onSelect,
  onDrag,
  canvasRef,
}: {
  field: TemplateField;
  selected: boolean;
  onSelect: () => void;
  onDrag: (x: number, y: number) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}) {
  const dragging = useRef(false);
  const origin = useRef({ px: 0, py: 0, fx: 0, fy: 0 });

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onSelect();
      dragging.current = true;
      origin.current = {
        px: e.clientX,
        py: e.clientY,
        fx: field.x,
        fy: field.y,
      };
      (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    },
    [onSelect, field.x, field.y],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (!dragging.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - origin.current.px) / rect.width) * 100;
      const dy = ((e.clientY - origin.current.py) / rect.height) * 100;
      const nx = Math.max(0, Math.min(95, origin.current.fx + dx));
      const ny = Math.max(0, Math.min(95, origin.current.fy + dy));
      onDrag(nx, ny);
    },
    [onDrag, canvasRef],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const labelText = field.label || field.type;

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`absolute select-none cursor-move rounded px-1 py-0.5 transition-colors ${
        selected
          ? "ring-1 ring-primary/70 bg-primary/10 z-10"
          : "hover:bg-primary/5"
      }`}
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        fontSize: `${field.fontSize}px`,
        fontWeight: field.bold ? "bold" : "normal",
        fontStyle: field.italic ? "italic" : "normal",
        color: field.color,
        textAlign: field.align,
        touchAction: "none",
        maxWidth: "90%",
        background: "transparent",
        border: selected
          ? "1px solid hsl(var(--primary))"
          : "1px dashed rgba(100,100,100,0.4)",
      }}
      aria-label={`Field: ${labelText}`}
    >
      {labelText}
    </button>
  );
}

// ── Properties Panel ──────────────────────────────────────────────────────────

function PropertiesPanel({
  field,
  onChange,
  onDelete,
}: {
  field: TemplateField;
  onChange: (updates: Partial<TemplateField>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Field Properties
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          data-ocid="template.field.delete_button"
          aria-label="Delete field"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Label / Text</Label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="h-7 text-xs"
          data-ocid="template.field.label.input"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">X (%)</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={Math.round(field.x)}
            onChange={(e) =>
              onChange({
                x: Math.max(
                  0,
                  Math.min(
                    95,
                    Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                  ),
                ),
              })
            }
            className="h-7 text-xs"
            data-ocid="template.field.x.input"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Y (%)</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={Math.round(field.y)}
            onChange={(e) =>
              onChange({
                y: Math.max(
                  0,
                  Math.min(
                    95,
                    Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                  ),
                ),
              })
            }
            className="h-7 text-xs"
            data-ocid="template.field.y.input"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Font Size (px)</Label>
        <Input
          type="text"
          inputMode="numeric"
          value={field.fontSize}
          onChange={(e) =>
            onChange({
              fontSize: Math.max(
                6,
                Math.min(
                  72,
                  Number(e.target.value.replace(/[^0-9]/g, "")) || 12,
                ),
              ),
            })
          }
          className="h-7 text-xs"
          data-ocid="template.field.fontsize.input"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Text Color</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={field.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="w-8 h-7 rounded border border-input cursor-pointer bg-transparent"
            data-ocid="template.field.color.input"
          />
          <Input
            value={field.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-7 text-xs flex-1 font-mono"
          />
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          size="sm"
          variant={field.bold ? "default" : "outline"}
          className="flex-1 h-7 text-xs"
          onClick={() => onChange({ bold: !field.bold })}
          data-ocid="template.field.bold.toggle"
        >
          <Bold className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant={field.italic ? "default" : "outline"}
          className="flex-1 h-7 text-xs"
          onClick={() => onChange({ italic: !field.italic })}
          data-ocid="template.field.italic.toggle"
        >
          <Italic className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant={field.align === "left" ? "default" : "outline"}
          className="flex-1 h-7 text-xs"
          onClick={() => onChange({ align: "left" })}
          data-ocid="template.field.align_left.toggle"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant={field.align === "center" ? "default" : "outline"}
          className="flex-1 h-7 text-xs"
          onClick={() => onChange({ align: "center" })}
          data-ocid="template.field.align_center.toggle"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResultTemplateDesigner() {
  // Load saved templates from server or localStorage
  const [templates, setTemplates] = useState<ResultTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ResultTemplate | null>(
    null,
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("My Result Template");
  const [showLoadPanel, setShowLoadPanel] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  // Load templates from server on mount
  useEffect(() => {
    phpApiService
      .get<Record<string, unknown>[]>("settings/get&key=exam_result_templates")
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.value) {
          try {
            const parsed = JSON.parse(
              String(rows[0].value),
            ) as ResultTemplate[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTemplates(parsed);
            }
          } catch {
            /* noop */
          }
        }
      })
      .catch(() => {
        /* noop */
      });
  }, []);

  // Start with a new blank template (run once on mount)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setActiveTemplate({
      id: generateId(),
      name: "My Result Template",
      fields: [
        {
          id: generateId(),
          type: "schoolName",
          label: "School Name",
          x: 30,
          y: 3,
          fontSize: 18,
          bold: true,
          italic: false,
          color: "#1a1a1a",
          align: "center",
        },
        {
          id: generateId(),
          type: "examName",
          label: "Exam Name",
          x: 30,
          y: 8,
          fontSize: 14,
          bold: true,
          italic: false,
          color: "#333333",
          align: "center",
        },
        {
          id: generateId(),
          type: "studentName",
          label: "Student Name",
          x: 5,
          y: 16,
          fontSize: 12,
          bold: false,
          italic: false,
          color: "#1a1a1a",
          align: "left",
        },
        {
          id: generateId(),
          type: "admNo",
          label: "Adm. No.",
          x: 55,
          y: 16,
          fontSize: 12,
          bold: false,
          italic: false,
          color: "#1a1a1a",
          align: "left",
        },
        {
          id: generateId(),
          type: "class",
          label: "Class",
          x: 5,
          y: 21,
          fontSize: 12,
          bold: false,
          italic: false,
          color: "#1a1a1a",
          align: "left",
        },
        {
          id: generateId(),
          type: "date",
          label: "Date",
          x: 55,
          y: 21,
          fontSize: 12,
          bold: false,
          italic: false,
          color: "#1a1a1a",
          align: "left",
        },
        {
          id: generateId(),
          type: "subjectMarks",
          label: "Subject / Marks Table",
          x: 5,
          y: 28,
          fontSize: 11,
          bold: false,
          italic: false,
          color: "#1a1a1a",
          align: "left",
        },
        {
          id: generateId(),
          type: "totalMarks",
          label: "Total Marks",
          x: 5,
          y: 75,
          fontSize: 12,
          bold: true,
          italic: false,
          color: "#1a1a1a",
          align: "left",
        },
        {
          id: generateId(),
          type: "percentage",
          label: "Percentage",
          x: 40,
          y: 75,
          fontSize: 12,
          bold: true,
          italic: false,
          color: "#1a1a1a",
          align: "left",
        },
        {
          id: generateId(),
          type: "grade",
          label: "Grade",
          x: 70,
          y: 75,
          fontSize: 12,
          bold: true,
          italic: false,
          color: "#1a1a1a",
          align: "left",
        },
        {
          id: generateId(),
          type: "result",
          label: "Result (Pass/Fail)",
          x: 5,
          y: 82,
          fontSize: 14,
          bold: true,
          italic: false,
          color: "#1a1a1a",
          align: "left",
        },
        {
          id: generateId(),
          type: "principalSign",
          label: "Principal Signature",
          x: 60,
          y: 92,
          fontSize: 11,
          bold: false,
          italic: false,
          color: "#555555",
          align: "center",
        },
      ],
      backgroundImage: "",
      createdAt: new Date().toISOString(),
    });
  }, []);

  const selectedField =
    activeTemplate?.fields.find((f) => f.id === selectedFieldId) ?? null;

  function addField(type: string, label: string) {
    if (!activeTemplate) return;
    const newField: TemplateField = {
      id: generateId(),
      type,
      label,
      x: 10,
      y: 10,
      fontSize: 12,
      bold: false,
      italic: false,
      color: "#1a1a1a",
      align: "left",
    };
    setActiveTemplate({
      ...activeTemplate,
      fields: [...activeTemplate.fields, newField],
    });
    setSelectedFieldId(newField.id);
  }

  function updateField(id: string, updates: Partial<TemplateField>) {
    if (!activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      fields: activeTemplate.fields.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      ),
    });
  }

  function deleteField(id: string) {
    if (!activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      fields: activeTemplate.fields.filter((f) => f.id !== id),
    });
    setSelectedFieldId(null);
  }

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeTemplate) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setActiveTemplate({
        ...activeTemplate,
        backgroundImage: ev.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSave() {
    if (!activeTemplate) return;
    setSaving(true);
    try {
      const toSave = {
        ...activeTemplate,
        name: templateName,
        createdAt: new Date().toISOString(),
      };
      const updatedList = templates.find((t) => t.id === toSave.id)
        ? templates.map((t) => (t.id === toSave.id ? toSave : t))
        : [toSave, ...templates];

      // Save to server
      await phpApiService.post("settings/save", {
        key: "exam_result_templates",
        value: JSON.stringify(updatedList),
      });

      // Also save active template for ExamResults to use
      await phpApiService
        .post("settings/save", {
          key: "exam_result_template",
          value: JSON.stringify(toSave),
        })
        .catch(() => {});

      // Fallback: save to localStorage
      localStorage.setItem("exam_result_template", JSON.stringify(toSave));

      setTemplates(updatedList);
    } catch {
      // Silently handle — save to localStorage as fallback
      const toSave = {
        ...activeTemplate,
        name: templateName,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("exam_result_template", JSON.stringify(toSave));
      setTemplates((prev) => {
        const exists = prev.find((t) => t.id === toSave.id);
        return exists
          ? prev.map((t) => (t.id === toSave.id ? toSave : t))
          : [toSave, ...prev];
      });
    } finally {
      setSaving(false);
    }
  }

  function handleLoadTemplate(t: ResultTemplate) {
    setActiveTemplate({ ...t });
    setTemplateName(t.name);
    setSelectedFieldId(null);
    setShowLoadPanel(false);
  }

  function handleNewTemplate() {
    const fresh: ResultTemplate = {
      id: generateId(),
      name: "New Template",
      fields: [],
      backgroundImage: "",
      createdAt: new Date().toISOString(),
    };
    setActiveTemplate(fresh);
    setTemplateName("New Template");
    setSelectedFieldId(null);
  }

  if (!activeTemplate) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-40">
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
            className="h-8 text-sm font-medium"
            data-ocid="template.name.input"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => bgRef.current?.click()}
            data-ocid="template.bg.upload_button"
          >
            <Image className="w-3.5 h-3.5 mr-1.5" />
            {activeTemplate.backgroundImage ? "Change BG" : "Add BG Image"}
          </Button>
          {activeTemplate.backgroundImage && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30"
              onClick={() =>
                setActiveTemplate({ ...activeTemplate, backgroundImage: "" })
              }
              data-ocid="template.bg.delete_button"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Remove BG
            </Button>
          )}
          <input
            ref={bgRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBgUpload}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLoadPanel(!showLoadPanel)}
            data-ocid="template.load.button"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Load Template
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewTemplate}
            data-ocid="template.new.button"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
            data-ocid="template.save_button"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving…" : "Save Template"}
          </Button>
        </div>
      </div>

      {/* Load Panel */}
      {showLoadPanel && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Saved Templates</p>
          {templates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No saved templates yet
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleLoadTemplate(t)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-xs font-medium hover:bg-primary/10 hover:border-primary/40 transition-colors"
                  data-ocid={`template.load.item.${t.id}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Left: Add Fields Panel */}
        <div className="w-full lg:w-48 shrink-0 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Add Fields
          </p>
          <div className="space-y-1">
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft.type}
                type="button"
                onClick={() => addField(ft.type, ft.label)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1.5 text-muted-foreground border border-transparent hover:border-primary/20"
                data-ocid={`template.add_field.${ft.type}`}
              >
                <Plus className="w-3 h-3 shrink-0" />
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: A4 Canvas */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            A4 Canvas Preview
          </p>
          <div
            className="relative mx-auto border-2 border-border bg-card overflow-hidden shadow-elevated"
            style={{
              width: "100%",
              maxWidth: "560px",
              aspectRatio: `${A4_RATIO}`,
              backgroundImage: activeTemplate.backgroundImage
                ? `url(${activeTemplate.backgroundImage})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            ref={canvasRef as React.RefObject<HTMLDivElement>}
            onClick={() => setSelectedFieldId(null)}
            onKeyDown={() => {}}
            role="presentation"
            data-ocid="template.canvas_target"
          >
            {!activeTemplate.backgroundImage && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-muted-foreground/20">
                  <Upload className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm font-medium">A4 Result Sheet</p>
                  <p className="text-xs">Drag fields to position them</p>
                </div>
              </div>
            )}
            {activeTemplate.fields.map((field) => (
              <FieldBlock
                key={field.id}
                field={field}
                selected={selectedFieldId === field.id}
                onSelect={() => setSelectedFieldId(field.id)}
                onDrag={(x, y) => updateField(field.id, { x, y })}
                canvasRef={canvasRef as React.RefObject<HTMLDivElement | null>}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Click a field to select · Drag to reposition · Use panel to style
          </p>
        </div>

        {/* Right: Properties Panel */}
        <div className="w-full lg:w-56 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Properties
          </p>
          {selectedField ? (
            <PropertiesPanel
              field={selectedField}
              onChange={(updates) => updateField(selectedField.id, updates)}
              onDelete={() => deleteField(selectedField.id)}
            />
          ) : (
            <div className="bg-muted/20 rounded-xl border border-dashed border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Select a field on the canvas to edit its properties
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
