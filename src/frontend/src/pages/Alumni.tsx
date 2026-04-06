import { Edit2, Mail, Phone, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AlumnusRecord {
  id: number;
  name: string;
  batch: string;
  class: string;
  role: string;
  organization: string;
  email: string;
  mobile: string;
}

interface AlumniEvent {
  id: number;
  name: string;
  date: string;
  venue: string;
  description: string;
}

const DEMO_ALUMNI: AlumnusRecord[] = [
  {
    id: 1,
    name: "Suresh Agarwal",
    batch: "2010",
    class: "Class 12",
    role: "Senior Software Engineer",
    organization: "TCS",
    email: "suresh.agarwal@email.com",
    mobile: "9876543210",
  },
  {
    id: 2,
    name: "Meera Joshi",
    batch: "2012",
    class: "Class 12",
    role: "Resident Doctor",
    organization: "AIIMS Delhi",
    email: "meera.joshi@aiims.in",
    mobile: "9812345678",
  },
  {
    id: 3,
    name: "Rajan Patel",
    batch: "2014",
    class: "Class 12",
    role: "Chartered Accountant",
    organization: "Deloitte India",
    email: "rajan.patel@deloitte.com",
    mobile: "9887654321",
  },
  {
    id: 4,
    name: "Kavitha Nair",
    batch: "2016",
    class: "Class 12",
    role: "IAS Officer",
    organization: "Govt. of India",
    email: "kavitha.nair@ias.gov.in",
    mobile: "9856781234",
  },
  {
    id: 5,
    name: "Amit Sharma",
    batch: "2018",
    class: "Class 12",
    role: "Research Scientist",
    organization: "ISRO",
    email: "amit.sharma@isro.gov.in",
    mobile: "9845678901",
  },
  {
    id: 6,
    name: "Deepika Singh",
    batch: "2020",
    class: "Class 12",
    role: "Advocate",
    organization: "Delhi High Court",
    email: "deepika.singh@law.com",
    mobile: "9867543210",
  },
  {
    id: 7,
    name: "Rohit Gupta",
    batch: "2022",
    class: "Class 12",
    role: "Product Manager",
    organization: "Flipkart",
    email: "rohit.gupta@flipkart.com",
    mobile: "9876543209",
  },
  {
    id: 8,
    name: "Priya Verma",
    batch: "2024",
    class: "Class 12",
    role: "B.Tech Student",
    organization: "IIT Delhi",
    email: "priya.verma@iitd.ac.in",
    mobile: "9865432108",
  },
];

const DEMO_EVENTS: AlumniEvent[] = [
  {
    id: 1,
    name: "Annual Alumni Meet 2025",
    date: "2025-12-15",
    venue: "School Auditorium",
    description:
      "Grand reunion for all alumni batches with cultural programs and felicitation ceremony.",
  },
  {
    id: 2,
    name: "Career Guidance Seminar",
    date: "2025-03-20",
    venue: "Conference Hall",
    description: "Senior alumni sharing career insights with current students.",
  },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function Alumni() {
  const [tab, setTab] = useState<"directory" | "batch" | "events">("directory");
  const [alumni, setAlumni] = useState<AlumnusRecord[]>(() =>
    loadFromStorage("erp_alumni", DEMO_ALUMNI),
  );
  const [events, setEvents] = useState<AlumniEvent[]>(() =>
    loadFromStorage("erp_alumni_events", DEMO_EVENTS),
  );
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [showAlumModal, setShowAlumModal] = useState(false);
  const [editAlum, setEditAlum] = useState<AlumnusRecord | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editEvent, setEditEvent] = useState<AlumniEvent | null>(null);
  const [alumForm, setAlumForm] = useState({
    name: "",
    batch: "",
    class: "Class 12",
    role: "",
    organization: "",
    email: "",
    mobile: "",
  });
  const [eventForm, setEventForm] = useState({
    name: "",
    date: "",
    venue: "",
    description: "",
  });

  useEffect(() => {
    localStorage.setItem("erp_alumni", JSON.stringify(alumni));
  }, [alumni]);
  useEffect(() => {
    localStorage.setItem("erp_alumni_events", JSON.stringify(events));
  }, [events]);

  const filtered = alumni.filter((a) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        a.name.toLowerCase().includes(q) ||
        a.batch.includes(q) ||
        a.role.toLowerCase().includes(q)) &&
      (!batchFilter || a.batch === batchFilter)
    );
  });

  const batches = [...new Set(alumni.map((a) => a.batch))].sort((a, b) =>
    b.localeCompare(a),
  );
  const batchGroups = batches.reduce(
    (acc, b) => {
      acc[b] = alumni.filter((a) => a.batch === b);
      return acc;
    },
    {} as Record<string, AlumnusRecord[]>,
  );

  const saveAlum = () => {
    if (!alumForm.name.trim()) return;
    if (editAlum) {
      setAlumni((prev) =>
        prev.map((a) =>
          a.id === editAlum.id ? { ...editAlum, ...alumForm } : a,
        ),
      );
      toast.success("Alumni record updated");
    } else {
      setAlumni((prev) => [...prev, { id: Date.now(), ...alumForm }]);
      toast.success("Alumni added");
    }
    setShowAlumModal(false);
    setEditAlum(null);
    setAlumForm({
      name: "",
      batch: "",
      class: "Class 12",
      role: "",
      organization: "",
      email: "",
      mobile: "",
    });
  };

  const saveEvent = () => {
    if (!eventForm.name.trim()) return;
    if (editEvent) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === editEvent.id ? { ...editEvent, ...eventForm } : e,
        ),
      );
      toast.success("Event updated");
    } else {
      setEvents((prev) => [...prev, { id: Date.now(), ...eventForm }]);
      toast.success("Event added");
    }
    setShowEventModal(false);
    setEditEvent(null);
    setEventForm({ name: "", date: "", venue: "", description: "" });
  };

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Alumni</h2>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total Alumni", value: alumni.length, color: "text-white" },
          { label: "Batches", value: batches.length, color: "text-blue-400" },
          {
            label: "Upcoming Events",
            value: events.filter(
              (e) => e.date >= new Date().toISOString().split("T")[0],
            ).length,
            color: "text-green-400",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-lg p-3"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <p className="text-gray-400 text-xs">{k.label}</p>
            <p className={`${k.color} text-2xl font-bold`}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mb-4">
        {(["directory", "batch", "events"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            data-ocid={`alumni.${t}.tab`}
            className={`px-4 py-1.5 rounded text-xs font-medium capitalize transition ${tab === t ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
          >
            {t === "directory"
              ? "Alumni Directory"
              : t === "batch"
                ? "Batch View"
                : "Events"}
          </button>
        ))}
      </div>

      {/* ─ DIRECTORY ─ */}
      {tab === "directory" && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, batch, or role..."
              className="flex-1 max-w-xs bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-gray-300 text-xs outline-none"
              data-ocid="alumni.search_input"
            />
            <button
              type="button"
              onClick={() => {
                setEditAlum(null);
                setAlumForm({
                  name: "",
                  batch: "",
                  class: "Class 12",
                  role: "",
                  organization: "",
                  email: "",
                  mobile: "",
                });
                setShowAlumModal(true);
              }}
              data-ocid="alumni.directory.primary_button"
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
            >
              <Plus size={13} /> Add Alumni
            </button>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {[
                    "#",
                    "Name",
                    "Batch",
                    "Current Role",
                    "Organization",
                    "Contact",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-gray-400 font-medium whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-gray-500"
                      data-ocid="alumni.directory.empty_state"
                    >
                      No alumni found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a, i) => (
                    <tr
                      key={a.id}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                      data-ocid={`alumni.directory.item.${i + 1}`}
                    >
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 text-white font-medium">
                        {a.name}
                      </td>
                      <td className="px-3 py-2">
                        <span className="bg-blue-900/40 text-blue-300 text-[10px] px-2 py-0.5 rounded-full">
                          {a.batch}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-300">{a.role}</td>
                      <td className="px-3 py-2 text-gray-400">
                        {a.organization}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 text-gray-400 text-[10px]">
                            <Mail size={9} />
                            {a.email}
                          </span>
                          <span className="flex items-center gap-1 text-gray-400 text-[10px]">
                            <Phone size={9} />
                            {a.mobile}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditAlum(a);
                              setAlumForm({
                                name: a.name,
                                batch: a.batch,
                                class: a.class,
                                role: a.role,
                                organization: a.organization,
                                email: a.email,
                                mobile: a.mobile,
                              });
                              setShowAlumModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                            data-ocid={`alumni.directory.edit_button.${i + 1}`}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAlumni((prev) =>
                                prev.filter((x) => x.id !== a.id),
                              );
                              toast.success("Removed");
                            }}
                            className="text-red-400 hover:text-red-300"
                            data-ocid={`alumni.directory.delete_button.${i + 1}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─ BATCH VIEW ─ */}
      {tab === "batch" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
              data-ocid="alumni.batch.select"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
            <span className="text-gray-400 text-xs">
              {filtered.length} alumni
            </span>
          </div>
          {(batchFilter ? [batchFilter] : batches).map((batch) => (
            <div key={batch} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400 font-bold text-sm">
                  Batch {batch}
                </span>
                <span className="text-gray-500 text-xs">
                  ({batchGroups[batch]?.length || 0} alumni)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(batchGroups[batch] || []).map((a, i) => (
                  <div
                    key={a.id}
                    className="rounded-lg p-3"
                    style={{
                      background: "#1a1f2e",
                      border: "1px solid #374151",
                    }}
                    data-ocid={`alumni.batch.item.${i + 1}`}
                  >
                    <div className="text-white font-medium text-xs">
                      {a.name}
                    </div>
                    <div className="text-blue-400 text-[10px] mt-0.5">
                      {a.role}
                    </div>
                    <div className="text-gray-500 text-[10px]">
                      {a.organization}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─ EVENTS ─ */}
      {tab === "events" && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => {
                setEditEvent(null);
                setEventForm({
                  name: "",
                  date: "",
                  venue: "",
                  description: "",
                });
                setShowEventModal(true);
              }}
              data-ocid="alumni.events.primary_button"
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
            >
              <Plus size={13} /> Add Event
            </button>
          </div>
          <div className="space-y-3">
            {events.map((ev, i) => (
              <div
                key={ev.id}
                className="rounded-lg p-4"
                style={{ background: "#1a1f2e", border: "1px solid #374151" }}
                data-ocid={`alumni.events.item.${i + 1}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-sm">
                      {ev.name}
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {ev.venue} &nbsp;|&nbsp;{" "}
                      <span className="text-blue-400">{ev.date}</span>
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      {ev.description}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditEvent(ev);
                        setEventForm({
                          name: ev.name,
                          date: ev.date,
                          venue: ev.venue,
                          description: ev.description,
                        });
                        setShowEventModal(true);
                      }}
                      className="text-blue-400 hover:text-blue-300"
                      data-ocid={`alumni.events.edit_button.${i + 1}`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEvents((prev) => prev.filter((x) => x.id !== ev.id));
                        toast.success("Event removed");
                      }}
                      className="text-red-400 hover:text-red-300"
                      data-ocid={`alumni.events.delete_button.${i + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div
                className="text-center py-8 text-gray-500"
                data-ocid="alumni.events.empty_state"
              >
                No events scheduled.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─ ALUMNI MODAL ─ */}
      {showAlumModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          data-ocid="alumni.directory.modal"
        >
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {editAlum ? "Edit Alumni" : "Add Alumni"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAlumModal(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="alumni.directory.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: "alum-name",
                  label: "Full Name",
                  key: "name",
                  span: true,
                },
                { id: "alum-batch", label: "Batch Year", key: "batch" },
                { id: "alum-class", label: "Class", key: "class" },
                { id: "alum-role", label: "Current Role", key: "role" },
                { id: "alum-org", label: "Organization", key: "organization" },
                { id: "alum-email", label: "Email", key: "email" },
                { id: "alum-mobile", label: "Mobile", key: "mobile" },
              ].map((f) => (
                <div key={f.id} className={f.span ? "col-span-2" : ""}>
                  <label
                    htmlFor={f.id}
                    className="text-gray-400 text-xs block mb-1"
                  >
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    value={alumForm[f.key as keyof typeof alumForm]}
                    onChange={(e) =>
                      setAlumForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={saveAlum}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                data-ocid="alumni.directory.submit_button"
              >
                {editAlum ? "Update" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowAlumModal(false)}
                className="flex-1 bg-gray-700 text-white text-xs py-2 rounded"
                data-ocid="alumni.directory.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─ EVENT MODAL ─ */}
      {showEventModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          data-ocid="alumni.events.modal"
        >
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {editEvent ? "Edit Event" : "Add Event"}
              </h3>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="alumni.events.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="ev-name"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Event Name
                </label>
                <input
                  id="ev-name"
                  value={eventForm.name}
                  onChange={(e) =>
                    setEventForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ev-date"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="ev-date"
                    type="date"
                    value={eventForm.date}
                    onChange={(e) =>
                      setEventForm((p) => ({ ...p, date: e.target.value }))
                    }
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ev-venue"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    Venue
                  </label>
                  <input
                    id="ev-venue"
                    value={eventForm.venue}
                    onChange={(e) =>
                      setEventForm((p) => ({ ...p, venue: e.target.value }))
                    }
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="ev-desc"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Description
                </label>
                <textarea
                  id="ev-desc"
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={saveEvent}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                data-ocid="alumni.events.submit_button"
              >
                {editEvent ? "Update" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="flex-1 bg-gray-700 text-white text-xs py-2 rounded"
                data-ocid="alumni.events.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
