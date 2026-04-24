/**
 * SHUBH SCHOOL ERP — Inventory Module (Direct API rebuild)
 * All data via phpApiService directly. No getData(), no local sync.
 * ALL price/rate/quantity fields: type="text" inputMode="decimal" — NO spinners.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Download,
  Edit2,
  Loader2,
  Package,
  Plus,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import phpApiService from "../utils/phpApiService";

// ── Types ─────────────────────────────────────────────────────

interface InvItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  storeLocation?: string;
}

interface InvTransaction {
  id: string;
  itemId: string;
  itemName?: string;
  type: "purchase" | "sale" | "adjustment";
  quantity: number;
  rate?: number;
  totalCost?: number;
  vendor?: string;
  date: string;
  note?: string;
}

type Tab = "items" | "report" | "purchase";

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

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
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

// ── Modal — defined OUTSIDE Inventory to prevent remounts ────

function InvModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-elevated animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

// ── Item Form State ───────────────────────────────────────────

interface ItemFormState {
  name: string;
  category: string;
  unit: string;
  costPriceStr: string;
  sellingPriceStr: string;
  currentStockStr: string;
  reorderLevelStr: string;
  storeLocation: string;
}

const EMPTY_ITEM_FORM: ItemFormState = {
  name: "",
  category: "",
  unit: "Pcs",
  costPriceStr: "",
  sellingPriceStr: "",
  currentStockStr: "",
  reorderLevelStr: "5",
  storeLocation: "",
};

// ── Purchase Form State ───────────────────────────────────────

interface PurchaseFormState {
  itemId: string;
  quantityStr: string;
  rateStr: string;
  vendor: string;
  date: string;
}

// ── Main Component ────────────────────────────────────────────

export default function Inventory() {
  const [items, setItems] = useState<InvItem[]>([]);
  const [transactions, setTransactions] = useState<InvTransaction[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("items");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Item form
  const [itemSearch, setItemSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [savingItem, setSavingItem] = useState(false);

  // Stock modal
  const [stockItemId, setStockItemId] = useState<string | null>(null);
  const [stockAction, setStockAction] = useState<"in" | "out">("in");
  const [stockQtyStr, setStockQtyStr] = useState("1");
  const [stockNote, setStockNote] = useState("");
  const [stockError, setStockError] = useState("");
  const [savingStock, setSavingStock] = useState(false);

  // Purchase modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>({
    itemId: "",
    quantityStr: "",
    rateStr: "",
    vendor: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [savingPurchase, setSavingPurchase] = useState(false);

  // ── Stable field handlers (prevent remounts) ──────────────
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
        costPriceStr: e.target.value
          .replace(/[^0-9.]/g, "")
          .replace(/(\..*)\./g, "$1"),
      })),
    [],
  );
  const handleItemSellChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setItemForm((p) => ({
        ...p,
        sellingPriceStr: e.target.value
          .replace(/[^0-9.]/g, "")
          .replace(/(\..*)\./g, "$1"),
      })),
    [],
  );
  const handleItemStockChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setItemForm((p) => ({
        ...p,
        currentStockStr: e.target.value.replace(/[^0-9]/g, ""),
      })),
    [],
  );
  const handleItemReorderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setItemForm((p) => ({
        ...p,
        reorderLevelStr: e.target.value.replace(/[^0-9]/g, ""),
      })),
    [],
  );
  const handleItemLocationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setItemForm((p) => ({ ...p, storeLocation: e.target.value })),
    [],
  );
  const handleStockQtyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setStockError("");
      setStockQtyStr(e.target.value.replace(/[^0-9]/g, ""));
    },
    [],
  );
  const handleStockNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setStockNote(e.target.value),
    [],
  );

  // ── Load data ──────────────────────────────────────────────

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await phpApiService.get<{ data: InvItem[]; total: number }>(
        `inventory/list&page=${page}&limit=${PAGE_SIZE}${itemSearch ? `&search=${encodeURIComponent(itemSearch)}` : ""}${catFilter ? `&category=${encodeURIComponent(catFilter)}` : ""}`,
      );
      setItems(res.data ?? []);
      setTotalItems(res.total ?? res.data?.length ?? 0);
    } catch {
      toast.error("Failed to load inventory items");
    } finally {
      setLoading(false);
    }
  }, [page, itemSearch, catFilter]);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await phpApiService.get<InvTransaction[]>(
        "inventory/transactions&limit=50",
      );
      setTransactions(data ?? []);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (tab === "purchase" || tab === "report") void loadTransactions();
  }, [tab, loadTransactions]);

  // ── Categories ─────────────────────────────────────────────

  const categories = useMemo(() => {
    const fromItems = [
      ...new Set(items.map((i) => i.category).filter(Boolean)),
    ];
    return [...new Set([...DEFAULT_CATEGORIES, ...fromItems])].sort();
  }, [items]);

  // ── Item CRUD ──────────────────────────────────────────────

  const openAddItem = useCallback(() => {
    setItemForm(EMPTY_ITEM_FORM);
    setEditItemId(null);
    setShowItemModal(true);
  }, []);

  const openEditItem = useCallback((item: InvItem) => {
    setItemForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      costPriceStr: item.costPrice ? String(item.costPrice) : "",
      sellingPriceStr: item.sellingPrice ? String(item.sellingPrice) : "",
      currentStockStr: item.currentStock ? String(item.currentStock) : "0",
      reorderLevelStr: item.reorderLevel ? String(item.reorderLevel) : "5",
      storeLocation: item.storeLocation ?? "",
    });
    setEditItemId(item.id);
    setShowItemModal(true);
  }, []);

  const handleSaveItem = useCallback(async () => {
    if (!itemForm.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    setSavingItem(true);
    try {
      const payload = {
        id: editItemId ?? undefined,
        name: itemForm.name.trim(),
        category: itemForm.category,
        unit: itemForm.unit,
        costPrice: Number(itemForm.costPriceStr) || 0,
        sellingPrice: Number(itemForm.sellingPriceStr) || 0,
        currentStock: Number(itemForm.currentStockStr) || 0,
        reorderLevel: Number(itemForm.reorderLevelStr) || 5,
        storeLocation: itemForm.storeLocation,
      };
      if (editItemId) {
        await phpApiService.updateInventoryItem(
          payload as Record<string, unknown>,
        );
        toast.success(`"${payload.name}" updated`);
      } else {
        await phpApiService.addInventoryItem(
          payload as Record<string, unknown>,
        );
        toast.success(`"${payload.name}" added`);
      }
      setShowItemModal(false);
      setEditItemId(null);
      await loadItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSavingItem(false);
    }
  }, [itemForm, editItemId, loadItems]);

  const handleDeleteItem = useCallback(
    async (id: string) => {
      if (!confirm("Delete this item?")) return;
      try {
        await phpApiService.del("inventory/delete", { id });
        toast.success("Item deleted");
        await loadItems();
      } catch {
        toast.error("Failed to delete item");
      }
    },
    [loadItems],
  );

  // ── Stock In/Out ────────────────────────────────────────────

  const openStockModal = useCallback((item: InvItem, action: "in" | "out") => {
    setStockItemId(item.id);
    setStockAction(action);
    setStockQtyStr("1");
    setStockNote("");
    setStockError("");
  }, []);

  const handleStockUpdate = useCallback(async () => {
    const qty = Number(stockQtyStr) || 0;
    if (!stockItemId || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    const item = items.find((i) => i.id === stockItemId);
    if (!item) return;
    if (stockAction === "out" && qty > item.currentStock) {
      setStockError(
        `Insufficient stock. Available: ${item.currentStock} ${item.unit}`,
      );
      return;
    }
    setSavingStock(true);
    try {
      await phpApiService.post("inventory/transaction", {
        itemId: stockItemId,
        type: stockAction === "in" ? "purchase" : "sale",
        quantity: qty,
        note: stockNote,
        date: new Date().toISOString().split("T")[0],
      });
      toast.success(
        `${stockAction === "in" ? "Added" : "Issued"} ${qty} × ${item.name}`,
      );
      setStockItemId(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update stock",
      );
    } finally {
      setSavingStock(false);
    }
  }, [stockItemId, stockAction, stockQtyStr, stockNote, items, loadItems]);

  // ── Purchase ────────────────────────────────────────────────

  const handleSavePurchase = useCallback(async () => {
    const { itemId, quantityStr, rateStr, vendor, date } = purchaseForm;
    if (!itemId || !quantityStr || !rateStr) {
      toast.error("Fill all required fields");
      return;
    }
    const qty = Number(quantityStr) || 0;
    const rate = Number(rateStr) || 0;
    setSavingPurchase(true);
    try {
      await phpApiService.post("inventory/transaction", {
        itemId,
        type: "purchase",
        quantity: qty,
        rate,
        totalCost: qty * rate,
        vendor,
        date,
      });
      toast.success("Purchase recorded");
      setShowPurchaseModal(false);
      setPurchaseForm({
        itemId: "",
        quantityStr: "",
        rateStr: "",
        vendor: "",
        date: new Date().toISOString().split("T")[0],
      });
      await loadItems();
      await loadTransactions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record purchase",
      );
    } finally {
      setSavingPurchase(false);
    }
  }, [purchaseForm, loadItems, loadTransactions]);

  // ── Derived ────────────────────────────────────────────────

  const totalStockValue = useMemo(
    () => items.reduce((a, i) => a + i.currentStock * i.costPrice, 0),
    [items],
  );
  const lowStockItems = useMemo(
    () => items.filter((i) => i.currentStock <= i.reorderLevel),
    [items],
  );
  const stockItem = items.find((i) => i.id === stockItemId);

  const TABS: {
    id: Tab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "items", label: "Items", icon: Package },
    { id: "report", label: "Stock Report", icon: AlertTriangle },
    { id: "purchase", label: "Purchases", icon: Warehouse },
  ];

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Inventory
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage school store items, purchases, and stock levels
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-primary">{totalItems}</div>
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
              {transactions.filter((t) => t.type === "purchase").length}
            </div>
            <div className="text-xs text-muted-foreground">Purchases</div>
          </CardContent>
        </Card>
        <Card
          className={
            lowStockItems.length > 0
              ? "bg-destructive/5 border-destructive/20"
              : "bg-muted/30"
          }
        >
          <CardContent className="py-3 text-center">
            <div
              className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-destructive" : "text-foreground"}`}
            >
              {lowStockItems.length}
            </div>
            <div className="text-xs text-muted-foreground">Low Stock</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              data-ocid={`inventory.${t.id}_tab`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── ITEMS TAB ── */}
      {tab === "items" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Input
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search items…"
                className="w-44"
                data-ocid="inventory.search_input"
              />
              <select
                className="border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={catFilter}
                onChange={(e) => {
                  setCatFilter(e.target.value);
                  setPage(1);
                }}
                data-ocid="inventory.category_select"
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
                onClick={openAddItem}
                data-ocid="inventory.add_item_button"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportCSV(
                    [
                      [
                        "Item",
                        "Category",
                        "Unit",
                        "Cost",
                        "Sell",
                        "Stock",
                        "Reorder",
                        "Location",
                      ],
                      ...items.map((i) => [
                        i.name,
                        i.category,
                        i.unit,
                        String(i.costPrice),
                        String(i.sellingPrice),
                        String(i.currentStock),
                        String(i.reorderLevel),
                        i.storeLocation ?? "",
                      ]),
                    ],
                    "inventory.csv",
                  )
                }
                data-ocid="inventory.export_button"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading items…</span>
            </div>
          ) : (
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
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
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
                    items.map((item, idx) => {
                      const isLow = item.currentStock <= item.reorderLevel;
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
                                Low
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">
                              {item.category || "—"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {formatCurrency(item.costPrice)}
                          </td>
                          <td className="px-4 py-3 text-accent font-medium">
                            {formatCurrency(item.sellingPrice)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={isLow ? "destructive" : "outline"}>
                              {item.currentStock} {item.unit}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
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
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditItem(item)}
                                data-ocid={`inventory.edit_button.${idx + 1}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => void handleDeleteItem(item.id)}
                                data-ocid={`inventory.delete_button.${idx + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
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
                        colSpan={5}
                        className="px-4 py-3 text-right font-semibold text-foreground"
                      >
                        Total Stock Value:
                      </td>
                      <td
                        colSpan={2}
                        className="px-4 py-3 font-bold text-primary"
                      >
                        {formatCurrency(
                          items.reduce(
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
          )}

          {/* Pagination */}
          {totalItems > PAGE_SIZE && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                data-ocid="inventory.pagination_prev"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-3 py-1.5">
                Page {page} of {Math.ceil(totalItems / PAGE_SIZE)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * PAGE_SIZE >= totalItems}
                onClick={() => setPage((p) => p + 1)}
                data-ocid="inventory.pagination_next"
              >
                Next
              </Button>
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
              onClick={() =>
                exportCSV(
                  [
                    [
                      "Item",
                      "Category",
                      "Unit",
                      "Cost",
                      "Sell",
                      "Stock",
                      "Reorder Level",
                      "Status",
                      "Value",
                    ],
                    ...items.map((i) => [
                      i.name,
                      i.category,
                      i.unit,
                      String(i.costPrice),
                      String(i.sellingPrice),
                      String(i.currentStock),
                      String(i.reorderLevel),
                      i.currentStock <= i.reorderLevel ? "Low Stock" : "OK",
                      String(i.currentStock * i.costPrice),
                    ]),
                  ],
                  `stock_report_${new Date().toISOString().split("T")[0]}.csv`,
                )
              }
              data-ocid="inventory.export_report_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>

          {lowStockItems.length > 0 && (
            <div
              className="bg-destructive/5 border border-destructive/30 rounded-xl p-3"
              data-ocid="inventory.low_stock_alert"
            >
              <p className="text-sm font-semibold text-destructive mb-2">
                ⚠️ {lowStockItems.length} item(s) at or below reorder level
              </p>
              <div className="flex flex-wrap gap-1">
                {lowStockItems.map((i) => (
                  <Badge key={i.id} variant="destructive" className="text-xs">
                    {i.name}: {i.currentStock} {i.unit}
                  </Badge>
                ))}
              </div>
            </div>
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
                    "Current Stock",
                    "Reorder Level",
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
                      colSpan={9}
                      className="px-4 py-12 text-center text-muted-foreground"
                      data-ocid="inventory.report_empty_state"
                    >
                      No inventory items yet.
                    </td>
                  </tr>
                ) : (
                  [...items]
                    .sort((a, b) => a.currentStock - b.currentStock)
                    .map((item, idx) => {
                      const isLow = item.currentStock <= item.reorderLevel;
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
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.reorderLevel}
                          </td>
                          <td className="px-4 py-3">
                            {isLow ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-foreground"
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
                      colSpan={8}
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

      {/* ── PURCHASES TAB ── */}
      {tab === "purchase" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Purchase Register
            </h2>
            <Button
              onClick={() => setShowPurchaseModal(true)}
              data-ocid="inventory.add_purchase_button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Record Purchase
            </Button>
          </div>
          {transactions.filter((t) => t.type === "purchase").length === 0 ? (
            <div
              className="py-12 text-center text-muted-foreground"
              data-ocid="inventory.purchase_empty_state"
            >
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No purchases recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "Date",
                      "Item",
                      "Qty",
                      "Rate (₹)",
                      "Total Cost",
                      "Vendor",
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
                  {[...transactions]
                    .filter((t) => t.type === "purchase")
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((p, idx) => (
                      <tr
                        key={p.id}
                        className="border-t border-border hover:bg-muted/30"
                        data-ocid={`inventory.purchase.${idx + 1}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.date}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {p.itemName ?? "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{p.quantity}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {p.rate != null ? formatCurrency(p.rate) : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary tabular-nums">
                          {p.totalCost != null
                            ? formatCurrency(p.totalCost)
                            : formatCurrency(p.quantity * (p.rate ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.vendor || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Item Modal ── */}
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
                className="mt-1"
                data-ocid="inventory.item_name_input"
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
                value={itemForm.category}
                onChange={handleItemCategoryChange}
              >
                <option value="">Select Category</option>
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
                onChange={handleItemUnitChange}
                placeholder="Pcs / Pair / Set"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Cost Price (₹)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={itemForm.costPriceStr}
                onChange={handleItemCostChange}
                placeholder="0"
                className="mt-1"
                data-ocid="inventory.item_cost_input"
              />
            </div>
            <div>
              <Label>Selling Price (₹)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={itemForm.sellingPriceStr}
                onChange={handleItemSellChange}
                placeholder="0"
                className="mt-1"
                data-ocid="inventory.item_sell_input"
              />
            </div>
            <div>
              <Label>Opening Stock</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={itemForm.currentStockStr}
                onChange={handleItemStockChange}
                placeholder="0"
                className="mt-1"
                data-ocid="inventory.item_stock_input"
              />
            </div>
            <div>
              <Label>Reorder Level</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={itemForm.reorderLevelStr}
                onChange={handleItemReorderChange}
                placeholder="5"
                className="mt-1"
                data-ocid="inventory.item_reorder_input"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Store Location</Label>
              <Input
                value={itemForm.storeLocation}
                onChange={handleItemLocationChange}
                placeholder="e.g. Room 2 Shelf A"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => void handleSaveItem()}
              disabled={savingItem}
              data-ocid="inventory.item_save_button"
            >
              {savingItem && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
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

      {/* ── Stock Modal ── */}
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
              value={stockQtyStr}
              onChange={handleStockQtyChange}
              className="mt-1"
              data-ocid="inventory.stock_qty_input"
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input
              value={stockNote}
              onChange={handleStockNoteChange}
              placeholder={
                stockAction === "in"
                  ? "Supplier / purchase order"
                  : "Issued to (student/staff)"
              }
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => void handleStockUpdate()}
              disabled={savingStock}
              data-ocid="inventory.stock_save_button"
            >
              {savingStock && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
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

      {/* ── Purchase Modal ── */}
      {showPurchaseModal && (
        <InvModal
          title="Record Purchase"
          onClose={() => setShowPurchaseModal(false)}
        >
          <div>
            <Label>Item *</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
              value={purchaseForm.itemId}
              onChange={(e) =>
                setPurchaseForm((p) => ({ ...p, itemId: e.target.value }))
              }
              data-ocid="inventory.purchase_item_select"
            >
              <option value="">Select Item</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (Current: {i.currentStock} {i.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity *</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={purchaseForm.quantityStr}
                onChange={(e) =>
                  setPurchaseForm((p) => ({
                    ...p,
                    quantityStr: e.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
                placeholder="10"
                className="mt-1"
                data-ocid="inventory.purchase_qty_input"
              />
            </div>
            <div>
              <Label>Rate (₹) *</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={purchaseForm.rateStr}
                onChange={(e) =>
                  setPurchaseForm((p) => ({
                    ...p,
                    rateStr: e.target.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1"),
                  }))
                }
                placeholder="200"
                className="mt-1"
                data-ocid="inventory.purchase_rate_input"
              />
            </div>
          </div>
          {purchaseForm.quantityStr && purchaseForm.rateStr && (
            <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm flex justify-between">
              <span className="text-muted-foreground">Total Cost</span>
              <span className="font-bold text-foreground">
                ₹
                {(
                  Number(purchaseForm.quantityStr) *
                  Number(purchaseForm.rateStr)
                ).toLocaleString("en-IN")}
              </span>
            </div>
          )}
          <div>
            <Label>Vendor</Label>
            <Input
              value={purchaseForm.vendor}
              onChange={(e) =>
                setPurchaseForm((p) => ({ ...p, vendor: e.target.value }))
              }
              placeholder="Vendor / supplier name"
              className="mt-1"
              data-ocid="inventory.purchase_vendor_input"
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={purchaseForm.date}
              onChange={(e) =>
                setPurchaseForm((p) => ({ ...p, date: e.target.value }))
              }
              className="mt-1"
              data-ocid="inventory.purchase_date_input"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => void handleSavePurchase()}
              disabled={savingPurchase}
              data-ocid="inventory.purchase_save_button"
            >
              {savingPurchase && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Record Purchase
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPurchaseModal(false)}
              data-ocid="inventory.purchase_cancel_button"
            >
              Cancel
            </Button>
          </div>
        </InvModal>
      )}
    </div>
  );
}
