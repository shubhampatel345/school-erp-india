import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Edit2,
  Mail,
  Phone,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Alumni, AlumniEvent } from "../types";
import { generateId } from "../utils/localStorage";

function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface AlumniFormData {
  name: string;
  admNo: string;
  yearOfPassing: string;
  classGrade: string;
  mobile: string;
  email: string;
  occupation: string;
  address: string;
}

const EMPTY_FORM: AlumniFormData = {
  name: "",
  admNo: "",
  yearOfPassing: "",
  classGrade: "",
  mobile: "",
  email: "",
  occupation: "",
  address: "",
};

function AlumniForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<AlumniFormData>;
  onSave: (data: AlumniFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AlumniFormData>({
    ...EMPTY_FORM,
    ...initial,
  });
  const set = (k: keyof AlumniFormData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Full Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            data-ocid="alumni.form_name_input"
          />
        </div>
        <div>
          <Label>Adm. No.</Label>
          <Input
            value={form.admNo}
            onChange={(e) => set("admNo", e.target.value)}
          />
        </div>
        <div>
          <Label>Year of Passing *</Label>
          <Input
            value={form.yearOfPassing}
            onChange={(e) => set("yearOfPassing", e.target.value)}
            placeholder="e.g. 2020"
          />
        </div>
        <div>
          <Label>Class/Grade</Label>
          <Input
            value={form.classGrade}
            onChange={(e) => set("classGrade", e.target.value)}
            placeholder="e.g. 12"
          />
        </div>
        <div>
          <Label>Mobile</Label>
          <Input
            value={form.mobile}
            onChange={(e) => set("mobile", e.target.value)}
            type="tel"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            type="email"
          />
        </div>
        <div>
          <Label>Occupation</Label>
          <Input
            value={form.occupation}
            onChange={(e) => set("occupation", e.target.value)}
            placeholder="e.g. Engineer"
          />
        </div>
        <div className="col-span-2">
          <Label>Address</Label>
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          data-ocid="alumni.form_cancel_button"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (!form.name || !form.yearOfPassing) return;
            onSave(form);
          }}
          data-ocid="alumni.form_submit_button"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export default function AlumniPage() {
  const { getData, saveData, updateData, deleteData } = useApp();
  const alumniList = getData("alumni") as Alumni[];
  const eventsList = getData("alumni_events") as AlumniEvent[];

  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Alumni | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: "",
    description: "",
  });

  const batches = useMemo(() => {
    const set = new Set(alumniList.map((a) => a.batch ?? "").filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [alumniList]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return alumniList.filter(
      (a) =>
        (!q ||
          (a.name ?? "").toLowerCase().includes(q) ||
          (a.batch ?? "").includes(q) ||
          (a.admNo ?? "").toLowerCase().includes(q)) &&
        (batchFilter === "all" || a.batch === batchFilter),
    );
  }, [alumniList, search, batchFilter]);

  const batchGroups = useMemo(() => {
    const map: Record<string, Alumni[]> = {};
    for (const a of alumniList) {
      const b = a.batch ?? "Unknown";
      if (!map[b]) map[b] = [];
      map[b].push(a);
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [alumniList]);

  const handleSave = async (form: AlumniFormData) => {
    const record: Record<string, unknown> = {
      name: form.name,
      admNo: form.admNo,
      batch: form.yearOfPassing,
      class_: form.classGrade,
      mobile: form.mobile,
      email: form.email,
      occupation: form.occupation,
      address: form.address,
    };
    if (editItem) {
      await updateData("alumni", editItem.id, record);
    } else {
      record.id = generateId();
      await saveData("alumni", record);
    }
    setDialogOpen(false);
    setEditItem(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this alumni record?")) return;
    await deleteData("alumni", id);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.date) return;
    await saveData("alumni_events", {
      id: generateId(),
      ...eventForm,
      attendees: [],
    });
    setEventDialogOpen(false);
    setEventForm({ title: "", date: "", description: "" });
  };

  const exportCSV = () => {
    downloadCSV("alumni_directory.csv", [
      ["Name", "Adm No", "Batch", "Class", "Mobile", "Email", "Occupation"],
      ...alumniList.map((a) => [
        a.name ?? "",
        a.admNo ?? "",
        a.batch ?? "",
        a.class_ ?? "",
        a.mobile ?? "",
        a.email ?? "",
        "",
      ]),
    ]);
  };

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Alumni
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {alumniList.length} alumni registered
          </p>
        </div>
        <Button
          onClick={() => {
            setEditItem(null);
            setDialogOpen(true);
          }}
          data-ocid="alumni.add_button"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Alumni
        </Button>
      </div>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory" data-ocid="alumni.directory_tab">
            Directory
          </TabsTrigger>
          <TabsTrigger value="batches" data-ocid="alumni.batches_tab">
            Batch View
          </TabsTrigger>
          <TabsTrigger value="events" data-ocid="alumni.events_tab">
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Search by name, batch, adm no…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
              data-ocid="alumni.search_input"
            />
            <select
              className="border border-input rounded-md px-3 py-2 text-sm bg-background"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
            >
              <option value="all">All Batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  Batch {b}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              data-ocid="alumni.export_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="alumni.directory_empty_state"
            >
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No alumni found</p>
              <p className="text-xs mt-1">Click "Add Alumni" to get started</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a, i) => (
                <Card key={a.id} data-ocid={`alumni.item.${i + 1}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">
                          {a.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Batch {a.batch} · Class {a.class_}
                        </p>
                        {a.mobile && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {a.mobile}
                          </p>
                        )}
                        {a.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {a.email}
                          </p>
                        )}
                        {a.admNo && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {a.admNo}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditItem(a);
                            setDialogOpen(true);
                          }}
                          data-ocid={`alumni.edit_button.${i + 1}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(a.id)}
                          data-ocid={`alumni.delete_button.${i + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="batches" className="mt-4 space-y-3">
          {batchGroups.length === 0 ? (
            <p
              className="text-muted-foreground text-sm py-8 text-center"
              data-ocid="alumni.batches_empty_state"
            >
              No batches yet. Add alumni first.
            </p>
          ) : (
            batchGroups.map(([batch, members]) => (
              <Card key={batch}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">
                      Batch {batch}
                    </h3>
                    <Badge>{members.length} alumni</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m) => (
                      <span
                        key={m.id}
                        className="text-xs bg-muted px-2 py-0.5 rounded"
                      >
                        {m.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4 space-y-3">
          <Button
            onClick={() => setEventDialogOpen(true)}
            data-ocid="alumni.add_event_button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Event
          </Button>
          {eventsList.length === 0 ? (
            <p
              className="text-muted-foreground text-sm py-8 text-center"
              data-ocid="alumni.events_empty_state"
            >
              No alumni events scheduled.
            </p>
          ) : (
            eventsList.map((ev, i) => (
              <Card key={ev.id} data-ocid={`alumni.event.${i + 1}`}>
                <CardContent className="pt-4 pb-3">
                  <p className="font-semibold text-foreground">{ev.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ev.date}
                  </p>
                  {ev.description && (
                    <p className="text-sm text-foreground/80 mt-1">
                      {ev.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Alumni Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="alumni.dialog">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Alumni" : "Add Alumni"}</DialogTitle>
          </DialogHeader>
          <AlumniForm
            initial={
              editItem
                ? {
                    name: editItem.name ?? "",
                    admNo: editItem.admNo ?? "",
                    yearOfPassing: editItem.batch ?? "",
                    classGrade: editItem.class_ ?? "",
                    mobile: editItem.mobile ?? "",
                    email: editItem.email ?? "",
                    occupation: "",
                    address: editItem.address ?? "",
                  }
                : undefined
            }
            onSave={handleSave}
            onClose={() => {
              setDialogOpen(false);
              setEditItem(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent data-ocid="alumni.event_dialog">
          <DialogHeader>
            <DialogTitle>Add Alumni Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Event Title *</Label>
              <Input
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, title: e.target.value }))
                }
                data-ocid="alumni.event_title_input"
              />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={eventForm.date}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEventDialogOpen(false)}
                data-ocid="alumni.event_cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEvent}
                data-ocid="alumni.event_submit_button"
              >
                Save Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
