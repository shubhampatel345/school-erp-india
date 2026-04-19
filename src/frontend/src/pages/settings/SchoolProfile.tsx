import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  CreditCard,
  Globe,
  ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import { getApiIndexUrl, getJwt, isApiConfigured } from "../../utils/api";

interface SchoolProfileData {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  principalName: string;
  affiliationNo: string;
  affiliatedBoard: string;
  schoolCode: string;
  city: string;
  state: string;
  pincode: string;
  timezone: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifscCode: string;
  dashboardBackground: string;
}

const DEFAULT: SchoolProfileData = {
  id: "school_profile_1",
  name: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  logo: "",
  principalName: "",
  affiliationNo: "",
  affiliatedBoard: "",
  schoolCode: "",
  city: "",
  state: "",
  pincode: "",
  timezone: "Asia/Kolkata",
  bankName: "",
  branchName: "",
  accountNumber: "",
  ifscCode: "",
  dashboardBackground: "",
};

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Kathmandu",
  "Asia/Colombo",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Singapore",
  "UTC",
];

async function loadProfileFromServer(): Promise<SchoolProfileData | null> {
  if (!isApiConfigured()) return null;
  const indexUrl = getApiIndexUrl();
  const jwt = getJwt();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  try {
    const res = await fetch(`${indexUrl}?route=school_settings/list`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    if (text.trimStart().startsWith("<")) return null;
    const json = JSON.parse(text) as {
      data?: SchoolProfileData[] | SchoolProfileData;
      status?: string;
    };
    const data = json.data;
    if (!data) return null;
    if (Array.isArray(data)) return (data[0] as SchoolProfileData) ?? null;
    return data as SchoolProfileData;
  } catch {
    return null;
  }
}

async function saveProfileToServer(profile: SchoolProfileData): Promise<void> {
  const indexUrl = getApiIndexUrl();
  const jwt = getJwt();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  const res = await fetch(`${indexUrl}?route=school_settings/save`, {
    method: "POST",
    headers,
    body: JSON.stringify(profile),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  if (text.trimStart().startsWith("<"))
    throw new Error("Server returned HTML. Check api/index.php is uploaded.");
  const json = JSON.parse(text) as { status?: string; message?: string };
  if (json.status === "error")
    throw new Error(json.message ?? "Failed to save");
}

export default function SchoolProfile() {
  const { getData, saveData } = useApp();
  const [profile, setProfile] = useState<SchoolProfileData>(() => {
    const saved = getData("schoolProfile") as SchoolProfileData[];
    return saved[0] ? { ...DEFAULT, ...saved[0] } : { ...DEFAULT };
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadProfileFromServer()
      .then((data) => {
        if (data) setProfile({ ...DEFAULT, ...data });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set(field: keyof SchoolProfileData, value: string) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  function handleFileUpload(
    field: "logo" | "dashboardBackground",
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set(field, ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!profile.name.trim()) {
      toast.error("School name is required.");
      return;
    }
    setSaving(true);
    try {
      // Save to server first
      if (isApiConfigured()) {
        await saveProfileToServer(profile);
        toast.success("School profile saved to server.");
      }
      // Also save to local via AppContext
      await saveData(
        "schoolProfile",
        profile as unknown as Record<string, unknown>,
      );
      if (!isApiConfigured()) toast.success("School profile saved locally.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  const F = ({
    id,
    label,
    placeholder,
    type = "text",
  }: {
    id: keyof SchoolProfileData;
    label: string;
    placeholder?: string;
    type?: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={`sp-${id}`}>{label}</Label>
      <Input
        id={`sp-${id}`}
        type={type}
        value={(profile[id] as string) ?? ""}
        onChange={(e) => set(id, e.target.value)}
        placeholder={placeholder}
        data-ocid={`school-profile.${id}.input`}
      />
    </div>
  );

  if (loading)
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading profile from
        server…
      </div>
    );

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6 animate-fade-in">
      {/* School Information */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-display font-semibold text-foreground">
            School Information
          </h2>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
            {profile.logo ? (
              <img
                src={profile.logo}
                alt="School Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-2xl">🏫</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">School Logo</p>
            <p className="text-xs text-muted-foreground mb-2">
              PNG or JPG — displayed on receipts &amp; certificates
            </p>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload("logo", e)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => logoRef.current?.click()}
                data-ocid="school-profile.logo.upload_button"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Logo
              </Button>
              {profile.logo && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30"
                  onClick={() => set("logo", "")}
                  data-ocid="school-profile.logo.delete_button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F
            id="name"
            label="School Name *"
            placeholder="Official school name"
          />
          <F
            id="principalName"
            label="Principal Name"
            placeholder="Principal's full name"
          />
          <F id="phone" label="Phone" placeholder="+91 XXXXX XXXXX" />
          <F
            id="email"
            label="Email"
            placeholder="school@example.com"
            type="email"
          />
          <F id="website" label="Website" placeholder="www.schoolname.com" />
          <F
            id="affiliatedBoard"
            label="Affiliated Board"
            placeholder="e.g. CBSE, ICSE, State Board"
          />
          <F
            id="affiliationNo"
            label="Affiliation / Board No."
            placeholder="Board affiliation number"
          />
          <F
            id="schoolCode"
            label="UDISE Code"
            placeholder="11-digit UDISE code"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <F id="city" label="City" placeholder="City" />
          <F id="state" label="State" placeholder="State" />
          <F id="pincode" label="Pincode" placeholder="6-digit pincode" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sp-address">Address</Label>
          <Input
            id="sp-address"
            value={profile.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Full school address (shown on receipts)"
            data-ocid="school-profile.address.input"
          />
        </div>

        {/* Timezone */}
        <div className="space-y-1.5">
          <Label htmlFor="sp-timezone" className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Timezone
          </Label>
          <select
            id="sp-timezone"
            value={profile.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            data-ocid="school-profile.timezone.select"
            className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Dashboard Background */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground">
              Dashboard Background Image
            </h2>
            <p className="text-xs text-muted-foreground">
              Shown as hero banner on the dashboard
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-48 h-24 rounded-xl border-2 border-border overflow-hidden shrink-0 relative bg-muted">
            {profile.dashboardBackground ? (
              <>
                <img
                  src={profile.dashboardBackground}
                  alt="Dashboard background"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-end p-2">
                  <span className="text-white text-[9px] font-semibold opacity-80">
                    Preview (with overlay)
                  </span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary/30 to-accent/20">
                <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground/60">
                  No image set
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 justify-center">
            <p className="text-sm font-medium text-foreground">
              {profile.dashboardBackground
                ? "Background image set ✓"
                : "No background image"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Upload a school photo. Recommended: 1600×500px or wider.
            </p>
            <input
              ref={bgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload("dashboardBackground", e)}
            />
            <div className="flex gap-2 mt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => bgRef.current?.click()}
                data-ocid="school-profile.bg.upload_button"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {profile.dashboardBackground ? "Change Image" : "Upload Image"}
              </Button>
              {profile.dashboardBackground && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => set("dashboardBackground", "")}
                  data-ocid="school-profile.bg.delete_button"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Bank Details */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground">
              Bank Details
            </h2>
            <p className="text-xs text-muted-foreground">
              Printed on fee receipts and payment challans
            </p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bank-name">Bank Name</Label>
            <Input
              id="bank-name"
              value={profile.bankName}
              onChange={(e) => set("bankName", e.target.value)}
              placeholder="e.g. State Bank of India"
              data-ocid="school-profile.bank.name.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">Branch Name</Label>
            <Input
              id="branch-name"
              value={profile.branchName}
              onChange={(e) => set("branchName", e.target.value)}
              placeholder="e.g. Main Branch, Civil Lines"
              data-ocid="school-profile.bank.branch.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-number">Account Number</Label>
            <Input
              id="account-number"
              value={profile.accountNumber}
              onChange={(e) => set("accountNumber", e.target.value)}
              placeholder="Bank account number"
              data-ocid="school-profile.bank.account.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ifsc-code">IFSC Code</Label>
            <Input
              id="ifsc-code"
              value={profile.ifscCode}
              onChange={(e) => set("ifscCode", e.target.value)}
              placeholder="e.g. SBIN0001234"
              data-ocid="school-profile.bank.ifsc.input"
            />
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 inline mr-1" />
            Bank details auto-populate on fee receipts and online payment
            challans.
          </p>
        </div>
      </Card>

      {/* Contact Summary */}
      {(profile.phone || profile.email) && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            {profile.phone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Globe className="w-3.5 h-3.5" />
                <span>{profile.email}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Save */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={() => void handleSave()}
          data-ocid="school-profile.save_button"
          size="lg"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save School Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
