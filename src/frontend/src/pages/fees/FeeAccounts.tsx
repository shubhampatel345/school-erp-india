import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApp } from "../../context/AppContext";
import type { FeeAccount, FeeReceipt } from "../../types";
import { formatCurrency, generateId, ls } from "../../utils/localStorage";

export default function FeeAccounts() {
  const { currentUser, isReadOnly, currentSession } = useApp();
  const [accounts, setAccounts] = useState<FeeAccount[]>([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const canEdit =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  useEffect(() => {
    setAccounts(ls.get<FeeAccount[]>("fee_accounts", []));
  }, []);

  function addAccount() {
    if (!newName.trim()) return;
    const acc: FeeAccount = { id: generateId(), name: newName.trim() };
    const updated = [...accounts, acc];
    ls.set("fee_accounts", updated);
    setAccounts(updated);
    setNewName("");
  }

  function saveEdit(id: string) {
    if (!editName.trim()) return;
    const updated = accounts.map((a) =>
      a.id === id ? { ...a, name: editName.trim() } : a,
    );
    ls.set("fee_accounts", updated);
    setAccounts(updated);
    setEditId(null);
    setEditName("");
  }

  function deleteAccount(id: string) {
    if (!confirm("Delete this account?")) return;
    const updated = accounts.filter((a) => a.id !== id);
    ls.set("fee_accounts", updated);
    setAccounts(updated);
  }

  const sessionReceipts = ls
    .get<FeeReceipt[]>("fee_receipts", [])
    .filter(
      (r) =>
        !r.isDeleted && (!currentSession || r.sessionId === currentSession.id),
    );

  const totalReceipts = sessionReceipts.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Fee Accounts</h3>
        <p className="text-sm text-muted-foreground">
          Manage account names and view account-wise received fees
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
              placeholder="Account name (e.g. Main Account, Hostel Fund)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAccount()}
              data-ocid="add-account-input"
            />
            <Button
              onClick={addAccount}
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
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
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
                <th className="px-4 py-3 text-right font-semibold">
                  Fees Received
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
                  data-ocid="fee-account-row"
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
                          onClick={() => saveEdit(acc.id)}
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
                  <td className="px-4 py-3 text-right font-semibold text-green-600">
                    {/* First account shows total session receipts; others show 0 until tagged */}
                    {idx === 0
                      ? formatCurrency(totalReceipts)
                      : formatCurrency(0)}
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
                              data-ocid="edit-account-btn"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => deleteAccount(acc.id)}
                              data-ocid="delete-account-btn"
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
    </div>
  );
}
