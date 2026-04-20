/**
 * SHUBH SCHOOL ERP — Library + Barcode Scanning Module
 *
 * Tabs: Books Catalog | Issue/Return | Overdue Books | Barcode Scanner
 * Uses jsQR for barcode scanning (same pattern as QRAttendance)
 * All amount fields are plain text — NO spinner controls
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
  BarChart2,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit2,
  History,
  Keyboard,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import type { BookIssue, LibraryBook, Student } from "../types";
import {
  deleteCollectionItem,
  fetchCollection,
  saveCollectionItem,
  updateCollectionItem,
} from "../utils/api";
import { generateId } from "../utils/localStorage";

// ── Types ──────────────────────────────────────────────────

interface LibrarySettings {
  finePerDay: number;
  defaultLoanDays: number;
}

const DEFAULT_SETTINGS: LibrarySettings = {
  finePerDay: 5,
  defaultLoanDays: 14,
};

const BOOK_CATEGORIES = [
  "Fiction",
  "Non-Fiction",
  "Science",
  "Mathematics",
  "History",
  "Geography",
  "Literature",
  "Reference",
  "Textbook",
  "Magazine",
  "Other",
];

type TabId = "catalog" | "issue-return" | "overdue" | "scanner";

const TABS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "catalog", label: "Books Catalog", icon: BookOpen },
  { id: "issue-return", label: "Issue / Return", icon: History },
  { id: "overdue", label: "Overdue Books", icon: AlertTriangle },
  { id: "scanner", label: "Barcode Scanner", icon: Camera },
];

const ALLOWED_WRITE_ROLES = new Set(["superadmin", "admin", "librarian"]);

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

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Settings Panel ─────────────────────────────────────────

function LibrarySettingsPanel({
  settings,
  onSave,
  onClose,
}: {
  settings: LibrarySettings;
  onSave: (s: LibrarySettings) => void;
  onClose: () => void;
}) {
  const [finePerDay, setFinePerDay] = useState(String(settings.finePerDay));
  const [defaultLoanDays, setDefaultLoanDays] = useState(
    String(settings.defaultLoanDays),
  );

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
              type="number"
              className="mt-1 no-spinner"
              value={finePerDay}
              onChange={(e) => setFinePerDay(e.target.value)}
              placeholder="5"
              data-ocid="library.settings.fine_input"
            />
          </div>
          <div>
            <Label>Default loan period (days)</Label>
            <Input
              type="number"
              className="mt-1 no-spinner"
              value={defaultLoanDays}
              onChange={(e) => setDefaultLoanDays(e.target.value)}
              placeholder="14"
              data-ocid="library.settings.loan_days_input"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={() => {
                onSave({
                  finePerDay: Math.max(0, Number(finePerDay) || 5),
                  defaultLoanDays: Math.max(1, Number(defaultLoanDays) || 14),
                });
              }}
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

// ── Add/Edit Book Dialog ───────────────────────────────────

interface BookFormProps {
  book?: LibraryBook;
  onSave: (b: Omit<LibraryBook, "id" | "addedAt">) => Promise<void>;
  onClose: () => void;
  onScanISBN: (cb: (isbn: string) => void) => void;
}

function BookFormDialog({ book, onSave, onClose, onScanISBN }: BookFormProps) {
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

  const handleScan = () => {
    onScanISBN((scanned) => setIsbn(scanned));
  };

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
            <div className="flex gap-2 mt-1">
              <Input
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="978-0-000-00000-0"
                data-ocid="library.book.isbn_input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleScan}
                data-ocid="library.book.scan_isbn_button"
              >
                <Camera className="w-4 h-4 mr-1" /> Scan
              </Button>
            </div>
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
              data-ocid="library.book.publisher_input"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className="mt-1"
                data-ocid="library.book.category_select"
              >
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
                type="number"
                className="mt-1 no-spinner"
                value={totalQty}
                onChange={(e) => setTotalQty(e.target.value)}
                min="0"
                data-ocid="library.book.total_qty_input"
              />
            </div>
            <div>
              <Label>Available Qty</Label>
              <Input
                type="number"
                className="mt-1 no-spinner"
                value={availableQty}
                onChange={(e) => setAvailableQty(e.target.value)}
                min="0"
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
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
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

// ── Books Catalog Tab ──────────────────────────────────────

function BooksCatalogTab({
  books,
  issues,
  canWrite,
  canDelete,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onImportCSV,
}: {
  books: LibraryBook[];
  issues: BookIssue[];
  canWrite: boolean;
  canDelete: boolean;
  onAddBook: () => void;
  onEditBook: (b: LibraryBook) => void;
  onDeleteBook: (id: string) => void;
  onImportCSV: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const totalIssued = useMemo(
    () =>
      issues.filter((i) => i.status === "issued" || i.status === "overdue")
        .length,
    [issues],
  );
  const overdueCount = useMemo(
    () =>
      issues.filter((i) => {
        if (i.status !== "issued") return false;
        return daysOverdue(i.dueDate) > 0;
      }).length,
    [issues],
  );
  const totalAvailable = useMemo(
    () => books.reduce((s, b) => s + b.availableQty, 0),
    [books],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return books.filter((b) => {
      const matchSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q);
      const matchCat = filterCat === "all" || b.category === filterCat;
      return matchSearch && matchCat;
    });
  }, [books, search, filterCat]);

  const exportCSV = () => {
    const header =
      "ISBN,Title,Author,Publisher,Category,TotalQty,AvailableQty,Location";
    const rows = books.map((b) =>
      [
        b.isbn,
        b.title,
        b.author,
        b.publisher ?? "",
        b.category,
        b.totalQty,
        b.availableQty,
        b.location ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "library_books.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Books", value: books.length, color: "text-primary" },
          { label: "Total Issued", value: totalIssued, color: "text-warning" },
          { label: "Available", value: totalAvailable, color: "text-success" },
          { label: "Overdue", value: overdueCount, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="text-center py-3">
            <p className={`text-2xl font-bold font-display ${s.color}`}>
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title, author, ISBN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="library.catalog.search_input"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
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
          <>
            <Button
              onClick={onAddBook}
              data-ocid="library.catalog.add_book_button"
            >
              <BookOpen className="w-4 h-4 mr-2" /> Add Book
            </Button>
            <Button
              variant="outline"
              onClick={onImportCSV}
              data-ocid="library.catalog.import_button"
            >
              <Upload className="w-4 h-4 mr-2" /> Import CSV
            </Button>
          </>
        )}
        <Button
          variant="outline"
          onClick={exportCSV}
          data-ocid="library.catalog.export_button"
        >
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          data-ocid="library.catalog.empty_state"
        >
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">
            {books.length === 0
              ? "No books in catalog yet. Add your first book to get started."
              : "No books match your search."}
          </p>
          {books.length === 0 && canWrite && (
            <Button
              className="mt-4"
              onClick={onAddBook}
              data-ocid="library.catalog.add_first_book_button"
            >
              Add First Book
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
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
                <th className="text-right px-3 py-2.5 text-muted-foreground font-medium hidden md:table-cell">
                  Issued
                </th>
                <th className="text-left px-3 py-2.5 text-muted-foreground font-medium hidden lg:table-cell">
                  Location
                </th>
                {(canWrite || canDelete) && (
                  <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, idx) => {
                const issuedQty = b.totalQty - b.availableQty;
                const isLow = b.availableQty === 0;
                return (
                  <tr
                    key={b.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${isLow ? "bg-destructive/5" : ""}`}
                    data-ocid={`library.catalog.item.${idx + 1}`}
                  >
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {isLow && (
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
                      className={`px-3 py-2.5 text-right tabular-nums font-medium ${isLow ? "text-destructive" : "text-success"}`}
                    >
                      {b.availableQty}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                      {issuedQty}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">
                      {b.location || "—"}
                    </td>
                    {(canWrite || canDelete) && (
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onEditBook(b)}
                              data-ocid={`library.catalog.edit_button.${idx + 1}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => onDeleteBook(b.id)}
                              data-ocid={`library.catalog.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Issue/Return Tab ───────────────────────────────────────

function IssueReturnTab({
  books,
  issues,
  students,
  settings,
  canWrite,
  onIssue,
  onReturn,
}: {
  books: LibraryBook[];
  issues: BookIssue[];
  students: Student[];
  settings: LibrarySettings;
  canWrite: boolean;
  onIssue: (
    bookId: string,
    studentId: string,
    dueDate: string,
  ) => Promise<void>;
  onReturn: (issueId: string, fine: number) => Promise<void>;
}) {
  // Issue form state
  const [issueStudentQ, setIssueStudentQ] = useState("");
  const [issueStudentId, setIssueStudentId] = useState("");
  const [issueBookQ, setIssueBookQ] = useState("");
  const [issueBookId, setIssueBookId] = useState("");
  const [issueDue, setIssueDue] = useState(() =>
    defaultDueDate(settings.defaultLoanDays),
  );
  const [issueLoading, setIssueLoading] = useState(false);
  const [showStudentDD, setShowStudentDD] = useState(false);
  const [showBookDD, setShowBookDD] = useState(false);

  // Return form state
  const [returnBookQ, setReturnBookQ] = useState("");
  const [returnBookId, setReturnBookId] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  const [showReturnBookDD, setShowReturnBookDD] = useState(false);

  const activeStudents = useMemo(
    () => students.filter((s) => s.status === "active"),
    [students],
  );

  const studentMatches = useMemo(() => {
    const q = issueStudentQ.toLowerCase();
    if (!q) return [];
    return activeStudents
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.admNo.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [issueStudentQ, activeStudents]);

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

  // Current open issue for selected return book
  const currentIssue = useMemo(() => {
    if (!returnBookId) return null;
    return (
      issues.find(
        (i) =>
          i.bookId === returnBookId &&
          (i.status === "issued" || i.status === "overdue"),
      ) ?? null
    );
  }, [returnBookId, issues]);

  const issueStudent = useMemo(() => {
    if (!currentIssue) return null;
    return students.find((s) => s.id === currentIssue.studentId) ?? null;
  }, [currentIssue, students]);

  const daysOD = currentIssue ? daysOverdue(currentIssue.dueDate) : 0;
  const calculatedFine = daysOD * settings.finePerDay;

  const handleIssue = async () => {
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
      await onIssue(issueBookId, issueStudentId, issueDue);
      setIssueStudentQ("");
      setIssueStudentId("");
      setIssueBookQ("");
      setIssueBookId("");
      setIssueDue(defaultDueDate(settings.defaultLoanDays));
    } finally {
      setIssueLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!currentIssue) {
      toast.error("No open issue found for this book");
      return;
    }
    setReturnLoading(true);
    try {
      await onReturn(currentIssue.id, calculatedFine);
      setReturnBookQ("");
      setReturnBookId("");
    } finally {
      setReturnLoading(false);
    }
  };

  const recentIssues = useMemo(
    () => [...issues].reverse().slice(0, 10),
    [issues],
  );

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Issue Book */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Issue Book
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
                  placeholder="Type student name or adm. no…"
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
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />
                )}
              </div>
              {showStudentDD && studentMatches.length > 0 && (
                <div
                  className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                  data-ocid="library.issue.student_dropdown"
                >
                  {studentMatches.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm"
                      onClick={() => {
                        setIssueStudentQ(`${s.fullName} (${s.admNo})`);
                        setIssueStudentId(s.id);
                        setShowStudentDD(false);
                      }}
                      data-ocid={`library.issue.student_option.${s.id}`}
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
                  placeholder="Type book title or scan barcode…"
                  value={issueBookQ}
                  onChange={(e) => {
                    setIssueBookQ(e.target.value);
                    setIssueBookId("");
                    setShowBookDD(true);
                  }}
                  onFocus={() => setShowBookDD(true)}
                  data-ocid="library.issue.book_search_input"
                />
                {issueBookId && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />
                )}
              </div>
              {showBookDD && issueBookMatches.length > 0 && (
                <div
                  className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                  data-ocid="library.issue.book_dropdown"
                >
                  {issueBookMatches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm"
                      onClick={() => {
                        setIssueBookQ(b.title);
                        setIssueBookId(b.id);
                        setShowBookDD(false);
                      }}
                      data-ocid={`library.issue.book_option.${b.id}`}
                    >
                      <span className="font-medium">{b.title}</span>
                      <span className="text-xs text-success">
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
              onClick={handleIssue}
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
            {!canWrite && (
              <p className="text-xs text-muted-foreground text-center">
                Librarian/Admin access required
              </p>
            )}
          </CardContent>
        </Card>

        {/* Return Book */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-accent" /> Return Book
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
                    setShowReturnBookDD(true);
                  }}
                  onFocus={() => setShowReturnBookDD(true)}
                  data-ocid="library.return.book_search_input"
                />
              </div>
              {showReturnBookDD && returnBookMatches.length > 0 && (
                <div
                  className="absolute z-30 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                  data-ocid="library.return.book_dropdown"
                >
                  {returnBookMatches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm"
                      onClick={() => {
                        setReturnBookQ(b.title);
                        setReturnBookId(b.id);
                        setShowReturnBookDD(false);
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
                    className={daysOD > 0 ? "text-destructive font-medium" : ""}
                  >
                    {currentIssue.dueDate}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Days Overdue</span>
                  <span
                    className={daysOD > 0 ? "text-destructive" : "text-success"}
                  >
                    {daysOD > 0 ? `${daysOD} days` : "On time"}
                  </span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-1.5 mt-1">
                  <span>Fine Amount</span>
                  <span
                    className={
                      calculatedFine > 0 ? "text-destructive" : "text-success"
                    }
                  >
                    ₹{calculatedFine}{" "}
                    {daysOD > 0
                      ? `(₹${settings.finePerDay}/day × ${daysOD} days)`
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
              variant={calculatedFine > 0 ? "destructive" : "default"}
              onClick={handleReturn}
              disabled={!canWrite || returnLoading || !currentIssue}
              data-ocid="library.return.submit_button"
            >
              {returnLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              {calculatedFine > 0
                ? `Return & Collect Fine ₹${calculatedFine}`
                : "Return Book"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Issues Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" /> Recent
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentIssues.length === 0 ? (
            <div
              className="py-8 text-center text-muted-foreground text-sm"
              data-ocid="library.recent.empty_state"
            >
              No transactions yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentIssues.map((issue, idx) => {
                const book = books.find((b) => b.id === issue.bookId);
                const student = students.find((s) => s.id === issue.studentId);
                const overdueDays =
                  issue.status === "issued" ? daysOverdue(issue.dueDate) : 0;
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
                          : overdueDays > 0
                            ? "destructive"
                            : "default"
                      }
                      className="text-xs flex-shrink-0"
                    >
                      {issue.status === "returned"
                        ? "Returned"
                        : overdueDays > 0
                          ? "Overdue"
                          : "Issued"}
                    </Badge>
                    <span className="font-medium truncate flex-1">
                      {book?.title ?? "Unknown Book"}
                    </span>
                    <span className="text-muted-foreground truncate hidden sm:block">
                      {student?.fullName ?? "Unknown"}
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
  );
}

// ── Overdue Tab ────────────────────────────────────────────

function OverdueTab({
  books,
  issues,
  students,
  settings,
  onSendReminder,
  onBulkRemind,
}: {
  books: LibraryBook[];
  issues: BookIssue[];
  students: Student[];
  settings: LibrarySettings;
  onSendReminder: (issue: BookIssue, student: Student | null) => Promise<void>;
  onBulkRemind: (
    overdueList: { issue: BookIssue; student: Student | null }[],
  ) => Promise<void>;
}) {
  const [bulkLoading, setBulkLoading] = useState(false);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const overdueList = useMemo(() => {
    return issues
      .filter((i) => i.status === "issued" && daysOverdue(i.dueDate) > 0)
      .map((i) => ({
        issue: i,
        student: students.find((s) => s.id === i.studentId) ?? null,
        book: books.find((b) => b.id === i.bookId),
        days: daysOverdue(i.dueDate),
        fine: daysOverdue(i.dueDate) * settings.finePerDay,
      }))
      .sort((a, b) => b.days - a.days);
  }, [issues, students, books, settings]);

  function severityClass(days: number) {
    if (days > 7) return "border-l-4 border-l-destructive bg-destructive/5";
    if (days >= 3) return "border-l-4 border-l-warning bg-warning/5";
    return "border-l-4 border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10";
  }

  const handleRemind = async (entry: {
    issue: BookIssue;
    student: Student | null;
  }) => {
    setRemindingId(entry.issue.id);
    try {
      await onSendReminder(entry.issue, entry.student);
    } finally {
      setRemindingId(null);
    }
  };

  const handleBulkRemind = async () => {
    setBulkLoading(true);
    try {
      await onBulkRemind(
        overdueList.map((e) => ({ issue: e.issue, student: e.student })),
      );
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {overdueList.length} overdue book
            {overdueList.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-yellow-500 rounded-sm inline-block" />{" "}
              1–3 days
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-warning rounded-sm inline-block" />{" "}
              3–7 days
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-destructive rounded-sm inline-block" />{" "}
              7+ days
            </span>
          </div>
        </div>
        {overdueList.length > 0 && (
          <Button
            onClick={handleBulkRemind}
            disabled={bulkLoading}
            variant="outline"
            data-ocid="library.overdue.bulk_remind_button"
          >
            {bulkLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Bulk Remind All ({overdueList.length})
          </Button>
        )}
      </div>

      {overdueList.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          data-ocid="library.overdue.empty_state"
        >
          <CheckCircle2 className="w-12 h-12 text-success/60 mb-3" />
          <p className="text-muted-foreground font-medium">
            No overdue books! All issues are on time.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {overdueList.map((entry, idx) => (
            <div
              key={entry.issue.id}
              className={`rounded-lg bg-card border border-border p-3 flex flex-wrap items-center gap-3 ${severityClass(entry.days)}`}
              data-ocid={`library.overdue.item.${idx + 1}`}
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-medium text-sm truncate">
                  {entry.book?.title ?? "Unknown Book"}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{entry.student?.fullName ?? "Unknown Student"}</span>
                  {entry.student && (
                    <span>
                      {entry.student.class}-{entry.student.section}
                    </span>
                  )}
                  <span>Due: {entry.issue.dueDate}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 space-y-0.5">
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
                className="flex-shrink-0 text-xs h-7"
                disabled={remindingId === entry.issue.id}
                onClick={() => handleRemind(entry)}
                data-ocid={`library.overdue.remind_button.${idx + 1}`}
              >
                {remindingId === entry.issue.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Send Reminder"
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Barcode Scanner Tab ────────────────────────────────────

type JsQRFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => { data: string } | null;

function BarcodeScannerTab({
  books,
  issues,
  onQuickIssue,
  onQuickReturn,
  onIsbnDetected,
}: {
  books: LibraryBook[];
  issues: BookIssue[];
  onQuickIssue: (bookId: string) => void;
  onQuickReturn: (bookId: string) => void;
  onIsbnDetected?: (isbn: string) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [detectedBook, setDetectedBook] = useState<LibraryBook | null>(null);
  const [scanHistory, setScanHistory] = useState<LibraryBook[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const jsQRRef = useRef<JsQRFn | null>(null);
  const lastDecodedRef = useRef("");
  const lastTimeRef = useRef(0);

  const lookupIsbn = useCallback(
    (isbn: string) => {
      const book = books.find((b) => b.isbn === isbn || b.isbn === isbn.trim());
      if (book) {
        setDetectedBook(book);
        setScanHistory((prev) => {
          const next = [book, ...prev.filter((b) => b.id !== book.id)].slice(
            0,
            5,
          );
          return next;
        });
        if (onIsbnDetected) onIsbnDetected(isbn);
      } else {
        toast.error(`No book found for ISBN: ${isbn}`);
        setDetectedBook(null);
      }
    },
    [books, onIsbnDetected],
  );

  function tryDecode() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !jsQRRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQRRef.current(
      imageData.data,
      imageData.width,
      imageData.height,
    );
    if (code?.data) {
      const decoded = code.data.trim();
      const now = Date.now();
      if (
        decoded === lastDecodedRef.current &&
        now - lastTimeRef.current < 2000
      )
        return;
      lastDecodedRef.current = decoded;
      lastTimeRef.current = now;
      lookupIsbn(decoded);
    }
  }

  function scanLoop() {
    tryDecode();
    animRef.current = requestAnimationFrame(scanLoop);
  }

  async function startCamera() {
    setCameraError("");
    if (!jsQRRef.current) {
      const globalJsQR = (window as Window & { jsQR?: JsQRFn }).jsQR;
      if (typeof globalJsQR === "function") {
        jsQRRef.current = globalJsQR;
      }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      scanLoop();
    } catch {
      setCameraError(
        "Camera access denied or unavailable. Use manual entry below.",
      );
    }
  }

  function stopCamera() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    for (const t of streamRef.current?.getTracks() ?? []) t.stop();
    streamRef.current = null;
    setScanning(false);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup only
  useEffect(() => () => stopCamera(), []);

  const handleManualLookup = () => {
    if (!manualIsbn.trim()) return;
    lookupIsbn(manualIsbn.trim());
    setManualIsbn("");
  };

  const openIssue = detectedBook
    ? issues.find((i) => i.bookId === detectedBook.id && i.status === "issued")
    : null;

  return (
    <div className="space-y-4">
      {/* Camera viewer */}
      <Card className="overflow-hidden">
        <div className="relative bg-muted min-h-[260px] flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full max-h-[320px] object-contain ${scanning ? "block" : "hidden"}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!scanning && (
            <div className="flex flex-col items-center gap-3 p-8">
              <Camera className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm text-center">
                {cameraError ||
                  "Start camera to scan book barcodes (ISBN/EAN-13/Code 128)"}
              </p>
              {cameraError && (
                <p className="text-xs text-muted-foreground/70 text-center">
                  {cameraError}
                </p>
              )}
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-24 border-2 border-primary/70 rounded-md relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-px w-full bg-primary/50 animate-pulse" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-3 flex gap-2">
          {!scanning ? (
            <Button
              onClick={startCamera}
              className="flex-1"
              data-ocid="library.scanner.start_button"
            >
              <Camera className="w-4 h-4 mr-2" /> Start Camera
            </Button>
          ) : (
            <Button
              onClick={stopCamera}
              variant="outline"
              className="flex-1"
              data-ocid="library.scanner.stop_button"
            >
              <X className="w-4 h-4 mr-2" /> Stop Camera
            </Button>
          )}
        </div>
      </Card>

      {/* Manual entry */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Enter ISBN manually…"
            value={manualIsbn}
            onChange={(e) => setManualIsbn(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
            data-ocid="library.scanner.manual_isbn_input"
          />
        </div>
        <Button
          onClick={handleManualLookup}
          variant="outline"
          data-ocid="library.scanner.manual_lookup_button"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Detected book card */}
      {detectedBook && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base">{detectedBook.title}</p>
                <p className="text-sm text-muted-foreground">
                  {detectedBook.author}
                </p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span>ISBN: {detectedBook.isbn || "N/A"}</span>
                  <span>·</span>
                  <span>{detectedBook.category}</span>
                  <span>·</span>
                  <span
                    className={
                      detectedBook.availableQty > 0
                        ? "text-success font-medium"
                        : "text-destructive font-medium"
                    }
                  >
                    {detectedBook.availableQty > 0
                      ? `${detectedBook.availableQty} available`
                      : "Out of stock"}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => setDetectedBook(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              {detectedBook.availableQty > 0 ? (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onQuickIssue(detectedBook.id)}
                  data-ocid="library.scanner.quick_issue_button"
                >
                  <BookOpen className="w-4 h-4 mr-2" /> Issue to Student
                </Button>
              ) : openIssue ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onQuickReturn(detectedBook.id)}
                  data-ocid="library.scanner.quick_return_button"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Return
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan history */}
      {scanHistory.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            Recently Scanned
          </p>
          <div className="space-y-1.5">
            {scanHistory.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/30 text-sm transition-colors"
                onClick={() => setDetectedBook(b)}
                data-ocid={`library.scanner.history.item.${idx + 1}`}
              >
                <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate font-medium">{b.title}</span>
                <Badge
                  variant={b.availableQty > 0 ? "secondary" : "destructive"}
                  className="text-xs flex-shrink-0"
                >
                  {b.availableQty > 0 ? "Available" : "Issued"}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Library Component ─────────────────────────────────

export default function Library() {
  const { getData, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>("catalog");
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [editBook, setEditBook] = useState<LibraryBook | null>(null);
  const [settings, setSettings] = useState<LibrarySettings>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("shubh_library_settings") ?? "null") ??
        DEFAULT_SETTINGS
      );
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [scanIsbnCallback, setScanIsbnCallback] = useState<
    ((isbn: string) => void) | null
  >(null);

  const students = useMemo(() => getData("students") as Student[], [getData]);

  const canWrite = currentUser
    ? ALLOWED_WRITE_ROLES.has(currentUser.role)
    : false;
  const canDelete = currentUser
    ? currentUser.role === "superadmin" || currentUser.role === "admin"
    : false;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [booksData, issuesData] = await Promise.all([
        fetchCollection<LibraryBook>("library_books"),
        fetchCollection<BookIssue>("book_issues"),
      ]);
      setBooks(booksData);
      setIssues(issuesData);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to load library data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const saveSettings = (s: LibrarySettings) => {
    setSettings(s);
    localStorage.setItem("shubh_library_settings", JSON.stringify(s));
    setShowSettings(false);
    toast.success("Library settings saved");
  };

  const handleAddBook = async (data: Omit<LibraryBook, "id" | "addedAt">) => {
    try {
      const newBook: LibraryBook = {
        id: generateId(),
        addedAt: todayStr(),
        ...data,
      };
      await saveCollectionItem(
        "library_books",
        newBook as unknown as Record<string, unknown>,
      );
      setBooks((prev) => [...prev, newBook]);
      toast.success(`Book "${data.title}" added successfully`);
      setShowAddBook(false);
    } catch {
      toast.error("Failed to add book");
    }
  };

  const handleEditBook = async (data: Omit<LibraryBook, "id" | "addedAt">) => {
    if (!editBook) return;
    try {
      const updated: LibraryBook = { ...editBook, ...data };
      await updateCollectionItem(
        "library_books",
        editBook.id,
        updated as unknown as Record<string, unknown>,
      );
      setBooks((prev) => prev.map((b) => (b.id === editBook.id ? updated : b)));
      toast.success("Book updated");
      setEditBook(null);
    } catch {
      toast.error("Failed to update book");
    }
  };

  const handleDeleteBook = async (id: string) => {
    const book = books.find((b) => b.id === id);
    if (!book) return;
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`))
      return;
    try {
      await deleteCollectionItem("library_books", id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      toast.success("Book deleted");
    } catch {
      toast.error("Failed to delete book");
    }
  };

  const handleIssue = async (
    bookId: string,
    studentId: string,
    dueDate: string,
  ) => {
    const book = books.find((b) => b.id === bookId);
    if (!book || book.availableQty <= 0) {
      toast.error("Book is not available");
      return;
    }
    try {
      const issue: BookIssue = {
        id: generateId(),
        bookId,
        studentId,
        issueDate: todayStr(),
        dueDate,
        fine: 0,
        status: "issued",
      };
      await saveCollectionItem(
        "book_issues",
        issue as unknown as Record<string, unknown>,
      );
      const updatedBook: LibraryBook = {
        ...book,
        availableQty: book.availableQty - 1,
      };
      await updateCollectionItem(
        "library_books",
        bookId,
        updatedBook as unknown as Record<string, unknown>,
      );
      setIssues((prev) => [...prev, issue]);
      setBooks((prev) => prev.map((b) => (b.id === bookId ? updatedBook : b)));
      toast.success(`Book issued successfully. Due: ${dueDate}`);
    } catch {
      toast.error("Failed to issue book");
    }
  };

  const handleReturn = async (issueId: string, fine: number) => {
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;
    const book = books.find((b) => b.id === issue.bookId);
    try {
      const updated: BookIssue = {
        ...issue,
        returnDate: todayStr(),
        fine,
        status: "returned",
      };
      await updateCollectionItem(
        "book_issues",
        issueId,
        updated as unknown as Record<string, unknown>,
      );
      if (book) {
        const updatedBook: LibraryBook = {
          ...book,
          availableQty: book.availableQty + 1,
        };
        await updateCollectionItem(
          "library_books",
          book.id,
          updatedBook as unknown as Record<string, unknown>,
        );
        setBooks((prev) =>
          prev.map((b) => (b.id === book.id ? updatedBook : b)),
        );
      }
      setIssues((prev) => prev.map((i) => (i.id === issueId ? updated : i)));
      toast.success(
        fine > 0
          ? `Book returned. Fine collected: ₹${fine}`
          : "Book returned successfully",
      );
    } catch {
      toast.error("Failed to return book");
    }
  };

  const sendWhatsAppReminder = async (
    mobile: string,
    studentName: string,
    bookTitle: string,
    fine: number,
  ) => {
    const wa = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("shubh_erp_whatsapp_settings") ?? "{}",
        ) as { appKey?: string; authKey?: string };
      } catch {
        return {};
      }
    })();
    if (!wa.appKey || !wa.authKey) return false;
    const message = `Dear Parent of ${studentName}, the library book "${bookTitle}" is overdue. Fine: ₹${fine}. Please return immediately.`;
    try {
      await fetch(
        `https://wacoder.in/api/send?route=api&appkey=${wa.appKey}&authkey=${wa.authKey}&to=${mobile}&message=${encodeURIComponent(message)}`,
        { signal: AbortSignal.timeout(8000) },
      );
      return true;
    } catch {
      return false;
    }
  };

  const handleSendReminder = async (
    issue: BookIssue,
    student: Student | null,
  ) => {
    if (!student) {
      toast.error("Student not found");
      return;
    }
    const book = books.find((b) => b.id === issue.bookId);
    const fine = daysOverdue(issue.dueDate) * settings.finePerDay;
    const mobile = student.guardianMobile || student.mobile;
    const sent = await sendWhatsAppReminder(
      mobile,
      student.fullName,
      book?.title ?? "Library Book",
      fine,
    );
    if (sent) toast.success(`Reminder sent to ${student.fullName}'s guardian`);
    else
      toast.info(
        "WhatsApp credentials not configured. Go to Communication > WhatsApp to set them up.",
      );
  };

  const handleBulkRemind = async (
    list: { issue: BookIssue; student: Student | null }[],
  ) => {
    let sent = 0;
    for (const entry of list) {
      if (!entry.student) continue;
      const book = books.find((b) => b.id === entry.issue.bookId);
      const fine = daysOverdue(entry.issue.dueDate) * settings.finePerDay;
      const mobile = entry.student.guardianMobile || entry.student.mobile;
      const ok = await sendWhatsAppReminder(
        mobile,
        entry.student.fullName,
        book?.title ?? "Library Book",
        fine,
      );
      if (ok) sent++;
    }
    toast.success(`Reminders sent to ${sent}/${list.length} guardians`);
  };

  const handleImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.trim().split("\n");
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      let added = 0;
      const newBooks: LibraryBook[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] ?? "";
        });
        if (!row.title) continue;
        const book: LibraryBook = {
          id: generateId(),
          isbn: row.isbn ?? "",
          title: row.title,
          author: row.author ?? "",
          publisher: row.publisher || undefined,
          category: row.category ?? "Other",
          totalQty:
            Number.parseInt(row.totalqty ?? row["total qty"] ?? "1", 10) || 1,
          availableQty:
            Number.parseInt(
              row.availableqty ?? row["available qty"] ?? "1",
              10,
            ) || 1,
          location: row.location || undefined,
          addedAt: todayStr(),
        };
        try {
          await saveCollectionItem(
            "library_books",
            book as unknown as Record<string, unknown>,
          );
          newBooks.push(book);
          added++;
        } catch {
          // skip row
        }
      }
      setBooks((prev) => [...prev, ...newBooks]);
      toast.success(`Imported ${added} books`);
    };
    input.click();
  };

  // Expose ISBN scan callback for barcode tab → book form
  const openIsbnScanner = (cb: (isbn: string) => void) => {
    setScanIsbnCallback(() => cb);
    setActiveTab("scanner");
  };

  const handleIsbnDetectedInScanner = (isbn: string) => {
    if (scanIsbnCallback) {
      scanIsbnCallback(isbn);
      setScanIsbnCallback(null);
      setActiveTab("catalog");
    }
  };

  const quickIssueToTab = (bookId: string) => {
    setActiveTab("issue-return");
    const book = books.find((b) => b.id === bookId);
    if (book)
      toast.info(`Switch to Issue/Return tab and search for "${book.title}"`);
  };

  const quickReturnFromTab = (bookId: string) => {
    setActiveTab("issue-return");
    const book = books.find((b) => b.id === bookId);
    if (book)
      toast.info(
        `Switch to Issue/Return tab and search for "${book.title}" to return`,
      );
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Library
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage books, issue/return, overdue tracking with barcode scanning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void loadData()}
            title="Refresh"
            data-ocid="library.refresh_button"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            data-ocid="library.settings.open_modal_button"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 bg-muted/50 rounded-xl p-1 flex-wrap"
        role="tablist"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-ocid={`library.${tab.id}.tab`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center min-w-[100px] ${
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === "catalog"
                  ? "Books"
                  : tab.id === "issue-return"
                    ? "Issue"
                    : tab.id === "overdue"
                      ? "Overdue"
                      : "Scan"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div
          className="flex items-center justify-center py-16"
          data-ocid="library.loading_state"
        >
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
          <span className="text-muted-foreground">Loading library data…</span>
        </div>
      ) : error ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          data-ocid="library.error_state"
        >
          <AlertTriangle className="w-10 h-10 text-destructive/60 mb-3" />
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => void loadData()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <>
          {activeTab === "catalog" && (
            <BooksCatalogTab
              books={books}
              issues={issues}
              canWrite={canWrite}
              canDelete={canDelete}
              onAddBook={() => setShowAddBook(true)}
              onEditBook={(b) => setEditBook(b)}
              onDeleteBook={handleDeleteBook}
              onImportCSV={handleImportCSV}
            />
          )}
          {activeTab === "issue-return" && (
            <IssueReturnTab
              books={books}
              issues={issues}
              students={students}
              settings={settings}
              canWrite={canWrite}
              onIssue={handleIssue}
              onReturn={handleReturn}
            />
          )}
          {activeTab === "overdue" && (
            <OverdueTab
              books={books}
              issues={issues}
              students={students}
              settings={settings}
              onSendReminder={handleSendReminder}
              onBulkRemind={handleBulkRemind}
            />
          )}
          {activeTab === "scanner" && (
            <BarcodeScannerTab
              books={books}
              issues={issues}
              onQuickIssue={quickIssueToTab}
              onQuickReturn={quickReturnFromTab}
              onIsbnDetected={handleIsbnDetectedInScanner}
            />
          )}
        </>
      )}

      {/* Dialogs */}
      {showSettings && (
        <LibrarySettingsPanel
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showAddBook && (
        <BookFormDialog
          onSave={handleAddBook}
          onClose={() => setShowAddBook(false)}
          onScanISBN={openIsbnScanner}
        />
      )}
      {editBook && (
        <BookFormDialog
          book={editBook}
          onSave={handleEditBook}
          onClose={() => setEditBook(null)}
          onScanISBN={openIsbnScanner}
        />
      )}
    </div>
  );
}
