import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useApp } from "../context/AppContext";
import { formatCurrency, generateId } from "../utils/localStorage";

// ── Types ────────────────────────────────────────────────────
interface InvItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  storeLocation: string;
  sessionId?: string;
}

interface InvCategory {
  id: string;
  name: string;
  description: string;
}

type Tab = "items" | "categories" | "report";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "items", label: "Items", icon: "📦" },
  { id: "categories", label: "Categories", icon: "🗂️" },
  { id: "report", label: "Stock Report", icon: "📊" },
];

const LOW_STOCK = 5;
const DEFAULT_CATEGORIES = [
  "Uniform",
  "Tie",
  "Belt",
  "Shoes",
  "Books",
  "Stationery",
  "Sports",
  "Other",
];

function exportCSV(rows: string[][], filename: string) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

const EMPTY_ITEM: Omit<InvItem, "id"> = {
  name: "",
  category: "",
  unit: "Pcs",
  costPrice: 0,
  sellingPrice: 0,
  currentStock: 0,
  storeLocation: "",
};
const EMPTY_CAT: Omit<InvCategory, "id"> = { name: "", description: "" };

// ── Modal extracted OUTSIDE the main component ───────────────────────────────
// CRITICAL: If Modal were defined inside Inventory(), React would see a brand-new
// component type on every parent render, causing the modal to unmount+remount
// and lose input focus on every keystroke.
function InvModal({
  title,
  onClose,
  children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-elevated animate-slide-up">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Close"
          >
            ×
          </button>
        </CardHeader>
        <CardContent className="space-y-3">{children}</CardContent>
      </Card>
    </div>
  );
}

export default function Inventory() {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    addNotification,
    isReadOnly,
    currentSession,
  } = useApp();
  const sessionId = currentSession?.id ?? "sess_2025";
  const [tab, setTab] = useState<Tab>("items");

  const [items, setItems] = useState<InvItem[]>([]);
  const [categories, setCategories] = useState<InvCategory[]>([]);

  useEffect(() => {
    const raw = getData("inventory_items") as InvItem[];
    setItems(raw);
    const cats = getData("inv_categories") as InvCategory[];
    if (cats.length > 0) {
      setCategories(cats);
    } else {
      setCategories(
        DEFAULT_CATEGORIES.map((name) => ({
          id: generateId(),
          name,
          description: "",
        })),
      );
    }
  }, [getData]);

  // ── Items ─────────────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);

  const openAddItem = useCallback(() => {
    setItemForm((prev) => ({ ...EMPTY_ITEM, category: prev.category || "" }));
    setEditItemId(null);
    setShowItemModal(true);
  }, []);

  const openEditItem = useCallback((item: InvItem) => {
    setItemForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      currentStock: item.currentStock,
      storeLocation: item.storeLocation,
    });
    setEditItemId(item.id);
    setShowItemModal(true);
  }, []);

  // ── Stable per-field setters — CRITICAL: these must be useCallback with []
  // so their references never change, which would cause Input to remount mid-type.
  const handleItemNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setItemForm((p) => ({ ...p, name: e.target.value })),
    [],
  );
  const handleItemCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      setItemForm((p) => ({ ...p, category: e.target.value })),
    [],
  );
  const handleItemUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setItemForm((p) => ({ ...p, unit: e.target.value })),
    [],
  );
  const handleItemCostChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setItemForm((p) => ({
        ...p,
        costPrice:
          Number(
            e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
          ) || 0,
      })),
    [],
  );
  const handleItemSellChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setItemForm((p) => ({
        ...p,
        sellingPrice:
          Number(
            e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
          ) || 0,
      })),
    [],
  );
  const handleItemStockChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setItemForm((p) => ({
        ...p,
        currentStock: Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
      })),
    [],
  );
  const handleItemLocationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setItemForm((p) => ({ ...p, storeLocation: e.target.value })),
    [],
  );

  const handleSaveItem = useCallback(async () => {
    if (!itemForm.name.trim()) return;
    if (editItemId) {
      const updated: InvItem = { id: editItemId, ...itemForm, sessionId };
      await updateData(
        "inventory_items",
        editItemId,
        updated as unknown as Record<string, unknown>,
      );
      setItems((prev) => prev.map((i) => (i.id === editItemId ? updated : i)));
      addNotification(`"${itemForm.name}" updated`, "success", "📦");
    } else {
      const newItem: InvItem = { id: generateId(), ...itemForm, sessionId };
      await saveData(
        "inventory_items",
        newItem as unknown as Record<string, unknown>,
      );
      setItems((prev) => [...prev, newItem]);
      addNotification(`"${itemForm.name}" added`, "success", "📦");
    }
    setShowItemModal(false);
    setEditItemId(null);
  }, [itemForm, editItemId, sessionId, saveData, updateData, addNotification]);

  const handleDeleteItem = useCallback(
    async (id: string) => {
      await deleteData("inventory_items", id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      addNotification("Item deleted", "info");
    },
    [deleteData, addNotification],
  );

  // ── Stock In / Out ─────────────────────────────────────────
  const [stockItemId, setStockItemId] = useState<string | null>(null);
  const [stockAction, setStockAction] = useState<"in" | "out">("in");
  const [stockQty, setStockQty] = useState(1);
  const [stockNote, setStockNote] = useState("");
  const [stockError, setStockError] = useState("");

  const openStockModal = useCallback((item: InvItem, action: "in" | "out") => {
    setStockItemId(item.id);
    setStockAction(action);
    setStockQty(1);
    setStockNote("");
    setStockError("");
  }, []);

  const handleStockQtyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setStockError("");
      setStockQty(Number(e.target.value.replace(/[^0-9]/g, "")) || 0);
    },
    [],
  );
  const handleStockNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setStockNote(e.target.value),
    [],
  );

  const handleStockUpdate = useCallback(async () => {
    if (!stockItemId || stockQty <= 0) return;
    const item = items.find((i) => i.id === stockItemId);
    if (!item) return;
    if (stockAction === "out" && stockQty > item.currentStock) {
      setStockError(
        `Insufficient stock. Available: ${item.currentStock} ${item.unit}`,
      );
      return;
    }
    const newStock =
      stockAction === "in"
        ? item.currentStock + stockQty
        : item.currentStock - stockQty;
    const updated: InvItem = { ...item, currentStock: newStock };
    await updateData(
      "inventory_items",
      item.id,
      updated as unknown as Record<string, unknown>,
    );
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    addNotification(
      `${stockAction === "in" ? "Added" : "Issued"} ${stockQty} × ${item.name}`,
      "success",
    );
    if (stockAction === "out" && newStock < LOW_STOCK) {
      addNotification(
        `⚠️ Low stock: ${item.name} — only ${newStock} left`,
        "warning",
      );
    }
    setStockItemId(null);
  }, [stockItemId, stockAction, stockQty, items, updateData, addNotification]);

  // ── Categories ────────────────────────────────────────────
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState(EMPTY_CAT);

  const openAddCat = useCallback(() => {
    setCatForm(EMPTY_CAT);
    setEditCatId(null);
    setShowCatModal(true);
  }, []);

  const openEditCat = useCallback((c: InvCategory) => {
    setCatForm({ name: c.name, description: c.description });
    setEditCatId(c.id);
    setShowCatModal(true);
  }, []);

  const handleCatNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setCatForm((p) => ({ ...p, name: e.target.value })),
    [],
  );
  const handleCatDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setCatForm((p) => ({ ...p, description: e.target.value })),
    [],
  );

  const handleSaveCat = useCallback(async () => {
    if (!catForm.name.trim()) return;
    if (editCatId) {
      await updateData("inv_categories", editCatId, {
        id: editCatId,
        ...catForm,
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editCatId ? { id: editCatId, ...catForm } : c,
        ),
      );
    } else {
      const newCat: InvCategory = { id: generateId(), ...catForm };
      await saveData(
        "inv_categories",
        newCat as unknown as Record<string, unknown>,
      );
      setCategories((prev) => [...prev, newCat]);
    }
    setShowCatModal(false);
    setEditCatId(null);
  }, [catForm, editCatId, saveData, updateData]);

  const handleDeleteCat = useCallback(
    async (id: string) => {
      await deleteData("inv_categories", id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    },
    [deleteData],
  );

  // ── Derived ───────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const ms =
        !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase());
      const mc = !catFilter || i.category === catFilter;
      return ms && mc;
    });
  }, [items, itemSearch, catFilter]);

  const totalStockValue = useMemo(
    () => items.reduce((a, i) => a + i.currentStock * i.costPrice, 0),
    [items],
  );
  const lowCount = useMemo(
    () => items.filter((i) => i.currentStock < LOW_STOCK).length,
    [items],
  );
  const stockItem = items.find((i) => i.id === stockItemId);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {items.length}
            </div>
            <div className="text-xs text-muted-foreground">Total Items</div>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="py-3 text-center">
            <div className="text-sm font-bold text-accent">
              {formatCurrency(totalStockValue)}
            </div>
            <div className="text-xs text-muted-foreground">Stock Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-foreground">
              {categories.length}
            </div>
            <div className="text-xs text-muted-foreground">Categories</div>
          </CardContent>
        </Card>
        <Card
          className={
            lowCount > 0
              ? "bg-destructive/5 border-destructive/20"
              : "bg-muted/30"
          }
        >
          <CardContent className="py-3 text-center">
            <div
              className={`text-2xl font-bold ${lowCount > 0 ? "text-destructive" : "text-foreground"}`}
            >
              {lowCount}
            </div>
            <div className="text-xs text-muted-foreground">Low Stock</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            data-ocid={`inventory.${t.id}_tab`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ITEMS TAB ── */}
      {tab === "items" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items..."
                className="w-44"
                data-ocid="inventory.search_input"
              />
              <select
                className="border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                data-ocid="inventory.category_select"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {!isReadOnly && (
              <Button
                onClick={openAddItem}
                data-ocid="inventory.add_item_button"
              >
                + Add Item
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Item Name",
                    "Category",
                    "Unit",
                    "Cost Price",
                    "Sell Price",
                    "Stock",
                    "Location",
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
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-muted-foreground"
                      data-ocid="inventory.items_empty_state"
                    >
                      <div className="text-4xl mb-2">📦</div>
                      <div className="font-medium">No items found</div>
                      <div className="text-xs mt-1">
                        Add inventory items to get started
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isLow = item.currentStock < LOW_STOCK;
                    return (
                      <tr
                        key={item.id}
                        className={`border-t border-border hover:bg-muted/30 transition-colors ${isLow ? "bg-destructive/5" : ""}`}
                        data-ocid={`inventory.item.${idx + 1}`}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {item.name}
                          {isLow && (
                            <Badge
                              variant="destructive"
                              className="ml-2 text-xs"
                            >
                              Low Stock
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{item.category}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.unit}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatCurrency(item.costPrice)}
                        </td>
                        <td className="px-4 py-3 font-medium text-accent">
                          {formatCurrency(item.sellingPrice)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={isLow ? "destructive" : "outline"}>
                            {item.currentStock} {item.unit}
                            {isLow ? " ⚠️" : ""}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {item.storeLocation || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {!isReadOnly && (
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openStockModal(item, "in")}
                                data-ocid={`inventory.stock_in_button.${idx + 1}`}
                              >
                                + Stock
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openStockModal(item, "out")}
                                data-ocid={`inventory.stock_out_button.${idx + 1}`}
                              >
                                Issue
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditItem(item)}
                                data-ocid={`inventory.edit_button.${idx + 1}`}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id)}
                                data-ocid={`inventory.delete_button.${idx + 1}`}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot className="bg-muted/40">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-right font-semibold text-foreground"
                    >
                      Total Stock Value:
                    </td>
                    <td
                      colSpan={3}
                      className="px-4 py-3 font-bold text-primary"
                    >
                      {formatCurrency(
                        filteredItems.reduce(
                          (a, i) => a + i.currentStock * i.costPrice,
                          0,
                        ),
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── CATEGORIES TAB ── */}
      {tab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Categories
            </h2>
            {!isReadOnly && (
              <Button onClick={openAddCat} data-ocid="inventory.add_cat_button">
                + Add Category
              </Button>
            )}
          </div>
          {categories.length === 0 ? (
            <Card data-ocid="inventory.categories_empty_state">
              <CardContent className="py-12 text-center text-muted-foreground">
                No categories yet.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "Category Name",
                      "Description",
                      "Item Count",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-semibold text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, idx) => (
                    <tr
                      key={cat.id}
                      className="border-t border-border hover:bg-muted/30"
                      data-ocid={`inventory.category.${idx + 1}`}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {cat.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {cat.description || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {items.filter((i) => i.category === cat.name).length}{" "}
                          items
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {!isReadOnly && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditCat(cat)}
                              data-ocid={`inventory.edit_cat_button.${idx + 1}`}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCat(cat.id)}
                              data-ocid={`inventory.delete_cat_button.${idx + 1}`}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STOCK REPORT TAB ── */}
      {tab === "report" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Stock Report
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rows: string[][] = [
                  [
                    "Item",
                    "Category",
                    "Unit",
                    "Cost Price",
                    "Sell Price",
                    "Stock",
                    "Location",
                    "Value",
                  ],
                ];
                for (const i of items)
                  rows.push([
                    i.name,
                    i.category,
                    i.unit,
                    String(i.costPrice),
                    String(i.sellingPrice),
                    String(i.currentStock),
                    i.storeLocation,
                    String(i.currentStock * i.costPrice),
                  ]);
                exportCSV(
                  rows,
                  `stock_report_${new Date().toISOString().split("T")[0]}.csv`,
                );
              }}
              data-ocid="inventory.export_report_button"
            >
              Export CSV
            </Button>
          </div>

          {lowCount > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-3">
                <p className="text-sm font-semibold text-destructive">
                  ⚠️ {lowCount} item(s) have low stock (below {LOW_STOCK} units)
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {items
                    .filter((i) => i.currentStock < LOW_STOCK)
                    .map((i) => (
                      <Badge
                        key={i.id}
                        variant="destructive"
                        className="text-xs"
                      >
                        {i.name}: {i.currentStock} {i.unit}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Item Name",
                    "Category",
                    "Unit",
                    "Cost Price",
                    "Sell Price",
                    "Stock",
                    "Status",
                    "Value",
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
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-muted-foreground"
                      data-ocid="inventory.report_empty_state"
                    >
                      <div className="text-4xl mb-2">📊</div>No inventory items
                      to report.
                    </td>
                  </tr>
                ) : (
                  [...items]
                    .sort((a, b) => a.currentStock - b.currentStock)
                    .map((item, idx) => {
                      const isLow = item.currentStock < LOW_STOCK;
                      return (
                        <tr
                          key={item.id}
                          className={`border-t border-border hover:bg-muted/30 ${isLow ? "bg-destructive/5" : ""}`}
                          data-ocid={`inventory.report_item.${idx + 1}`}
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {item.name}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{item.category}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3">
                            {formatCurrency(item.costPrice)}
                          </td>
                          <td className="px-4 py-3 text-accent">
                            {formatCurrency(item.sellingPrice)}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            {item.currentStock}
                          </td>
                          <td className="px-4 py-3">
                            {isLow ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-green-700"
                              >
                                OK
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-primary">
                            {formatCurrency(item.currentStock * item.costPrice)}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-muted/40">
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-3 text-right font-semibold text-foreground"
                    >
                      Total Inventory Value:
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {formatCurrency(totalStockValue)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <InvModal
          title={editItemId ? "Edit Item" : "Add Item"}
          onClose={() => {
            setShowItemModal(false);
            setEditItemId(null);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Item Name *</Label>
              <Input
                value={itemForm.name}
                onChange={handleItemNameChange}
                placeholder="e.g. School Dress"
                data-ocid="inventory.item_name_input"
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={itemForm.category}
                onChange={handleItemCategoryChange}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Unit</Label>
              <Input
                value={itemForm.unit}
                onChange={handleItemUnitChange}
                placeholder="Pcs / Pair / Set"
              />
            </div>
            <div>
              <Label>Cost Price (₹)</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={itemForm.costPrice || ""}
                onChange={handleItemCostChange}
                placeholder="0"
                data-ocid="inventory.item_cost_input"
              />
            </div>
            <div>
              <Label>Selling Price (₹)</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={itemForm.sellingPrice || ""}
                onChange={handleItemSellChange}
                placeholder="0"
                data-ocid="inventory.item_sell_input"
              />
            </div>
            <div>
              <Label>Opening Stock</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={itemForm.currentStock || ""}
                onChange={handleItemStockChange}
                placeholder="0"
                data-ocid="inventory.item_stock_input"
              />
            </div>
            <div>
              <Label>Store Location</Label>
              <Input
                value={itemForm.storeLocation}
                onChange={handleItemLocationChange}
                placeholder="e.g. Room 2 Shelf A"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSaveItem}
              data-ocid="inventory.item_save_button"
            >
              Save Item
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowItemModal(false);
                setEditItemId(null);
              }}
              data-ocid="inventory.item_cancel_button"
            >
              Cancel
            </Button>
          </div>
        </InvModal>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <InvModal
          title={editCatId ? "Edit Category" : "Add Category"}
          onClose={() => {
            setShowCatModal(false);
            setEditCatId(null);
          }}
        >
          <div>
            <Label>Category Name *</Label>
            <Input
              value={catForm.name}
              onChange={handleCatNameChange}
              placeholder="e.g. Uniform"
              data-ocid="inventory.cat_name_input"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={catForm.description}
              onChange={handleCatDescriptionChange}
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSaveCat}
              data-ocid="inventory.cat_save_button"
            >
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCatModal(false);
                setEditCatId(null);
              }}
              data-ocid="inventory.cat_cancel_button"
            >
              Cancel
            </Button>
          </div>
        </InvModal>
      )}

      {/* Stock Modal */}
      {stockItemId && (
        <InvModal
          title={stockAction === "in" ? "📥 Add Stock" : "📤 Issue Stock"}
          onClose={() => {
            setStockItemId(null);
            setStockError("");
          }}
        >
          {stockError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              ⚠️ {stockError}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Item: <strong className="text-foreground">{stockItem?.name}</strong>{" "}
            · Current:{" "}
            <strong>
              {stockItem?.currentStock} {stockItem?.unit}
            </strong>
          </p>
          <div>
            <Label>Quantity *</Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={stockQty || ""}
              onChange={handleStockQtyChange}
              data-ocid="inventory.stock_qty_input"
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input
              value={stockNote}
              onChange={handleStockNoteChange}
              placeholder={
                stockAction === "in" ? "Supplier, etc." : "Student / buyer"
              }
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleStockUpdate}
              data-ocid="inventory.stock_save_button"
            >
              {stockAction === "in" ? "Add Stock" : "Issue Stock"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStockItemId(null);
                setStockError("");
              }}
              data-ocid="inventory.stock_cancel_button"
            >
              Cancel
            </Button>
          </div>
        </InvModal>
      )}
    </div>
  );
}
