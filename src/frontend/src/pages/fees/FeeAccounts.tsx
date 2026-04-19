import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApp } from "../../context/AppContext";
import type { FeeAccount, FeeHeading, FeeReceipt } from "../../types";
import { formatCurrency, generateId } from "../../utils/localStorage";

export default function FeeAccounts() {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    currentUser,
    isReadOnly,
    currentSession,
    addNotification,
  } = useApp();

  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const canEdit =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  // All data from context — collection keys match server MySQL tables
  const accounts = getData("feeAccounts") as FeeAccount[];

  const sessionReceipts = (getData("fee_receipts") as FeeReceipt[]).filter(
    (r) =>
      !r.isDeleted && (!currentSession || r.sessionId === currentSession.id),
  );

  const totalReceipts = sessionReceipts.reduce((s, r) => s + r.totalAmount, 0);

  // Heading-wise breakdown
  const feeHeadings = getData("fee_headings") as FeeHeading[];
  const headingTotals: Record<string, number> = {};
  let otherChargesTotal = 0;
  for (const receipt of sessionReceipts) {
    for (const item of receipt.items) {
      headingTotals[item.headingId] =
        (headingTotals[item.headingId] ?? 0) + item.amount;
    }
    if (Array.isArray(receipt.otherCharges)) {
      for (const oc of receipt.otherCharges) {
        otherChargesTotal += oc.paidAmount ?? 0;
      }
    }
  }

  const headingRows: { id: string; name: string; total: number }[] = [];
  const seenIds = new Set<string>();
  for (const h of feeHeadings) {
    const total = headingTotals[h.id] ?? 0;
    if (total > 0) {
      headingRows.push({ id: h.id, name: h.name, total });
      seenIds.add(h.id);
    }
  }
  for (const [hId, total] of Object.entries(headingTotals)) {
    if (!seenIds.has(hId) && total > 0) {
      let name = "(Deleted Heading)";
      outer: for (const receipt of sessionReceipts) {
        for (const item of receipt.items) {
          if (item.headingId === hId && item.headingName) {
            name = item.headingName;
            break outer;
          }
        }
      }
      headingRows.push({ id: hId, name, total });
    }
  }
  headingRows.sort((a, b) => b.total - a.total);
  const grandTotal =
    headingRows.reduce((s, r) => s + r.total, 0) + otherChargesTotal;

  async function addAccount() {
    if (!newName.trim()) return;
    const acc: FeeAccount = { id: generateId(), name: newName.trim() };
    await saveData("feeAccounts", acc as unknown as Record<string, unknown>);
    addNotification(`Account "${acc.name}" added`, "success");
    setNewName("");
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    await updateData("feeAccounts", id, { name: editName.trim() });
    setEditId(null);
    setEditName("");
  }

  async function deleteAccount(id: string) {
    if (!confirm("Delete this account?")) return;
    await deleteData("feeAccounts", id);
    addNotification("Account deleted", "info");
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-foreground">Fee Accounts</h3>
        <p className="text-sm text-muted-foreground">
          Manage account names and view heading-wise received fees
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-sm text-muted-foreground mb-1">
          Total Fees Received (Current Session)
        </p>
        <p className="text-2xl font-bold text-primary">
          {formatCurrency(totalReceipts)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {sessionReceipts.length} receipt(s) in this session
        </p>
      </div>

      {/* Add account */}
      {canEdit && !isReadOnly && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium mb-2">Add New Account</p>
          <div className="flex gap-2">
            <Input
              placeholder="Account name (e.g. Main Account, Lab Fund)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addAccount();
              }}
              data-ocid="add-account-input"
            />
            <Button
              onClick={() => void addAccount()}
              disabled={!newName.trim()}
              data-ocid="add-account-btn"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Accounts list */}
      {accounts.length === 0 ? (
        <div
          className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground"
          data-ocid="fee-accounts.empty_state"
        >
          <p className="text-lg mb-1">No accounts yet</p>
          <p className="text-sm">
            Add account names to track fee collections by account.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Account Name
                </th>
                {canEdit && (
                  <th className="px-4 py-3 text-center font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc, idx) => (
                <tr
                  key={acc.id}
                  className="border-t border-border hover:bg-muted/20"
                  data-ocid={`fee-account-row.item.${idx + 1}`}
                >
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    {editId === acc.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-48"
                          data-ocid="edit-account-input"
                        />
                        <Button
                          size="sm"
                          onClick={() => void saveEdit(acc.id)}
                          data-ocid="save-account-btn"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditId(null);
                            setEditName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <span className="font-medium">{acc.name}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        {editId !== acc.id && !isReadOnly && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditId(acc.id);
                                setEditName(acc.name);
                              }}
                              data-ocid={`edit-account-btn.${idx + 1}`}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/20 hover:bg-destructive/10"
                              onClick={() => void deleteAccount(acc.id)}
                              data-ocid={`delete-account-btn.${idx + 1}`}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Heading-wise Collections */}
      <div>
        <div className="mb-3">
          <h3 className="font-semibold text-foreground">
            Fee Heading-wise Collections (Current Session)
          </h3>
          <p className="text-sm text-muted-foreground">
            Total amount received per fee heading from all receipts in this
            session
          </p>
        </div>

        {headingRows.length === 0 && otherChargesTotal === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
            <p className="text-2xl mb-2">📋</p>
            <p className="font-medium">No fee collections recorded yet</p>
            <p className="text-sm mt-1">
              Collections will appear here once fee receipts are saved.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm" data-ocid="heading-wise-table">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Fee Heading
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    Amount Received
                  </th>
                </tr>
              </thead>
              <tbody>
                {headingRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-t border-border hover:bg-muted/20"
                    data-ocid="heading-collection-row"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
                {otherChargesTotal > 0 && (
                  <tr className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">
                      {headingRows.length + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      Other Charges
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {formatCurrency(otherChargesTotal)}
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 font-bold text-foreground">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground text-base">
                    {formatCurrency(grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
