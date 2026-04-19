import { useCallback, useEffect, useState } from "react";
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

// ── Types ───────────────────────────────────────────────────
interface InvItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  unit: string;
  sessionId?: string;
}

interface InvCategory {
  id: string;
  name: string;
}

type Tab = "items" | "categories" | "report";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "items", label: "Items", icon: "📦" },
  { id: "categories", label: "Categories", icon: "🗂️" },
  { id: "report", label: "Stock Report", icon: "📊" },
];

const LOW_STOCK = 5;
const today = new Date().toISOString().split("T")[0];

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

// ── Component ───────────────────────────────────────────────
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

  // ── Data from context ─────────────────────────────────────
  const [items, setItems] = useState<InvItem[]>([]);
  const [categories, setCategories] = useState<InvCategory[]>([]);

  useEffect(() => {
    setItems(getData("inventory") as InvItem[]);
  }, [getData]);

  useEffect(() => {
    const raw = getData("inv_categories") as InvCategory[];
    if (raw.length > 0) {
      setCategories(raw);
    } else {
      // Seed defaults if empty
      const defaults: InvCategory[] = [
        "Uniform",
        "Tie",
        "Belt",
        "Books",
        "Stationery",
        "Sports",
        "Other",
      ].map((name) => ({ id: generateId(), name }));
      setCategories(defaults);
    }
  }, [getData]);

  // ── Items ─────────────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "",
    stock: 0,
    price: 0,
    unit: "Pcs",
  });

  const openAddItem = () => {
    setItemForm({
      name: "",
      category: categories[0]?.name ?? "",
      stock: 0,
      price: 0,
      unit: "Pcs",
    });
    setEditItemId(null);
    setShowItemModal(true);
  };

  const openEditItem = (item: InvItem) => {
    setItemForm({
      name: item.name,
      category: item.category,
      stock: item.stock,
      price: item.price,
      unit: item.unit,
    });
    setEditItemId(item.id);
    setShowItemModal(true);
  };

  const handleSaveItem = useCallback(async () => {
    if (!itemForm.name.trim()) return;
    if (editItemId) {
      const updated: InvItem = { id: editItemId, ...itemForm, sessionId };
      await updateData(
        "inventory",
        editItemId,
        updated as unknown as Record<string, unknown>,
      );
      setItems((prev) => prev.map((i) => (i.id === editItemId ? updated : i)));
      addNotification(`"${itemForm.name}" updated`, "success", "📦");
    } else {
      const newItem: InvItem = { id: generateId(), ...itemForm, sessionId };
      await saveData(
        "inventory",
        newItem as unknown as Record<string, unknown>,
      );
      setItems((prev) => [...prev, newItem]);
      addNotification(`"${itemForm.name}" added to inventory`, "success", "📦");
    }
    setShowItemModal(false);
    setEditItemId(null);
  }, [itemForm, editItemId, sessionId, saveData, updateData, addNotification]);

  const handleDeleteItem = useCallback(
    async (id: string) => {
      await deleteData("inventory", id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      addNotification("Item deleted", "info", "📦");
    },
    [deleteData, addNotification],
  );

  // ── Add / Sell stock ──────────────────────────────────────
  const [stockItemId, setStockItemId] = useState<string | null>(null);
  const [stockAction, setStockAction] = useState<"add" | "sell">("add");
  const [stockQty, setStockQty] = useState(1);
  const [stockNote, setStockNote] = useState("");
  const [stockError, setStockError] = useState("");

  const openStockModal = (item: InvItem, action: "add" | "sell") => {
    setStockItemId(item.id);
    setStockAction(action);
    setStockQty(1);
    setStockNote("");
    setStockError("");
  };

  const handleStockUpdate = useCallback(async () => {
    if (!stockItemId || stockQty <= 0) return;
    const item = items.find((i) => i.id === stockItemId);
    if (!item) return;
    if (stockAction === "sell" && stockQty > item.stock) {
      setStockError(
        `Insufficient stock! Available: ${item.stock} ${item.unit}`,
      );
      return;
    }
    const newStock =
      stockAction === "add" ? item.stock + stockQty : item.stock - stockQty;
    const updated: InvItem = { ...item, stock: newStock };
    await updateData(
      "inventory",
      item.id,
      updated as unknown as Record<string, unknown>,
    );
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    addNotification(
      `${stockAction === "add" ? "Added" : "Issued"} ${stockQty} × ${item.name}`,
      "success",
      stockAction === "add" ? "📥" : "📤",
    );
    if (stockAction === "sell" && newStock < LOW_STOCK) {
      addNotification(
        `⚠️ Low stock: ${item.name} — only ${newStock} left`,
        "warning",
        "⚠️",
      );
    }
    setStockItemId(null);
    setStockQty(1);
    setStockNote("");
  }, [stockItemId, stockAction, stockQty, items, updateData, addNotification]);

  // ── Categories ────────────────────────────────────────────
  const [catForm, setCatForm] = useState("");
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const handleAddCategory = useCallback(async () => {
    const name = catForm.trim();
    if (!name || categories.some((c) => c.name === name)) return;
    const newCat: InvCategory = { id: generateId(), name };
    await saveData(
      "inv_categories",
      newCat as unknown as Record<string, unknown>,
    );
    setCategories((prev) => [...prev, newCat]);
    setCatForm("");
  }, [catForm, categories, saveData]);

  const handleUpdateCategory = useCallback(async () => {
    if (!editCatId || !editCatName.trim()) return;
    await updateData("inv_categories", editCatId, {
      id: editCatId,
      name: editCatName.trim(),
    });
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editCatId ? { ...c, name: editCatName.trim() } : c,
      ),
    );
    setEditCatId(null);
    setEditCatName("");
  }, [editCatId, editCatName, updateData]);

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      await deleteData("inv_categories", id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    },
    [deleteData],
  );

  // ── Derived ───────────────────────────────────────────────
  const filteredItems = items.filter((i) => {
    const ms =
      !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase());
    const mc = !catFilter || i.category === catFilter;
    return ms && mc;
  });

  const totalStockValue = items.reduce((a, i) => a + i.stock * i.price, 0);
  const lowCount = items.filter((i) => i.stock < LOW_STOCK).length;

  const exportReport = () => {
    const rows: string[][] = [
      ["Item", "Category", "Unit", "Price (₹)", "Stock", "Value (₹)"],
    ];
    for (const i of items) {
      rows.push([
        i.name,
        i.category,
        i.unit,
        String(i.price),
        String(i.stock),
        String(i.stock * i.price),
      ]);
    }
    exportCSV(rows, `stock_report_${today}.csv`);
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Summary cards */}
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
            <div className="text-lg font-bold text-accent">
              {formatCurrency(totalStockValue)}
            </div>
            <div className="text-xs text-muted-foreground">Stock Value</div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/10 border-secondary/20">
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
            <div className="text-xs text-muted-foreground">Low Stock Items</div>
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
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-ocid={`inventory.tab-${t.id}_tab`}
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
                data-ocid="inventory.add-item_button"
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
                    "Price",
                    "Stock",
                    "Stock Value",
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
                      colSpan={7}
                      className="px-4 py-12 text-center text-muted-foreground"
                      data-ocid="inventory.items_empty_state"
                    >
                      <div className="text-4xl mb-2">📦</div>
                      <div className="font-medium">No items found</div>
                      <div className="text-xs mt-1">
                        Add your first inventory item to get started
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isLow = item.stock < LOW_STOCK;
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
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={isLow ? "destructive" : "outline"}>
                            {item.stock} {item.unit}
                            {isLow ? " ⚠️" : ""}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-accent">
                          {formatCurrency(item.stock * item.price)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {!isReadOnly && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openStockModal(item, "add")}
                                  data-ocid={`inventory.add-stock_button.${idx + 1}`}
                                >
                                  + Stock
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openStockModal(item, "sell")}
                                  data-ocid={`inventory.sell_button.${idx + 1}`}
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
                              </>
                            )}
                          </div>
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
                    <td className="px-4 py-3 font-bold text-primary">
                      {formatCurrency(
                        filteredItems.reduce(
                          (a, i) => a + i.stock * i.price,
                          0,
                        ),
                      )}
                    </td>
                    <td />
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
          <h2 className="text-lg font-semibold text-foreground">Categories</h2>

          {!isReadOnly && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex gap-2">
                  <Input
                    value={catForm}
                    onChange={(e) => setCatForm(e.target.value)}
                    placeholder="New category name"
                    className="max-w-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleAddCategory();
                      }
                    }}
                    data-ocid="inventory.new-cat_input"
                  />
                  <Button
                    onClick={() => {
                      void handleAddCategory();
                    }}
                    data-ocid="inventory.add-cat_button"
                  >
                    Add Category
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                    {["Category Name", "Items Count", "Actions"].map((h) => (
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
                      data-ocid={`inventory.cat_item.${idx + 1}`}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {editCatId === cat.id ? (
                          <Input
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="max-w-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                void handleUpdateCategory();
                              }
                            }}
                          />
                        ) : (
                          cat.name
                        )}
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
                            {editCatId === cat.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    void handleUpdateCategory();
                                  }}
                                  data-ocid={`inventory.cat-save_button.${idx + 1}`}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditCatId(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditCatId(cat.id);
                                    setEditCatName(cat.name);
                                  }}
                                  data-ocid={`inventory.cat-edit_button.${idx + 1}`}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    void handleDeleteCategory(cat.id);
                                  }}
                                  data-ocid={`inventory.cat-delete_button.${idx + 1}`}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
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
              onClick={exportReport}
              data-ocid="inventory.export-report_button"
            >
              Export CSV
            </Button>
          </div>

          {items.length === 0 ? (
            <Card data-ocid="inventory.report_empty_state">
              <CardContent className="py-12 text-center text-muted-foreground">
                <div className="text-4xl mb-2">📊</div>
                No inventory items to report.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "Item Name",
                      "Category",
                      "Unit",
                      "Price (₹)",
                      "Stock",
                      "Value (₹)",
                      "Status",
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
                  {[...items]
                    .sort((a, b) => a.stock - b.stock)
                    .map((item, idx) => {
                      const isLow = item.stock < LOW_STOCK;
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
                          <td className="px-4 py-3 font-medium">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-3 font-bold">{item.stock}</td>
                          <td className="px-4 py-3 font-semibold text-accent">
                            {formatCurrency(item.stock * item.price)}
                          </td>
                          <td className="px-4 py-3">
                            {isLow ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-200"
                              >
                                OK
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot className="bg-muted/40">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-right font-semibold text-foreground"
                    >
                      Total Stock Value:
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {formatCurrency(totalStockValue)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Item modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card
            className="w-full max-w-lg shadow-elevated"
            data-ocid="inventory.item_dialog"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">
                {editItemId ? "Edit Item" : "Add Item"}
              </CardTitle>
              <button
                type="button"
                onClick={() => {
                  setShowItemModal(false);
                  setEditItemId(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xl"
                aria-label="Close"
                data-ocid="inventory.item_close_button"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Item Name *</Label>
                  <Input
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. School Dress"
                    data-ocid="inventory.item-name_input"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                    value={itemForm.category}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, category: e.target.value }))
                    }
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Price (₹) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={itemForm.price || ""}
                    onChange={(e) =>
                      setItemForm((p) => ({
                        ...p,
                        price: Number(e.target.value),
                      }))
                    }
                    placeholder="0"
                    data-ocid="inventory.item-price_input"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={itemForm.unit}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, unit: e.target.value }))
                    }
                    placeholder="Pcs / Pair / Set / kg"
                  />
                </div>
                <div>
                  <Label>Opening Stock</Label>
                  <Input
                    type="number"
                    min={0}
                    value={itemForm.stock || ""}
                    onChange={(e) =>
                      setItemForm((p) => ({
                        ...p,
                        stock: Number(e.target.value),
                      }))
                    }
                    placeholder="0"
                    data-ocid="inventory.item-stock_input"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => {
                    void handleSaveItem();
                  }}
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stock Add/Issue modal */}
      {stockItemId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card
            className="w-full max-w-sm shadow-elevated"
            data-ocid="inventory.stock_dialog"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">
                {stockAction === "add"
                  ? "📥 Add Stock"
                  : "📤 Issue / Sell Stock"}
              </CardTitle>
              <button
                type="button"
                onClick={() => {
                  setStockItemId(null);
                  setStockError("");
                }}
                className="text-muted-foreground hover:text-foreground text-xl"
                aria-label="Close"
                data-ocid="inventory.stock_close_button"
              >
                ×
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              {stockError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  ⚠️ {stockError}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Item:{" "}
                <strong className="text-foreground">
                  {items.find((i) => i.id === stockItemId)?.name}
                </strong>
                <br />
                Current stock:{" "}
                <strong>
                  {items.find((i) => i.id === stockItemId)?.stock}{" "}
                  {items.find((i) => i.id === stockItemId)?.unit}
                </strong>
              </p>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min={1}
                  value={stockQty || ""}
                  onChange={(e) => {
                    setStockError("");
                    setStockQty(Number(e.target.value));
                  }}
                  data-ocid="inventory.stock-qty_input"
                />
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Input
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  placeholder={
                    stockAction === "add"
                      ? "Supplier name, etc."
                      : "Student/buyer name"
                  }
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => {
                    void handleStockUpdate();
                  }}
                  data-ocid="inventory.stock_save_button"
                >
                  {stockAction === "add" ? "Add Stock" : "Issue Stock"}
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
