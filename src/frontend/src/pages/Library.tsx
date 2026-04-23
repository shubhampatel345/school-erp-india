/**
 * SHUBH SCHOOL ERP — Library Module
 * Tabs: Books Catalog | Issue/Return | Reports
 * All amount fields: type="text" inputMode="decimal" — NO spinners
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  Edit2,
  History,
  Loader2,
  RotateCcw,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import type { BookIssue, LibraryBook, Student } from "../types";
import { generateId } from "../utils/localStorage";

// ── Constants ──────────────────────────────────────────────

const BOOK_CATEGORIES = [
  "Textbook",
  "Fiction",
  "Non-Fiction",
  "Science",
  "Mathematics",
  "History",
  "Geography",
  "Literature",
  "Reference",
  "Magazine",
  "Other",
];

const ALLOWED_WRITE_ROLES = new Set(["superadmin", "admin", "librarian"]);

type TabId = "catalog" | "issue-return" | "reports";

// ── Helpers ─────────────────────────────────────────────────

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - due.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

function defaultDueDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function exportCSV(rows: string[][], filename: string) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

// ── Settings ─────────────────────────────────────────────────

interface LibrarySettings {
  finePerDay: number;
  defaultLoanDays: number;
}
const DEFAULT_LIB_SETTINGS: LibrarySettings = {
  finePerDay: 5,
  defaultLoanDays: 14,
};

function SettingsDialog({
  settings,
  onSave,
  onClose,
}: {
  settings: LibrarySettings;
  onSave: (s: LibrarySettings) => void;
  onClose: () => void;
}) {
  const [fine, setFine] = useState(String(settings.finePerDay));
  const [days, setDays] = useState(String(settings.defaultLoanDays));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Library Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Fine per overdue day (₹)</Label>
            <Input
              type="text"
              inputMode="decimal"
              className="mt-1"
              value={fine}
              onChange={(e) =>
                setFine(
                  e.target.value
                    .replace(/[^0-9.]/g, "")
                    .replace(/(\..*)\./g, "$1"),
                )
              }
              data-ocid="library.settings.fine_input"
            />
          </div>
          <div>
            <Label>Default loan period (days)</Label>
            <Input
              type="text"
              inputMode="numeric"
              className="mt-1"
              value={days}
              onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))}
              data-ocid="library.settings.loan_days_input"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1"
              onClick={() =>
                onSave({
                  finePerDay: Math.max(0, Number(fine) || 5),
                  defaultLoanDays: Math.max(1, Number(days) || 14),
                })
              }
              data-ocid="library.settings.save_button"
            >
              Save Settings
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="library.settings.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Book Form ─────────────────────────────────────────────────

function BookFormDialog({
  book,
  onSave,
  onClose,
}: {
  book?: LibraryBook;
  onSave: (b: Omit<LibraryBook, "id" | "addedAt">) => Promise<void>;
  onClose: () => void;
}) {
  const [isbn, setIsbn] = useState(book?.isbn ?? "");
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [publisher, setPublisher] = useState(book?.publisher ?? "");
  const [category, setCategory] = useState(book?.category ?? "Textbook");
  const [totalQty, setTotalQty] = useState(String(book?.totalQty ?? 1));
  const [availableQty, setAvailableQty] = useState(
    String(book?.availableQty ?? 1),
  );
  const [location, setLocation] = useState(book?.location ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!author.trim()) {
      toast.error("Author is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        isbn: isbn.trim(),
        title: title.trim(),
        author: author.trim(),
        publisher: publisher.trim() || undefined,
        category,
        totalQty: Math.max(0, Number(totalQty) || 0),
        availableQty: Math.max(0, Number(availableQty) || 0),
        location: location.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{book ? "Edit Book" : "Add New Book"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>ISBN</Label>
            <Input
              className="mt-1"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="978-0-000-00000-0"
              data-ocid="library.book.isbn_input"
            />
          </div>
          <div>
            <Label>
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book title"
              data-ocid="library.book.title_input"
            />
          </div>
          <div>
            <Label>
              Author <span className="text-destructive">*</span>
            </Label>
            <Input
              className="mt-1"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
              data-ocid="library.book.author_input"
            />
          </div>
          <div>
            <Label>Publisher</Label>
            <Input
              className="mt-1"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Publisher"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Total Qty</Label>
              <Input
                type="text"
                inputMode="numeric"
                className="mt-1"
                value={totalQty}
                onChange={(e) =>
                  setTotalQty(e.target.value.replace(/[^0-9]/g, ""))
                }
                data-ocid="library.book.total_qty_input"
              />
            </div>
            <div>
              <Label>Available Qty</Label>
              <Input
                type="text"
                inputMode="numeric"
                className="mt-1"
                value={availableQty}
                onChange={(e) =>
                  setAvailableQty(e.target.value.replace(/[^0-9]/g, ""))
                }
                data-ocid="library.book.available_qty_input"
              />
            </div>
          </div>
          <div>
            <Label>Location / Shelf</Label>
            <Input
              className="mt-1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Shelf A-3"
              data-ocid="library.book.location_input"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={saving}
              data-ocid="library.book.submit_button"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {book ? "Save Changes" : "Add Book"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="library.book.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Library Page ─────────────────────────────────────────

export default function Library() {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    addNotification,
    currentUser,
  } = useApp();

  const books = getData("library") as LibraryBook[];
  const issues = getData("library_issues") as BookIssue[];
  const students = getData("students") as Student[];

  const [activeTab, setActiveTab] = useState<TabId>("catalog");
  const [showBookForm, setShowBookForm] = useState(false);
  const [editBook, setEditBook] = useState<LibraryBook | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [libSettings, setLibSettings] =
    useState<LibrarySettings>(DEFAULT_LIB_SETTINGS);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCat, setCatalogCat] = useState("all");

  const canWrite = ALLOWED_WRITE_ROLES.has(currentUser?.role ?? "");

  // ── Book CRUD ────────────────────────────────────────────────

  const handleSaveBook = useCallback(
    async (data: Omit<LibraryBook, "id" | "addedAt">) => {
      if (editBook) {
        await updateData("library", editBook.id, {
          ...data,
          id: editBook.id,
          addedAt: editBook.addedAt,
        });
        addNotification(`Book updated: ${data.title}`, "success", "📚");
      } else {
        const id = generateId();
        await saveData("library", {
          ...data,
          id,
          addedAt: todayStr(),
        } as unknown as Record<string, unknown>);
        addNotification(`Book added: ${data.title}`, "success", "📚");
      }
      setShowBookForm(false);
      setEditBook(undefined);
    },
    [editBook, updateData, saveData, addNotification],
  );

  const handleDeleteBook = useCallback(
    async (id: string) => {
      if (!confirm("Delete this book from the catalog?")) return;
      await deleteData("library", id);
      addNotification("Book removed from catalog", "info");
    },
    [deleteData, addNotification],
  );

  // ── Issue / Return ────────────────────────────────────────────

  const handleIssue = useCallback(
    async (bookId: string, studentId: string, dueDate: string) => {
      const book = books.find((b) => b.id === bookId);
      if (!book) return;
      if (book.availableQty < 1) {
        toast.error("No copies available");
        return;
      }

      const issueId = generateId();
      await saveData("library_issues", {
        id: issueId,
        bookId,
        studentId,
        issueDate: todayStr(),
        dueDate,
        fine: 0,
        status: "issued",
      } as unknown as Record<string, unknown>);
      await updateData("library", bookId, {
        ...book,
        availableQty: book.availableQty - 1,
      });

      const student = students.find((s) => s.id === studentId);
      addNotification(
        `Book issued to ${student?.fullName ?? "student"}`,
        "success",
        "📗",
      );
      toast.success("Book issued successfully");
    },
    [books, students, saveData, updateData, addNotification],
  );

  const handleReturn = useCallback(
    async (issueId: string, fine: number) => {
      const issue = issues.find((i) => i.id === issueId);
      if (!issue) return;
      const book = books.find((b) => b.id === issue.bookId);

      await updateData("library_issues", issueId, {
        ...issue,
        returnDate: todayStr(),
        fine,
        status: "returned",
      });
      if (book)
        await updateData("library", book.id, {
          ...book,
          availableQty: book.availableQty + 1,
        });

      addNotification(
        `Book returned${fine > 0 ? ` — Fine: ₹${fine}` : ""}`,
        "success",
        "📘",
      );
      toast.success(
        fine > 0
          ? `Book returned. Fine collected: ₹${fine}`
          : "Book returned successfully",
      );
    },
    [issues, books, updateData, addNotification],
  );

  const handleSendReminder = useCallback(
    async (_issue: BookIssue, student: Student | null) => {
      toast.success(
        `Reminder sent to ${student?.fullName ?? "student"} (simulated)`,
      );
    },
    [],
  );

  const handleBulkRemind = useCallback(
    async (list: { issue: BookIssue; student: Student | null }[]) => {
      toast.success(
        `Bulk reminders sent to ${list.length} students (simulated)`,
      );
    },
    [],
  );

  // ── Catalog stats ─────────────────────────────────────────────

  const totalIssued = useMemo(
    () => issues.filter((i) => i.status === "issued").length,
    [issues],
  );
  const overdueCount = useMemo(
    () =>
      issues.filter((i) => i.status === "issued" && daysOverdue(i.dueDate) > 0)
        .length,
    [issues],
  );
  const totalAvailable = useMemo(
    () => books.reduce((s, b) => s + b.availableQty, 0),
    [books],
  );

  const filteredBooks = useMemo(() => {
    const q = catalogSearch.toLowerCase();
    return books.filter(
      (b) =>
        (catalogCat === "all" || b.category === catalogCat) &&
        (!q ||
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q)),
    );
  }, [books, catalogSearch, catalogCat]);

  // ── Overdue list ──────────────────────────────────────────────

  const overdueList = useMemo(
    () =>
      issues
        .filter((i) => i.status === "issued" && daysOverdue(i.dueDate) > 0)
        .map((i) => ({
          issue: i,
          student: students.find((s) => s.id === i.studentId) ?? null,
          book: books.find((b) => b.id === i.bookId),
          days: daysOverdue(i.dueDate),
          fine: daysOverdue(i.dueDate) * libSettings.finePerDay,
        }))
        .sort((a, b) => b.days - a.days),
    [issues, students, books, libSettings],
  );

  // ── Issue form state ──────────────────────────────────────────

  const [issueStudentQ, setIssueStudentQ] = useState("");
  const [issueStudentId, setIssueStudentId] = useState("");
  const [issueBookQ, setIssueBookQ] = useState("");
  const [issueBookId, setIssueBookId] = useState("");
  const [issueDue, setIssueDue] = useState(() =>
    defaultDueDate(libSettings.defaultLoanDays),
  );
  const [issueLoading, setIssueLoading] = useState(false);
  const [showStudentDD, setShowStudentDD] = useState(false);
  const [showIssueBookDD, setShowIssueBookDD] = useState(false);
  const [returnBookQ, setReturnBookQ] = useState("");
  const [returnBookId, setReturnBookId] = useState("");
  const [showReturnDD, setShowReturnDD] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);

  const studentMatches = useMemo(() => {
    const q = issueStudentQ.toLowerCase();
    if (!q) return [];
    return students
      .filter(
        (s) =>
          s.status === "active" &&
          (s.fullName.toLowerCase().includes(q) ||
            s.admNo.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [issueStudentQ, students]);

  const issueBookMatches = useMemo(() => {
    const q = issueBookQ.toLowerCase();
    if (!q) return [];
    return books
      .filter(
        (b) =>
          b.availableQty > 0 &&
          (b.title.toLowerCase().includes(q) ||
            b.isbn.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [issueBookQ, books]);

  const returnBookMatches = useMemo(() => {
    const q = returnBookQ.toLowerCase();
    if (!q) return [];
    return books
      .filter(
        (b) =>
          b.title.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [returnBookQ, books]);

  const currentIssue = useMemo(() => {
    if (!returnBookId) return null;
    return (
      issues.find((i) => i.bookId === returnBookId && i.status === "issued") ??
      null
    );
  }, [returnBookId, issues]);

  const issueStudent = useMemo(() => {
    if (!currentIssue) return null;
    return students.find((s) => s.id === currentIssue.studentId) ?? null;
  }, [currentIssue, students]);

  const daysOD = currentIssue ? daysOverdue(currentIssue.dueDate) : 0;
  const calcFine = daysOD * libSettings.finePerDay;

  const handleIssueSubmit = async () => {
    if (!issueStudentId) {
      toast.error("Select a student");
      return;
    }
    if (!issueBookId) {
      toast.error("Select a book");
      return;
    }
    setIssueLoading(true);
    try {
      await handleIssue(issueBookId, issueStudentId, issueDue);
      setIssueStudentQ("");
      setIssueStudentId("");
      setIssueBookQ("");
      setIssueBookId("");
      setIssueDue(defaultDueDate(libSettings.defaultLoanDays));
    } finally {
      setIssueLoading(false);
    }
  };

  const handleReturnSubmit = async () => {
    if (!currentIssue) {
      toast.error("No open issue found for this book");
      return;
    }
    setReturnLoading(true);
    try {
      await handleReturn(currentIssue.id, calcFine);
      setReturnBookQ("");
      setReturnBookId("");
    } finally {
      setReturnLoading(false);
    }
  };

  const TABS: {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "catalog", label: "Books Catalog", icon: BookOpen },
    { id: "issue-return", label: "Issue / Return", icon: History },
    { id: "reports", label: "Reports", icon: Download },
  ];

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Library
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {books.length} books in catalog · {totalIssued} issued
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
          data-ocid="library.settings_button"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Books", value: books.length, color: "text-primary" },
          { label: "Issued", value: totalIssued, color: "text-warning" },
          {
            label: "Available",
            value: totalAvailable,
            color: "text-foreground",
          },
          { label: "Overdue", value: overdueCount, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-2xl font-bold font-display ${s.color}`}>
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              data-ocid={`library.${t.id}_tab`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Catalog Tab ── */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Search title, author, ISBN…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                data-ocid="library.catalog.search_input"
              />
            </div>
            <Select value={catalogCat} onValueChange={setCatalogCat}>
              <SelectTrigger
                className="w-36"
                data-ocid="library.catalog.category_filter"
              >
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {BOOK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canWrite && (
              <Button
                onClick={() => {
                  setEditBook(undefined);
                  setShowBookForm(true);
                }}
                data-ocid="library.catalog.add_book_button"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Add Book
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                exportCSV(
                  [
                    [
                      "ISBN",
                      "Title",
                      "Author",
                      "Publisher",
                      "Category",
                      "Total Qty",
                      "Available",
                      "Location",
                    ],
                    ...books.map((b) => [
                      b.isbn,
                      b.title,
                      b.author,
                      b.publisher ?? "",
                      b.category,
                      String(b.totalQty),
                      String(b.availableQty),
                      b.location ?? "",
                    ]),
                  ],
                  "library_catalog.csv",
                )
              }
              data-ocid="library.catalog.export_button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {filteredBooks.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="library.catalog.empty_state"
            >
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">
                {books.length === 0
                  ? "No books yet. Add your first book."
                  : "No books match your search."}
              </p>
              {books.length === 0 && canWrite && (
                <Button className="mt-4" onClick={() => setShowBookForm(true)}>
                  Add First Book
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">
                      Title
                    </th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium hidden md:table-cell">
                      Author
                    </th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium hidden lg:table-cell">
                      ISBN
                    </th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">
                      Category
                    </th>
                    <th className="text-right px-3 py-2.5 text-muted-foreground font-medium">
                      Total
                    </th>
                    <th className="text-right px-3 py-2.5 text-muted-foreground font-medium">
                      Avail.
                    </th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium hidden lg:table-cell">
                      Location
                    </th>
                    {canWrite && (
                      <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((b, idx) => (
                    <tr
                      key={b.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 ${b.availableQty === 0 ? "bg-destructive/5" : ""}`}
                      data-ocid={`library.catalog.item.${idx + 1}`}
                    >
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          {b.availableQty === 0 && (
                            <span
                              className="w-2 h-2 rounded-full bg-destructive flex-shrink-0"
                              title="Out of stock"
                            />
                          )}
                          <span
                            className="truncate max-w-[160px]"
                            title={b.title}
                          >
                            {b.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                        {b.author}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs hidden lg:table-cell">
                        {b.isbn || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="secondary" className="text-xs">
                          {b.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {b.totalQty}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right tabular-nums font-medium ${b.availableQty === 0 ? "text-destructive" : "text-foreground"}`}
                      >
                        {b.availableQty}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">
                        {b.location || "—"}
                      </td>
                      {canWrite && (
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditBook(b);
                                setShowBookForm(true);
                              }}
                              data-ocid={`library.catalog.edit_button.${idx + 1}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteBook(b.id)}
                              data-ocid={`library.catalog.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Issue/Return Tab ── */}
      {activeTab === "issue-return" && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Issue Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Issue Book
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Student search */}
                <div className="relative">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Student
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      className="pl-9"
                      placeholder="Student name or adm. no…"
                      value={issueStudentQ}
                      onChange={(e) => {
                        setIssueStudentQ(e.target.value);
                        setIssueStudentId("");
                        setShowStudentDD(true);
                      }}
                      onFocus={() => setShowStudentDD(true)}
                      data-ocid="library.issue.student_search_input"
                    />
                    {issueStudentId && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    )}
                  </div>
                  {showStudentDD && studentMatches.length > 0 && (
                    <div
                      className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      data-ocid="library.issue.student_dropdown"
                    >
                      {studentMatches.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex items-center gap-2"
                          onClick={() => {
                            setIssueStudentQ(`${s.fullName} (${s.admNo})`);
                            setIssueStudentId(s.id);
                            setShowStudentDD(false);
                          }}
                        >
                          <span className="font-medium">{s.fullName}</span>
                          <span className="text-muted-foreground text-xs">
                            {s.class}-{s.section} · {s.admNo}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Book search */}
                <div className="relative">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Book
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      className="pl-9"
                      placeholder="Book title or ISBN…"
                      value={issueBookQ}
                      onChange={(e) => {
                        setIssueBookQ(e.target.value);
                        setIssueBookId("");
                        setShowIssueBookDD(true);
                      }}
                      onFocus={() => setShowIssueBookDD(true)}
                      data-ocid="library.issue.book_search_input"
                    />
                    {issueBookId && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    )}
                  </div>
                  {showIssueBookDD && issueBookMatches.length > 0 && (
                    <div className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {issueBookMatches.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between items-center"
                          onClick={() => {
                            setIssueBookQ(b.title);
                            setIssueBookId(b.id);
                            setShowIssueBookDD(false);
                          }}
                        >
                          <span className="font-medium">{b.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {b.availableQty} avail.
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Due Date
                  </Label>
                  <Input
                    type="date"
                    value={issueDue}
                    onChange={(e) => setIssueDue(e.target.value)}
                    min={todayStr()}
                    data-ocid="library.issue.due_date_input"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleIssueSubmit}
                  disabled={
                    !canWrite || issueLoading || !issueStudentId || !issueBookId
                  }
                  data-ocid="library.issue.submit_button"
                >
                  {issueLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <BookOpen className="w-4 h-4 mr-2" />
                  )}
                  Issue Book
                </Button>
              </CardContent>
            </Card>

            {/* Return Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-accent" />
                  Return Book
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Book
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      className="pl-9"
                      placeholder="Search book to return…"
                      value={returnBookQ}
                      onChange={(e) => {
                        setReturnBookQ(e.target.value);
                        setReturnBookId("");
                        setShowReturnDD(true);
                      }}
                      onFocus={() => setShowReturnDD(true)}
                      data-ocid="library.return.book_search_input"
                    />
                  </div>
                  {showReturnDD && returnBookMatches.length > 0 && (
                    <div className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {returnBookMatches.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between"
                          onClick={() => {
                            setReturnBookQ(b.title);
                            setReturnBookId(b.id);
                            setShowReturnDD(false);
                          }}
                        >
                          <span className="font-medium">{b.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {b.isbn || "No ISBN"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {currentIssue ? (
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 text-sm border border-border">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Student</span>
                      <span className="font-medium">
                        {issueStudent?.fullName ?? "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issue Date</span>
                      <span>{currentIssue.issueDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due Date</span>
                      <span
                        className={
                          daysOD > 0 ? "text-destructive font-medium" : ""
                        }
                      >
                        {currentIssue.dueDate}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 font-bold">
                      <span>Fine</span>
                      <span
                        className={
                          calcFine > 0 ? "text-destructive" : "text-foreground"
                        }
                      >
                        ₹{calcFine}{" "}
                        {daysOD > 0
                          ? `(${daysOD} days × ₹${libSettings.finePerDay})`
                          : ""}
                      </span>
                    </div>
                  </div>
                ) : returnBookId ? (
                  <div
                    className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground text-center border border-dashed border-border"
                    data-ocid="library.return.no_issue_state"
                  >
                    No open issue found for this book.
                  </div>
                ) : null}

                <Button
                  className="w-full"
                  variant={calcFine > 0 ? "destructive" : "default"}
                  onClick={handleReturnSubmit}
                  disabled={!canWrite || returnLoading || !currentIssue}
                  data-ocid="library.return.submit_button"
                >
                  {returnLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  {calcFine > 0
                    ? `Return & Collect ₹${calcFine}`
                    : "Return Book"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent transactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {issues.length === 0 ? (
                <div
                  className="py-8 text-center text-muted-foreground text-sm"
                  data-ocid="library.recent.empty_state"
                >
                  No transactions yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {[...issues]
                    .reverse()
                    .slice(0, 12)
                    .map((issue, idx) => {
                      const book = books.find((b) => b.id === issue.bookId);
                      const student = students.find(
                        (s) => s.id === issue.studentId,
                      );
                      const od =
                        issue.status === "issued"
                          ? daysOverdue(issue.dueDate)
                          : 0;
                      return (
                        <div
                          key={issue.id}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm"
                          data-ocid={`library.recent.item.${idx + 1}`}
                        >
                          <Badge
                            variant={
                              issue.status === "returned"
                                ? "secondary"
                                : od > 0
                                  ? "destructive"
                                  : "default"
                            }
                            className="text-xs flex-shrink-0"
                          >
                            {issue.status === "returned"
                              ? "Returned"
                              : od > 0
                                ? "Overdue"
                                : "Issued"}
                          </Badge>
                          <span className="font-medium truncate flex-1">
                            {book?.title ?? "Unknown Book"}
                          </span>
                          <span className="text-muted-foreground truncate hidden sm:block">
                            {student?.fullName ?? "—"}
                          </span>
                          <span className="text-muted-foreground text-xs flex-shrink-0">
                            {issue.issueDate}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Reports Tab ── */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Total Issued",
                value: issues.filter((i) => i.status === "issued").length,
                color: "text-primary",
              },
              {
                label: "Returned",
                value: issues.filter((i) => i.status === "returned").length,
                color: "text-foreground",
              },
              {
                label: "Overdue",
                value: overdueCount,
                color: "text-destructive",
              },
              {
                label: "Total Fines (₹)",
                value: issues
                  .filter((i) => i.fine > 0)
                  .reduce((s, i) => s + i.fine, 0),
                color: "text-warning",
              },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className={`text-2xl font-bold font-display ${s.color}`}>
                    {s.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overdue alerts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Overdue Books ({overdueList.length})
              </h3>
              {overdueList.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleBulkRemind(
                      overdueList.map((e) => ({
                        issue: e.issue,
                        student: e.student,
                      })),
                    )
                  }
                  data-ocid="library.reports.bulk_remind_button"
                >
                  Bulk Remind All
                </Button>
              )}
            </div>
            {overdueList.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 text-center bg-muted/30 rounded-xl"
                data-ocid="library.reports.overdue_empty_state"
              >
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm font-medium">
                  No overdue books! All issues are on time.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueList.map((entry, idx) => (
                  <div
                    key={entry.issue.id}
                    className={`rounded-lg bg-card border border-border p-3 flex flex-wrap items-center gap-3 ${entry.days > 7 ? "border-l-4 border-l-destructive bg-destructive/5" : entry.days >= 3 ? "border-l-4 border-l-warning" : "border-l-4 border-l-yellow-500"}`}
                    data-ocid={`library.reports.overdue.item.${idx + 1}`}
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="font-medium text-sm truncate">
                        {entry.book?.title ?? "Unknown Book"}
                      </p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>{entry.student?.fullName ?? "Unknown"}</span>
                        {entry.student && (
                          <span>
                            {entry.student.class}-{entry.student.section}
                          </span>
                        )}
                        <span>Due: {entry.issue.dueDate}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-destructive">
                        {entry.days} days overdue
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fine: ₹{entry.fine}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 h-7 text-xs"
                      onClick={() =>
                        handleSendReminder(entry.issue, entry.student)
                      }
                      data-ocid={`library.reports.overdue.remind_button.${idx + 1}`}
                    >
                      Send Reminder
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Popular books */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              Popular Books (Most Issued)
            </h3>
            {books.length === 0 ? (
              <p className="text-sm text-muted-foreground">No books yet.</p>
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      {["Book Title", "Author", "Category", "Total Issues"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {books
                      .map((b) => ({
                        ...b,
                        issueCount: issues.filter((i) => i.bookId === b.id)
                          .length,
                      }))
                      .sort((a, b) => b.issueCount - a.issueCount)
                      .slice(0, 10)
                      .map((b, idx) => (
                        <tr
                          key={b.id}
                          className="border-b border-border last:border-0 hover:bg-muted/20"
                          data-ocid={`library.reports.popular.item.${idx + 1}`}
                        >
                          <td className="px-3 py-2.5 font-medium">{b.title}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {b.author}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant="secondary" className="text-xs">
                              {b.category}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                            {b.issueCount}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Fine collection summary */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              Fine Collection Summary
            </h3>
            {issues.filter((i) => i.fine > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No fines collected yet.
              </p>
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      {[
                        "Student",
                        "Book",
                        "Issue Date",
                        "Return Date",
                        "Fine (₹)",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {issues
                      .filter((i) => i.fine > 0)
                      .map((issue, idx) => {
                        const book = books.find((b) => b.id === issue.bookId);
                        const student = students.find(
                          (s) => s.id === issue.studentId,
                        );
                        return (
                          <tr
                            key={issue.id}
                            className="border-b border-border last:border-0 hover:bg-muted/20"
                            data-ocid={`library.reports.fine.item.${idx + 1}`}
                          >
                            <td className="px-3 py-2.5 font-medium">
                              {student?.fullName ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[160px]">
                              {book?.title ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {issue.issueDate}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {issue.returnDate ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-destructive tabular-nums">
                              ₹{issue.fine}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-2" data-print-hide>
            <Button
              variant="outline"
              onClick={() =>
                exportCSV(
                  [
                    [
                      "Student",
                      "Adm No",
                      "Class",
                      "Book",
                      "Issue Date",
                      "Due Date",
                      "Return Date",
                      "Fine",
                      "Status",
                    ],
                    ...issues.map((issue) => {
                      const b = books.find((bk) => bk.id === issue.bookId);
                      const s = students.find(
                        (st) => st.id === issue.studentId,
                      );
                      return [
                        s?.fullName ?? "",
                        s?.admNo ?? "",
                        s ? `${s.class}-${s.section}` : "",
                        b?.title ?? "",
                        issue.issueDate,
                        issue.dueDate,
                        issue.returnDate ?? "",
                        String(issue.fine),
                        issue.status,
                      ];
                    }),
                  ],
                  "library_issue_history.csv",
                )
              }
              data-ocid="library.reports.export_issues_button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Issue History
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                exportCSV(
                  [
                    ["Student", "Adm No", "Class", "Book", "Fine (₹)"],
                    ...issues
                      .filter((i) => i.fine > 0)
                      .map((issue) => {
                        const b = books.find((bk) => bk.id === issue.bookId);
                        const s = students.find(
                          (st) => st.id === issue.studentId,
                        );
                        return [
                          s?.fullName ?? "",
                          s?.admNo ?? "",
                          s ? `${s.class}-${s.section}` : "",
                          b?.title ?? "",
                          String(issue.fine),
                        ];
                      }),
                  ],
                  "library_fines.csv",
                )
              }
              data-ocid="library.reports.export_fines_button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Fines
            </Button>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      {showSettings && (
        <SettingsDialog
          settings={libSettings}
          onSave={(s) => {
            setLibSettings(s);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Book Form Dialog */}
      {showBookForm && (
        <BookFormDialog
          book={editBook}
          onSave={handleSaveBook}
          onClose={() => {
            setShowBookForm(false);
            setEditBook(undefined);
          }}
        />
      )}
    </div>
  );
}
