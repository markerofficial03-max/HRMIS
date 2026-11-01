/**
 * HR Attendance MIS & Payroll Enterprise Mock Data & Configuration
 * Standard Indian Corporate & Global Compliance Model
 */

const COMPANY_CONFIG = {
  companyName: "HR MIS TOTAL SOLUTION",
  companyCode: "HRMIS-ENTERPRISE",
  portalTitle: "HR MIS TOTAL SOLUTION",
  panNumber: "AAACH9841K",
  tanNumber: "DELH12345C",
  address: "Tower 4, Enterprise Cyber Hub, Phase III, Gurugram, NCR - 122002",
  pfCode: "DL/CPM/1098471/000",
  esicCode: "11000984710000101",
  currentMonth: "October 2026",
  financialYear: "2026-2027",
  calendarDays: 31,
  totalWorkingDays: 22,
  standardDailyHours: 8.5,
  statutory: {
    pfRate: 0.12, // 12% on Basic
    esiRate: 0.0075, // 0.75% for Gross < 21,000
    ptDefault: 200, // Monthly Professional Tax slab
    tdsSlabDefault: 0.10 // Average default TDS slab
  }
};

// User credentials for authentication
const AUTH_ACCOUNTS = [
  { id: "DEV-100", username: "developer", password: "120723", role: "super_admin", name: "System Developer", email: "developer@hrmis.com", status: "Active" },
  { id: "ZG-1001", username: "admin", password: "123", role: "super_admin", name: "Aarav Sharma", email: "aarav.sharma@hrmis.com", status: "Active" },
  { id: "ZG-1002", username: "hr", password: "123", role: "hr_admin", name: "Priyanka Verma", email: "priyanka.verma@hrmis.com", status: "Active" },
  { id: "ZG-1003", username: "finance", password: "123", role: "finance_admin", name: "Rohan Kulkarni", email: "rohan.k@hrmis.com", status: "Active" },
  { id: "ZG-1005", username: "manager", password: "123", role: "manager", name: "Mohammad Irfan", email: "m.irfan@hrmis.com", status: "Active" },
  { id: "ZG-1004", username: "employee", password: "123", role: "employee", name: "Sneha Nair", email: "sneha.nair@hrmis.com", status: "Active" },
  { id: "ZG-1006", username: "ananya", password: "123", role: "employee", name: "Ananya Iyer", email: "ananya.iyer@hrmis.com", status: "Active" }
];

// Admin-defined Access Points & Permission Matrix (Who Can Do What)
const USER_PERMISSIONS = {
  "DEV-100": { attendance: true, payroll: true, form16: true, approvals: true, geofence: true, staffMgmt: true, licenseMgmt: true },
  "ZG-1001": { attendance: true, payroll: true, form16: true, approvals: true, geofence: true, staffMgmt: true, licenseMgmt: true },
  "ZG-1002": { attendance: true, payroll: false, form16: false, approvals: true, geofence: true, staffMgmt: true, licenseMgmt: false },
  "ZG-1003": { attendance: true, payroll: true, form16: true, approvals: false, geofence: false, staffMgmt: false, licenseMgmt: false },
  "ZG-1005": { attendance: true, payroll: false, form16: false, approvals: true, geofence: true, staffMgmt: false, licenseMgmt: false },
  "ZG-1004": { attendance: true, payroll: false, form16: false, approvals: false, geofence: false, staffMgmt: false, licenseMgmt: false },
  "ZG-1006": { attendance: true, payroll: false, form16: false, approvals: false, geofence: false, staffMgmt: false, licenseMgmt: false }
};

// Enterprise Yearly Recharge & Subscription License Configuration
// Secret master recharge verification key: -12072023 (Encrypted/Masked)
const SUBSCRIPTION_CONFIG = {
  planName: "Enterprise Unlimited Cloud License",
  status: "Active (Enterprise)",
  secretRechargeCode: "-12072023",
  validUntil: "2027-10-31",
  daysRemaining: 364,
  licenseKey: "HRMIS-ENT-2026-X8910",
  rechargeHistory: [
    { date: "2026-10-31", period: "1 Year Extension", renewedBy: "Super Admin", receiptNo: "REC-2026-9810", status: "Verified & Active" },
    { date: "2025-10-31", period: "1 Year Standard", renewedBy: "Super Admin", receiptNo: "REC-2025-4120", status: "Completed" }
  ]
};

// Geofenced Office Locations Master
const BRANCH_LOCATIONS = [
  {
    id: "LOC-01",
    name: "Gurugram Head Office (HQ)",
    city: "Gurugram, NCR",
    lat: 28.4947,
    lng: 77.0894,
    radiusMeters: 250,
    activeEmployees: 140,
    status: "Active"
  },
  {
    id: "LOC-02",
    name: "Bengaluru Tech Park Hub",
    city: "Bengaluru, Karnataka",
    lat: 12.9352,
    lng: 77.6946,
    radiusMeters: 300,
    activeEmployees: 95,
    status: "Active"
  },
  {
    id: "LOC-03",
    name: "Mumbai Commercial Branch",
    city: "Bandra Kurla Complex, Mumbai",
    lat: 19.0657,
    lng: 72.8687,
    radiusMeters: 200,
    activeEmployees: 60,
    status: "Active"
  },
  {
    id: "LOC-04",
    name: "Noida Logistics & Ops Center",
    city: "Sector 62, Noida, UP",
    lat: 28.6280,
    lng: 77.3649,
    radiusMeters: 400,
    activeEmployees: 45,
    status: "Active"
  }
];

// Employee Master Database with Integrated Attendance & Financial Attributes
const EMPLOYEES = [
  {
    id: "DEV-100",
    name: "System Developer",
    email: "developer@hrmis.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    department: "Engineering & IT",
    designation: "Lead System Developer",
    branch: "Gurugram Head Office (HQ)",
    branchId: "LOC-01",
    reportingManager: "Executive Director",
    hodManager: "Executive Director",
    matrixManager: "None",
    doj: "2020-01-01",
    dob: "1988-07-12",
    pan: "DEVP8291K",
    uan: "101999888777",
    bankName: "HDFC Bank",
    accountNo: "50100998877665",
    ifsc: "HDFC0000240",
    
    calendarDays: 31,
    presentDays: 22,
    absentDays: 0,
    weeklyOffs: 5,
    paidHolidays: 2,
    leaves: {
      cl: 1,
      sl: 1,
      el: 0,
      maternityPaternity: 0,
      lwp: 0
    },
    timeTracking: {
      lateComingCount: 0,
      lateHours: 0.0,
      earlyGoingCount: 0,
      earlyHours: 0.0,
      overtimeHours: 20.0,
      effectiveWorkingHours: 195.0,
      totalLoggedHours: 215.0,
      totalBreakHours: 20.0,
      missedPunches: 0
    },
    regularization: {
      pending: 0,
      approved: 0,
      status: "Verified & Locked"
    },
    salary: {
      basic: 95000,
      da: 20000,
      hra: 45000,
      specialAllowance: 35000,
      travelAllowance: 6000,
      advanceDeduction: 0
    },
    taxDeclarations: {
      sec80C: 150000,
      sec80D: 25000,
      secHRA: 240000,
      regime: "New Regime"
    }
  },
  {
    id: "ZG-1001",
    name: "Aarav Sharma",
    email: "aarav.sharma@zenithglobal.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    department: "Information Technology",
    designation: "Principal Cloud Architect",
    branch: "Gurugram Head Office (HQ)",
    branchId: "LOC-01",
    reportingManager: "Vikram Singhania (VP Tech)",
    hodManager: "Devendra Patel (CTO)",
    matrixManager: "Sarah Jenkins (Enterprise Lead)",
    doj: "2021-03-15",
    dob: "1990-10-18",
    pan: "ABFPS8291K",
    uan: "101293849102",
    bankName: "HDFC Bank",
    accountNo: "50100492817291",
    ifsc: "HDFC0000240",
    
    // Monthly Attendance & Time Tracking Metrics
    calendarDays: 31,
    presentDays: 20,
    absentDays: 0,
    weeklyOffs: 5,
    paidHolidays: 2, // e.g. Dussehra & Gandhi Jayanti
    leaves: {
      cl: 1,
      sl: 1,
      el: 2,
      maternityPaternity: 0,
      lwp: 0 // Loss of Pay days
    },
    timeTracking: {
      lateComingCount: 1,
      lateHours: 0.5,
      earlyGoingCount: 0,
      earlyHours: 0.0,
      overtimeHours: 14.5,
      effectiveWorkingHours: 184.0, // Total net productive logged hours
      totalLoggedHours: 204.0,
      totalBreakHours: 20.0,
      missedPunches: 0
    },
    regularization: {
      pending: 0,
      approved: 1,
      status: "Verified & Locked"
    },
    
    // Compensation Structure (Monthly INR)
    salary: {
      basic: 65000,
      da: 15000,
      hra: 32000,
      specialAllowance: 28000,
      travelAllowance: 5000,
      advanceDeduction: 0
    },

    // Tax Declarations for Form 16
    taxDeclarations: {
      sec80C: 150000, // PPF, ELSS, EPF
      sec80D: 25000,  // Health Insurance
      secHRA: 180000, // Annual Rent Proof verified
      regime: "Old Regime"
    }
  },
  {
    id: "ZG-1002",
    name: "Priyanka Verma",
    email: "priyanka.verma@zenithglobal.com",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    department: "Human Resources",
    designation: "Sr. HR Talent Partner",
    branch: "Gurugram Head Office (HQ)",
    branchId: "LOC-01",
    reportingManager: "Sunita Roy (HR Director)",
    hodManager: "Kavita Rao (CHRO)",
    matrixManager: "None",
    doj: "2022-07-01",
    dob: "1994-11-04", // Upcoming Birthday!
    pan: "BPQPV1928N",
    uan: "101827364519",
    bankName: "ICICI Bank",
    accountNo: "001205938472",
    ifsc: "ICIC0000012",
    
    calendarDays: 31,
    presentDays: 19,
    absentDays: 0,
    weeklyOffs: 5,
    paidHolidays: 2,
    leaves: {
      cl: 2,
      sl: 1,
      el: 1,
      maternityPaternity: 0,
      lwp: 1 // 1 Day LOP / LWP
    },
    timeTracking: {
      lateComingCount: 3,
      lateHours: 1.8,
      earlyGoingCount: 1,
      earlyHours: 0.75,
      overtimeHours: 4.0,
      effectiveWorkingHours: 162.5,
      totalLoggedHours: 182.0,
      totalBreakHours: 19.5,
      missedPunches: 1
    },
    regularization: {
      pending: 1,
      approved: 2,
      status: "Pending L2 Review"
    },
    
    salary: {
      basic: 38000,
      da: 9000,
      hra: 18000,
      specialAllowance: 15000,
      travelAllowance: 3000,
      advanceDeduction: 2000
    },

    taxDeclarations: {
      sec80C: 120000,
      sec80D: 20000,
      secHRA: 144000,
      regime: "New Regime"
    }
  },
  {
    id: "ZG-1003",
    name: "Rohan Kulkarni",
    email: "rohan.k@zenithglobal.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    department: "Finance & Accounts",
    designation: "Assistant Finance Manager",
    branch: "Mumbai Commercial Branch",
    branchId: "LOC-03",
    reportingManager: "Rajesh Tandon (CFO)",
    hodManager: "Rajesh Tandon (CFO)",
    matrixManager: "Aarav Sharma",
    doj: "2019-10-10", // Milestone Anniversary in October!
    dob: "1988-06-22",
    pan: "CKPRK4819M",
    uan: "100918273645",
    bankName: "State Bank of India",
    accountNo: "309281729481",
    ifsc: "SBIN0001824",
    
    calendarDays: 31,
    presentDays: 21,
    absentDays: 0,
    weeklyOffs: 5,
    paidHolidays: 2,
    leaves: {
      cl: 1,
      sl: 0,
      el: 2,
      maternityPaternity: 0,
      lwp: 0
    },
    timeTracking: {
      lateComingCount: 0,
      lateHours: 0.0,
      earlyGoingCount: 0,
      earlyHours: 0.0,
      overtimeHours: 22.0, // Significant Month-end audit OT
      effectiveWorkingHours: 198.0,
      totalLoggedHours: 218.0,
      totalBreakHours: 20.0,
      missedPunches: 0
    },
    regularization: {
      pending: 0,
      approved: 0,
      status: "All Matched"
    },
    
    salary: {
      basic: 48000,
      da: 12000,
      hra: 24000,
      specialAllowance: 20000,
      travelAllowance: 4000,
      advanceDeduction: 0
    },

    taxDeclarations: {
      sec80C: 150000,
      sec80D: 25000,
      secHRA: 216000,
      regime: "Old Regime"
    }
  },
  {
    id: "ZG-1004",
    name: "Sneha Nair",
    email: "sneha.nair@zenithglobal.com",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    department: "Sales & Business Dev",
    designation: "Enterprise Accounts Executive",
    branch: "Bengaluru Tech Park Hub",
    branchId: "LOC-02",
    reportingManager: "Manish Goel (Sales VP)",
    hodManager: "Vikram Singhania",
    matrixManager: "Priyanka Verma",
    doj: "2023-01-20",
    dob: "1996-03-12",
    pan: "DAPSN3918Q",
    uan: "101928374618",
    bankName: "Axis Bank",
    accountNo: "91802003918274",
    ifsc: "UTIB0000135",
    
    calendarDays: 31,
    presentDays: 16,
    absentDays: 2, // 2 days unauthorized absence
    weeklyOffs: 5,
    paidHolidays: 2,
    leaves: {
      cl: 1,
      sl: 2,
      el: 0,
      maternityPaternity: 0,
      lwp: 3 // Total 3 LOP
    },
    timeTracking: {
      lateComingCount: 6, // High punctuality warning
      lateHours: 4.5,
      earlyGoingCount: 3,
      earlyHours: 2.1,
      overtimeHours: 0.0,
      effectiveWorkingHours: 128.0,
      totalLoggedHours: 145.0,
      totalBreakHours: 17.0,
      missedPunches: 4
    },
    regularization: {
      pending: 2,
      approved: 1,
      status: "Warning Issued"
    },
    
    salary: {
      basic: 32000,
      da: 7000,
      hra: 15000,
      specialAllowance: 12000,
      travelAllowance: 6000,
      advanceDeduction: 5000 // Loan recovery
    },

    taxDeclarations: {
      sec80C: 80000,
      sec80D: 10000,
      secHRA: 120000,
      regime: "New Regime"
    }
  },
  {
    id: "ZG-1005",
    name: "Mohammad Irfan",
    email: "m.irfan@zenithglobal.com",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    department: "Operations & Logistics",
    designation: "Operations Lead",
    branch: "Noida Logistics & Ops Center",
    branchId: "LOC-04",
    reportingManager: "Harish Gupta (Ops Director)",
    hodManager: "Harish Gupta (Ops Director)",
    matrixManager: "None",
    doj: "2020-08-10",
    dob: "1992-11-15",
    pan: "EPMI82710L",
    uan: "101827461928",
    bankName: "Kotak Mahindra Bank",
    accountNo: "7812903847",
    ifsc: "KKBK0000180",
    
    calendarDays: 31,
    presentDays: 22,
    absentDays: 0,
    weeklyOffs: 5,
    paidHolidays: 2,
    leaves: {
      cl: 1,
      sl: 1,
      el: 0,
      maternityPaternity: 0,
      lwp: 0
    },
    timeTracking: {
      lateComingCount: 0,
      lateHours: 0.0,
      earlyGoingCount: 0,
      earlyHours: 0.0,
      overtimeHours: 18.0,
      effectiveWorkingHours: 195.0,
      totalLoggedHours: 215.0,
      totalBreakHours: 20.0,
      missedPunches: 1
    },
    regularization: {
      pending: 0,
      approved: 1,
      status: "Approved L1"
    },
    
    salary: {
      basic: 36000,
      da: 8000,
      hra: 16000,
      specialAllowance: 14000,
      travelAllowance: 3500,
      advanceDeduction: 0
    },

    taxDeclarations: {
      sec80C: 135000,
      sec80D: 22000,
      secHRA: 130000,
      regime: "Old Regime"
    }
  },
  {
    id: "ZG-1006",
    name: "Ananya Iyer",
    email: "ananya.iyer@zenithglobal.com",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    department: "Information Technology",
    designation: "Lead UI/UX & Frontend Engineer",
    branch: "Bengaluru Tech Park Hub",
    branchId: "LOC-02",
    reportingManager: "Aarav Sharma",
    hodManager: "Devendra Patel (CTO)",
    matrixManager: "Sarah Jenkins",
    doj: "2024-02-01",
    dob: "1995-10-29",
    pan: "FXPAI9182C",
    uan: "101928471928",
    bankName: "HDFC Bank",
    accountNo: "50100819283746",
    ifsc: "HDFC0000128",
    
    calendarDays: 31,
    presentDays: 21,
    absentDays: 0,
    weeklyOffs: 5,
    paidHolidays: 2,
    leaves: {
      cl: 1,
      sl: 1,
      el: 1,
      maternityPaternity: 0,
      lwp: 0
    },
    timeTracking: {
      lateComingCount: 1,
      lateHours: 0.3,
      earlyGoingCount: 0,
      earlyHours: 0.0,
      overtimeHours: 9.0,
      effectiveWorkingHours: 182.0,
      totalLoggedHours: 200.0,
      totalBreakHours: 18.0,
      missedPunches: 0
    },
    regularization: {
      pending: 0,
      approved: 0,
      status: "All Matched"
    },
    
    salary: {
      basic: 52000,
      da: 11000,
      hra: 25000,
      specialAllowance: 22000,
      travelAllowance: 4000,
      advanceDeduction: 0
    },

    taxDeclarations: {
      sec80C: 150000,
      sec80D: 25000,
      secHRA: 180000,
      regime: "New Regime"
    }
  }
];

// Active Notices & Announcements
const COMPANY_NOTICES = [
  {
    id: "NOT-2026-101",
    title: "Diwali & Festival Bonus Payout and Office Schedule",
    category: "Holiday Notice",
    targetAudience: "All Locations & Departments",
    publishDate: "2026-10-25",
    expiryDate: "2026-11-15",
    priority: "High",
    acknowledgedCount: 284,
    totalCount: 340,
    content: "Company offices will observe mandatory holidays from Nov 1 to Nov 4. Festival advance & ex-gratia bonuses have been credited along with October payroll."
  },
  {
    id: "NOT-2026-102",
    title: "Updated GPS Geofencing Radius Policy for Field Employees",
    category: "Policy Update",
    targetAudience: "Sales & Operations Departments",
    publishDate: "2026-10-18",
    expiryDate: "2026-11-30",
    priority: "Medium",
    acknowledgedCount: 98,
    totalCount: 105,
    content: "All field associates must mark biometric attendance within a strict 300m radius of authorized client sites or regional transit depots using the Zenith Mobile App."
  },
  {
    id: "NOT-2026-103",
    title: "Mandatory Submission of Tax Saving Investment Proofs (FY 2026-27)",
    category: "Urgent Alert",
    targetAudience: "All Employees (Account / Finance)",
    publishDate: "2026-10-20",
    expiryDate: "2026-12-15",
    priority: "Urgent",
    acknowledgedCount: 310,
    totalCount: 340,
    content: "Upload all proofs for Section 80C, 80D, and HRA rent agreements with landlord PAN on the portal by Dec 15 to avoid heavy TDS deductions in Q4 salary slips."
  }
];

// Pending Multi-Tier Regularization & Leave Approvals Queue
const APPROVAL_REQUESTS = [
  {
    id: "REQ-9901",
    empId: "ZG-1002",
    empName: "Priyanka Verma",
    dept: "Human Resources",
    type: "Missed Punch Regularization",
    date: "2026-10-14",
    inTime: "09:30 AM",
    outTime: "06:45 PM",
    reason: "Biometric reader error at Gurugram gate 2 during morning rush.",
    stage: "L2 Pending (HOD Kavita Rao)",
    l1Status: "Approved by Sunita Roy",
    l2Status: "Pending",
    appliedOn: "2026-10-15"
  },
  {
    id: "REQ-9902",
    empId: "ZG-1004",
    empName: "Sneha Nair",
    dept: "Sales & Business Dev",
    type: "Leave Application (Earned Leave - 4 Days)",
    date: "2026-11-05 to 2026-11-08",
    inTime: "--",
    outTime: "--",
    reason: "Family travel during post-Diwali festivities.",
    stage: "L1 Pending (Manish Goel)",
    l1Status: "Pending Review",
    l2Status: "Awaiting L1",
    appliedOn: "2026-10-27"
  },
  {
    id: "REQ-9903",
    empId: "ZG-1004",
    empName: "Sneha Nair",
    dept: "Sales & Business Dev",
    type: "Biometric Regularization",
    date: "2026-10-22",
    inTime: "10:15 AM",
    outTime: "07:30 PM",
    reason: "Client meeting off-site in Whitefield; punched from transit.",
    stage: "Matrix Review (Sarah Jenkins)",
    l1Status: "Approved by Manish Goel",
    l2Status: "Pending Project Matrix",
    appliedOn: "2026-10-23"
  }
];

// Sample Form 16 Part A TDS TRACES Summary
const FORM16_PART_A_MOCK = [
  { quarter: "Q1 (Apr - Jun)", challanNo: "CH-091823", depositDate: "2026-07-07", bsrCode: "0210084", taxDeducted: 42000, taxDeposited: 42000, status: "TRACES Matched" },
  { quarter: "Q2 (Jul - Sep)", challanNo: "CH-098231", depositDate: "2026-10-06", bsrCode: "0210084", taxDeducted: 42000, taxDeposited: 42000, status: "TRACES Matched" },
  { quarter: "Q3 (Oct - Dec)", challanNo: "Pending", depositDate: "Due Jan 2027", bsrCode: "--", taxDeducted: 42000, taxDeposited: 0, status: "Estimated" },
  { quarter: "Q4 (Jan - Mar)", challanNo: "Pending", depositDate: "Due Apr 2027", bsrCode: "--", taxDeducted: 42000, taxDeposited: 0, status: "Estimated" }
];
