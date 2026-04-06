import { ChevronDown, ChevronUp, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { DateInput } from "../components/DateInput";

interface StudentAdmissionFormProps {
  onCancel: () => void;
  onSave: (student: any) => void;
  initialData?: any;
}

const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);
const SECTIONS = ["A", "B", "C", "D"];
const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", "Minority", "Other"];
const MONTHS = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];
const ROUTES = ["Route 1", "Route 2", "Route 3", "Route 4"];
const PICKUP_POINTS: Record<string, string[]> = {
  "Route 1": ["Stop A1", "Stop A2", "Stop A3"],
  "Route 2": ["Stop B1", "Stop B2", "Stop B3"],
  "Route 3": ["Stop C1", "Stop C2", "Stop C3"],
  "Route 4": ["Stop D1", "Stop D2", "Stop D3"],
};

function genAdmNo() {
  return `ADM-${Math.floor(100000 + Math.random() * 900000)}`;
}

function SectionHeader({
  title,
  color,
  open,
  onToggle,
}: {
  title: string;
  color: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 rounded-t-lg cursor-pointer select-none"
      style={{ background: "#1a1f2e", borderLeft: `4px solid ${color}` }}
      data-ocid="admission.section.toggle"
    >
      <span className="text-white font-semibold text-sm">{title}</span>
      {open ? (
        <ChevronUp size={16} className="text-gray-400" />
      ) : (
        <ChevronDown size={16} className="text-gray-400" />
      )}
    </button>
  );
}

function FieldLabel({
  label,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <p className="text-gray-400 text-xs mb-1">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
      {hint && <span className="text-gray-500 ml-1">{hint}</span>}
    </p>
  );
}

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
  error,
  ...rest
}: {
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  error?: boolean;
  [key: string]: any;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full bg-gray-800 border rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 transition-colors ${
        error ? "border-red-500" : "border-gray-600"
      } ${readOnly ? "opacity-70 cursor-not-allowed" : ""}`}
      {...rest}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-gray-800 border rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 transition-colors ${
        error ? "border-red-500" : "border-gray-600"
      }`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function PhotoUpload({
  label,
  preview,
  onChange,
  size = "large",
}: {
  label: string;
  preview: string | null;
  onChange: (url: string) => void;
  size?: "large" | "small";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    onChange(url);
  };
  return (
    <div
      className={`border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors relative overflow-hidden ${
        size === "large" ? "h-24 w-24" : "h-20 w-full"
      }`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      data-ocid="admission.upload_button"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {preview ? (
        <img
          src={preview}
          alt="preview"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-gray-500">
          <Upload size={16} />
          <span className="text-[10px] text-center px-1">{label}</span>
        </div>
      )}
    </div>
  );
}

function DocUpload({
  index,
  title,
  fileName,
  onTitleChange,
  onFileChange,
}: {
  index: number;
  title: string;
  fileName: string;
  onTitleChange: (v: string) => void;
  onFileChange: (name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0">
          {index}
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Document Title"
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
          data-ocid={`admission.doc.input.${index}`}
        />
      </div>
      <div
        className="border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center gap-2 py-3 cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) onFileChange(file.name);
        }}
        data-ocid={`admission.dropzone.${index}`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileChange(file.name);
          }}
        />
        <Upload size={14} className="text-gray-500" />
        <span className="text-gray-500 text-xs">
          {fileName || "Drag and drop or click"}
        </span>
      </div>
    </div>
  );
}

export function StudentAdmissionForm({
  onCancel,
  onSave,
  initialData,
}: StudentAdmissionFormProps) {
  const [admNo, setAdmNo] = useState(initialData?.admNo || genAdmNo());
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    student: true,
    transport: true,
    fees: true,
    parent: true,
    address: true,
    misc: true,
    prevschool: true,
    documents: true,
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Student Details
  const [rollNo, setRollNo] = useState(initialData?.rollNo || "");
  const [className, setClassName] = useState(
    initialData?.className || "Class 3",
  );
  const [section, setSection] = useState(initialData?.section || "A");
  const [fullName, setFullName] = useState(initialData?.name || "");
  const [penNo, setPenNo] = useState(initialData?.penNo || "");
  const [apaarNo, setApaarNo] = useState(initialData?.apaarNo || "");
  const [gender, setGender] = useState(initialData?.gender || "Male");
  const [dob, setDob] = useState(initialData?.dob || "");
  const [religion, setReligion] = useState(initialData?.religion || "");
  const [caste, setCaste] = useState(initialData?.caste || "");
  const [category, setCategory] = useState(initialData?.category || "General");
  const [mobile, setMobile] = useState(initialData?.contact || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [admDate, setAdmDate] = useState(
    initialData?.admissionDate || new Date().toISOString().split("T")[0],
  );
  const [bloodGroup, setBloodGroup] = useState(initialData?.bloodGroup || "");
  const [height, setHeight] = useState(initialData?.height || "");
  const [weight, setWeight] = useState(initialData?.weight || "");
  const [aadhaar, setAadhaar] = useState(initialData?.aadharNo || "");
  const [srNo, setSrNo] = useState(initialData?.srNo || "");
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);

  // Transport
  const [route, setRoute] = useState(initialData?.route || "");
  const [pickupPoint, setPickupPoint] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // Fees
  const [fixedDiscount, setFixedDiscount] = useState("0");

  // Parent
  const [fatherName, setFatherName] = useState(initialData?.fatherName || "");
  const [fatherPhoto, setFatherPhoto] = useState<string | null>(null);
  const [motherName, setMotherName] = useState(initialData?.motherName || "");
  const [motherPhoto, setMotherPhoto] = useState<string | null>(null);
  const [guardianType, setGuardianType] = useState<
    "Father" | "Mother" | "Other"
  >("Father");
  const [guardianName, setGuardianName] = useState(
    initialData?.guardianName || "",
  );
  const [guardianRelation, setGuardianRelation] = useState("Father");
  const [guardianPhone, setGuardianPhone] = useState(
    initialData?.guardianPhone || "",
  );
  const [guardianAddress, setGuardianAddress] = useState("");

  // Address
  const [currentAddress, setCurrentAddress] = useState(
    initialData?.address || "",
  );
  const [sameAsGuardian, setSameAsGuardian] = useState(false);
  const [permanentAddress, setPermanentAddress] = useState("");
  const [sameAsCurrent, setSameAsCurrent] = useState(false);

  // Misc
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [localId, setLocalId] = useState("");
  const [rte, setRte] = useState<"Yes" | "No">("No");

  // Prev School
  const [prevSchool, setPrevSchool] = useState(
    initialData?.prevSchoolName || "",
  );
  const [lastClass, setLastClass] = useState(
    initialData?.prevSchoolClass || "",
  );
  const [tcNo, setTcNo] = useState(initialData?.prevSchoolTcNo || "");
  const [note, setNote] = useState("");

  // Documents
  const [docs, setDocs] = useState(
    Array.from({ length: 4 }, (_, idx) => ({
      id: idx + 1,
      title: "",
      fileName: "",
    })),
  );

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleMonth = (m: string) =>
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );

  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    if (!rollNo) newErrors.rollNo = true;
    if (!fullName) newErrors.fullName = true;
    if (!dob) newErrors.dob = true;
    // Guardian name and phone are now OPTIONAL — removed from required validation
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    onSave({
      admNo,
      rollNo,
      className,
      section,
      name: fullName,
      gender,
      dob,
      contact: mobile,
      fatherName,
      motherName,
      category,
      address: currentAddress || guardianAddress,
      status: "Active",
      admissionDate: admDate,
      aadharNo: aadhaar,
      srNo,
      penNo,
      apaarNo,
      bloodGroup,
      religion,
      caste,
      guardianName,
      guardianPhone,
      route,
      prevSchoolName: prevSchool,
      prevSchoolTcNo: tcNo,
      prevSchoolLeavingDate: "",
      prevSchoolClass: lastClass,
    });
  };

  const sectionBody =
    "bg-gray-900/50 border border-gray-700 border-t-0 rounded-b-lg p-4 mb-4";

  return (
    <div className="min-h-screen" style={{ background: "#111827" }}>
      {/* Sticky Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-gray-700"
        style={{ background: "#1a1f2e" }}
      >
        <div>
          <h1 className="text-white font-bold text-lg">Student Admission</h1>
          <p className="text-gray-400 text-xs">
            {initialData
              ? `Editing: ${initialData.name || "Student"}`
              : "Fill in all the required details to register a new student."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 text-sm transition-colors"
            data-ocid="admission.cancel_button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            data-ocid="admission.submit_button"
          >
            Save Student
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* 1. Student Details */}
        <div className="mb-4">
          <SectionHeader
            title="Student Details"
            color="#6366f1"
            open={openSections.student}
            onToggle={() => toggleSection("student")}
          />
          {openSections.student && (
            <div className={sectionBody}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <FieldLabel label="Admission No" />
                  {/* Editable admission number field — user can type their own */}
                  <TextInput
                    value={admNo}
                    onChange={setAdmNo}
                    placeholder="e.g. ADM-2024-001"
                    data-ocid="admission.admno_input"
                  />
                </div>
                <div>
                  <FieldLabel label="Roll Number" required />
                  <TextInput
                    value={rollNo}
                    onChange={setRollNo}
                    error={errors.rollNo}
                    data-ocid="admission.roll_input"
                  />
                </div>
                <div>
                  <FieldLabel label="Class" required />
                  <SelectInput
                    value={className}
                    onChange={setClassName}
                    options={CLASSES}
                    data-ocid="admission.class_select"
                  />
                </div>
                <div>
                  <FieldLabel label="Section" required />
                  <SelectInput
                    value={section}
                    onChange={setSection}
                    options={SECTIONS}
                    data-ocid="admission.section_select"
                  />
                </div>
                <div className="col-span-2">
                  <FieldLabel label="Full Name" required />
                  <TextInput
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Enter student's full name"
                    error={errors.fullName}
                    data-ocid="admission.fullname_input"
                  />
                </div>
                <div>
                  <FieldLabel label="Gender" required />
                  <SelectInput
                    value={gender}
                    onChange={setGender}
                    options={GENDERS}
                  />
                </div>
                <div>
                  <FieldLabel label="Date Of Birth" required />
                  <DateInput
                    value={dob}
                    onChange={setDob}
                    error={errors.dob}
                    data-ocid="admission.dob_input"
                  />
                </div>
                {/* Category field */}
                <div>
                  <FieldLabel label="Category" />
                  <SelectInput
                    value={category}
                    onChange={setCategory}
                    options={CATEGORIES}
                    placeholder="Select Category"
                    data-ocid="admission.category_select"
                  />
                </div>
                <div>
                  <FieldLabel label="Blood Group" />
                  <SelectInput
                    value={bloodGroup}
                    onChange={setBloodGroup}
                    options={BLOOD_GROUPS}
                    placeholder="Select"
                  />
                </div>
                <div>
                  <FieldLabel label="Religion" />
                  <TextInput value={religion} onChange={setReligion} />
                </div>
                <div>
                  <FieldLabel label="Caste" />
                  <TextInput value={caste} onChange={setCaste} />
                </div>
                <div>
                  <FieldLabel label="Mobile Number" />
                  <TextInput
                    value={mobile}
                    onChange={setMobile}
                    type="tel"
                    data-ocid="admission.mobile_input"
                  />
                </div>
                <div>
                  <FieldLabel label="Email" />
                  <TextInput
                    value={email}
                    onChange={setEmail}
                    type="email"
                    data-ocid="admission.email_input"
                  />
                </div>
                <div>
                  <FieldLabel label="Admission Date" />
                  <DateInput value={admDate} onChange={setAdmDate} />
                </div>
                <div>
                  <FieldLabel label="Height (cm)" />
                  <TextInput
                    value={height}
                    onChange={setHeight}
                    type="number"
                  />
                </div>
                <div>
                  <FieldLabel label="Weight (kg)" />
                  <TextInput
                    value={weight}
                    onChange={setWeight}
                    type="number"
                  />
                </div>
                <div>
                  <FieldLabel label="Aadhaar No." />
                  <TextInput
                    value={aadhaar}
                    onChange={setAadhaar}
                    placeholder="12 digits"
                    maxLength={12}
                  />
                </div>
                <div>
                  <FieldLabel label="S.R. No." />
                  <TextInput value={srNo} onChange={setSrNo} />
                </div>
                <div>
                  <FieldLabel label="PEN No." />
                  <TextInput
                    value={penNo}
                    onChange={setPenNo}
                    placeholder="Permanent Education Number"
                  />
                </div>
                <div>
                  <FieldLabel label="APAAR No." />
                  <TextInput
                    value={apaarNo}
                    onChange={setApaarNo}
                    placeholder="Academic Bank of Credits"
                  />
                </div>
              </div>
              <div>
                <FieldLabel label="Student Photo" />
                <div className="flex items-center gap-4">
                  <PhotoUpload
                    label="Drag and drop or click (100x100)"
                    preview={studentPhoto}
                    onChange={setStudentPhoto}
                    size="large"
                  />
                  {studentPhoto && (
                    <button
                      type="button"
                      onClick={() => setStudentPhoto(null)}
                      className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                    >
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Transport Details */}
        <div className="mb-4">
          <SectionHeader
            title="Transport Details"
            color="#22c55e"
            open={openSections.transport}
            onToggle={() => toggleSection("transport")}
          />
          {openSections.transport && (
            <div className={sectionBody}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <FieldLabel label="Route List" />
                  <SelectInput
                    value={route}
                    onChange={(v) => {
                      setRoute(v);
                      setPickupPoint("");
                    }}
                    options={ROUTES}
                    placeholder="Select"
                    data-ocid="admission.route_select"
                  />
                </div>
                <div>
                  <FieldLabel label="Pickup Point" />
                  <SelectInput
                    value={pickupPoint}
                    onChange={setPickupPoint}
                    options={route ? PICKUP_POINTS[route] || [] : []}
                    placeholder="Select"
                    data-ocid="admission.pickup_select"
                  />
                </div>
              </div>
              <div>
                <FieldLabel label="Applicable Months for Transport/Fees" />
                <div className="flex flex-wrap gap-2 mt-1">
                  {MONTHS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMonth(m)}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                        selectedMonths.includes(m)
                          ? "bg-green-600 border-green-500 text-white"
                          : "bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400"
                      }`}
                      data-ocid="admission.month.toggle"
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMonths([...MONTHS])}
                    className="text-xs text-blue-400 hover:text-blue-300"
                    data-ocid="admission.months_select_all"
                  >
                    Select All
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMonths([])}
                    className="text-xs text-gray-400 hover:text-gray-300"
                    data-ocid="admission.months_clear_all"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Fees Details */}
        <div className="mb-4">
          <SectionHeader
            title="Fees Details"
            color="#f97316"
            open={openSections.fees}
            onToggle={() => toggleSection("fees")}
          />
          {openSections.fees && (
            <div className={sectionBody}>
              <div className="mb-4">
                <FieldLabel label="Fee Structure" />
                <div className="bg-gray-800/50 border border-gray-700 rounded p-3 text-gray-500 text-xs italic">
                  No fee structure found for selected class
                </div>
              </div>
              <div className="flex items-center justify-between mb-4 py-2 px-3 bg-gray-800/30 rounded border border-gray-700">
                <span className="text-gray-400 text-xs font-medium">
                  Gross Total
                </span>
                <span className="text-white font-bold">₹0</span>
              </div>
              <div className="border border-gray-700 rounded p-3">
                <p className="text-gray-400 text-xs font-semibold mb-3">
                  Discounts &amp; Final
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel label="Fixed Discount Amount" />
                    <TextInput
                      value={fixedDiscount}
                      onChange={setFixedDiscount}
                      type="number"
                      data-ocid="admission.discount_input"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="w-full py-2 px-3 bg-gray-800/50 border border-gray-700 rounded">
                      <p className="text-gray-400 text-xs">
                        Net Payable Amount
                      </p>
                      <p className="text-white font-bold text-sm">₹0 / Total</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Parent Guardian Detail */}
        <div className="mb-4">
          <SectionHeader
            title="Parent Guardian Detail"
            color="#a855f7"
            open={openSections.parent}
            onToggle={() => toggleSection("parent")}
          />
          {openSections.parent && (
            <div className={sectionBody}>
              {/* Father Details */}
              <div className="mb-4">
                <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">
                  Father Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel label="Father Name" />
                    <TextInput
                      value={fatherName}
                      onChange={setFatherName}
                      data-ocid="admission.father_name_input"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Father Photo" />
                    <PhotoUpload
                      label="Click to upload"
                      preview={fatherPhoto}
                      onChange={setFatherPhoto}
                      size="small"
                    />
                  </div>
                </div>
              </div>
              {/* Mother Details */}
              <div className="mb-4">
                <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">
                  Mother Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel label="Mother Name" />
                    <TextInput
                      value={motherName}
                      onChange={setMotherName}
                      data-ocid="admission.mother_name_input"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Mother Photo" />
                    <PhotoUpload
                      label="Click to upload"
                      preview={motherPhoto}
                      onChange={setMotherPhoto}
                      size="small"
                    />
                  </div>
                </div>
              </div>
              {/* Guardian Details */}
              <div>
                <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">
                  Guardian Details
                </p>
                <div className="flex gap-4 mb-3">
                  {(["Father", "Mother", "Other"] as const).map((gt) => (
                    <label
                      key={gt}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        checked={guardianType === gt}
                        onChange={() => {
                          setGuardianType(gt);
                          if (gt !== "Other") setGuardianRelation(gt);
                        }}
                        className="accent-purple-500"
                        data-ocid="admission.guardian_radio"
                      />
                      <span className="text-gray-300 text-xs">{gt}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {/* Guardian Name: Optional */}
                    <FieldLabel
                      label="Guardian Name"
                      required={false}
                      hint="(Optional)"
                    />
                    <TextInput
                      value={guardianName}
                      onChange={setGuardianName}
                      data-ocid="admission.guardian_name_input"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Guardian Relation" />
                    <TextInput
                      value={guardianRelation}
                      onChange={setGuardianRelation}
                    />
                  </div>
                  <div>
                    {/* Guardian Phone: Optional */}
                    <FieldLabel
                      label="Guardian Phone"
                      required={false}
                      hint="(Optional)"
                    />
                    <TextInput
                      value={guardianPhone}
                      onChange={setGuardianPhone}
                      type="tel"
                      data-ocid="admission.guardian_phone_input"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Guardian Address" />
                    <textarea
                      value={guardianAddress}
                      onChange={(e) => setGuardianAddress(e.target.value)}
                      rows={2}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 resize-none"
                      data-ocid="admission.guardian_address_textarea"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Student Address Details */}
        <div className="mb-4">
          <SectionHeader
            title="Student Address Details"
            color="#14b8a6"
            open={openSections.address}
            onToggle={() => toggleSection("address")}
          />
          {openSections.address && (
            <div className={sectionBody}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel label="Current Address" />
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameAsGuardian}
                        onChange={(e) => {
                          setSameAsGuardian(e.target.checked);
                          if (e.target.checked)
                            setCurrentAddress(guardianAddress);
                        }}
                        className="accent-teal-500"
                        data-ocid="admission.same_as_guardian_checkbox"
                      />
                      <span className="text-gray-400 text-xs">
                        Same as Guardian Address
                      </span>
                    </label>
                  </div>
                  <textarea
                    value={currentAddress}
                    onChange={(e) => setCurrentAddress(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 resize-none"
                    data-ocid="admission.current_address_textarea"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel label="Permanent Address" />
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameAsCurrent}
                        onChange={(e) => {
                          setSameAsCurrent(e.target.checked);
                          if (e.target.checked)
                            setPermanentAddress(currentAddress);
                        }}
                        className="accent-teal-500"
                        data-ocid="admission.same_as_current_checkbox"
                      />
                      <span className="text-gray-400 text-xs">
                        Same as Current Address
                      </span>
                    </label>
                  </div>
                  <textarea
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 resize-none"
                    data-ocid="admission.permanent_address_textarea"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. Miscellaneous Details */}
        <div className="mb-4">
          <SectionHeader
            title="Miscellaneous Details"
            color="#9ca3af"
            open={openSections.misc}
            onToggle={() => toggleSection("misc")}
          />
          {openSections.misc && (
            <div className={sectionBody}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <FieldLabel label="Bank Account Number" />
                  <TextInput
                    value={bankAccount}
                    onChange={setBankAccount}
                    data-ocid="admission.bank_account_input"
                  />
                </div>
                <div>
                  <FieldLabel label="Bank Name" />
                  <TextInput value={bankName} onChange={setBankName} />
                </div>
                <div>
                  <FieldLabel label="IFSC Code" />
                  <TextInput value={ifsc} onChange={setIfsc} />
                </div>
                <div>
                  <FieldLabel label="National ID" />
                  <TextInput value={nationalId} onChange={setNationalId} />
                </div>
                <div>
                  <FieldLabel label="Local ID" />
                  <TextInput value={localId} onChange={setLocalId} />
                </div>
                <div>
                  <FieldLabel label="RTE" />
                  <div className="flex gap-4 mt-1">
                    {(["Yes", "No"] as const).map((v) => (
                      <label
                        key={v}
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <input
                          type="radio"
                          checked={rte === v}
                          onChange={() => setRte(v)}
                          className="accent-gray-400"
                          data-ocid="admission.rte_radio"
                        />
                        <span className="text-gray-300 text-xs">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7. Previous School Details */}
        <div className="mb-4">
          <SectionHeader
            title="Previous School Details"
            color="#eab308"
            open={openSections.prevschool}
            onToggle={() => toggleSection("prevschool")}
          />
          {openSections.prevschool && (
            <div className={sectionBody}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <FieldLabel label="School Name" />
                  <TextInput
                    value={prevSchool}
                    onChange={setPrevSchool}
                    data-ocid="admission.prev_school_input"
                  />
                </div>
                <div>
                  <FieldLabel label="Last Class" />
                  <TextInput value={lastClass} onChange={setLastClass} />
                </div>
                <div>
                  <FieldLabel label="TC Number" />
                  <TextInput value={tcNo} onChange={setTcNo} />
                </div>
              </div>
              <div>
                <FieldLabel label="Note" />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 resize-none"
                  data-ocid="admission.note_textarea"
                />
              </div>
            </div>
          )}
        </div>

        {/* 8. Upload Documents */}
        <div className="mb-4">
          <SectionHeader
            title="Upload Documents"
            color="#ef4444"
            open={openSections.documents}
            onToggle={() => toggleSection("documents")}
          />
          {openSections.documents && (
            <div className={sectionBody}>
              <div className="grid grid-cols-2 gap-3">
                {docs.map((doc, i) => (
                  <DocUpload
                    key={doc.id}
                    index={i + 1}
                    title={doc.title}
                    fileName={doc.fileName}
                    onTitleChange={(v) =>
                      setDocs((prev) =>
                        prev.map((d, j) => (j === i ? { ...d, title: v } : d)),
                      )
                    }
                    onFileChange={(name) =>
                      setDocs((prev) =>
                        prev.map((d, j) =>
                          j === i ? { ...d, fileName: name } : d,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div className="flex justify-end gap-2 pt-2 pb-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 text-sm transition-colors"
            data-ocid="admission.cancel_button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            data-ocid="admission.submit_button"
          >
            Save Student
          </button>
        </div>
      </div>
    </div>
  );
}
