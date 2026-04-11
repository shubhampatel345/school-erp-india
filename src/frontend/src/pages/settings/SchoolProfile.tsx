import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, CreditCard, Save, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type {
  BankDetails,
  SchoolProfile as SchoolProfileType,
} from "../../types";
import { ls } from "../../utils/localStorage";

interface FullProfile extends SchoolProfileType {
  bank: BankDetails;
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
  schoolCode: "",
  city: "",
  state: "",
  pincode: "",
  bank: {
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
  },
};

export default function SchoolProfile() {
  const [profile, setProfile] = useState<FullProfile>(() => {
    const saved = ls.get<FullProfile>("school_profile", DEFAULT_PROFILE);
    // Ensure bank object exists for old data
    if (!saved.bank) saved.bank = DEFAULT_PROFILE.bank;
    return saved;
  });
  const [saved, setSaved] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  function handleChange(field: keyof SchoolProfileType, value: string) {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  }

  function handleBankChange(field: keyof BankDetails, value: string) {
    setProfile((p) => ({ ...p, bank: { ...p.bank, [field]: value } }));
    setSaved(false);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setProfile((p) => ({ ...p, logo: base64 }));
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    ls.set("school_profile", profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const field = (
    id: keyof SchoolProfileType,
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
        data-ocid={`school-profile-${id}`}
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
        value={profile.bank[id]}
        onChange={(e) => handleBankChange(id, e.target.value)}
        placeholder={placeholder}
        data-ocid={`bank-${id}`}
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => logoRef.current?.click()}
              data-ocid="school-profile-logo-upload"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Logo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("name", "School Name *", "Full official school name")}
          {field("principalName", "Principal Name", "Principal's full name")}
          {field("phone", "Phone", "School contact number")}
          {field("email", "Email", "school@example.com", "email")}
          {field("website", "Website", "www.schoolname.com")}
          {field(
            "affiliationNo",
            "Affiliation / Board No.",
            "CBSE / State Board affiliation number",
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
            data-ocid="school-profile-address"
          />
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
            payment challans. Keep them accurate.
          </p>
        </div>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          data-ocid="school-profile-save"
          className={saved ? "bg-accent text-accent-foreground" : ""}
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {saved ? "✓ Profile Saved!" : "Save School Profile"}
        </Button>
      </div>
    </div>
  );
}
