import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  GraduationCap,
  Mail,
  Phone,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { generateId, ls } from "../utils/localStorage";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AlumniRecord {
  id: string;
  name: string;
  batch: string; // e.g. "2020-21"
  graduationYear: string; // e.g. "2021"
  class_: string;
  admNo: string;
  mobile: string;
  email: string;
  address: string;
  photo: string;
  currentRole: string; // current job / position
}

interface AlumniEventRecord {
  id: string;
  title: string;
  date: string;
  description: string;
  venue: string;
  attendees: string[]; // alumni IDs
}

type AlumniTab = "directory" | "batch" | "events";

const TABS: { id: AlumniTab; label: string; icon: React.ReactNode }[] = [
  { id: "directory", label: "Directory", icon: <Users className="w-4 h-4" /> },
  {
    id: "batch",
    label: "Batch View",
    icon: <GraduationCap className="w-4 h-4" />,
  },
  {
    id: "events",
    label: "Events",
    icon: <CalendarDays className="w-4 h-4" />,
  },
];

const EMPTY_ALUMNI: Omit<AlumniRecord, "id"> = {
  name: "",
  batch: "",
  graduationYear: "",
  class_: "",
  admNo: "",
  mobile: "",
  email: "",
  address: "",
  photo: "",
  currentRole: "",
};

const EMPTY_EVENT: Omit<AlumniEventRecord, "id"> = {
  title: "",
  date: "",
  description: "",
  venue: "",
  attendees: [],
};

const today = new Date().toISOString().split("T")[0];

// ─────────────────────────────────────────────
// Avatar helper
// ─────────────────────────────────────────────
function AlumniAvatar({
  a,
  size = "sm",
}: { a: AlumniRecord; size?: "sm" | "lg" }) {
  const cls =
    size === "lg"
      ? "w-14 h-14 rounded-full object-cover"
      : "w-8 h-8 rounded-full object-cover";
  const placeholderCls =
    size === "lg"
      ? "w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center text-primary font-bold text-xl mx-auto"
      : "w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0";

  if (a.photo) {
    return (
      <img
        src={a.photo}
        alt={a.name}
        className={size === "lg" ? `${cls} mx-auto` : cls}
      />
    );
  }
  return <div className={placeholderCls}>{a.name.charAt(0).toUpperCase()}</div>;
}

export default function AlumniPage() {
  const { addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<AlumniTab>("directory");
  const [alumnis, setAlumnis] = useState<AlumniRecord[]>(() =>
    ls.get<AlumniRecord[]>("alumni", []),
  );
  const [events, setEvents] = useState<AlumniEventRecord[]>(() =>
    ls.get<AlumniEventRecord[]>("alumni_events", []),
  );

  // Directory state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<AlumniRecord, "id">>(EMPTY_ALUMNI);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchBatch, setSearchBatch] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Events state
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] =
    useState<Omit<AlumniEventRecord, "id">>(EMPTY_EVENT);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState("");

  // Batch expansion state
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(
    new Set(),
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((p) => ({ ...p, photo: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = useCallback(() => {
    if (!form.name.trim()) return;
    if (editId) {
      const updated = alumnis.map((a) =>
        a.id === editId ? { ...form, id: editId } : a,
      );
      setAlumnis(updated);
      ls.set("alumni", updated);
    } else {
      const updated = [...alumnis, { ...form, id: generateId() }];
      setAlumnis(updated);
      ls.set("alumni", updated);
      addNotification(
        `${form.name} added to alumni directory`,
        "success",
        "🎓",
      );
    }
    setForm(EMPTY_ALUMNI);
    setEditId(null);
    setShowForm(false);
  }, [form, editId, alumnis, addNotification]);

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm("Delete this alumni record?")) return;
      const updated = alumnis.filter((a) => a.id !== id);
      setAlumnis(updated);
      ls.set("alumni", updated);
    },
    [alumnis],
  );

  const handleEdit = useCallback((a: AlumniRecord) => {
    setForm({
      name: a.name,
      batch: a.batch,
      graduationYear: a.graduationYear ?? "",
      class_: a.class_,
      admNo: a.admNo,
      mobile: a.mobile,
      email: a.email,
      address: a.address,
      photo: a.photo,
      currentRole: a.currentRole ?? "",
    });
    setEditId(a.id);
    setShowForm(true);
  }, []);

  const handleSaveEvent = useCallback(() => {
    if (!eventForm.title.trim()) return;
    if (editEventId) {
      const updated = events.map((e) =>
        e.id === editEventId ? { ...eventForm, id: editEventId } : e,
      );
      setEvents(updated);
      ls.set("alumni_events", updated);
    } else {
      const updated = [...events, { ...eventForm, id: generateId() }];
      setEvents(updated);
      ls.set("alumni_events", updated);
      addNotification(
        `Alumni event "${eventForm.title}" scheduled`,
        "success",
        "📅",
      );
    }
    setEventForm(EMPTY_EVENT);
    setEditEventId(null);
    setShowEventForm(false);
  }, [eventForm, editEventId, events, addNotification]);

  const handleDeleteEvent = useCallback(
    (id: string) => {
      if (!confirm("Delete this event?")) return;
      const updated = events.filter((e) => e.id !== id);
      setEvents(updated);
      ls.set("alumni_events", updated);
    },
    [events],
  );

  const toggleAttendee = useCallback((alumniId: string) => {
    setEventForm((prev) => {
      const has = prev.attendees.includes(alumniId);
      return {
        ...prev,
        attendees: has
          ? prev.attendees.filter((id) => id !== alumniId)
          : [...prev.attendees, alumniId],
      };
    });
  }, []);

  const toggleBatch = (batch: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batch)) next.delete(batch);
      else next.add(batch);
      return next;
    });
  };

  const filtered = alumnis.filter((a) => {
    const matchName = a.name.toLowerCase().includes(searchName.toLowerCase());
    const matchBatch = searchBatch ? a.batch.includes(searchBatch) : true;
    return matchName && matchBatch;
  });

  // Group by batch
  const batchMap: Record<string, AlumniRecord[]> = {};
  for (const a of alumnis) {
    const key = a.batch || "Unknown";
    if (!batchMap[key]) batchMap[key] = [];
    batchMap[key].push(a);
  }
  const sortedBatches = Object.keys(batchMap).sort((a, b) => {
    const na = Number(a.split("-")[0]);
    const nb = Number(b.split("-")[0]);
    return nb - na;
  });

  const filteredAttendees = alumnis.filter((a) =>
    a.name.toLowerCase().includes(attendeeSearch.toLowerCase()),
  );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">
            Alumni
          </h1>
          <p className="text-sm text-muted-foreground">
            {alumnis.length} alumni in directory
          </p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-ocid={`alumni-tab-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── DIRECTORY ── */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Alumni Directory
            </h2>
            <Button
              onClick={() => {
                setShowForm(true);
                setForm(EMPTY_ALUMNI);
                setEditId(null);
              }}
              data-ocid="add-alumni-btn"
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Alumni
            </Button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Input
              className="max-w-xs"
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              data-ocid="alumni-search-name"
            />
            <Input
              className="max-w-[180px]"
              placeholder="Filter by batch..."
              value={searchBatch}
              onChange={(e) => setSearchBatch(e.target.value)}
              data-ocid="alumni-search-batch"
            />
          </div>

          {showForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">
                  {editId ? "Edit Alumni" : "Add Alumni"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Photo upload */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                    {form.photo ? (
                      <img
                        src={form.photo}
                        alt="Alumni"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <GraduationCap className="w-7 h-7 text-primary/40" />
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Photo</Label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        Upload Photo
                      </Button>
                      {form.photo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setForm((p) => ({ ...p, photo: "" }))}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Full Name *",
                      key: "name" as const,
                      placeholder: "Alumni name",
                    },
                    {
                      label: "Batch Year",
                      key: "batch" as const,
                      placeholder: "e.g. 2020-21",
                    },
                    {
                      label: "Graduation Year",
                      key: "graduationYear" as const,
                      placeholder: "e.g. 2021",
                    },
                    {
                      label: "Class",
                      key: "class_" as const,
                      placeholder: "e.g. Class 10",
                    },
                    {
                      label: "Adm. No.",
                      key: "admNo" as const,
                      placeholder: "Admission number",
                    },
                    {
                      label: "Mobile",
                      key: "mobile" as const,
                      placeholder: "10-digit mobile",
                    },
                    {
                      label: "Email",
                      key: "email" as const,
                      placeholder: "alumni@email.com",
                    },
                    {
                      label: "Current Role",
                      key: "currentRole" as const,
                      placeholder: "Engineer at Infosys",
                    },
                    {
                      label: "Address",
                      key: "address" as const,
                      placeholder: "City, State",
                    },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={form[key]}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, [key]: e.target.value }))
                        }
                        placeholder={placeholder}
                        data-ocid={`alumni-input-${key}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} data-ocid="save-alumni-btn">
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {[
                    "Name",
                    "Batch",
                    "Year",
                    "Current Role",
                    "Contact",
                    "Email",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      <GraduationCap className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                      No alumni records found.
                    </td>
                  </tr>
                )}
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-border hover:bg-muted/30"
                    data-ocid={`alumni-row-${a.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlumniAvatar a={a} />
                        <span className="font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{a.batch || "—"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.graduationYear || a.batch?.split("-")[1] || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[140px]">
                      {a.currentRole || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {a.mobile ? (
                        <a
                          href={`tel:${a.mobile}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="w-3 h-3" /> {a.mobile}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 truncate max-w-[140px]">
                      {a.email ? (
                        <a
                          href={`mailto:${a.email}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Mail className="w-3 h-3" /> {a.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(a)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(a.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BATCH VIEW ── */}
      {activeTab === "batch" && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Alumni by Batch
          </h2>
          {sortedBatches.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  No alumni records yet. Add alumni from the Directory tab.
                </p>
              </CardContent>
            </Card>
          )}
          {sortedBatches.map((batch) => {
            const isExpanded = expandedBatches.has(batch);
            return (
              <div
                key={batch}
                className="border border-border rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleBatch(batch)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/30 transition-colors"
                  data-ocid={`batch-toggle-${batch}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">
                        Batch {batch}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {batchMap[batch].length} alumni
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{batchMap[batch].length}</Badge>
                    <span className="text-muted-foreground text-sm">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-border bg-background p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {batchMap[batch].map((a) => (
                        <Card
                          key={a.id}
                          className="hover:shadow-md transition-shadow"
                        >
                          <CardContent className="py-4 text-center space-y-2">
                            <AlumniAvatar a={a} size="lg" />
                            <div className="font-semibold text-sm text-foreground truncate px-1">
                              {a.name}
                            </div>
                            {a.currentRole && (
                              <div className="text-xs text-muted-foreground truncate px-1">
                                {a.currentRole}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1 justify-center">
                              {a.class_ && (
                                <Badge variant="outline" className="text-xs">
                                  {a.class_}
                                </Badge>
                              )}
                              {(a.graduationYear || a.batch) && (
                                <Badge variant="secondary" className="text-xs">
                                  {a.graduationYear || a.batch}
                                </Badge>
                              )}
                            </div>
                            {a.mobile && (
                              <a
                                href={`tel:${a.mobile}`}
                                className="flex items-center justify-center gap-1 text-[10px] text-primary hover:underline"
                              >
                                <Phone className="w-3 h-3" /> {a.mobile}
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── EVENTS ── */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Alumni Events
            </h2>
            <Button
              onClick={() => {
                setShowEventForm(true);
                setEventForm({ ...EMPTY_EVENT, date: today });
                setEditEventId(null);
              }}
              data-ocid="add-event-btn"
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Event
            </Button>
          </div>

          {showEventForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">
                  {editEventId ? "Edit Event" : "New Alumni Event"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Event Title *</Label>
                    <Input
                      value={eventForm.title}
                      onChange={(e) =>
                        setEventForm((p) => ({ ...p, title: e.target.value }))
                      }
                      placeholder="Annual Alumni Meet 2026"
                      data-ocid="event-title-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={eventForm.date}
                      onChange={(e) =>
                        setEventForm((p) => ({ ...p, date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Venue</Label>
                    <Input
                      value={eventForm.venue}
                      onChange={(e) =>
                        setEventForm((p) => ({ ...p, venue: e.target.value }))
                      }
                      placeholder="School Auditorium"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={eventForm.description}
                      onChange={(e) =>
                        setEventForm((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Brief description"
                    />
                  </div>
                </div>

                {/* Attendee selector */}
                {alumnis.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Add Attendees ({eventForm.attendees.length} selected)
                    </Label>
                    <Input
                      placeholder="Search alumni..."
                      value={attendeeSearch}
                      onChange={(e) => setAttendeeSearch(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                      {filteredAttendees.map((a) => (
                        <label
                          key={a.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-1 rounded text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={eventForm.attendees.includes(a.id)}
                            onChange={() => toggleAttendee(a.id)}
                            className="rounded"
                          />
                          <span>{a.name}</span>
                          {a.batch && (
                            <span className="text-xs text-muted-foreground">
                              ({a.batch})
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleSaveEvent} data-ocid="save-event-btn">
                    Save Event
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEventForm(false);
                      setEditEventId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {events.length === 0 && !showEventForm && (
            <Card>
              <CardContent className="py-16 text-center">
                <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  No events scheduled yet.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {[...events]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((ev) => {
                const isPast = ev.date < today;
                const attendeeNames = ev.attendees
                  .map((id) => alumnis.find((a) => a.id === id)?.name)
                  .filter(Boolean)
                  .slice(0, 5);
                return (
                  <Card key={ev.id} className={isPast ? "opacity-70" : ""}>
                    <CardContent className="py-4 flex items-start justify-between gap-3">
                      <div className="flex gap-3 items-start">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {ev.date
                              ? new Date(`${ev.date}T00:00:00`).toLocaleString(
                                  "en-IN",
                                  { month: "short" },
                                )
                              : "—"}
                          </span>
                          <span className="text-xl font-bold text-primary leading-none">
                            {ev.date
                              ? new Date(`${ev.date}T00:00:00`).getDate()
                              : "—"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                            {ev.title}
                            {isPast ? (
                              <Badge variant="secondary" className="text-xs">
                                Past
                              </Badge>
                            ) : (
                              <Badge className="text-xs bg-accent/20 text-accent-foreground border-accent/30">
                                Upcoming
                              </Badge>
                            )}
                          </div>
                          {ev.venue && (
                            <div className="text-sm text-muted-foreground">
                              📍 {ev.venue}
                            </div>
                          )}
                          {ev.description && (
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {ev.description}
                            </div>
                          )}
                          {attendeeNames.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1 flex-wrap">
                              <Users className="w-3 h-3" />
                              {attendeeNames.join(", ")}
                              {ev.attendees.length > 5 &&
                                ` +${ev.attendees.length - 5} more`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEventForm({
                              title: ev.title,
                              date: ev.date,
                              description: ev.description,
                              venue: ev.venue,
                              attendees: ev.attendees,
                            });
                            setEditEventId(ev.id);
                            setShowEventForm(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteEvent(ev.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
