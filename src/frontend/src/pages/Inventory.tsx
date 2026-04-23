/**
 * SHUBH SCHOOL ERP — Inventory Module (Rebuilt)
 * Tabs: Items | Stores | Stock Report | Purchase
 * ALL price/rate/quantity fields: type="text" inputMode="decimal" — NO spinners
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
  Package,
  Plus,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { formatCurrency, generateId } from "../utils/localStorage";

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
  storeLocation: string;
  sessionId?: string;
}

interface InvStore {
  id: string;
  storeName: string;
  location: string;
  incharge: string;
}

interface InvPurchase {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  rate: number;
  totalCost: number;
  vendor: string;
  date: string;
  sessionId?: string;
}

type Tab = "items" | "stores" | "report" | "purchase";

const LOW_STOCK_DEFAULT = 5;

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

// ── Modal — defined OUTSIDE Inventory to prevent remounts ────

function InvModal({
  title,
  onClose,
  children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
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

// ── Items form fields ─────────────────────────────────────────

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

// ── Store form ────────────────────────────────────────────────

interface StoreFormState {
  storeName: string;
  location: string;
  incharge: string;
}
const EMPTY_STORE_FORM: StoreFormState = {
  storeName: "",
  location: "",
  incharge: "",
};

// ── Purchase form ─────────────────────────────────────────────

interface PurchaseFormState {
  itemId: string;
  quantityStr: string;
  rateStr: string;
  vendor: string;
  date: string;
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
  const [stores, setStores] = useState<InvStore[]>([]);
  const [purchases, setPurchases] = useState<InvPurchase[]>([]);

  const categories = useMemo(() => {
    const fromItems = [
      ...new Set(items.map((i) => i.category).filter(Boolean)),
    ];
    return [...new Set([...DEFAULT_CATEGORIES, ...fromItems])].sort();
  }, [items]);

  useEffect(() => {
    setItems(getData("inventory_items") as InvItem[]);
    setStores(getData("inv_stores") as InvStore[]);
    setPurchases(getData("inv_purchases") as InvPurchase[]);
  }, [getData]);

  // ── Items state ────────────────────────────────────────────

  const [itemSearch, setItemSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);

  // Stock action modal
  const [stockItemId, setStockItemId] = useState<string | null>(null);
  const [stockAction, setStockAction] = useState<"in" | "out">("in");
  const [stockQtyStr, setStockQtyStr] = useState("1");
  const [stockNote, setStockNote] = useState("");
  const [stockError, setStockError] = useState("");

  // ── Store state ────────────────────────────────────────────

  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editStoreId, setEditStoreId] = useState<string | null>(null);
  const [storeForm, setStoreForm] = useState<StoreFormState>(EMPTY_STORE_FORM);

  // ── Purchase state ─────────────────────────────────────────

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>({
    itemId: "",
    quantityStr: "",
    rateStr: "",
    vendor: "",
    date: new Date().toISOString().split("T")[0],
  });

  // ── Stable item field handlers ─────────────────────────────
  // CRITICAL: useCallback([]) prevents remount on every keystroke

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

  // ── Stable store field handlers ────────────────────────────

  const handleStoreNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setStoreForm((p) => ({ ...p, storeName: e.target.value })),
    [],
  );
  const handleStoreLocationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setStoreForm((p) => ({ ...p, location: e.target.value })),
    [],
  );
  const handleStoreInchargeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setStoreForm((p) => ({ ...p, incharge: e.target.value })),
    [],
  );

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
      currentStockStr: item.currentStock ? String(item.currentStock) : "",
      reorderLevelStr: item.reorderLevel ? String(item.reorderLevel) : "5",
      storeLocation: item.storeLocation,
    });
    setEditItemId(item.id);
    setShowItemModal(true);
  }, []);

  const handleSaveItem = useCallback(async () => {
    if (!itemForm.name.trim()) return;
    const itemData: InvItem = {
      id: editItemId ?? generateId(),
      name: itemForm.name.trim(),
      category: itemForm.category,
      unit: itemForm.unit,
      costPrice: Number(itemForm.costPriceStr) || 0,
      sellingPrice: Number(itemForm.sellingPriceStr) || 0,
      currentStock: Number(itemForm.currentStockStr) || 0,
      reorderLevel: Number(itemForm.reorderLevelStr) || LOW_STOCK_DEFAULT,
      storeLocation: itemForm.storeLocation,
      sessionId,
    };
    if (editItemId) {
      await updateData(
        "inventory_items",
        editItemId,
        itemData as unknown as Record<string, unknown>,
      );
      setItems((prev) => prev.map((i) => (i.id === editItemId ? itemData : i)));
      addNotification(`"${itemData.name}" updated`, "success", "📦");
    } else {
      await saveData(
        "inventory_items",
        itemData as unknown as Record<string, unknown>,
      );
      setItems((prev) => [...prev, itemData]);
      addNotification(`"${itemData.name}" added`, "success", "📦");
    }
    setShowItemModal(false);
    setEditItemId(null);
  }, [itemForm, editItemId, sessionId, updateData, saveData, addNotification]);

  const handleDeleteItem = useCallback(
    async (id: string) => {
      if (!confirm("Delete this item?")) return;
      await deleteData("inventory_items", id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      addNotification("Item deleted", "info");
    },
    [deleteData, addNotification],
  );

  // ── Stock In/Out ───────────────────────────────────────────

  const openStockModal = useCallback((item: InvItem, action: "in" | "out") => {
    setStockItemId(item.id);
    setStockAction(action);
    setStockQtyStr("1");
    setStockNote("");
    setStockError("");
  }, []);

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

  const handleStockUpdate = useCallback(async () => {
    const qty = Number(stockQtyStr) || 0;
    if (!stockItemId || qty <= 0) return;
    const item = items.find((i) => i.id === stockItemId);
    if (!item) return;
    if (stockAction === "out" && qty > item.currentStock) {
      setStockError(
        `Insufficient stock. Available: ${item.currentStock} ${item.unit}`,
      );
      return;
    }
    const newStock =
      stockAction === "in" ? item.currentStock + qty : item.currentStock - qty;
    const updated: InvItem = { ...item, currentStock: newStock };
    await updateData(
      "inventory_items",
      item.id,
      updated as unknown as Record<string, unknown>,
    );
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    addNotification(
      `${stockAction === "in" ? "Added" : "Issued"} ${qty} × ${item.name}`,
      "success",
    );
    if (newStock <= item.reorderLevel)
      addNotification(
        `⚠️ Low stock: ${item.name} — ${newStock} left`,
        "warning",
      );
    setStockItemId(null);
  }, [
    stockItemId,
    stockAction,
    stockQtyStr,
    items,
    updateData,
    addNotification,
  ]);

  // ── Store CRUD ─────────────────────────────────────────────

  const openAddStore = useCallback(() => {
    setStoreForm(EMPTY_STORE_FORM);
    setEditStoreId(null);
    setShowStoreModal(true);
  }, []);
  const openEditStore = useCallback((s: InvStore) => {
    setStoreForm({
      storeName: s.storeName,
      location: s.location,
      incharge: s.incharge,
    });
    setEditStoreId(s.id);
    setShowStoreModal(true);
  }, []);

  const handleSaveStore = useCallback(async () => {
    if (!storeForm.storeName.trim()) return;
    if (editStoreId) {
      await updateData("inv_stores", editStoreId, {
        id: editStoreId,
        ...storeForm,
      });
      setStores((prev) =>
        prev.map((s) =>
          s.id === editStoreId ? { id: editStoreId, ...storeForm } : s,
        ),
      );
    } else {
      const newStore: InvStore = { id: generateId(), ...storeForm };
      await saveData(
        "inv_stores",
        newStore as unknown as Record<string, unknown>,
      );
      setStores((prev) => [...prev, newStore]);
    }
    setShowStoreModal(false);
    setEditStoreId(null);
  }, [storeForm, editStoreId, updateData, saveData]);

  const handleDeleteStore = useCallback(
    async (id: string) => {
      await deleteData("inv_stores", id);
      setStores((prev) => prev.filter((s) => s.id !== id));
    },
    [deleteData],
  );

  // ── Purchase ──────────────────────────────────────────────

  const handleSavePurchase = useCallback(async () => {
    const { itemId, quantityStr, rateStr, vendor, date } = purchaseForm;
    if (!itemId || !quantityStr || !rateStr) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const qty = Number(quantityStr) || 0;
    const rate = Number(rateStr) || 0;
    const purchase: InvPurchase = {
      id: generateId(),
      itemId,
      itemName: item.name,
      quantity: qty,
      rate,
      totalCost: qty * rate,
      vendor,
      date,
      sessionId,
    };
    await saveData(
      "inv_purchases",
      purchase as unknown as Record<string, unknown>,
    );
    setPurchases((prev) => [...prev, purchase]);
    // Update stock
    const updated: InvItem = { ...item, currentStock: item.currentStock + qty };
    await updateData(
      "inventory_items",
      item.id,
      updated as unknown as Record<string, unknown>,
    );
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    addNotification(
      `Purchase recorded: ${qty} × ${item.name}`,
      "success",
      "🛒",
    );
    setShowPurchaseModal(false);
    setPurchaseForm({
      itemId: "",
      quantityStr: "",
      rateStr: "",
      vendor: "",
      date: new Date().toISOString().split("T")[0],
    });
  }, [purchaseForm, items, sessionId, saveData, updateData, addNotification]);

  // ── Derived ────────────────────────────────────────────────

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
    { id: "stores", label: "Stores", icon: Warehouse },
    { id: "report", label: "Stock Report", icon: AlertTriangle },
    { id: "purchase", label: "Purchase", icon: Plus },
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
              {stores.length}
            </div>
            <div className="text-xs text-muted-foreground">Stores</div>
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
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
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
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items…"
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
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              {!isReadOnly && (
                <Button
                  onClick={openAddItem}
                  data-ocid="inventory.add_item_button"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              )}
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
                        "Cost Price",
                        "Sell Price",
                        "Stock",
                        "Reorder Level",
                        "Location",
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
                        i.storeLocation,
                        String(i.currentStock * i.costPrice),
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
                        Add inventory items to get started
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
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
                              Low Stock
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
                                onClick={() => handleDeleteItem(item.id)}
                                data-ocid={`inventory.delete_button.${idx + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
                      colSpan={2}
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

      {/* ── STORES TAB ── */}
      {tab === "stores" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Stores</h2>
            {!isReadOnly && (
              <Button
                onClick={openAddStore}
                data-ocid="inventory.add_store_button"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Store
              </Button>
            )}
          </div>
          {stores.length === 0 ? (
            <div
              className="py-12 text-center text-muted-foreground"
              data-ocid="inventory.stores_empty_state"
            >
              <Warehouse className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No stores added yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "Store Name",
                      "Location",
                      "Incharge",
                      "Items",
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
                  {stores.map((s, idx) => (
                    <tr
                      key={s.id}
                      className="border-t border-border hover:bg-muted/30"
                      data-ocid={`inventory.store.${idx + 1}`}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {s.storeName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.location || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {s.incharge || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {
                            items.filter((i) => i.storeLocation === s.storeName)
                              .length
                          }{" "}
                          items
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {!isReadOnly && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditStore(s)}
                              data-ocid={`inventory.edit_store_button.${idx + 1}`}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteStore(s.id)}
                              data-ocid={`inventory.delete_store_button.${idx + 1}`}
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

      {/* ── PURCHASE TAB ── */}
      {tab === "purchase" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Purchase Register
            </h2>
            {!isReadOnly && (
              <Button
                onClick={() => setShowPurchaseModal(true)}
                data-ocid="inventory.add_purchase_button"
              >
                <Plus className="w-4 h-4 mr-1" />
                Record Purchase
              </Button>
            )}
          </div>
          {purchases.length === 0 ? (
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
                  {[...purchases]
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
                          {p.itemName}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{p.quantity}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatCurrency(p.rate)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary tabular-nums">
                          {formatCurrency(p.totalCost)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.vendor || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="bg-muted/40">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-right font-semibold text-foreground"
                    >
                      Total:
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {formatCurrency(
                        purchases.reduce((a, p) => a + p.totalCost, 0),
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
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

      {/* ── Store Modal ── */}
      {showStoreModal && (
        <InvModal
          title={editStoreId ? "Edit Store" : "Add Store"}
          onClose={() => {
            setShowStoreModal(false);
            setEditStoreId(null);
          }}
        >
          <div>
            <Label>Store Name *</Label>
            <Input
              value={storeForm.storeName}
              onChange={handleStoreNameChange}
              placeholder="e.g. Main Store"
              className="mt-1"
              data-ocid="inventory.store_name_input"
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              value={storeForm.location}
              onChange={handleStoreLocationChange}
              placeholder="e.g. Ground Floor, Block B"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Incharge</Label>
            <Input
              value={storeForm.incharge}
              onChange={handleStoreInchargeChange}
              placeholder="Staff name"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSaveStore}
              data-ocid="inventory.store_save_button"
            >
              Save Store
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowStoreModal(false);
                setEditStoreId(null);
              }}
              data-ocid="inventory.store_cancel_button"
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
              <option value="">— Select Item —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.currentStock} {i.unit})
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
                placeholder="0"
                className="mt-1"
                data-ocid="inventory.purchase_qty_input"
              />
            </div>
            <div>
              <Label>Rate per unit (₹) *</Label>
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
                placeholder="0.00"
                className="mt-1"
                data-ocid="inventory.purchase_rate_input"
              />
            </div>
          </div>
          {purchaseForm.quantityStr && purchaseForm.rateStr && (
            <p className="text-sm font-semibold text-primary">
              Total Cost:{" "}
              {formatCurrency(
                (Number(purchaseForm.quantityStr) || 0) *
                  (Number(purchaseForm.rateStr) || 0),
              )}
            </p>
          )}
          <div>
            <Label>Vendor / Supplier</Label>
            <Input
              value={purchaseForm.vendor}
              onChange={(e) =>
                setPurchaseForm((p) => ({ ...p, vendor: e.target.value }))
              }
              placeholder="Vendor name"
              className="mt-1"
              data-ocid="inventory.purchase_vendor_input"
            />
          </div>
          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              value={purchaseForm.date}
              onChange={(e) =>
                setPurchaseForm((p) => ({ ...p, date: e.target.value }))
              }
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSavePurchase}
              data-ocid="inventory.purchase_save_button"
            >
              Save Purchase
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
