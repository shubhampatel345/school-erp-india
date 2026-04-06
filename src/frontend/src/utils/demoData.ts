// School ERP - Data seeder
// No demo data is seeded. ERP starts clean.
// Only structural defaults (fee masters, fee plans) are seeded on first run.

export interface Student {
  id: number;
  admNo: string;
  name: string;
  fatherName: string;
  motherName: string;
  className: string;
  section: string;
  rollNo: string;
  dob: string;
  contact: string;
  route: string;
  schNo: string;
  oldBalance: number;
  status: "Active" | "Inactive";
  admissionDate?: string;
  aadharNo?: string;
  srNo?: string;
  penNo?: string;
  apaarNo?: string;
  prevSchoolName?: string;
  prevSchoolTcNo?: string;
  prevSchoolLeavingDate?: string;
  prevSchoolClass?: string;
}

export interface Staff {
  id: number;
  name: string;
  designation: string;
  department: string;
  employeeId: string;
  contact: string;
  email: string;
  dob: string;
  joiningDate: string;
  salary: number;
  status: "Active" | "Inactive";
}

export function seedDemoDataIfEmpty(): void {
  try {
    // Students - start empty
    if (!localStorage.getItem("erp_students")) {
      localStorage.setItem("erp_students", JSON.stringify([]));
    }

    // Staff - start empty
    if (!localStorage.getItem("erp_staff")) {
      localStorage.setItem("erp_staff", JSON.stringify([]));
    }

    // Fee payments - start empty
    if (!localStorage.getItem("erp_fee_payments")) {
      localStorage.setItem("erp_fee_payments", JSON.stringify([]));
    }

    // Notifications - start empty
    if (!localStorage.getItem("erp_notifications")) {
      localStorage.setItem("erp_notifications", JSON.stringify([]));
    }

    // Fee masters - seed structural defaults only if not present
    if (!localStorage.getItem("erp_fee_masters")) {
      const defaultMasters = [
        {
          id: 1,
          heading: "Tuition Fee",
          group: "General",
          account: "Tuition Fees",
          frequency: "Monthly",
          months: [
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
          ],
        },
        {
          id: 2,
          heading: "Development Fee",
          group: "General",
          account: "Vikas Shulk",
          frequency: "Annual",
          months: [],
        },
        {
          id: 3,
          heading: "Library Fee",
          group: "General",
          account: "Admission Fees",
          frequency: "Annual",
          months: [],
        },
        {
          id: 4,
          heading: "Sports Fee",
          group: "General",
          account: "Admission Fees",
          frequency: "Annual",
          months: [],
        },
        {
          id: 5,
          heading: "Computer Fee",
          group: "General",
          account: "Computer",
          frequency: "Monthly",
          months: [
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
          ],
        },
      ];
      localStorage.setItem("erp_fee_masters", JSON.stringify(defaultMasters));
    }

    // Fee plans - start empty (school fills in their own amounts)
    if (!localStorage.getItem("erp_fee_plans")) {
      localStorage.setItem("erp_fee_plans", JSON.stringify([]));
    }

    // Current session default
    if (!localStorage.getItem("erp_current_session")) {
      localStorage.setItem("erp_current_session", "2025-26");
    }
  } catch (e) {
    console.warn("Data initialization failed:", e);
  }
}
