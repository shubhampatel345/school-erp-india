import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  CreditCard,
  ImageIcon,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type {
  BankDetails,
  SchoolProfile as SchoolProfileType,
} from "../../types";

interface FullProfile extends SchoolProfileType {
  bank: BankDetails;
  dashboardBackground?: string;
  affiliatedBoard?: string;
}

const DEFAULT_PROFILE: FullProfile = {
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
  bank: { bankName: "", accountNumber: "", ifscCode: "", branchName: "" },
  dashboardBackground: "",
};

export default function SchoolProfile() {
  const { getData, saveData } = useApp();

  const [profile, setProfile] = useState<FullProfile>(() => {
    const saved = getData("schoolProfile") as FullProfile[];
    const existing = saved[0] as FullProfile | undefined;
    if (existing) {
      return {
        ...DEFAULT_PROFILE,
        ...existing,
        bank: existing.bank ?? DEFAULT_PROFILE.bank,
      };
    }
    return DEFAULT_PROFILE;
  });

  const [saving, setSaving] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  function handleChange(field: keyof FullProfile, value: string) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  function handleBankChange(field: keyof BankDetails, value: string) {
    setProfile((p) => ({ ...p, bank: { ...p.bank, [field]: value } }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfile((p) => ({ ...p, logo: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfile((p) => ({
        ...p,
        dashboardBackground: ev.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const record = { ...profile, id: "school_profile_1" } as Record<
        string,
        unknown
      >;
      await saveData("schoolProfile", record);
      toast.success("School profile saved to server.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  const field = (
    id: keyof FullProfile,
    label: string,
    placeholder?: string,
    type = "text",
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`sp-${id}`}>{label}</Label>
      <Input
        id={`sp-${id}`}
        type={type}
        value={(profile[id] as string) ?? ""}
        onChange={(e) => handleChange(id, e.target.value)}
        placeholder={placeholder}
        data-ocid={`school-profile.${id}.input`}
      />
    </div>
  );

  const bankField = (
    id: keyof BankDetails,
    label: string,
    placeholder?: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`bank-${id}`}>{label}</Label>
      <Input
        id={`bank-${id}`}
        value={profile.bank[id] ?? ""}
        onChange={(e) => handleBankChange(id, e.target.value)}
        placeholder={placeholder}
        data-ocid={`school-profile.bank.${id}.input`}
      />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6">
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
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden">
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
              PNG or JPG — displayed on fee receipts, timetables, certificates
            </p>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
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
                  onClick={() => setProfile((p) => ({ ...p, logo: "" }))}
                  data-ocid="school-profile.logo.delete_button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("name", "School Name *", "Full official school name")}
          {field("principalName", "Principal Name", "Principal's full name")}
          {field("phone", "Phone", "School contact number")}
          {field("email", "Email", "school@example.com", "email")}
          {field("website", "Website", "www.schoolname.com")}
          {field(
            "affiliatedBoard",
            "Affiliated Board",
            "e.g. CBSE, ICSE, State Board",
          )}
          {field(
            "affiliationNo",
            "Affiliation / Board No.",
            "Board affiliation number",
          )}
          {field("schoolCode", "UDISE Code", "11-digit UDISE code")}
          {field("city", "City", "City")}
          {field("state", "State", "State")}
          {field("pincode", "Pincode", "6-digit pincode")}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sp-address">Address</Label>
          <Input
            id="sp-address"
            value={profile.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Full school address (shown on receipts)"
            data-ocid="school-profile.address.input"
          />
        </div>
      </Card>

      {/* Dashboard Background Image */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground">
              Dashboard Background Image
            </h2>
            <p className="text-xs text-muted-foreground">
              Shown as hero banner on the dashboard. Text stays readable via
              dark overlay.
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-48 h-24 rounded-xl border-2 border-border overflow-hidden flex-shrink-0 relative bg-muted">
            {profile.dashboardBackground ? (
              <>
                <img
                  src={profile.dashboardBackground}
                  alt="Dashboard background preview"
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
              Upload a school building photo or campus view. Recommended:
              1600×500px or wider.
            </p>
            <div className="flex gap-2 mt-1">
              <input
                ref={bgRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBgUpload}
              />
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
                  onClick={() =>
                    setProfile((p) => ({ ...p, dashboardBackground: "" }))
                  }
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
          {bankField("bankName", "Bank Name", "e.g. State Bank of India")}
          {bankField(
            "branchName",
            "Branch Name",
            "e.g. Main Branch, Civil Lines",
          )}
          {bankField("accountNumber", "Account Number", "Bank account number")}
          {bankField("ifscCode", "IFSC Code", "e.g. SBIN0001234")}
        </div>

        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            💡 These bank details will auto-populate on fee receipts and online
            payment challans.
          </p>
        </div>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
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
