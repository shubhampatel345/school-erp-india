import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, School, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import phpApiService from "../../utils/phpApiService";

interface Profile {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  principalName: string;
  affiliationNo: string;
  schoolCode: string;
  city: string;
  state: string;
  pincode: string;
  logo: string;
}

const DEFAULT_PROFILE: Profile = {
  name: "SHUBH PUBLIC SCHOOL",
  address: "",
  phone: "",
  email: "",
  website: "",
  principalName: "",
  affiliationNo: "",
  schoolCode: "",
  city: "",
  state: "Madhya Pradesh",
  pincode: "",
  logo: "",
};

export default function SchoolProfile() {
  const { addNotification } = useApp();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void phpApiService
      .getSettings()
      .then((s) => {
        if (s.school_profile) {
          try {
            const p =
              typeof s.school_profile === "string"
                ? (JSON.parse(s.school_profile) as Profile)
                : (s.school_profile as Profile);
            setProfile((prev) => ({ ...prev, ...p }));
          } catch {
            /* noop */
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const set = (k: keyof Profile, v: string) =>
    setProfile((p) => ({ ...p, [k]: v }));

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("logo", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await phpApiService.saveSettings({
        school_profile: JSON.stringify(profile),
      });
      addNotification("School profile saved", "success");
    } catch {
      addNotification("Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const FIELDS: [keyof Profile, string, string, boolean][] = [
    ["name", "School Name", "text", true],
    ["address", "Address", "text", true],
    ["phone", "Phone", "tel", false],
    ["email", "Email", "email", false],
    ["website", "Website", "url", false],
    ["principalName", "Principal Name", "text", false],
    ["affiliationNo", "Affiliation No.", "text", false],
    ["schoolCode", "School Code", "text", false],
    ["city", "City", "text", false],
    ["state", "State", "text", false],
    ["pincode", "Pincode", "text", false],
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {["a", "b", "c", "d", "e", "f"].map((k) => (
          <div key={k} className="h-10 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <School className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-foreground">
            School Information
          </h2>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.logo ? (
              <img
                src={profile.logo}
                alt="School logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <School className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              School Logo
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              data-ocid="school-profile.upload_button"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload Logo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogo}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map(([key, label, type, fullWidth]) => (
            <div key={String(key)} className={fullWidth ? "sm:col-span-2" : ""}>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {label}
              </Label>
              <Input
                type={type}
                value={profile[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={label}
                data-ocid={`school-profile.${key}_input`}
              />
            </div>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          data-ocid="school-profile.submit_button"
          className="w-full sm:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
