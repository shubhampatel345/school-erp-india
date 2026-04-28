/**
 * SHUBH SCHOOL ERP — Inventory Module
 * All data via apiCall(). No offline sync.
 * ALL price/qty fields: type="text" inputMode="decimal" — NO spinners.
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
import { apiCall } from "../utils/api";

// ── Types ──────────────────────────────────────────────────────

interface InvItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
}

interface InvTransaction {
  id: string;
  item_id: string;
  item_name?: string;
  type: "in" | "out";
  quantity: number;
  date: string;
  notes?: string;
}

type Tab = "items" | "stock_in" | "stock_out" | "report";

// ── Modal ──────────────────────────────────────────────────────

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
            className="text-muted-foreground hover:text-foreground text-xl w-8 h-8 flex items-center justify-center"
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

// ── Main ───────────────────────────────────────────────────────

export default function Inventory() {
  const [items, setItems] = useState<InvItem[]>([]);
  const [transactions, setTransactions] = useState<InvTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("items");

  // Item form
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<InvItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemUnit, setItemUnit] = useState("Pcs");
  const [itemReorder, setItemReorder] = useState("5");
  const [savingItem, setSavingItem] = useState(false);

  // Stock in/out form
  const [txItemId, setTxItemId] = useState("");
  const [txQty, setTxQty] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txNotes, setTxNotes] = useState("");
  const [txError, setTxError] = useState("");
  const [savingTx, setSavingTx] = useState(false);

  const TABS: {
    id: Tab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "items", label: "Items", icon: Package },
    { id: "stock_in", label: "Stock In", icon: Plus },
    { id: "stock_out", label: "Stock Out", icon: Warehouse },
    { id: "report", label: "Report", icon: AlertTriangle },
  ];

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall<{ data: InvItem[] }>("inventory/items");
      setItems((res as { data: InvItem[] }).data ?? []);
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await apiCall<{ data: InvTransaction[] }>(
        "inventory/transactions",
      );
      setTransactions((res as { data: InvTransaction[] }).data ?? []);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);
  useEffect(() => {
    if (tab === "report") void loadTransactions();
  }, [tab, loadTransactions]);

  const lowStock = useMemo(
    () => items.filter((i) => i.current_stock <= i.reorder_level),
    [items],
  );

  function openAdd() {
    setEditItem(null);
    setItemName("");
    setItemCategory("");
    setItemUnit("Pcs");
    setItemReorder("5");
    setShowItemModal(true);
  }
  function openEdit(item: InvItem) {
    setEditItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemUnit(item.unit);
    setItemReorder(String(item.reorder_level));
    setShowItemModal(true);
  }

  async function handleSaveItem() {
    if (!itemName.trim()) {
      toast.error("Item name required");
      return;
    }
    setSavingItem(true);
    try {
      await apiCall("inventory/item-add", "POST", {
        id: editItem?.id,
        name: itemName.trim(),
        category: itemCategory,
        unit: itemUnit,
        reorder_level: Number(itemReorder) || 5,
      });
      toast.success(editItem ? "Item updated" : "Item added");
      setShowItemModal(false);
      await loadItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      await apiCall("inventory/item-delete", "POST", { id });
      toast.success("Item deleted");
      await loadItems();
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function handleTransaction(type: "in" | "out") {
    setTxError("");
    const qty = Number(txQty) || 0;
    if (!txItemId) {
      toast.error("Select an item");
      return;
    }
    if (qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    if (type === "out") {
      const item = items.find((i) => i.id === txItemId);
      if (item && qty > item.current_stock) {
        setTxError(
          `Insufficient stock. Available: ${item.current_stock} ${item.unit}`,
        );
        return;
      }
    }
    setSavingTx(true);
    try {
      await apiCall("inventory/transaction", "POST", {
        item_id: txItemId,
        type,
        quantity: qty,
        date: txDate,
        notes: txNotes,
      });
      toast.success(
        `${type === "in" ? "Stock added" : "Stock issued"} successfully`,
      );
      setTxItemId("");
      setTxQty("");
      setTxNotes("");
      await loadItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update stock");
    } finally {
      setSavingTx(false);
    }
  }

  function exportCSV() {
    const rows = [
      ["Name", "Category", "Unit", "Stock", "Reorder Level", "Status"],
      ...items.map((i) => [
        i.name,
        i.category,
        i.unit,
        String(i.current_stock),
        String(i.reorder_level),
        i.current_stock <= i.reorder_level ? "Low Stock" : "OK",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = "inventory.csv";
    a.click();
  }

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Inventory
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage school store items, stock levels and transactions
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {items.length}
            </div>
            <div className="text-xs text-muted-foreground">Total Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-foreground">
              {items.reduce((s, i) => s + i.current_stock, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-foreground">
              {transactions.filter((t) => t.type === "in").length}
            </div>
            <div className="text-xs text-muted-foreground">
              Stock In (total)
            </div>
          </CardContent>
        </Card>
        <Card
          className={
            lowStock.length > 0
              ? "bg-destructive/5 border-destructive/20"
              : "bg-muted/30"
          }
        >
          <CardContent className="py-3 text-center">
            <div
              className={`text-2xl font-bold ${lowStock.length > 0 ? "text-destructive" : "text-foreground"}`}
            >
              {lowStock.length}
            </div>
            <div className="text-xs text-muted-foreground">Low Stock</div>
          </CardContent>
        </Card>
      </div>

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

      {/* Items Tab */}
      {tab === "items" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-foreground">
              All Items
            </h2>
            <div className="flex gap-2">
              <Button onClick={openAdd} data-ocid="inventory.add_item_button">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
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
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "Name",
                      "Category",
                      "Unit",
                      "Stock",
                      "Reorder Level",
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
                        colSpan={6}
                        className="px-4 py-12 text-center text-muted-foreground"
                        data-ocid="inventory.items_empty_state"
                      >
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <div className="font-medium">No items yet</div>
                        <div className="text-xs mt-1">
                          Add inventory items to get started
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const isLow = item.current_stock <= item.reorder_level;
                      return (
                        <tr
                          key={item.id}
                          className={`border-t border-border hover:bg-muted/30 ${isLow ? "bg-destructive/5" : ""}`}
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
                          <td className="px-4 py-3">
                            <Badge variant={isLow ? "destructive" : "outline"}>
                              {item.current_stock} {item.unit}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.reorder_level}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(item)}
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
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock In Tab */}
      {tab === "stock_in" && (
        <div className="max-w-md space-y-4">
          <h2 className="text-base font-semibold text-foreground">Add Stock</h2>
          {txError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              ⚠️ {txError}
            </div>
          )}
          <div>
            <Label>Item *</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
              value={txItemId}
              onChange={(e) => setTxItemId(e.target.value)}
              data-ocid="inventory.stock_in.item_select"
            >
              <option value="">Select Item</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (Current: {i.current_stock} {i.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Quantity *</Label>
            <Input
              type="text"
              inputMode="numeric"
              className="mt-1"
              value={txQty}
              onChange={(e) => {
                setTxQty(e.target.value.replace(/[^0-9]/g, ""));
                setTxError("");
              }}
              placeholder="0"
              data-ocid="inventory.stock_in.qty_input"
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              className="mt-1"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              data-ocid="inventory.stock_in.date_input"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              className="mt-1"
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              placeholder="Supplier / notes"
              data-ocid="inventory.stock_in.notes_input"
            />
          </div>
          <Button
            onClick={() => void handleTransaction("in")}
            disabled={savingTx}
            data-ocid="inventory.stock_in.submit_button"
          >
            {savingTx && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Add
            Stock
          </Button>
        </div>
      )}

      {/* Stock Out Tab */}
      {tab === "stock_out" && (
        <div className="max-w-md space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Issue Stock
          </h2>
          {txError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              ⚠️ {txError}
            </div>
          )}
          <div>
            <Label>Item *</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
              value={txItemId}
              onChange={(e) => setTxItemId(e.target.value)}
              data-ocid="inventory.stock_out.item_select"
            >
              <option value="">Select Item</option>
              {items
                .filter((i) => i.current_stock > 0)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.current_stock} {i.unit} available)
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label>Quantity *</Label>
            <Input
              type="text"
              inputMode="numeric"
              className="mt-1"
              value={txQty}
              onChange={(e) => {
                setTxQty(e.target.value.replace(/[^0-9]/g, ""));
                setTxError("");
              }}
              placeholder="0"
              data-ocid="inventory.stock_out.qty_input"
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              className="mt-1"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              data-ocid="inventory.stock_out.date_input"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              className="mt-1"
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              placeholder="Issued to (student/staff)"
              data-ocid="inventory.stock_out.notes_input"
            />
          </div>
          <Button
            onClick={() => void handleTransaction("out")}
            disabled={savingTx}
            data-ocid="inventory.stock_out.submit_button"
          >
            {savingTx && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Issue
            Stock
          </Button>
        </div>
      )}

      {/* Report Tab */}
      {tab === "report" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Stock Report
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              data-ocid="inventory.export_report_button"
            >
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
          {lowStock.length > 0 && (
            <div
              className="bg-destructive/5 border border-destructive/30 rounded-xl p-3"
              data-ocid="inventory.low_stock_alert"
            >
              <p className="text-sm font-semibold text-destructive mb-2">
                ⚠️ {lowStock.length} item(s) at or below reorder level
              </p>
              <div className="flex flex-wrap gap-1">
                {lowStock.map((i) => (
                  <Badge key={i.id} variant="destructive" className="text-xs">
                    {i.name}: {i.current_stock} {i.unit}
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
                    "Current Stock",
                    "Reorder Level",
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
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-muted-foreground"
                      data-ocid="inventory.report_empty_state"
                    >
                      No inventory items yet.
                    </td>
                  </tr>
                ) : (
                  [...items]
                    .sort((a, b) => a.current_stock - b.current_stock)
                    .map((item, idx) => {
                      const isLow = item.current_stock <= item.reorder_level;
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
                          <td className="px-4 py-3 font-bold">
                            {item.current_stock}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.reorder_level}
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
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Transaction history */}
          {transactions.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">
                Transaction History
              </h3>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Date", "Item", "Type", "Quantity", "Notes"].map(
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
                    {[...transactions]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((t, idx) => (
                        <tr
                          key={t.id}
                          className="border-t border-border hover:bg-muted/30"
                          data-ocid={`inventory.transaction.${idx + 1}`}
                        >
                          <td className="px-4 py-3 text-muted-foreground">
                            {t.date}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">
                            {t.item_name ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                t.type === "in" ? "default" : "secondary"
                              }
                            >
                              {t.type === "in" ? "Stock In" : "Stock Out"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {t.quantity}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {t.notes || "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <InvModal
          title={editItem ? "Edit Item" : "Add Item"}
          onClose={() => {
            setShowItemModal(false);
            setEditItem(null);
          }}
        >
          <div>
            <Label>Item Name *</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. School Dress"
              className="mt-1"
              data-ocid="inventory.item_name_input"
            />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value)}
            >
              <option value="">Select Category</option>
              {[
                "Uniform",
                "Tie",
                "Belt",
                "Shoes",
                "Books",
                "Stationery",
                "Sports",
                "Other",
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Unit</Label>
            <Input
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
              placeholder="Pcs / Pair / Set"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Reorder Level</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={itemReorder}
              onChange={(e) =>
                setItemReorder(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="5"
              className="mt-1"
              data-ocid="inventory.item_reorder_input"
            />
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
                setEditItem(null);
              }}
              data-ocid="inventory.item_cancel_button"
            >
              Cancel
            </Button>
          </div>
        </InvModal>
      )}
    </div>
  );
}
