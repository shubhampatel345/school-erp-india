import type { Permission, Role, RolePermissions } from "../types/auth";

export const permissionModules: Array<{ module: string; features: string[] }> =
  [
    {
      module: "Student Information",
      features: [
        "Student",
        "Import Student",
        "Student Categories",
        "Student Houses",
        "Disable Student",
        "Student Timeline",
        "Disable Reason",
      ],
    },
    {
      module: "Fees Collection",
      features: [
        "Collect Fees",
        "Fees Carry Forward",
        "Fees Master",
        "Fees Group",
        "Fees Group Assign",
        "Fees Type",
        "Fees Discount",
        "Fees Discount Assign",
        "Search Fees Payment",
        "Search Due Fees",
        "Fees Reminder",
        "Offline Bank Payments",
      ],
    },
    { module: "Income", features: ["Income", "Income Head", "Search Income"] },
    {
      module: "Expense",
      features: ["Expense", "Expense Head", "Search Expense"],
    },
    {
      module: "Student Attendance",
      features: [
        "Student / Period Attendance",
        "Attendance By Date",
        "Approve Leave",
      ],
    },
    {
      module: "Examination",
      features: [
        "Marks Grade",
        "Exam Group",
        "Design Admit Card",
        "Print Admit Card",
        "Design Marksheet",
        "Print Marksheet",
        "Exam Result",
        "Marks Import",
        "Exam",
        "Exam Publish",
        "Link Exam",
        "Assign / View student",
        "Exam Subject",
        "Exam Marks",
        "Marks Division",
        "Exam Schedule",
        "Generate Rank",
      ],
    },
    {
      module: "Academics",
      features: [
        "Class Timetable",
        "Subject",
        "Class",
        "Section",
        "Promote Student",
        "Assign Class Teacher",
        "Teachers Timetable",
        "Subject Group",
      ],
    },
    {
      module: "Download Center",
      features: [
        "Upload Content",
        "Content Type",
        "Content Share List",
        "Video Tutorial",
      ],
    },
    {
      module: "Library",
      features: [
        "Books List",
        "Issue Return",
        "Add Staff Member",
        "Add Student",
        "Import Book",
      ],
    },
    {
      module: "Inventory",
      features: [
        "Issue Item",
        "Add Item Stock",
        "Add Item",
        "Item Store",
        "Item Supplier",
        "Item Category",
      ],
    },
    {
      module: "Transport",
      features: [
        "Routes",
        "Vehicle",
        "Assign Vehicle",
        "Fees Master",
        "Pickup Point",
        "Route Pickup Point",
        "Student Transport Fees",
      ],
    },
    { module: "Hostel", features: ["Hostel", "Room Type", "Hostel Rooms"] },
    {
      module: "Communicate",
      features: [
        "Notice Board",
        "Email",
        "Email / SMS Log",
        "SMS",
        "Schedule Email SMS Log",
        "Login Credentials Send",
        "Email Template",
        "SMS Template",
      ],
    },
    {
      module: "Reports",
      features: [
        "Student Report",
        "Guardian Report",
        "Student History",
        "Student Login Credential Report",
        "Class Subject Report",
        "Admission Report",
        "Sibling Report",
        "Homework Evaluation Report",
        "Student Profile",
        "Fees Statement",
        "Balance Fees Report",
        "Fees Collection Report",
        "Online Fees Collection Report",
        "Income Report",
        "Expense Report",
        "PayRoll Report",
        "Income Group Report",
        "Expense Group Report",
        "Attendance Report",
        "Staff Attendance Report",
        "Transport Report",
        "Hostel Report",
        "Audit Trail Report",
        "User Log",
        "Book Issue Report",
        "Book Due Report",
        "Book Inventory Report",
        "Stock Report",
        "Add Item Report",
        "Issue Item Report",
        "Student Attendance Type Report",
        "Online Exam Wise Report",
        "Online Exams Report",
        "Online Exams Attempt Report",
        "Online Exams Rank Report",
        "Staff Report",
        "Student / Period Attendance Report",
        "Biometric Attendance Log",
        "Book Issue Return Report",
        "Rank Report",
        "Syllabus Status Report",
        "Subject Lesson Plan Report",
        "Alumni Report",
        "Student Gender Ratio Report",
        "Student Teacher Ratio Report",
        "Daily Attendance Report",
        "Balance Fees Report With Remark",
        "Balance Fees Statement",
        "Daily Collection Report",
        "Online Admission Report",
        "Income Expense Balance Report",
        "Due Fees Report",
        "Homework Marks Report",
        "Online Admission Fees Collection Report",
        "Class Section Report",
        "Leave Request Report",
        "My Leave Request Report",
      ],
    },
    {
      module: "System Settings",
      features: [
        "Languages",
        "General Setting",
        "Session Setting",
        "Notification Setting",
        "SMS Setting",
        "Email Setting",
        "Front CMS Setting",
        "Payment Methods",
        "User Status",
        "Backup",
        "Restore",
        "Language Switcher",
        "Custom Fields",
        "System Fields",
        "Print Header Footer",
        "Student Profile Update",
        "Sidebar Menu",
        "Currency",
        "Currency Switcher",
      ],
    },
    {
      module: "Front CMS",
      features: [
        "Menus",
        "Media Manager",
        "Banner Images",
        "Pages",
        "Gallery",
        "Event",
        "News",
      ],
    },
    {
      module: "Front Office",
      features: [
        "Admission Enquiry",
        "Follow Up Admission Enquiry",
        "Visitor Book",
        "Phone Call Log",
        "Postal Dispatch",
        "Postal Receive",
        "Complain",
        "Setup Front Office",
      ],
    },
    {
      module: "Human Resource",
      features: [
        "Staff",
        "Disable Staff",
        "Staff Attendance",
        "Staff Payroll",
        "Approve Leave Request",
        "Apply Leave",
        "Leave Types",
        "Department",
        "Designation",
        "Can See Other Users Profile",
        "Staff Timeline",
        "Teachers Rating",
      ],
    },
    {
      module: "Homework",
      features: ["Homework", "Homework Evaluation", "Daily Assignment"],
    },
    {
      module: "Certificate",
      features: [
        "Student Certificate",
        "Generate Certificate",
        "Student ID Card",
        "Generate ID Card",
        "Staff ID Card",
        "Generate Staff ID Card",
        "Download Transfer Certificate",
        "Build Transfer Certificate",
        "Transfer Certificate Settings",
        "Verify Transfer Certificate",
      ],
    },
    { module: "Calendar To Do List", features: ["Calendar To Do List"] },
    {
      module: "Dashboard and Widgets",
      features: [
        "Quick Session Change",
        "Fees Collection And Expense Monthly Chart",
        "Fees Collection And Expense Yearly Chart",
        "Monthly Fees Collection Widget",
        "Monthly Expense Widget",
        "Student Count Widget",
        "Staff Role Count Widget",
        "Fees Awaiting Payment Widgets",
        "Converted Leads Widgets",
        "Fees Overview Widgets",
        "Enquiry Overview Widgets",
        "Library Overview Widgets",
        "Student Today Attendance Widgets",
        "Income Donut Graph",
        "Expense Donut Graph",
        "Staff Present Today Widgets",
        "Student Present Today Widgets",
        "Student Head Count Widget",
        "Staff Approved Leave Widgets",
        "Student Approved Leave Widgets",
      ],
    },
    {
      module: "Online Examination",
      features: [
        "Online Examination",
        "Question Bank",
        "Add Questions in Exam",
        "Assign / View Student",
        "Import Question",
      ],
    },
    { module: "Chat", features: ["Chat"] },
    { module: "Multi Class", features: ["Multi Class Student"] },
    { module: "Online Admission", features: ["Online Admission"] },
    { module: "Alumni", features: ["Manage Alumni", "Events"] },
    {
      module: "Lesson Plan",
      features: [
        "Manage Lesson Plan",
        "Manage Syllabus Status",
        "Lesson",
        "Topic",
        "Comments",
        "Copy Old Lessons",
      ],
    },
    {
      module: "Annual Calendar",
      features: ["Annual Calendar", "Holiday Type"],
    },
    { module: "Student CV", features: ["Download CV", "Build CV"] },
  ];

const allTrue: Permission = { view: true, add: true, edit: true, delete: true };
const viewOnly: Permission = {
  view: true,
  add: false,
  edit: false,
  delete: false,
};
const noAccess: Permission = {
  view: false,
  add: false,
  edit: false,
  delete: false,
};

function buildPerms(
  overrides: Record<string, Record<string, Permission>>,
  fallback: Permission,
): RolePermissions {
  const result: RolePermissions = {};
  for (const { module, features } of permissionModules) {
    result[module] = {};
    for (const feature of features) {
      result[module][feature] =
        overrides[module]?.[feature] ?? overrides[module]?.["*"] ?? fallback;
    }
  }
  return result;
}

function allModulesTrue(): RolePermissions {
  const result: RolePermissions = {};
  for (const { module, features } of permissionModules) {
    result[module] = {};
    for (const feature of features) {
      result[module][feature] = { ...allTrue };
    }
  }
  return result;
}

const feesModules = ["Fees Collection", "Income", "Expense"];
const libraryModules = ["Library"];
const teacherModules = [
  "Academics",
  "Student Attendance",
  "Examination",
  "Homework",
  "Student Information",
];
const parentStudentViewModules = [
  "Student Information",
  "Student Attendance",
  "Fees Collection",
  "Examination",
  "Homework",
];

function buildAccountantPerms(): RolePermissions {
  const result: RolePermissions = {};
  for (const { module, features } of permissionModules) {
    result[module] = {};
    const isFeesModule = feesModules.includes(module);
    const isFeesReport = module === "Reports";
    for (const feature of features) {
      if (isFeesModule) {
        result[module][feature] = { ...allTrue };
      } else if (isFeesReport) {
        const feesReportFeatures = [
          "Fees Statement",
          "Balance Fees Report",
          "Fees Collection Report",
          "Online Fees Collection Report",
          "Income Report",
          "Expense Report",
          "Income Group Report",
          "Expense Group Report",
          "Daily Collection Report",
          "Online Admission Fees Collection Report",
          "Balance Fees Statement",
          "Due Fees Report",
          "Balance Fees Report With Remark",
        ];
        result[module][feature] = feesReportFeatures.includes(feature)
          ? viewOnly
          : noAccess;
      } else {
        result[module][feature] = { ...noAccess };
      }
    }
  }
  return result;
}

function buildLibrarianPerms(): RolePermissions {
  const result: RolePermissions = {};
  for (const { module, features } of permissionModules) {
    result[module] = {};
    const isLibrary = libraryModules.includes(module);
    const isBookReport = module === "Reports";
    for (const feature of features) {
      if (isLibrary) {
        result[module][feature] = { ...allTrue };
      } else if (isBookReport) {
        const bookReportFeatures = [
          "Book Issue Report",
          "Book Due Report",
          "Book Inventory Report",
          "Book Issue Return Report",
        ];
        result[module][feature] = bookReportFeatures.includes(feature)
          ? viewOnly
          : noAccess;
      } else {
        result[module][feature] = { ...noAccess };
      }
    }
  }
  return result;
}

function buildTeacherPerms(): RolePermissions {
  const result: RolePermissions = {};
  const teacherPerm: Permission = {
    view: true,
    add: true,
    edit: true,
    delete: false,
  };
  for (const { module, features } of permissionModules) {
    result[module] = {};
    for (const feature of features) {
      result[module][feature] = teacherModules.includes(module)
        ? { ...teacherPerm }
        : { ...noAccess };
    }
  }
  return result;
}

function buildParentPerms(): RolePermissions {
  const result: RolePermissions = {};
  for (const { module, features } of permissionModules) {
    result[module] = {};
    for (const feature of features) {
      result[module][feature] = parentStudentViewModules.includes(module)
        ? viewOnly
        : noAccess;
    }
  }
  return result;
}

function buildStudentPerms(): RolePermissions {
  const result: RolePermissions = {};
  const studentModules = [
    "Student Information",
    "Student Attendance",
    "Examination",
    "Homework",
  ];
  for (const { module, features } of permissionModules) {
    result[module] = {};
    for (const feature of features) {
      result[module][feature] = studentModules.includes(module)
        ? viewOnly
        : noAccess;
    }
  }
  return result;
}

function buildDriverPerms(): RolePermissions {
  const viewOnly: import("../types/auth").Permission = {
    view: true,
    add: false,
    edit: false,
    delete: false,
  };
  const noAccess: import("../types/auth").Permission = {
    view: false,
    add: false,
    edit: false,
    delete: false,
  };
  const result: RolePermissions = {};
  const driverModules = [
    "Transport",
    "Student Attendance",
    "Dashboard and Widgets",
  ];
  for (const { module, features } of permissionModules) {
    result[module] = {};
    for (const feature of features) {
      result[module][feature] = driverModules.includes(module)
        ? viewOnly
        : noAccess;
    }
  }
  return result;
}

export const defaultPermissions: Record<Role, RolePermissions> = {
  super_admin: allModulesTrue(),
  admin: allModulesTrue(),
  accountant: buildAccountantPerms(),
  librarian: buildLibrarianPerms(),
  teacher: buildTeacherPerms(),
  parent: buildParentPerms(),
  student: buildStudentPerms(),
  driver: buildDriverPerms(),
};

// Silence unused import warning
void buildPerms;
