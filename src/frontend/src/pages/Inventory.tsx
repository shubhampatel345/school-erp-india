import { useCallback, useState } from "react";
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
import type { InventoryPurchase, InventorySale } from "../types";
import { dataService } from "../utils/dataService";
import { formatCurrency, generateId, ls } from "../utils/localStorage";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface InvItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  sellPrice: number;
  costPrice: number;
  currentStock: number;
  sessionId: string;
}

type Tab = "stock" | "purchase" | "sales";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "stock", label: "Stock", icon: "📦" },
  { id: "purchase", label: "Purchase", icon: "📥" },
  { id: "sales", label: "Sales", icon: "📤" },
];

const LOW = 5;
const today = new Date().toISOString().split("T")[0];

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function Inventory() {
  const { addNotification, isReadOnly, currentSession } = useApp();
  const sessionId = currentSession?.id ?? "sess_2025";
  const iKey = `inv_items_${sessionId}`;
  const pKey = `inv_purchases_${sessionId}`;
  const sKey = `inv_sales_${sessionId}`;
  const catKey = `inv_categories_${sessionId}`;

  const [tab, setTab] = useState<Tab>("stock");

  // ── Data ──────────────────────────────────────────────────
  const [items, setItems] = useState<InvItem[]>(() => {
    const ds = dataService.get<InvItem>("inventory_items");
    return ds.length > 0 ? ds : ls.get<InvItem[]>(iKey, []);
  });
  const [purchases, setPurchases] = useState<InventoryPurchase[]>(() =>
    ls.get<InventoryPurchase[]>(pKey, []),
  );
  const [sales, setSales] = useState<InventorySale[]>(() =>
    ls.get<InventorySale[]>(sKey, []),
  );
  const [categories, setCategories] = useState<string[]>(() =>
    ls.get<string[]>(catKey, [
      "Uniform",
      "Tie",
      "Belt",
      "Books",
      "Stationery",
      "Sports",
      "Other",
    ]),
  );

  // ── Category management ───────────────────────────────────
  const [newCategory, setNewCategory] = useState("");
  const [showCatMgr, setShowCatMgr] = useState(false);

  const saveCategories = useCallback(
    (data: string[]) => {
      setCategories(data);
      ls.set(catKey, data);
    },
    [catKey],
  );

  const addCategory = useCallback(() => {
    const c = newCategory.trim();
    if (!c || categories.includes(c)) return;
    saveCategories([...categories, c]);
    setNewCategory("");
  }, [newCategory, categories, saveCategories]);

  const deleteCategory = useCallback(
    (c: string) => saveCategories(categories.filter((x) => x !== c)),
    [categories, saveCategories],
  );

  // ── Item form ─────────────────────────────────────────────
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    category: categories[0] ?? "Uniform",
    unit: "Pcs",
    sellPrice: 0,
    costPrice: 0,
    currentStock: 0,
  });
  const [itemSearch, setItemSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const saveItems = useCallback(
    (
      data: InvItem[],
      changed?: {
        op: "save" | "update" | "delete";
        item?: InvItem;
        id?: string;
      },
    ) => {
      setItems(data);
      ls.set(iKey, data);
      // Sync to server via DataService
      if (changed?.op === "save" && changed.item) {
        void dataService.save(
          "inventory_items",
          changed.item as unknown as Record<string, unknown>,
        );
      } else if (changed?.op === "update" && changed.item) {
        void dataService.update(
          "inventory_items",
          changed.item.id,
          changed.item as unknown as Record<string, unknown>,
        );
      } else if (changed?.op === "delete" && changed.id) {
        void dataService.delete("inventory_items", changed.id);
      }
    },
    [iKey],
  );

  const openAddItem = () => {
    setItemForm({
      name: "",
      category: categories[0] ?? "",
      unit: "Pcs",
      sellPrice: 0,
      costPrice: 0,
      currentStock: 0,
    });
    setEditItemId(null);
    setShowItemForm(true);
  };

  const openEditItem = (item: InvItem) => {
    setItemForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      sellPrice: item.sellPrice,
      costPrice: item.costPrice,
      currentStock: item.currentStock,
    });
    setEditItemId(item.id);
    setShowItemForm(true);
  };

  const handleSaveItem = useCallback(() => {
    if (!itemForm.name.trim()) return;
    if (editItemId) {
      const updated = { ...itemForm, id: editItemId, sessionId };
      saveItems(
        items.map((i) => (i.id === editItemId ? updated : i)),
        { op: "update", item: updated },
      );
    } else {
      const newItem: InvItem = { ...itemForm, id: generateId(), sessionId };
      saveItems([...items, newItem], { op: "save", item: newItem });
      addNotification(
        `Item "${itemForm.name}" added to inventory`,
        "success",
        "📦",
      );
    }
    setShowItemForm(false);
    setEditItemId(null);
  }, [itemForm, editItemId, items, saveItems, addNotification, sessionId]);

  const handleDeleteItem = useCallback(
    (id: string) =>
      saveItems(
        items.filter((i) => i.id !== id),
        { op: "delete", id },
      ),
    [items, saveItems],
  );

  // ── Purchase form ─────────────────────────────────────────
  const [purchForm, setPurchForm] = useState({
    itemId: "",
    quantity: 1,
    rate: 0,
    date: today,
    supplier: "",
  });

  const savePurchases = useCallback(
    (data: InventoryPurchase[]) => {
      setPurchases(data);
      ls.set(pKey, data);
    },
    [pKey],
  );

  const handlePurchase = useCallback(() => {
    if (!purchForm.itemId || purchForm.quantity <= 0) return;
    const item = items.find((i) => i.id === purchForm.itemId);
    if (!item) return;
    const rec: InventoryPurchase = {
      id: generateId(),
      itemId: purchForm.itemId,
      itemName: item.name,
      quantity: purchForm.quantity,
      rate: purchForm.rate,
      totalCost: purchForm.quantity * purchForm.rate,
      date: purchForm.date,
      supplier: purchForm.supplier,
      sessionId,
    };
    savePurchases([...purchases, rec]);
    saveItems(
      items.map((i) =>
        i.id === purchForm.itemId
          ? { ...i, currentStock: i.currentStock + purchForm.quantity }
          : i,
      ),
    );
    addNotification(
      `Purchased ${purchForm.quantity} × ${item.name} — ${formatCurrency(rec.totalCost)}`,
      "success",
      "📥",
    );
    setPurchForm({
      itemId: "",
      quantity: 1,
      rate: 0,
      date: today,
      supplier: "",
    });
  }, [
    purchForm,
    purchases,
    items,
    savePurchases,
    saveItems,
    addNotification,
    sessionId,
  ]);

  // ── Sale form ─────────────────────────────────────────────
  const [saleForm, setSaleForm] = useState({
    itemId: "",
    quantity: 1,
    sellPrice: 0,
    date: today,
    buyerName: "",
  });
  const [saleError, setSaleError] = useState("");

  const saveSales = useCallback(
    (data: InventorySale[]) => {
      setSales(data);
      ls.set(sKey, data);
    },
    [sKey],
  );

  const handleSale = useCallback(() => {
    setSaleError("");
    if (!saleForm.itemId || saleForm.quantity <= 0) return;
    const item = items.find((i) => i.id === saleForm.itemId);
    if (!item) return;
    if (item.currentStock < saleForm.quantity) {
      setSaleError(
        `Insufficient stock! Available: ${item.currentStock} ${item.unit}`,
      );
      return;
    }
    const rec: InventorySale = {
      id: generateId(),
      itemId: saleForm.itemId,
      itemName: item.name,
      quantity: saleForm.quantity,
      sellPrice: saleForm.sellPrice,
      totalAmount: saleForm.quantity * saleForm.sellPrice,
      date: saleForm.date,
      buyerName: saleForm.buyerName,
      sessionId,
    };
    saveSales([...sales, rec]);
    const updated = items.map((i) =>
      i.id === saleForm.itemId
        ? { ...i, currentStock: i.currentStock - saleForm.quantity }
        : i,
    );
    saveItems(updated);
    addNotification(
      `Sold ${saleForm.quantity} × ${item.name} — ${formatCurrency(rec.totalAmount)}`,
      "success",
      "📤",
    );
    const updatedItem = updated.find((i) => i.id === saleForm.itemId);
    if (updatedItem && updatedItem.currentStock < LOW) {
      addNotification(
        `⚠️ Low stock: ${updatedItem.name} — only ${updatedItem.currentStock} left`,
        "warning",
        "⚠️",
      );
    }
    setSaleForm({
      itemId: "",
      quantity: 1,
      sellPrice: 0,
      date: today,
      buyerName: "",
    });
  }, [
    saleForm,
    sales,
    items,
    saveSales,
    saveItems,
    addNotification,
    sessionId,
  ]);

  // ── Derived ───────────────────────────────────────────────
  const filteredItems = items.filter((i) => {
    const ms =
      !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase());
    const mc = !catFilter || i.category === catFilter;
    return ms && mc;
  });

  const totalItems = items.length;
  const totalStockValue = items.reduce(
    (a, i) => a + i.currentStock * i.sellPrice,
    0,
  );
  const totalSalesRevenue = sales.reduce((a, s) => a + s.totalAmount, 0);
  const lowStockCount = items.filter((i) => i.currentStock < LOW).length;

  // ── Export helpers ────────────────────────────────────────
  const exportStock = () => {
    const rows: string[][] = [
      [
        "Item",
        "Category",
        "Unit",
        "Sell Price",
        "Cost Price",
        "Current Stock",
        "Stock Value",
      ],
    ];
    for (const item of items) {
      rows.push([
        item.name,
        item.category,
        item.unit,
        String(item.sellPrice),
        String(item.costPrice),
        String(item.currentStock),
        String(item.currentStock * item.sellPrice),
      ]);
    }
    exportCSV(rows, "stock_report.csv");
  };

  const exportPurchases = () => {
    const rows: string[][] = [
      ["Date", "Item", "Qty", "Rate (₹)", "Total Cost (₹)", "Supplier"],
    ];
    for (const p of purchases) {
      rows.push([
        p.date,
        p.itemName,
        String(p.quantity),
        String(p.rate),
        String(p.totalCost),
        p.supplier ?? "",
      ]);
    }
    exportCSV(rows, "purchases.csv");
  };

  const exportSales = () => {
    const rows: string[][] = [
      ["Date", "Item", "Qty", "Sell Price (₹)", "Total (₹)", "Buyer"],
    ];
    for (const s of sales) {
      rows.push([
        s.date,
        s.itemName,
        String(s.quantity),
        String(s.sellPrice),
        String(s.totalAmount),
        s.buyerName ?? "",
      ]);
    }
    exportCSV(rows, "sales.csv");
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Dashboard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-primary">{totalItems}</div>
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
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(totalSalesRevenue)}
            </div>
            <div className="text-xs text-muted-foreground">Sales Revenue</div>
          </CardContent>
        </Card>
        <Card
          className={
            lowStockCount > 0
              ? "bg-destructive/5 border-destructive/20"
              : "bg-muted/30"
          }
        >
          <CardContent className="py-3 text-center">
            <div
              className={`text-2xl font-bold ${lowStockCount > 0 ? "text-destructive" : "text-foreground"}`}
            >
              {lowStockCount}
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
            data-ocid={`inv-tab-${t.id}`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── STOCK TAB ── */}
      {tab === "stock" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items..."
                className="w-44"
                data-ocid="inv-search"
              />
              <select
                className="border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                data-ocid="inv-cat-filter"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                data-ocid="inv-print-btn"
              >
                🖨️ Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportStock}
                data-ocid="inv-export-stock-btn"
              >
                Export CSV
              </Button>
              {!isReadOnly && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCatMgr((v) => !v)}
                    data-ocid="inv-manage-cat-btn"
                  >
                    ⚙️ Categories
                  </Button>
                  <Button
                    size="sm"
                    onClick={openAddItem}
                    data-ocid="inv-add-item-btn"
                  >
                    + Add Item
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Category Manager */}
          {showCatMgr && !isReadOnly && (
            <Card className="border-accent/30 bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Manage Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    className="max-w-xs"
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                    data-ocid="inv-new-cat-input"
                  />
                  <Button
                    size="sm"
                    onClick={addCategory}
                    data-ocid="inv-add-cat-btn"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <div
                      key={c}
                      className="flex items-center gap-1 bg-muted rounded-full px-3 py-1"
                    >
                      <span className="text-sm text-foreground">{c}</span>
                      <button
                        type="button"
                        onClick={() => deleteCategory(c)}
                        className="text-muted-foreground hover:text-destructive text-xs ml-1"
                        aria-label={`Remove category ${c}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Item Form */}
          {showItemForm && !isReadOnly && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {editItemId ? "Edit Item" : "New Item"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Item Name *</Label>
                    <Input
                      value={itemForm.name}
                      onChange={(e) =>
                        setItemForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g. School Dress"
                      data-ocid="inv-item-name"
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
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={itemForm.unit}
                      onChange={(e) =>
                        setItemForm((p) => ({ ...p, unit: e.target.value }))
                      }
                      placeholder="Pcs / Pair / Set / kg / m"
                    />
                  </div>
                  <div>
                    <Label>Sell Price (₹) *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={itemForm.sellPrice || ""}
                      onChange={(e) =>
                        setItemForm((p) => ({
                          ...p,
                          sellPrice: Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      data-ocid="inv-sell-price"
                    />
                  </div>
                  <div>
                    <Label>Cost Price (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={itemForm.costPrice || ""}
                      onChange={(e) =>
                        setItemForm((p) => ({
                          ...p,
                          costPrice: Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      data-ocid="inv-cost-price"
                    />
                  </div>
                  <div>
                    <Label>Opening Stock</Label>
                    <Input
                      type="number"
                      min={0}
                      value={itemForm.currentStock || ""}
                      onChange={(e) =>
                        setItemForm((p) => ({
                          ...p,
                          currentStock: Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveItem}
                    data-ocid="inv-save-item-btn"
                  >
                    Save Item
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowItemForm(false);
                      setEditItemId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stock Table */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Item Name",
                    "Category",
                    "Unit",
                    "Sell Price",
                    "Cost Price",
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
                      colSpan={8}
                      className="px-4 py-12 text-center text-muted-foreground"
                      data-ocid="inv-empty-state"
                    >
                      <div className="text-4xl mb-2">📦</div>
                      <div className="font-medium">No items found</div>
                      <div className="text-xs mt-1">
                        Add your first inventory item to get started
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.currentStock < LOW;
                    return (
                      <tr
                        key={item.id}
                        className={`border-t border-border hover:bg-muted/30 transition-colors ${isLow ? "bg-destructive/5" : ""}`}
                        data-ocid="inv-item-row"
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
                          {formatCurrency(item.sellPrice)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.costPrice > 0
                            ? formatCurrency(item.costPrice)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={isLow ? "destructive" : "outline"}>
                            {item.currentStock} {item.unit}
                            {isLow && " ⚠️"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-accent">
                          {formatCurrency(item.currentStock * item.sellPrice)}
                        </td>
                        <td className="px-4 py-3">
                          {!isReadOnly && (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditItem(item)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id)}
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
                      colSpan={6}
                      className="px-4 py-3 text-right font-semibold text-foreground"
                    >
                      Total Stock Value:
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {formatCurrency(
                        filteredItems.reduce(
                          (a, i) => a + i.currentStock * i.sellPrice,
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

      {/* ── PURCHASE TAB ── */}
      {tab === "purchase" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Purchase Records
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={exportPurchases}
              data-ocid="inv-export-purchases-btn"
            >
              Export CSV
            </Button>
          </div>

          {!isReadOnly && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">New Purchase Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Select Item *</Label>
                    <select
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                      value={purchForm.itemId}
                      onChange={(e) => {
                        const item = items.find((i) => i.id === e.target.value);
                        setPurchForm((p) => ({
                          ...p,
                          itemId: e.target.value,
                          rate: item?.costPrice ?? p.rate,
                        }));
                      }}
                      data-ocid="inv-purch-item-select"
                    >
                      <option value="">— Select Item —</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} (Stock: {i.currentStock} {i.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={purchForm.quantity || ""}
                      onChange={(e) =>
                        setPurchForm((p) => ({
                          ...p,
                          quantity: Number(e.target.value),
                        }))
                      }
                      data-ocid="inv-purch-qty"
                    />
                  </div>
                  <div>
                    <Label>Rate per Unit (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={purchForm.rate || ""}
                      onChange={(e) =>
                        setPurchForm((p) => ({
                          ...p,
                          rate: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={purchForm.date}
                      onChange={(e) =>
                        setPurchForm((p) => ({ ...p, date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Supplier Name</Label>
                    <Input
                      value={purchForm.supplier}
                      onChange={(e) =>
                        setPurchForm((p) => ({
                          ...p,
                          supplier: e.target.value,
                        }))
                      }
                      placeholder="Supplier / vendor name"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="bg-muted rounded-lg px-3 py-2 w-full text-sm">
                      <span className="text-muted-foreground">
                        Total Cost:{" "}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(purchForm.quantity * purchForm.rate)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handlePurchase}
                  data-ocid="inv-save-purchase-btn"
                >
                  Record Purchase
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Date",
                    "Item",
                    "Qty",
                    "Rate/Unit",
                    "Total Cost",
                    "Supplier",
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
                {purchases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-muted-foreground"
                      data-ocid="inv-purchase-empty"
                    >
                      <div className="text-3xl mb-1">📥</div>
                      No purchase records yet.
                    </td>
                  </tr>
                ) : (
                  [...purchases].reverse().map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.date}
                      </td>
                      <td className="px-4 py-3 font-medium">{p.itemName}</td>
                      <td className="px-4 py-3">{p.quantity}</td>
                      <td className="px-4 py-3">{formatCurrency(p.rate)}</td>
                      <td className="px-4 py-3 font-semibold text-accent">
                        {formatCurrency(p.totalCost)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.supplier || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {purchases.length > 0 && (
                <tfoot className="bg-muted/40">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-right font-semibold text-foreground"
                    >
                      Total Purchase Cost:
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {formatCurrency(
                        purchases.reduce((a, p) => a + p.totalCost, 0),
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

      {/* ── SALES TAB ── */}
      {tab === "sales" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Sales Records
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={exportSales}
              data-ocid="inv-export-sales-btn"
            >
              Export CSV
            </Button>
          </div>

          {!isReadOnly && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">New Sale Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {saleError && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                    ⚠️ {saleError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Select Item *</Label>
                    <select
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                      value={saleForm.itemId}
                      onChange={(e) => {
                        const item = items.find((i) => i.id === e.target.value);
                        setSaleForm((p) => ({
                          ...p,
                          itemId: e.target.value,
                          sellPrice: item?.sellPrice ?? 0,
                        }));
                        setSaleError("");
                      }}
                      data-ocid="inv-sale-item-select"
                    >
                      <option value="">— Select Item —</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} — Stock: {i.currentStock} {i.unit}
                          {i.currentStock < LOW ? " ⚠️ Low" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={saleForm.quantity || ""}
                      onChange={(e) => {
                        setSaleError("");
                        setSaleForm((p) => ({
                          ...p,
                          quantity: Number(e.target.value),
                        }));
                      }}
                      data-ocid="inv-sale-qty"
                    />
                  </div>
                  <div>
                    <Label>Sell Price (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={saleForm.sellPrice || ""}
                      onChange={(e) =>
                        setSaleForm((p) => ({
                          ...p,
                          sellPrice: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={saleForm.date}
                      onChange={(e) =>
                        setSaleForm((p) => ({ ...p, date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Buyer / Student Name</Label>
                    <Input
                      value={saleForm.buyerName}
                      onChange={(e) =>
                        setSaleForm((p) => ({
                          ...p,
                          buyerName: e.target.value,
                        }))
                      }
                      placeholder="Student or parent name"
                      data-ocid="inv-sale-buyer"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="bg-muted rounded-lg px-3 py-2 w-full text-sm">
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(saleForm.quantity * saleForm.sellPrice)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button onClick={handleSale} data-ocid="inv-save-sale-btn">
                  Record Sale
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Date", "Item", "Qty", "Sell Price", "Total", "Buyer"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-muted-foreground"
                      data-ocid="inv-sales-empty"
                    >
                      <div className="text-3xl mb-1">📤</div>
                      No sales recorded yet.
                    </td>
                  </tr>
                ) : (
                  [...sales].reverse().map((s) => (
                    <tr
                      key={s.id}
                      className="border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.date}
                      </td>
                      <td className="px-4 py-3 font-medium">{s.itemName}</td>
                      <td className="px-4 py-3">{s.quantity}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(s.sellPrice)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-accent">
                        {formatCurrency(s.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.buyerName || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sales.length > 0 && (
                <tfoot className="bg-muted/40">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-right font-semibold text-foreground"
                    >
                      Total Sales Revenue:
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {formatCurrency(
                        sales.reduce((a, s) => a + s.totalAmount, 0),
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
    </div>
  );
}
