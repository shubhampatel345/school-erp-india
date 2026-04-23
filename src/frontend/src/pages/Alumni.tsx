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
import { useState } from "react";
import { useApp } from "../context/AppContext";
import type { Alumni, AlumniEvent } from "../types";
import { generateId } from "../utils/localStorage";

// ── Seed data ────────────────────────────────────────────────────────────────

const SEED_ALUMNI: Alumni[] = [
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
    email: "priya@example.com",
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
  {
    id: "al4",
    name: "Anita Verma",
    batch: "2022",
    class_: "Class 10",
    admNo: "2022010",
    mobile: "9876543213",
    email: "anita@example.com",
    address: "Jaipur",
  },
  {
    id: "al5",
    name: "Suresh Kumar",
    batch: "2021",
    class_: "Class 12",
    admNo: "2021003",
    mobile: "9876543214",
    address: "Lucknow",
  },
  {
    id: "al6",
    name: "Meena Joshi",
    batch: "2021",
    class_: "Class 12",
    admNo: "2021008",
    mobile: "9876543215",
    email: "meena@example.com",
    address: "Agra",
  },
];

const SEED_EVENTS: AlumniEvent[] = [
  {
    id: "ev1",
    title: "Annual Alumni Meet 2026",
    date: "2026-12-20",
    description:
      "Annual gathering — dinner, cultural program, and prize distribution.",
    attendees: ["al1", "al2", "al3"],
  },
  {
    id: "ev2",
    title: "Career Guidance Talk",
    date: "2026-05-10",
    description:
      "Alumni speakers share career experiences with current students.",
    attendees: ["al1", "al4"],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Alumni Card ───────────────────────────────────────────────────────────────

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

// ── Alumni Form ───────────────────────────────────────────────────────────────

function AlumniForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Alumni;
  onSave: (a: Alumni) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Alumni>>(
    initial ?? {
      batch: String(new Date().getFullYear() - 1),
      class_: "Class 12",
    },
  );
  const upd = (k: keyof Alumni, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.name) return;
    onSave({
      id: form.id ?? generateId(),
      name: form.name,
      batch: form.batch ?? "",
      class_: form.class_ ?? "Class 12",
      admNo: form.admNo,
      mobile: form.mobile,
      email: form.email,
      address: form.address,
    });
  };

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
          onClick={save}
          disabled={!form.name}
          className="flex-1"
        >
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

// ── Batch View ────────────────────────────────────────────────────────────────

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

// ── Events Tab ────────────────────────────────────────────────────────────────

function EventsTab({ alumni: _alumni }: { alumni: Alumni[] }) {
  const { addNotification } = useApp();
  const [events, setEvents] = useState<AlumniEvent[]>(SEED_EVENTS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", description: "" });

  const createEvent = () => {
    if (!form.title || !form.date) return;
    const ev: AlumniEvent = {
      id: generateId(),
      title: form.title,
      date: form.date,
      description: form.description,
      attendees: [],
    };
    setEvents((prev) => [ev, ...prev]);
    setForm({ title: "", date: "", description: "" });
    setShowForm(false);
    addNotification(`Event "${form.title}" created`, "success");
  };

  const invite = (ev: AlumniEvent) => {
    addNotification(`Invitations sent to all alumni for "${ev.title}"`, "info");
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
              onClick={createEvent}
              className="flex-1"
            >
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
                  {ev.attendees.length} attending
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                data-ocid={`alumni.invite_button.${i + 1}`}
                onClick={() => invite(ev)}
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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AlumniPage() {
  const { getData, saveData, updateData, addNotification } = useApp();
  const storedAlumni = getData("alumni") as Alumni[];
  const [alumni, setAlumni] = useState<Alumni[]>(
    storedAlumni.length ? storedAlumni : SEED_ALUMNI,
  );
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [editTarget, setEditTarget] = useState<Alumni | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

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

  const handleSave = async (a: Alumni) => {
    const isEdit = alumni.some((x) => x.id === a.id);
    if (isEdit) {
      setAlumni((prev) => prev.map((x) => (x.id === a.id ? a : x)));
      await updateData("alumni", a.id, a as unknown as Record<string, unknown>);
      addNotification(`Alumni "${a.name}" updated`, "success");
    } else {
      setAlumni((prev) => [a, ...prev]);
      await saveData("alumni", a as unknown as Record<string, unknown>);
      addNotification(`Alumni "${a.name}" added`, "success");
    }
    setEditTarget(undefined);
    setShowForm(false);
  };

  const openEdit = (a: Alumni) => {
    setEditTarget(a);
    setShowForm(true);
  };
  const openAdd = () => {
    setEditTarget(undefined);
    setShowForm(true);
  };
  const closeForm = () => {
    setEditTarget(undefined);
    setShowForm(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="alumni.page">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Alumni
          </h1>
          <p className="text-muted-foreground text-sm">
            {alumni.length} alumni across {batches.length} batches
          </p>
        </div>
        <Button data-ocid="alumni.add_button" onClick={openAdd}>
          + Add Alumni
        </Button>
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

          {filtered.length === 0 ? (
            <div
              data-ocid="alumni.empty_state"
              className="text-center py-12 text-muted-foreground"
            >
              <p className="text-3xl mb-3">🎓</p>
              <p className="text-sm">No alumni found. Add your first record.</p>
              <Button
                className="mt-4"
                data-ocid="alumni.empty_add_button"
                onClick={openAdd}
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
                  onEdit={openEdit}
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

      {/* Add / Edit Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) closeForm();
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
            onClose={closeForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
