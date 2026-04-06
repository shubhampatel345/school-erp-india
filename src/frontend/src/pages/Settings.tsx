import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Shield,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DEMO_USERS,
  getAllCredentials,
  saveCredentials,
  useAuth,
} from "../context/AuthContext";
import { useSchool } from "../context/SchoolContext";
import { permissionModules } from "../data/permissions";
import { getSchoolProfile, saveSchoolProfile } from "../data/schoolProfile";
import type { Role, RolePermissions } from "../types/auth";

const ROLES: { value: Role; label: string; color: string }[] = [
  {
    value: "super_admin",
    label: "Super Admin",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  {
    value: "admin",
    label: "Admin",
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  },
  {
    value: "accountant",
    label: "Accountant",
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  },
  {
    value: "librarian",
    label: "Librarian",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    value: "teacher",
    label: "Teacher",
    color: "bg-green-500/20 text-green-300 border-green-500/30",
  },
  {
    value: "parent",
    label: "Parent",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    value: "student",
    label: "Student",
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
];

function InputField({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-gray-400 text-xs block mb-1">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
      />
    </div>
  );
}

function RolePermissionsTab({
  role,
  readOnly,
}: { role: Role; readOnly?: boolean }) {
  const { permissions, updateRolePermissions } = useAuth();
  const [localPerms, setLocalPerms] = useState<RolePermissions>(
    () => permissions[role] ?? {},
  );

  const toggle = (
    module: string,
    feature: string,
    key: keyof import("../types/auth").Permission,
  ) => {
    if (readOnly) return;
    setLocalPerms((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [feature]: {
          ...prev[module]?.[feature],
          [key]: !prev[module]?.[feature]?.[key],
        },
      },
    }));
  };

  const setAll = (val: boolean) => {
    if (readOnly) return;
    const next: RolePermissions = {};
    for (const { module, features } of permissionModules) {
      next[module] = {};
      for (const f of features) {
        next[module][f] = { view: val, add: val, edit: val, delete: val };
      }
    }
    setLocalPerms(next);
  };

  const handleSave = () => {
    updateRolePermissions(role, localPerms);
    toast.success(
      `Permissions for ${ROLES.find((r) => r.value === role)?.label} saved!`,
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-xs">
            Manage module-level access for this role
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 border-gray-600 text-gray-300"
              onClick={() => setAll(true)}
              data-ocid="permissions.button"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 border-gray-600 text-gray-300"
              onClick={() => setAll(false)}
              data-ocid="permissions.button"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}
      {readOnly && (
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
            Read Only
          </Badge>
          <p className="text-gray-500 text-xs">
            Super Admin always has full access and cannot be modified.
          </p>
        </div>
      )}
      <ScrollArea className="h-[480px] rounded-lg border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#1a1f2e" }} className="sticky top-0 z-10">
              <th className="text-left px-3 py-2 text-gray-400 font-semibold w-1/2">
                Module / Feature
              </th>
              <th className="text-center px-2 py-2 text-gray-400 font-semibold">
                View
              </th>
              <th className="text-center px-2 py-2 text-gray-400 font-semibold">
                Add
              </th>
              <th className="text-center px-2 py-2 text-gray-400 font-semibold">
                Edit
              </th>
              <th className="text-center px-2 py-2 text-gray-400 font-semibold">
                Delete
              </th>
            </tr>
          </thead>
          <tbody>
            {permissionModules.map(({ module, features }) => (
              <>
                <tr key={`mod-${module}`} style={{ background: "#1e2535" }}>
                  <td
                    colSpan={5}
                    className="px-3 py-1.5 text-orange-400 font-semibold"
                    data-ocid="permissions.row"
                  >
                    {module}
                  </td>
                </tr>
                {features.map((feature) => {
                  const perm = localPerms[module]?.[feature] ?? {
                    view: false,
                    add: false,
                    edit: false,
                    delete: false,
                  };
                  return (
                    <tr
                      key={`${module}-${feature}`}
                      className="border-t border-gray-700/50 hover:bg-gray-800/30"
                    >
                      <td className="px-3 py-1.5 pl-6 text-gray-300">
                        {feature}
                      </td>
                      {(["view", "add", "edit", "delete"] as const).map((k) => (
                        <td key={k} className="text-center px-2 py-1.5">
                          <Checkbox
                            checked={perm[k]}
                            onCheckedChange={() => toggle(module, feature, k)}
                            disabled={readOnly}
                            className="border-gray-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                            data-ocid="permissions.checkbox"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </ScrollArea>
      {!readOnly && (
        <Button
          onClick={handleSave}
          className="self-start bg-orange-500 hover:bg-orange-600 text-white text-xs"
          data-ocid="permissions.save_button"
        >
          Save Permissions
        </Button>
      )}
    </div>
  );
}

export function Settings() {
  const [generalForm, setGeneralForm] = useState({
    schoolName: "PSM School",
    address: "123 Main Road, New Delhi - 110001",
    phone: "011-23456789",
    email: "info@psmschool.edu.in",
  });

  const [sessionForm, setSessionForm] = useState({
    session: "2025-26",
    currency: "INR (₹)",
    timezone: "Asia/Kolkata",
    admissionPrefix: "ADM",
    receiptPrefix: "RCP",
  });

  const [profile, setProfile] = useState(getSchoolProfile);
  const [newFeature, setNewFeature] = useState("");
  const [newPhoto, setNewPhoto] = useState("");
  const [activePermRole, setActivePermRole] = useState<Role>("admin");
  const {
    branches,
    activeBranch,
    setActiveBranch,
    addBranch,
    updateBranch,
    deleteBranch,
  } = useSchool();
  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
    contact: "",
    email: "",
    principal: "",
  });
  const [editingBranch, setEditingBranch] = useState<string | null>(null);

  const handleSaveGeneral = () => {
    toast.success("General settings saved!");
  };

  const handleSaveSession = () => {
    toast.success("Session settings saved!");
  };

  const handleSaveProfile = () => {
    saveSchoolProfile(profile);
    toast.success("School profile saved! Login page updated.");
  };

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">System Settings</h2>
      <Tabs defaultValue="general">
        <TabsList
          className="bg-gray-800 border border-gray-700 mb-4"
          data-ocid="settings.tab"
        >
          <TabsTrigger
            value="general"
            className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="session"
            className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            Session
          </TabsTrigger>
          <TabsTrigger
            value="school-profile"
            className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            School Profile
          </TabsTrigger>
          <TabsTrigger
            value="permissions"
            className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            Users
          </TabsTrigger>
          <TabsTrigger
            value="branches"
            className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            Branches
          </TabsTrigger>
          <TabsTrigger
            value="user-management"
            className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            User Mgmt
          </TabsTrigger>
          <TabsTrigger
            value="online-payment"
            className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            Online Payment
          </TabsTrigger>
          <TabsTrigger
            value="notification-scheduler"
            className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <div
            className="rounded-lg p-5 max-w-lg"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white text-sm font-medium mb-3">
              General Settings
            </h3>
            <div className="space-y-3">
              <InputField
                label="School Name"
                id="schoolName"
                value={generalForm.schoolName}
                onChange={(v) =>
                  setGeneralForm((p) => ({ ...p, schoolName: v }))
                }
              />
              <InputField
                label="Address"
                id="address"
                value={generalForm.address}
                onChange={(v) => setGeneralForm((p) => ({ ...p, address: v }))}
              />
              <InputField
                label="Phone"
                id="phone"
                value={generalForm.phone}
                onChange={(v) => setGeneralForm((p) => ({ ...p, phone: v }))}
              />
              <InputField
                label="Email"
                id="email"
                value={generalForm.email}
                onChange={(v) => setGeneralForm((p) => ({ ...p, email: v }))}
              />
            </div>
            <Button
              onClick={handleSaveGeneral}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white text-xs"
              data-ocid="settings.save_button"
            >
              Save Settings
            </Button>
          </div>
        </TabsContent>

        {/* Session Tab */}
        <TabsContent value="session">
          <div
            className="rounded-lg p-5 max-w-lg"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white text-sm font-medium mb-3">
              Session Settings
            </h3>
            <div className="space-y-3">
              <InputField
                label="Academic Session"
                id="session"
                value={sessionForm.session}
                onChange={(v) => setSessionForm((p) => ({ ...p, session: v }))}
              />
              <InputField
                label="Currency"
                id="currency"
                value={sessionForm.currency}
                onChange={(v) => setSessionForm((p) => ({ ...p, currency: v }))}
              />
              <InputField
                label="Timezone"
                id="timezone"
                value={sessionForm.timezone}
                onChange={(v) => setSessionForm((p) => ({ ...p, timezone: v }))}
              />
              <InputField
                label="Admission No Prefix"
                id="admissionPrefix"
                value={sessionForm.admissionPrefix}
                onChange={(v) =>
                  setSessionForm((p) => ({ ...p, admissionPrefix: v }))
                }
              />
              <InputField
                label="Receipt No Prefix"
                id="receiptPrefix"
                value={sessionForm.receiptPrefix}
                onChange={(v) =>
                  setSessionForm((p) => ({ ...p, receiptPrefix: v }))
                }
              />
            </div>
            <Button
              onClick={handleSaveSession}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white text-xs"
              data-ocid="settings.save_button"
            >
              Save Settings
            </Button>
          </div>
        </TabsContent>

        {/* School Profile Tab */}
        <TabsContent value="school-profile">
          <div
            className="rounded-lg p-5 max-w-2xl space-y-4"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white text-sm font-medium">
              School Profile (controls Login Page)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="School Name"
                id="pSchoolName"
                value={profile.schoolName}
                onChange={(v) => setProfile((p) => ({ ...p, schoolName: v }))}
              />
              <InputField
                label="Tagline"
                id="pTagline"
                value={profile.tagline}
                onChange={(v) => setProfile((p) => ({ ...p, tagline: v }))}
              />
              <InputField
                label="Phone"
                id="pPhone"
                value={profile.phone}
                onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
              />
              <InputField
                label="Email"
                id="pEmail"
                value={profile.email}
                onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
              />
            </div>
            <div>
              <label
                htmlFor="pAddress"
                className="text-gray-400 text-xs block mb-1"
              >
                Address
              </label>
              <input
                id="pAddress"
                value={profile.address}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, address: e.target.value }))
                }
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
              />
            </div>

            {/* Features */}
            <div>
              <p className="text-gray-400 text-xs mb-2">School Features</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {profile.features.map((feat, i) => (
                  <div
                    key={feat}
                    className="flex items-center gap-1 bg-gray-700/50 rounded-full px-2 py-1"
                    data-ocid={`profile.item.${i + 1}`}
                  >
                    <span className="text-gray-200 text-xs">{feat}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setProfile((p) => ({
                          ...p,
                          features: p.features.filter((_, j) => j !== i),
                        }))
                      }
                      className="text-gray-500 hover:text-red-400"
                      data-ocid={`profile.delete_button.${i + 1}`}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Add a feature..."
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                  data-ocid="profile.input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFeature.trim()) {
                      setProfile((p) => ({
                        ...p,
                        features: [...p.features, newFeature.trim()],
                      }));
                      setNewFeature("");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newFeature.trim()) {
                      setProfile((p) => ({
                        ...p,
                        features: [...p.features, newFeature.trim()],
                      }));
                      setNewFeature("");
                    }
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded px-2 py-1 text-xs"
                  data-ocid="profile.button"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Photo URLs */}
            <div>
              <p className="text-gray-400 text-xs mb-2">
                Photo Gallery URLs (login page carousel)
              </p>
              <div className="space-y-1.5 mb-2">
                {profile.photos.map((url, i) => (
                  <div
                    key={url}
                    className="flex items-center gap-2"
                    data-ocid={`gallery.item.${i + 1}`}
                  >
                    <span className="text-gray-400 text-xs flex-1 truncate">
                      {url}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setProfile((p) => ({
                          ...p,
                          photos: p.photos.filter((_, j) => j !== i),
                        }))
                      }
                      className="text-gray-500 hover:text-red-400"
                      data-ocid={`gallery.delete_button.${i + 1}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newPhoto}
                  onChange={(e) => setNewPhoto(e.target.value)}
                  placeholder="Paste photo URL..."
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                  data-ocid="gallery.input"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newPhoto.trim()) {
                      setProfile((p) => ({
                        ...p,
                        photos: [...p.photos, newPhoto.trim()],
                      }));
                      setNewPhoto("");
                    }
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded px-2 py-1 text-xs"
                  data-ocid="gallery.button"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
              data-ocid="profile.save_button"
            >
              Save Profile
            </Button>
          </div>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="permissions">
          <div
            className="rounded-lg p-5"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white text-sm font-medium mb-4">
              Roles & Permissions
            </h3>
            <Tabs
              value={activePermRole}
              onValueChange={(v) => setActivePermRole(v as Role)}
            >
              <TabsList
                className="bg-gray-800 border border-gray-700 flex-wrap h-auto gap-1 mb-4"
                data-ocid="permissions.tab"
              >
                {ROLES.map((r) => (
                  <TabsTrigger
                    key={r.value}
                    value={r.value}
                    className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                  >
                    {r.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {ROLES.map((r) => (
                <TabsContent key={r.value} value={r.value}>
                  <RolePermissionsTab
                    role={r.value}
                    readOnly={r.value === "super_admin"}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div
            className="rounded-lg p-5"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white text-sm font-medium mb-4">
              User Accounts
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-400">Name</th>
                    <th className="text-left py-2 px-3 text-gray-400">
                      User ID
                    </th>
                    <th className="text-left py-2 px-3 text-gray-400">
                      Password
                    </th>
                    <th className="text-left py-2 px-3 text-gray-400">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_USERS.map((u, i) => {
                    const roleInfo = ROLES.find((r) => r.value === u.role);
                    return (
                      <tr
                        key={u.userId}
                        className="border-t border-gray-700/50 hover:bg-gray-800/30"
                        data-ocid={`users.row.${i + 1}`}
                      >
                        <td className="py-2 px-3 text-white">{u.name}</td>
                        <td className="py-2 px-3 font-mono text-blue-300">
                          {u.userId}
                        </td>
                        <td className="py-2 px-3 font-mono text-gray-400">
                          {u.password}
                        </td>
                        <td className="py-2 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 border ${roleInfo?.color}`}
                          >
                            {roleInfo?.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="branches">
          <div
            className="rounded-lg p-5 max-w-3xl"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white font-semibold text-sm mb-4">
              School Branches
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label
                  htmlFor="branch-name"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Branch Name *
                </label>
                <input
                  id="branch-name"
                  value={
                    editingBranch
                      ? (branches.find((b) => b.id === editingBranch)?.name ??
                        branchForm.name)
                      : branchForm.name
                  }
                  onChange={(e) => {
                    if (editingBranch) {
                      const b = branches.find((x) => x.id === editingBranch);
                      if (b) updateBranch({ ...b, name: e.target.value });
                    } else {
                      setBranchForm((f) => ({ ...f, name: e.target.value }));
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-orange-500"
                  placeholder="e.g. North Campus"
                  data-ocid="branches.input"
                />
              </div>
              <div>
                <label
                  htmlFor="branch-principal"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Principal Name
                </label>
                <input
                  id="branch-principal"
                  value={
                    editingBranch
                      ? (branches.find((b) => b.id === editingBranch)
                          ?.principal ?? branchForm.principal)
                      : branchForm.principal
                  }
                  onChange={(e) => {
                    if (editingBranch) {
                      const b = branches.find((x) => x.id === editingBranch);
                      if (b) updateBranch({ ...b, principal: e.target.value });
                    } else {
                      setBranchForm((f) => ({
                        ...f,
                        principal: e.target.value,
                      }));
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-orange-500"
                  placeholder="Principal name"
                  data-ocid="branches.input"
                />
              </div>
              <div>
                <label
                  htmlFor="branch-address"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Address
                </label>
                <input
                  id="branch-address"
                  value={
                    editingBranch
                      ? (branches.find((b) => b.id === editingBranch)
                          ?.address ?? branchForm.address)
                      : branchForm.address
                  }
                  onChange={(e) => {
                    if (editingBranch) {
                      const b = branches.find((x) => x.id === editingBranch);
                      if (b) updateBranch({ ...b, address: e.target.value });
                    } else {
                      setBranchForm((f) => ({ ...f, address: e.target.value }));
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-orange-500"
                  placeholder="Branch address"
                  data-ocid="branches.input"
                />
              </div>
              <div>
                <label
                  htmlFor="branch-contact"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Contact
                </label>
                <input
                  id="branch-contact"
                  value={
                    editingBranch
                      ? (branches.find((b) => b.id === editingBranch)
                          ?.contact ?? branchForm.contact)
                      : branchForm.contact
                  }
                  onChange={(e) => {
                    if (editingBranch) {
                      const b = branches.find((x) => x.id === editingBranch);
                      if (b) updateBranch({ ...b, contact: e.target.value });
                    } else {
                      setBranchForm((f) => ({ ...f, contact: e.target.value }));
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-orange-500"
                  placeholder="Phone number"
                  data-ocid="branches.input"
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="branch-email"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Email
                </label>
                <input
                  id="branch-email"
                  value={
                    editingBranch
                      ? (branches.find((b) => b.id === editingBranch)?.email ??
                        branchForm.email)
                      : branchForm.email
                  }
                  onChange={(e) => {
                    if (editingBranch) {
                      const b = branches.find((x) => x.id === editingBranch);
                      if (b) updateBranch({ ...b, email: e.target.value });
                    } else {
                      setBranchForm((f) => ({ ...f, email: e.target.value }));
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-orange-500"
                  placeholder="branch@school.edu.in"
                  data-ocid="branches.input"
                />
              </div>
            </div>
            <div className="flex gap-2 mb-5">
              {editingBranch ? (
                <>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                    onClick={() => {
                      setEditingBranch(null);
                      toast.success("Branch updated");
                    }}
                    data-ocid="branches.save_button"
                  >
                    Update Branch
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-white text-xs h-7"
                    onClick={() => setEditingBranch(null)}
                    data-ocid="branches.cancel_button"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                  onClick={() => {
                    if (!branchForm.name.trim()) {
                      toast.error("Branch name is required");
                      return;
                    }
                    addBranch(branchForm);
                    setBranchForm({
                      name: "",
                      address: "",
                      contact: "",
                      email: "",
                      principal: "",
                    });
                    toast.success("Branch added");
                  }}
                  data-ocid="branches.primary_button"
                >
                  <Plus size={12} className="mr-1" /> Add Branch
                </Button>
              )}
            </div>
            <div className="overflow-hidden rounded border border-gray-700">
              <table className="w-full text-xs" data-ocid="branches.table">
                <thead>
                  <tr style={{ background: "#111827" }}>
                    <th className="text-left px-3 py-2 text-gray-400 font-medium">
                      Branch Name
                    </th>
                    <th className="text-left px-3 py-2 text-gray-400 font-medium hidden sm:table-cell">
                      Principal
                    </th>
                    <th className="text-left px-3 py-2 text-gray-400 font-medium hidden md:table-cell">
                      Contact
                    </th>
                    <th className="text-left px-3 py-2 text-gray-400 font-medium">
                      Status
                    </th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b, i) => (
                    <tr
                      key={b.id}
                      style={{
                        borderTop: "1px solid #374151",
                        background: i % 2 === 0 ? "#0f1117" : "#111827",
                      }}
                      data-ocid={`branches.item.${i + 1}`}
                    >
                      <td className="px-3 py-2 text-white font-medium">
                        {b.name}
                      </td>
                      <td className="px-3 py-2 text-gray-300 hidden sm:table-cell">
                        {b.principal || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-300 hidden md:table-cell">
                        {b.contact || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {activeBranch?.id === b.id ? (
                          <span className="text-green-400 text-[10px] font-semibold">
                            ● Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveBranch(b);
                              toast.success(`Switched to ${b.name}`);
                            }}
                            className="text-blue-400 text-[10px] hover:underline"
                            data-ocid="branches.toggle"
                          >
                            Set Active
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingBranch(b.id)}
                            className="text-blue-400 hover:text-blue-300 text-[10px]"
                            data-ocid={`branches.edit_button.${i + 1}`}
                          >
                            Edit
                          </button>
                          {b.id !== "main" && (
                            <button
                              type="button"
                              onClick={() => {
                                deleteBranch(b.id);
                                toast.success("Branch deleted");
                              }}
                              className="text-red-400 hover:text-red-300 text-[10px]"
                              data-ocid={`branches.delete_button.${i + 1}`}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="user-management">
          <UserManagementTab />
        </TabsContent>
        <TabsContent value="online-payment">
          <OnlinePaymentTab />
        </TabsContent>
        <TabsContent value="notification-scheduler">
          <NotificationSchedulerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// USER MANAGEMENT TAB COMPONENT
function UserManagementTab() {
  const { user: currentUser, resetPassword } = useAuth();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [resetModal, setResetModal] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Add Staff User modal state
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    fullName: "",
    position: "",
    otherPosition: "",
    mobile: "",
    password: "",
  });
  const [addUserShowPwd, setAddUserShowPwd] = useState(false);
  const [addUserError, setAddUserError] = useState("");

  const POSITION_OPTIONS = [
    "Admin",
    "Receptionist",
    "Accountant",
    "Librarian",
    "Teacher",
    "Nurse",
    "Clerk",
    "Peon",
    "Driver",
    "Other",
  ];

  const POSITION_TO_ROLE: Record<string, Role> = {
    Admin: "admin",
    Receptionist: "admin",
    Accountant: "accountant",
    Librarian: "librarian",
    Teacher: "teacher",
    Nurse: "admin",
    Clerk: "admin",
    Peon: "admin",
    Driver: "driver",
    Other: "admin",
  };

  function generatePassword(): string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  function handleAddUser() {
    setAddUserError("");
    if (!addUserForm.fullName.trim()) {
      setAddUserError("Full Name is required.");
      return;
    }
    if (!addUserForm.position) {
      setAddUserError("Position / Role is required.");
      return;
    }
    if (!addUserForm.mobile.trim()) {
      setAddUserError("Mobile No. is required.");
      return;
    }
    if (!addUserForm.password || addUserForm.password.length < 4) {
      setAddUserError("Password must be at least 4 characters.");
      return;
    }
    const role = POSITION_TO_ROLE[addUserForm.position] ?? "admin";
    const positionLabel =
      addUserForm.position === "Other" && addUserForm.otherPosition
        ? addUserForm.otherPosition
        : addUserForm.position;
    const newCred = {
      userId: addUserForm.mobile.trim(),
      password: addUserForm.password,
      name: addUserForm.fullName.trim(),
      role,
    };
    const existing = getAllCredentials();
    const isDuplicate = existing.some((c) => c.userId === newCred.userId);
    if (isDuplicate) {
      setAddUserError(`Username "${newCred.userId}" already exists.`);
      return;
    }
    saveCredentials([...existing, newCred]);
    toast.success(
      `Staff user added. Username: ${addUserForm.mobile.trim()} (${positionLabel})`,
    );
    setAddUserForm({
      fullName: "",
      position: "",
      otherPosition: "",
      mobile: "",
      password: "",
    });
    setShowAddUser(false);
  }

  const allCreds = getAllCredentials();
  const DEMO_IDS = new Set(DEMO_USERS.map((u) => u.userId));
  const allUsers = [
    ...DEMO_USERS.map((u) => {
      const stored = allCreds.find((c) => c.userId === u.userId);
      return {
        userId: u.userId,
        name: u.name,
        role: u.role,
        password: stored?.password || u.password,
      };
    }),
    ...allCreds
      .filter((c) => !DEMO_IDS.has(c.userId))
      .map((c) => ({
        userId: c.userId,
        name: c.name,
        role: c.role,
        password: c.password,
      })),
  ];

  const filtered = allUsers.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.userId.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      filterRole === "all" ||
      u.role === filterRole ||
      (filterRole === "students" && u.role === "student") ||
      (filterRole === "teachers" && u.role === "teacher") ||
      (filterRole === "parents" && u.role === "parent") ||
      (filterRole === "staff" &&
        ["admin", "accountant", "librarian", "super_admin", "driver"].includes(
          u.role,
        ));
    return matchSearch && matchRole;
  });

  const ROLE_BADGE: Record<string, string> = {
    super_admin: "bg-red-500/20 text-red-300 border-red-500/30",
    admin: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    accountant: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    librarian: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    teacher: "bg-green-500/20 text-green-300 border-green-500/30",
    parent: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    student: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    driver: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  };

  const handleReset = () => {
    setPwdError("");
    if (!newPwd || !confirmPwd) {
      setPwdError("Both fields required.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Passwords do not match.");
      return;
    }
    if (newPwd.length < 4) {
      setPwdError("Minimum 4 characters.");
      return;
    }
    if (!resetModal) return;
    const ok = resetPassword(resetModal.userId, newPwd);
    if (ok) {
      setPwdSuccess(true);
      setTimeout(() => {
        setResetModal(null);
        setPwdSuccess(false);
        setNewPwd("");
        setConfirmPwd("");
      }, 1500);
    } else {
      setPwdError("Could not reset password.");
    }
  };

  if (currentUser?.role !== "super_admin" && currentUser?.role !== "admin") {
    return (
      <div className="text-gray-400 text-sm p-4">
        Only Super Admin can manage users.
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-5"
      style={{ background: "#1a1f2e", border: "1px solid #374151" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-orange-400" />
        <h3 className="text-white text-sm font-medium">User Management</h3>
        <span className="text-gray-500 text-xs ml-2">
          {filtered.length} users
        </span>
        {currentUser?.role === "super_admin" && (
          <button
            type="button"
            onClick={() => {
              setAddUserForm({
                fullName: "",
                position: "",
                otherPosition: "",
                mobile: "",
                password: "",
              });
              setAddUserError("");
              setShowAddUser(true);
            }}
            className="ml-auto flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded transition"
            data-ocid="user_management.primary_button"
          >
            <Plus size={13} /> Add Staff User
          </button>
        )}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or username..."
          className="flex-1 min-w-[160px] bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-blue-500"
          data-ocid="user_management.search_input"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
          data-ocid="user_management.select"
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="teachers">Teachers</option>
          <option value="accountant">Accountant</option>
          <option value="librarian">Librarian</option>
          <option value="students">Students</option>
          <option value="parents">Parents</option>
          <option value="driver">Driver</option>
        </select>
      </div>
      <div className="rounded-lg overflow-hidden border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr
              style={{
                background: "#0d111c",
                borderBottom: "1px solid #1f2937",
              }}
            >
              <th className="text-left py-2 px-3 text-gray-400 font-medium">
                Name
              </th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">
                Username
              </th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">
                Role
              </th>
              <th className="text-left py-2 px-3 text-gray-400 font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((u, i) => (
              <tr
                key={u.userId}
                style={{
                  background: i % 2 === 0 ? "#0d111c" : "#111827",
                  borderBottom: "1px solid #1f2937",
                }}
                data-ocid={`user_management.row.${i + 1}`}
              >
                <td className="py-2 px-3 text-white font-medium">{u.name}</td>
                <td className="py-2 px-3 font-mono text-blue-300 text-[11px]">
                  {u.userId}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${ROLE_BADGE[u.role] || "bg-gray-700 text-gray-300"}`}
                  >
                    {u.role.replace("_", " ")}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <button
                    type="button"
                    onClick={() => {
                      setResetModal({ userId: u.userId, name: u.name });
                      setNewPwd("");
                      setConfirmPwd("");
                      setPwdError("");
                      setPwdSuccess(false);
                    }}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-700 rounded px-2 py-0.5 transition"
                    data-ocid="user_management.edit_button"
                  >
                    <KeyRound size={11} /> Reset Pwd
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div
            className="text-center py-8 text-gray-500"
            data-ocid="user_management.empty_state"
          >
            No users found.
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          data-ocid="user_management.dialog"
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm shadow-2xl"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white text-base font-semibold mb-1">
              Reset Password
            </h3>
            <p className="text-gray-400 text-xs mb-4">
              For:{" "}
              <span className="text-white font-medium">{resetModal.name}</span>{" "}
              ({resetModal.userId})
            </p>
            {pwdSuccess ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">&#10003;</div>
                <p className="text-green-400 font-semibold">
                  Password reset successfully!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="um-new-pwd"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="um-new-pwd"
                      type={showPwd ? "text" : "password"}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-blue-500 pr-8"
                      data-ocid="user_management.input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="um-conf-pwd"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="um-conf-pwd"
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                    data-ocid="user_management.input"
                  />
                </div>
                {pwdError && (
                  <p
                    className="text-red-400 text-xs"
                    data-ocid="user_management.error_state"
                  >
                    {pwdError}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium transition"
                    data-ocid="user_management.confirm_button"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetModal(null)}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition"
                    data-ocid="user_management.cancel_button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Staff User Modal */}
      {showAddUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          data-ocid="user_management.modal"
        >
          <div
            className="rounded-xl p-6 w-full max-w-md shadow-2xl"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Add Staff User</h3>
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="user_management.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="au-name"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="au-name"
                  value={addUserForm.fullName}
                  onChange={(e) =>
                    setAddUserForm((p) => ({ ...p, fullName: e.target.value }))
                  }
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-green-500"
                  data-ocid="user_management.input"
                />
              </div>
              <div>
                <label
                  htmlFor="au-position"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Position / Role *
                </label>
                <select
                  id="au-position"
                  value={addUserForm.position}
                  onChange={(e) =>
                    setAddUserForm((p) => ({
                      ...p,
                      position: e.target.value,
                      otherPosition: "",
                    }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-green-500"
                  data-ocid="user_management.select"
                >
                  <option value="">Select Position</option>
                  {POSITION_OPTIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>
              {addUserForm.position === "Other" && (
                <div>
                  <label
                    htmlFor="au-other"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    Specify Position
                  </label>
                  <input
                    id="au-other"
                    value={addUserForm.otherPosition}
                    onChange={(e) =>
                      setAddUserForm((p) => ({
                        ...p,
                        otherPosition: e.target.value,
                      }))
                    }
                    placeholder="Enter position title"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-green-500"
                    data-ocid="user_management.input"
                  />
                </div>
              )}
              <div>
                <label
                  htmlFor="au-mobile"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Mobile No. * (becomes username)
                </label>
                <input
                  id="au-mobile"
                  value={addUserForm.mobile}
                  onChange={(e) =>
                    setAddUserForm((p) => ({ ...p, mobile: e.target.value }))
                  }
                  placeholder="10-digit mobile number"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-green-500"
                  data-ocid="user_management.input"
                />
              </div>
              <div>
                <label
                  htmlFor="au-pwd"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Password * (min 4 chars)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="au-pwd"
                      type={addUserShowPwd ? "text" : "password"}
                      value={addUserForm.password}
                      onChange={(e) =>
                        setAddUserForm((p) => ({
                          ...p,
                          password: e.target.value,
                        }))
                      }
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-green-500 pr-9"
                      data-ocid="user_management.input"
                    />
                    <button
                      type="button"
                      onClick={() => setAddUserShowPwd((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {addUserShowPwd ? (
                        <EyeOff size={13} />
                      ) : (
                        <Eye size={13} />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAddUserForm((p) => ({
                        ...p,
                        password: generatePassword(),
                      }))
                    }
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-xs transition"
                    data-ocid="user_management.button"
                  >
                    Generate
                  </button>
                </div>
              </div>
              {addUserError && (
                <p
                  className="text-red-400 text-xs"
                  data-ocid="user_management.error_state"
                >
                  {addUserError}
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={handleAddUser}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2 text-sm font-medium transition"
                data-ocid="user_management.submit_button"
              >
                Add Staff User
              </button>
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition"
                data-ocid="user_management.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ONLINE PAYMENT TAB COMPONENT
function OnlinePaymentTab() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("erp_payment_settings") || "{}",
      ) as Record<string, { enabled: boolean; merchantId: string }>;
    } catch {
      return {};
    }
  });

  const gateways = [
    {
      id: "gpay",
      name: "GPay (Google Pay)",
      icon: "🟢",
      desc: "Accept UPI payments via Google Pay",
    },
    {
      id: "razorpay",
      name: "Razorpay",
      icon: "🔵",
      desc: "Cards, UPI, Netbanking via Razorpay",
    },
    {
      id: "payu",
      name: "PayU",
      icon: "🟠",
      desc: "Multiple payment methods via PayU",
    },
  ];

  const toggle = (id: string) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        [id]: {
          ...prev[id],
          enabled: !prev[id]?.enabled,
          merchantId: prev[id]?.merchantId || "",
        },
      };
      localStorage.setItem("erp_payment_settings", JSON.stringify(updated));
      toast.success(
        `${id.toUpperCase()} ${updated[id].enabled ? "enabled" : "disabled"}`,
      );
      return updated;
    });
  };

  const setMerchantId = (id: string, val: string) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        [id]: {
          ...prev[id],
          merchantId: val,
          enabled: prev[id]?.enabled || false,
        },
      };
      localStorage.setItem("erp_payment_settings", JSON.stringify(updated));
      return updated;
    });
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="text-gray-400 text-sm p-4">
        Only Super Admin can configure payment settings.
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-5 max-w-2xl"
      style={{ background: "#1a1f2e", border: "1px solid #374151" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Smartphone size={16} className="text-orange-400" />
        <h3 className="text-white text-sm font-medium">
          Online Payment Gateways
        </h3>
      </div>
      <p className="text-gray-500 text-xs mb-5">
        Enable payment gateways to allow students/parents to pay fees online via
        UPI, cards, or net banking.
      </p>
      <div className="space-y-4">
        {gateways.map((gw) => (
          <div
            key={gw.id}
            className="rounded-lg p-4"
            style={{ background: "#111827", border: "1px solid #1f2937" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{gw.icon}</span>
                <div>
                  <p className="text-white text-sm font-medium">{gw.name}</p>
                  <p className="text-gray-500 text-xs">{gw.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(gw.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[gw.id]?.enabled ? "bg-green-600" : "bg-gray-600"}`}
                data-ocid="payment.toggle"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings[gw.id]?.enabled ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
            {settings[gw.id]?.enabled && (
              <div className="mt-2">
                <label
                  htmlFor={`merchant-${gw.id}`}
                  className="text-gray-400 text-xs block mb-1"
                >
                  Merchant ID / API Key
                </label>
                <input
                  id={`merchant-${gw.id}`}
                  type="text"
                  value={settings[gw.id]?.merchantId || ""}
                  onChange={(e) => setMerchantId(gw.id, e.target.value)}
                  placeholder={`Enter ${gw.name} merchant ID or key...`}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-green-500"
                  data-ocid="payment.input"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded bg-blue-900/20 border border-blue-800">
        <p className="text-blue-300 text-xs">
          ℹ️ When enabled, students and parents can pay fees online from the Fees
          module. Payments are simulated in demo mode.
        </p>
      </div>
    </div>
  );
}

// NOTIFICATION SCHEDULER TAB COMPONENT
interface SchedulerRule {
  enabled: boolean;
  timing?: string;
  timingUnit?: string;
  sendTo: string;
  channel: string;
}

interface SchedulerSettings {
  feeDue: SchedulerRule;
  absentAlert: SchedulerRule;
  examTimetable: SchedulerRule;
  resultPublished: SchedulerRule;
  birthdayWish: SchedulerRule;
  generalNotice: SchedulerRule;
  homeworkReminder: SchedulerRule;
}

const DEFAULT_SCHEDULER: SchedulerSettings = {
  feeDue: {
    enabled: false,
    timing: "3",
    timingUnit: "days",
    sendTo: "parents",
    channel: "both",
  },
  absentAlert: { enabled: false, sendTo: "parents", channel: "whatsapp" },
  examTimetable: { enabled: false, sendTo: "all", channel: "rcs" },
  resultPublished: { enabled: false, sendTo: "students", channel: "both" },
  birthdayWish: {
    enabled: false,
    timing: "08:00",
    sendTo: "student",
    channel: "whatsapp",
  },
  generalNotice: { enabled: false, sendTo: "all", channel: "both" },
  homeworkReminder: {
    enabled: false,
    timing: "1",
    timingUnit: "days",
    sendTo: "students",
    channel: "rcs",
  },
};

function NotificationSchedulerTab() {
  const [rules, setRules] = useState<SchedulerSettings>(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("erp_notification_scheduler") || "{}",
      ) as Partial<SchedulerSettings>;
      return { ...DEFAULT_SCHEDULER, ...stored };
    } catch {
      return DEFAULT_SCHEDULER;
    }
  });

  const update = (
    key: keyof SchedulerSettings,
    field: keyof SchedulerRule,
    value: string | boolean,
  ) => {
    setRules((prev) => {
      const updated = { ...prev, [key]: { ...prev[key], [field]: value } };
      localStorage.setItem(
        "erp_notification_scheduler",
        JSON.stringify(updated),
      );
      return updated;
    });
  };

  const activeCount = Object.values(rules).filter((r) => r.enabled).length;

  const events = [
    {
      id: "feeDue" as const,
      title: "Fee Due Reminder",
      icon: "💰",
      desc: "Send reminder before fee due date",
      hasTiming: true,
      timingLabel: "Days before due",
    },
    {
      id: "absentAlert" as const,
      title: "Absent Alert",
      icon: "🚨",
      desc: "Notify parents when student is absent",
      hasTiming: false,
    },
    {
      id: "examTimetable" as const,
      title: "Exam Timetable Published",
      icon: "📅",
      desc: "Notify when exam timetable is published",
      hasTiming: false,
    },
    {
      id: "resultPublished" as const,
      title: "Result Published",
      icon: "📊",
      desc: "Notify when exam results are out",
      hasTiming: false,
    },
    {
      id: "birthdayWish" as const,
      title: "Birthday Wish",
      icon: "🎂",
      desc: "Auto-send birthday greetings",
      hasTiming: true,
      timingLabel: "Send at time",
      isTime: true,
    },
    {
      id: "generalNotice" as const,
      title: "General Notice",
      icon: "📢",
      desc: "Manual trigger for general announcements",
      hasTiming: false,
    },
    {
      id: "homeworkReminder" as const,
      title: "Homework Deadline Reminder",
      icon: "📝",
      desc: "Remind students before homework deadline",
      hasTiming: true,
      timingLabel: "Days before deadline",
    },
  ];

  return (
    <div className="max-w-2xl">
      <div
        className="rounded-lg p-4 mb-4 flex items-center justify-between"
        style={{ background: "#1a1f2e", border: "1px solid #374151" }}
      >
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-orange-400" />
          <h3 className="text-white text-sm font-medium">
            Notification Scheduler
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">Active Rules:</span>
          <span className="bg-green-900/50 text-green-400 text-xs px-2 py-0.5 rounded-full font-medium">
            {activeCount}/7
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {events.map((evt) => {
          const rule = rules[evt.id];
          return (
            <div
              key={evt.id}
              className="rounded-lg p-4"
              style={{
                background: "#1a1f2e",
                border: `1px solid ${rule.enabled ? "#16a34a40" : "#374151"}`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2">
                  <span className="text-xl mt-0.5">{evt.icon}</span>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {evt.title}
                    </p>
                    <p className="text-gray-500 text-xs">{evt.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => update(evt.id, "enabled", !rule.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-2 ${rule.enabled ? "bg-green-600" : "bg-gray-600"}`}
                  data-ocid="notification.toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rule.enabled ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
              {rule.enabled && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-700">
                  {evt.hasTiming && (
                    <div>
                      <label
                        htmlFor={`sched-timing-${evt.id}`}
                        className="text-gray-500 text-[10px] block mb-1"
                      >
                        {evt.timingLabel}
                      </label>
                      <input
                        id={`sched-timing-${evt.id}`}
                        type={evt.isTime ? "time" : "number"}
                        value={rule.timing || ""}
                        onChange={(e) =>
                          update(evt.id, "timing", e.target.value)
                        }
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-green-500"
                        data-ocid="notification.input"
                      />
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor={`sched-sendto-${evt.id}`}
                      className="text-gray-500 text-[10px] block mb-1"
                    >
                      Send To
                    </label>
                    <select
                      id={`sched-sendto-${evt.id}`}
                      value={rule.sendTo}
                      onChange={(e) => update(evt.id, "sendTo", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs outline-none"
                      data-ocid="notification.select"
                    >
                      <option value="all">All</option>
                      <option value="parents">Parents</option>
                      <option value="students">Students</option>
                      <option value="teachers">Teachers</option>
                      <option value="student">Student Only</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`sched-channel-${evt.id}`}
                      className="text-gray-500 text-[10px] block mb-1"
                    >
                      Channel
                    </label>
                    <select
                      id={`sched-channel-${evt.id}`}
                      value={rule.channel}
                      onChange={(e) =>
                        update(evt.id, "channel", e.target.value)
                      }
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs outline-none"
                      data-ocid="notification.select"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="rcs">RCS</option>
                      <option value="both">Both</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 p-3 rounded bg-green-900/20 border border-green-800">
        <p className="text-green-300 text-xs">
          ✅ Settings auto-save when you toggle or change any rule.
        </p>
      </div>
    </div>
  );
}
