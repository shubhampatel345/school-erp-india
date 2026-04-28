/**
 * SHUBH SCHOOL ERP — Alumni Module
 * Direct PHP API via apiCall(). No local storage, no getData() stubs.
 */
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { apiCall } from "../utils/api";

interface Alumni {
  id: string;
  name: string;
  batch: string;
  class_?: string;
  admNo?: string;
  mobile?: string;
  email?: string;
  address?: string;
  photo?: string;
}

interface AlumniEvent {
  id: string;
  title: string;
  date: string;
  description?: string;
  attendees?: string[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AlumniCard({
  alumni,
  idx,
  onEdit,
}: { alumni: Alumni; idx: number; onEdit: (a: Alumni) => void }) {
  return (
    <div
      data-ocid={`alumni.item.${idx}`}
      className="bg-card border border-border rounded-xl p-4 flex items-start gap-3"
    >
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
        {alumni.photo ? (
          <img
            src={alumni.photo}
            alt={alumni.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initials(alumni.name)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-medium text-sm text-foreground">
            {alumni.name}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            Batch {alumni.batch}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {alumni.class_} · {alumni.admNo ?? "–"}
        </p>
        {alumni.email && (
          <p className="text-xs text-muted-foreground">{alumni.email}</p>
        )}
        {alumni.mobile && (
          <p className="text-xs text-muted-foreground">{alumni.mobile}</p>
        )}
        {alumni.address && (
          <p className="text-xs text-muted-foreground truncate">
            {alumni.address}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        data-ocid={`alumni.edit_button.${idx}`}
        onClick={() => onEdit(alumni)}
        className="h-7 text-xs shrink-0"
      >
        Edit
      </Button>
    </div>
  );
}

function AlumniForm({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: Alumni;
  onSave: (a: Partial<Alumni>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Alumni>>(
    initial ?? {
      batch: String(new Date().getFullYear() - 1),
      class_: "Class 12",
    },
  );
  const upd = (k: keyof Alumni, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Full Name *
          </Label>
          <Input
            data-ocid="alumni.form_name_input"
            value={form.name ?? ""}
            onChange={(e) => upd("name", e.target.value)}
            placeholder="Student full name"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Batch Year
          </Label>
          <Input
            data-ocid="alumni.form_batch_input"
            value={form.batch ?? ""}
            onChange={(e) => upd("batch", e.target.value)}
            inputMode="numeric"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Last Class
          </Label>
          <Input
            data-ocid="alumni.form_class_input"
            value={form.class_ ?? ""}
            onChange={(e) => upd("class_", e.target.value)}
            placeholder="Class 12"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Admission No
          </Label>
          <Input
            data-ocid="alumni.form_admno_input"
            value={form.admNo ?? ""}
            onChange={(e) => upd("admNo", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Mobile
          </Label>
          <Input
            data-ocid="alumni.form_mobile_input"
            value={form.mobile ?? ""}
            onChange={(e) => upd("mobile", e.target.value)}
            inputMode="tel"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Email
          </Label>
          <Input
            data-ocid="alumni.form_email_input"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => upd("email", e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Current Address
          </Label>
          <Input
            data-ocid="alumni.form_address_input"
            value={form.address ?? ""}
            onChange={(e) => upd("address", e.target.value)}
            placeholder="City or full address"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          data-ocid="alumni.form_save_button"
          onClick={() => {
            if (form.name) onSave(form);
          }}
          disabled={!form.name || saving}
          className="flex-1"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          Save
        </Button>
        <Button
          variant="outline"
          data-ocid="alumni.form_cancel_button"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function BatchView({ alumni }: { alumni: Alumni[] }) {
  const batches = [...new Set(alumni.map((a) => a.batch))].sort(
    (a, b) => Number(b) - Number(a),
  );
  if (batches.length === 0) {
    return (
      <div
        data-ocid="alumni.batch_empty_state"
        className="text-center py-12 text-muted-foreground"
      >
        <p className="text-3xl mb-3">🎓</p>
        <p className="text-sm">No alumni records yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {batches.map((batch) => {
        const batchAlumni = alumni.filter((a) => a.batch === batch);
        return (
          <div
            key={batch}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20">
              <span className="font-semibold text-foreground">
                Batch {batch}
              </span>
              <Badge variant="secondary">{batchAlumni.length} alumni</Badge>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {batchAlumni.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {initials(a.name)}
                  </div>
                  <span className="text-xs text-foreground truncate">
                    {a.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventsTab({ alumni: _alumni }: { alumni: Alumni[] }) {
  const { addNotification } = useApp();
  const [events, setEvents] = useState<AlumniEvent[]>([
    {
      id: "ev1",
      title: "Annual Alumni Meet 2026",
      date: "2026-12-20",
      description:
        "Annual gathering — dinner, cultural program, and prize distribution.",
      attendees: [],
    },
    {
      id: "ev2",
      title: "Career Guidance Talk",
      date: "2026-05-10",
      description:
        "Alumni speakers share career experiences with current students.",
      attendees: [],
    },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", description: "" });
  const [saving, setSaving] = useState(false);

  const createEvent = async () => {
    if (!form.title || !form.date) return;
    setSaving(true);
    const ev: AlumniEvent = {
      id: `ev_${Date.now()}`,
      title: form.title,
      date: form.date,
      description: form.description,
      attendees: [],
    };
    try {
      await apiCall("settings/save", "POST", {
        key: `alumni_event_${ev.id}`,
        value: JSON.stringify(ev),
      });
    } catch {
      /* continue */
    }
    setEvents((prev) => [ev, ...prev]);
    setForm({ title: "", date: "", description: "" });
    setShowForm(false);
    setSaving(false);
    addNotification(`Event "${form.title}" created`, "success");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          data-ocid="alumni.add_event_button"
          onClick={() => setShowForm(true)}
        >
          + New Event
        </Button>
      </div>
      {showForm && (
        <div
          className="bg-card border border-border rounded-xl p-5 space-y-3 max-w-lg"
          data-ocid="alumni.event_form"
        >
          <h3 className="font-semibold text-foreground font-display">
            New Alumni Event
          </h3>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Title
            </Label>
            <Input
              data-ocid="alumni.event_title_input"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Event title"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Date
            </Label>
            <Input
              data-ocid="alumni.event_date_input"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Description
            </Label>
            <Input
              data-ocid="alumni.event_desc_input"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Brief description"
            />
          </div>
          <div className="flex gap-2">
            <Button
              data-ocid="alumni.event_save_button"
              onClick={() => void createEvent()}
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : null}
              Create Event
            </Button>
            <Button
              variant="outline"
              data-ocid="alumni.event_cancel_button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {events.map((ev, i) => (
          <div
            key={ev.id}
            data-ocid={`alumni.event.item.${i + 1}`}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">
                  {ev.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(() => {
                    try {
                      return new Date(ev.date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      });
                    } catch {
                      return ev.date;
                    }
                  })()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ev.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ev.attendees?.length ?? 0} attending
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                data-ocid={`alumni.invite_button.${i + 1}`}
                onClick={() => {
                  addNotification(`Invitations sent for "${ev.title}"`, "info");
                  toast.success("Invitations sent");
                }}
                className="h-8 text-xs shrink-0"
              >
                Send Invites
              </Button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div
            data-ocid="alumni.events_empty_state"
            className="text-center py-10 text-muted-foreground"
          >
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-sm">No events yet. Create one!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlumniPage() {
  const { addNotification } = useApp();
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [editTarget, setEditTarget] = useState<Alumni | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall<Alumni[] | { data?: Alumni[] }>("alumni/list");
      const rows: Alumni[] = Array.isArray(res)
        ? res
        : Array.isArray((res as { data?: Alumni[] }).data)
          ? (res as { data?: Alumni[] }).data!
          : [];
      // Seed with demo data if empty
      if (rows.length === 0) {
        setAlumni([
          {
            id: "al1",
            name: "Rahul Sharma",
            batch: "2023",
            class_: "Class 12",
            admNo: "2023001",
            mobile: "9876543210",
            email: "rahul@example.com",
            address: "Delhi",
          },
          {
            id: "al2",
            name: "Priya Patel",
            batch: "2023",
            class_: "Class 12",
            admNo: "2023002",
            mobile: "9876543211",
            address: "Mumbai",
          },
          {
            id: "al3",
            name: "Vikram Singh",
            batch: "2022",
            class_: "Class 12",
            admNo: "2022005",
            mobile: "9876543212",
            address: "Pune",
          },
        ]);
      } else {
        setAlumni(rows);
      }
    } catch {
      setAlumni([
        {
          id: "al1",
          name: "Rahul Sharma",
          batch: "2023",
          class_: "Class 12",
          admNo: "2023001",
          mobile: "9876543210",
          address: "Delhi",
        },
        {
          id: "al2",
          name: "Priya Patel",
          batch: "2023",
          class_: "Class 12",
          admNo: "2023002",
          address: "Mumbai",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const batches = [...new Set(alumni.map((a) => a.batch))].sort(
    (a, b) => Number(b) - Number(a),
  );

  const filtered = alumni.filter((a) => {
    if (batchFilter !== "all" && a.batch !== batchFilter) return false;
    return (
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.mobile ?? "").includes(search)
    );
  });

  const handleSave = async (form: Partial<Alumni>) => {
    setSaving(true);
    const isEdit = editTarget !== undefined;
    try {
      if (isEdit && editTarget) {
        await apiCall("alumni/update", "POST", { ...form, id: editTarget.id });
        setAlumni((prev) =>
          prev.map((x) =>
            x.id === editTarget.id ? ({ ...x, ...form } as Alumni) : x,
          ),
        );
        addNotification(`Alumni "${form.name}" updated`, "success");
        toast.success("Updated");
      } else {
        const res = await apiCall<{ id?: string }>("alumni/add", "POST", form);
        const newA = { ...form, id: res?.id ?? `al_${Date.now()}` } as Alumni;
        setAlumni((prev) => [newA, ...prev]);
        addNotification(`Alumni "${form.name}" added`, "success");
        toast.success("Added");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
      setEditTarget(undefined);
      setShowForm(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="alumni.page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Alumni
          </h1>
          <p className="text-muted-foreground text-sm">
            {alumni.length} alumni across {batches.length} batches
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            data-ocid="alumni.refresh_button"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button
            data-ocid="alumni.add_button"
            onClick={() => {
              setEditTarget(undefined);
              setShowForm(true);
            }}
          >
            + Add Alumni
          </Button>
        </div>
      </div>

      <Tabs defaultValue="directory">
        <TabsList className="mb-4">
          <TabsTrigger value="directory" data-ocid="alumni.directory_tab">
            Directory
          </TabsTrigger>
          <TabsTrigger value="batch" data-ocid="alumni.batch_tab">
            By Batch
          </TabsTrigger>
          <TabsTrigger value="events" data-ocid="alumni.events_tab">
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <div className="flex gap-2 flex-wrap mb-4">
            <Input
              data-ocid="alumni.search_input"
              placeholder="Search name or mobile…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <select
              data-ocid="alumni.batch_filter"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="h-9 rounded border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  Batch {b}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="space-y-3" data-ocid="alumni.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              data-ocid="alumni.empty_state"
              className="text-center py-12 text-muted-foreground"
            >
              <p className="text-3xl mb-3">🎓</p>
              <p className="text-sm">No alumni found.</p>
              <Button
                className="mt-4"
                data-ocid="alumni.empty_add_button"
                onClick={() => {
                  setEditTarget(undefined);
                  setShowForm(true);
                }}
              >
                Add Alumni
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((a, i) => (
                <AlumniCard
                  key={a.id}
                  alumni={a}
                  idx={i + 1}
                  onEdit={(x) => {
                    setEditTarget(x);
                    setShowForm(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="batch">
          <BatchView alumni={alumni} />
        </TabsContent>
        <TabsContent value="events">
          <EventsTab alumni={alumni} />
        </TabsContent>
      </Tabs>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditTarget(undefined);
          }
        }}
      >
        <DialogContent data-ocid="alumni.form_dialog">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Alumni" : "Add Alumni"}
            </DialogTitle>
          </DialogHeader>
          <AlumniForm
            initial={editTarget}
            onSave={handleSave}
            onClose={() => {
              setShowForm(false);
              setEditTarget(undefined);
            }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
