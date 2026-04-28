/**
 * SHUBH SCHOOL ERP — Library Module
 * All data via apiCall(). No offline sync. No spinners on qty fields.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiCall } from "../utils/api";

// ── Types ──────────────────────────────────────────────────────

interface Book {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  category: string;
  total_copies: number;
  available_copies: number;
}

interface IssuedBook {
  id: string;
  book_id: string;
  book_title?: string;
  student_id: string;
  student_name?: string;
  issue_date: string;
  due_date: string;
  return_date?: string;
  status: "issued" | "returned";
}

type TabId = "catalog" | "issue" | "returns" | "report";

const TABS: { id: TabId; label: string }[] = [
  { id: "catalog", label: "Books" },
  { id: "issue", label: "Issue Book" },
  { id: "returns", label: "Returns" },
  { id: "report", label: "Stock Report" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}
function daysOverdue(due: string): number {
  const diff = Math.floor((Date.now() - new Date(due).getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

// ── Book Form ──────────────────────────────────────────────────

interface BookFormProps {
  book?: Book;
  onSave: () => void;
  onClose: () => void;
}
function BookForm({ book, onSave, onClose }: BookFormProps) {
  const [isbn, setIsbn] = useState(book?.isbn ?? "");
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [category, setCategory] = useState(book?.category ?? "Textbook");
  const [totalCopies, setTotalCopies] = useState(
    String(book?.total_copies ?? 1),
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !author.trim()) {
      toast.error("Title and author required");
      return;
    }
    setSaving(true);
    try {
      await apiCall("library/book-add", "POST", {
        id: book?.id,
        isbn: isbn.trim(),
        title: title.trim(),
        author: author.trim(),
        category,
        total_copies: Number(totalCopies) || 1,
      });
      toast.success(book ? "Book updated" : "Book added");
      onSave();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-elevated animate-slide-up">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">
            {book ? "Edit Book" : "Add Book"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl w-8 h-8 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Label>ISBN</Label>
            <Input
              className="mt-1"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="ISBN"
              data-ocid="library.book.isbn_input"
            />
          </div>
          <div>
            <Label>Title *</Label>
            <Input
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book title"
              data-ocid="library.book.title_input"
            />
          </div>
          <div>
            <Label>Author *</Label>
            <Input
              className="mt-1"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author"
              data-ocid="library.book.author_input"
            />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {[
                "Textbook",
                "Fiction",
                "Non-Fiction",
                "Science",
                "Mathematics",
                "History",
                "Reference",
                "Other",
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Total Copies</Label>
            <Input
              type="text"
              inputMode="numeric"
              className="mt-1"
              value={totalCopies}
              onChange={(e) =>
                setTotalCopies(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="1"
              data-ocid="library.book.total_copies_input"
            />
          </div>
          <div className="flex gap-2 pt-1">
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
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────

export default function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [issues, setIssues] = useState<IssuedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("catalog");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editBook, setEditBook] = useState<Book | undefined>();

  // Issue form
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [bookId, setBookId] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [issuing, setIssuing] = useState(false);

  // Return form
  const [returnSearch, setReturnSearch] = useState("");
  const [returnIssue, setReturnIssue] = useState<IssuedBook | null>(null);
  const [returning, setReturning] = useState(false);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall<{ data: Book[] }>("library/books");
      setBooks((res as { data: Book[] }).data ?? []);
    } catch {
      toast.error("Failed to load books");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIssues = useCallback(async () => {
    try {
      const res = await apiCall<{ data: IssuedBook[] }>("library/issues");
      setIssues((res as { data: IssuedBook[] }).data ?? []);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);
  useEffect(() => {
    if (activeTab === "returns" || activeTab === "report") void loadIssues();
  }, [activeTab, loadIssues]);

  const filtered = useMemo(
    () =>
      books.filter(
        (b) =>
          !search ||
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.author.toLowerCase().includes(search.toLowerCase()),
      ),
    [books, search],
  );

  async function handleIssue() {
    if (!studentId) {
      toast.error("Enter a student ID");
      return;
    }
    if (!bookId) {
      toast.error("Select a book");
      return;
    }
    setIssuing(true);
    try {
      await apiCall("library/issue", "POST", {
        book_id: bookId,
        student_id: studentId,
        due_date: dueDate,
        issue_date: todayStr(),
      });
      toast.success("Book issued successfully");
      setStudentSearch("");
      setStudentId("");
      setBookSearch("");
      setBookId("");
      setDueDate(defaultDueDate());
      await loadBooks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to issue");
    } finally {
      setIssuing(false);
    }
  }

  async function handleReturn(issue: IssuedBook) {
    setReturning(true);
    try {
      await apiCall("library/return", "POST", {
        issue_id: issue.id,
        return_date: todayStr(),
      });
      toast.success("Book returned successfully");
      setReturnIssue(null);
      setReturnSearch("");
      await loadBooks();
      await loadIssues();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to return");
    } finally {
      setReturning(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this book?")) return;
    try {
      await apiCall("library/book-delete", "POST", { id });
      toast.success("Book deleted");
      await loadBooks();
    } catch {
      toast.error("Failed to delete");
    }
  }

  const totalBooks = books.reduce((s, b) => s + b.total_copies, 0);
  const totalIssued = issues.filter((i) => i.status === "issued").length;
  const overdue = issues.filter(
    (i) => i.status === "issued" && daysOverdue(i.due_date) > 0,
  );

  const matchedReturns = issues.filter(
    (i) =>
      i.status === "issued" &&
      returnSearch &&
      (i.book_title?.toLowerCase().includes(returnSearch.toLowerCase()) ||
        i.student_name?.toLowerCase().includes(returnSearch.toLowerCase())),
  );

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Library
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {totalBooks} books · {totalIssued} issued
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Books", value: books.length, color: "text-primary" },
          { label: "Issued", value: totalIssued, color: "text-warning" },
          {
            label: "Available",
            value: books.reduce((s, b) => s + b.available_copies, 0),
            color: "text-foreground",
          },
          {
            label: "Overdue",
            value: overdue.length,
            color: "text-destructive",
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

      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            data-ocid={`library.${t.id}_tab`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Books Catalog */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Search title, author…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-ocid="library.catalog.search_input"
              />
            </div>
            <Button
              onClick={() => {
                setEditBook(undefined);
                setShowForm(true);
              }}
              data-ocid="library.catalog.add_book_button"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Add Book
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="library.catalog.empty_state"
            >
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">
                {search ? "No books match your search." : "No books yet."}
              </p>
              {!search && (
                <Button className="mt-4" onClick={() => setShowForm(true)}>
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
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">
                      Category
                    </th>
                    <th className="text-right px-3 py-2.5 text-muted-foreground font-medium">
                      Total
                    </th>
                    <th className="text-right px-3 py-2.5 text-muted-foreground font-medium">
                      Avail.
                    </th>
                    <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, idx) => (
                    <tr
                      key={b.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 ${b.available_copies === 0 ? "bg-destructive/5" : ""}`}
                      data-ocid={`library.catalog.item.${idx + 1}`}
                    >
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        <span
                          className="truncate max-w-[160px] block"
                          title={b.title}
                        >
                          {b.title}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                        {b.author}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="secondary" className="text-xs">
                          {b.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {b.total_copies}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right tabular-nums font-medium ${b.available_copies === 0 ? "text-destructive" : "text-foreground"}`}
                      >
                        {b.available_copies}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditBook(b);
                              setShowForm(true);
                            }}
                            data-ocid={`library.catalog.edit_button.${idx + 1}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => void handleDelete(b.id)}
                            data-ocid={`library.catalog.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Issue Book */}
      {activeTab === "issue" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Issue Book
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Student ID / Adm. No.</Label>
              <Input
                className="mt-1"
                placeholder="Enter student ID"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentId(e.target.value);
                }}
                data-ocid="library.issue.student_search_input"
              />
            </div>
            <div>
              <Label>Book</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 mt-1"
                  placeholder="Search book title…"
                  value={bookSearch}
                  onChange={(e) => {
                    setBookSearch(e.target.value);
                    const found = books.find((b) =>
                      b.title
                        .toLowerCase()
                        .includes(e.target.value.toLowerCase()),
                    );
                    if (found) setBookId(found.id);
                    else setBookId("");
                  }}
                  data-ocid="library.issue.book_search_input"
                />
              </div>
              {bookSearch && (
                <div className="border border-border rounded-lg mt-1 max-h-40 overflow-y-auto">
                  {books
                    .filter(
                      (b) =>
                        b.title
                          .toLowerCase()
                          .includes(bookSearch.toLowerCase()) &&
                        b.available_copies > 0,
                    )
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between"
                        onClick={() => {
                          setBookSearch(b.title);
                          setBookId(b.id);
                        }}
                      >
                        <span>{b.title}</span>
                        <span className="text-muted-foreground text-xs">
                          {b.available_copies} avail.
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                className="mt-1"
                value={dueDate}
                min={todayStr()}
                onChange={(e) => setDueDate(e.target.value)}
                data-ocid="library.issue.due_date_input"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleIssue}
              disabled={issuing || !studentId || !bookId}
              data-ocid="library.issue.submit_button"
            >
              {issuing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <BookOpen className="w-4 h-4 mr-2" />
              )}
              Issue Book
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Returns */}
      {activeTab === "returns" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Search issued book or student…"
              value={returnSearch}
              onChange={(e) => setReturnSearch(e.target.value)}
              data-ocid="library.return.book_search_input"
            />
          </div>
          {returnSearch && matchedReturns.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              {matchedReturns.map((issue, idx) => {
                const od = daysOverdue(issue.due_date);
                return (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20"
                    data-ocid={`library.return.item.${idx + 1}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{issue.book_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {issue.student_name} · Due: {issue.due_date}
                        {od > 0 && (
                          <span className="text-destructive ml-1">
                            ({od} days overdue)
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={od > 0 ? "destructive" : "default"}
                      onClick={() => {
                        setReturnIssue(issue);
                        void handleReturn(issue);
                      }}
                      disabled={returning}
                      data-ocid={`library.return.submit_button.${idx + 1}`}
                    >
                      {returning && returnIssue?.id === issue.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <RotateCcw className="w-4 h-4 mr-1" />
                      )}
                      Return
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {returnSearch && matchedReturns.length === 0 && (
            <div
              className="text-center py-10 text-muted-foreground"
              data-ocid="library.return.empty_state"
            >
              No matching issued books found.
            </div>
          )}
          {!returnSearch && (
            <div className="text-center py-10 text-muted-foreground">
              Search for a student name or book title above.
            </div>
          )}
        </div>
      )}

      {/* Stock Report */}
      {activeTab === "report" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Books", value: books.length },
              { label: "Issued", value: totalIssued },
              {
                label: "Available",
                value: books.reduce((s, b) => s + b.available_copies, 0),
              },
              { label: "Overdue", value: overdue.length },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold font-display">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {overdue.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Overdue Books
              </h3>
              <div className="space-y-2">
                {overdue.map((i, idx) => (
                  <div
                    key={i.id}
                    className="bg-destructive/5 border border-destructive/30 rounded-lg p-3 flex items-center justify-between"
                    data-ocid={`library.report.overdue.item.${idx + 1}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{i.book_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.student_name} · Due: {i.due_date}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {daysOverdue(i.due_date)} days
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          {overdue.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-10 bg-muted/30 rounded-xl"
              data-ocid="library.report.empty_state"
            >
              <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-sm font-medium">
                No overdue books — all on time!
              </p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const rows = [
                ["Title", "Author", "Category", "Total", "Available"],
                ...books.map((b) => [
                  b.title,
                  b.author,
                  b.category,
                  String(b.total_copies),
                  String(b.available_copies),
                ]),
              ];
              const csv = rows
                .map((r) => r.map((c) => `"${c}"`).join(","))
                .join("\n");
              const a = document.createElement("a");
              a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
              a.download = "library_report.csv";
              a.click();
            }}
            data-ocid="library.report.export_button"
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>
      )}

      {/* History panel always visible in issue tab */}
      {(activeTab === "issue" || activeTab === "returns") &&
        issues.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {issues.slice(0, 10).map((i, idx) => (
                  <div
                    key={i.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm"
                    data-ocid={`library.recent.item.${idx + 1}`}
                  >
                    <Badge
                      variant={
                        i.status === "returned"
                          ? "secondary"
                          : daysOverdue(i.due_date) > 0
                            ? "destructive"
                            : "default"
                      }
                      className="text-xs flex-shrink-0"
                    >
                      {i.status === "returned"
                        ? "Returned"
                        : daysOverdue(i.due_date) > 0
                          ? "Overdue"
                          : "Issued"}
                    </Badge>
                    <span className="font-medium truncate flex-1">
                      {i.book_title ?? "Unknown"}
                    </span>
                    <span className="text-muted-foreground truncate hidden sm:block">
                      {i.student_name ?? "—"}
                    </span>
                    <span className="text-muted-foreground text-xs flex-shrink-0">
                      {i.issue_date}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {showForm && (
        <BookForm
          book={editBook}
          onSave={() => void loadBooks()}
          onClose={() => {
            setShowForm(false);
            setEditBook(undefined);
          }}
        />
      )}
    </div>
  );
}
