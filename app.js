/**
 * Enterprise HR Attendance MIS & Payroll Cloud Engine
 * Full implementation of Attendance Metrics, Pay Slip, Form 16, Geofencing, and Approval Hierarchies
 */

// Global State
let currentUser = AUTH_ACCOUNTS[0]; // Default logged-in user (Super Admin)
let currentRole = currentUser.role;
let selectedEmployeeId = currentUser.id;
let attendanceFilter = {
  department: "all",
  branch: "all",
  search: "",
  month: "October 2026"
};

// Mobile GPS App State
let mobileGpsState = {
  lat: 28.4947,
  lng: 77.0894,
  accuracy: 14,
  distance: 38,
  nearestBranch: BRANCH_LOCATIONS[0],
  isWithinRadius: true,
  isDetecting: false
};

let mobilePunchStatus = {
  hasPunchedIn: false,
  punchInTime: null,
  punchOutTime: null,
  shiftDuration: "00:00:00",
  timerInterval: null
};

let mobilePunchLogs = [
  { type: "IN", time: "09:15 AM", location: "Gurugram HQ", distance: "38m", status: "Authorized (Biometric GPS)" },
  { type: "BREAK_OUT", time: "01:10 PM", location: "Cafeteria Tower 4", distance: "65m", status: "Lunch Break" },
  { type: "BREAK_IN", time: "01:50 PM", location: "Gurugram HQ", distance: "40m", status: "Resume Duty" }
];

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  initAuthSession();
  initNavigation();
  initRoleSwitcher();
  initFilters();
  renderAllModules();
  initCharts();
  startLiveClock();
  initMobileGPSApp();
});

// Live Clock in Topbar
function startLiveClock() {
  const clockEl = document.getElementById("topbar-live-clock");
  if (!clockEl) return;
  const update = () => {
    const now = new Date();
    clockEl.textContent = now.toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric"
    }) + " • " + now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  update();
  setInterval(update, 1000);
}

// Navigation Tabs
function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-tab-btn");
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  // Update nav buttons
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("nav-tab-active");
    } else {
      btn.classList.remove("nav-tab-active");
    }
  });

  // Show target content section
  document.querySelectorAll(".tab-content-panel").forEach(panel => {
    if (panel.id === tabId) {
      panel.classList.remove("hidden");
    } else {
      panel.classList.add("hidden");
    }
  });

  // Re-render chart if analytics tab
  if (tabId === "tab-attendance-mis") {
    setTimeout(renderAttendanceCharts, 50);
  }
}

// Role Based Access Control (RBAC) Switcher
function initRoleSwitcher() {
  const roleSelect = document.getElementById("rbac-role-select");
  if (!roleSelect) return;
  roleSelect.addEventListener("change", (e) => {
    currentRole = e.target.value;
    applyRolePermissions();
    showToast(`Switched perspective to ${formatRoleName(currentRole)}`, "info");
  });
}

function formatRoleName(role) {
  switch (role) {
    case "super_admin": return "Super Administrator (Full Enterprise Control)";
    case "hr_admin": return "HR Admin (Attendance & Onboarding)";
    case "finance_admin": return "Finance & Payroll Admin (Accounts & Tax)";
    case "manager": return "L1 / L2 Reporting Manager";
    case "employee": return "Employee Self-Service (Aarav Sharma)";
    default: return role;
  }
}

function applyRolePermissions() {
  const roleBadge = document.getElementById("active-role-badge");
  if (roleBadge) {
    roleBadge.textContent = currentRole.replace("_", " ").toUpperCase();
  }

  // Hide or show elements depending on permissions
  const financeSections = document.querySelectorAll(".require-finance");
  const adminSections = document.querySelectorAll(".require-admin");
  const managerSections = document.querySelectorAll(".require-manager");

  if (currentRole === "employee") {
    financeSections.forEach(el => el.classList.add("opacity-50", "pointer-events-none"));
    document.getElementById("btn-add-employee")?.classList.add("hidden");
  } else if (currentRole === "hr_admin") {
    financeSections.forEach(el => el.classList.remove("opacity-50", "pointer-events-none"));
    document.getElementById("btn-add-employee")?.classList.remove("hidden");
  } else {
    // Super admin & finance admin
    financeSections.forEach(el => el.classList.remove("opacity-50", "pointer-events-none"));
    document.getElementById("btn-add-employee")?.classList.remove("hidden");
  }

  renderAttendanceTable();
}

// Filter listeners
function initFilters() {
  const deptSelect = document.getElementById("filter-dept");
  const branchSelect = document.getElementById("filter-branch");
  const searchInput = document.getElementById("filter-search");

  if (deptSelect) {
    deptSelect.addEventListener("change", (e) => {
      attendanceFilter.department = e.target.value;
      renderAttendanceTable();
    });
  }
  if (branchSelect) {
    branchSelect.addEventListener("change", (e) => {
      attendanceFilter.branch = e.target.value;
      renderAttendanceTable();
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      attendanceFilter.search = e.target.value.toLowerCase();
      renderAttendanceTable();
    });
  }
}

// Calculation Utilities
function calculateEmployeeAttendance(emp) {
  const totalWorking = COMPANY_CONFIG.totalWorkingDays; // 22
  const calendarDays = emp.calendarDays; // 31
  const present = emp.presentDays;
  const wo = emp.weeklyOffs;
  const ph = emp.paidHolidays;
  const leaves = emp.leaves;
  const paidLeaves = (leaves.cl || 0) + (leaves.sl || 0) + (leaves.el || 0) + (leaves.maternityPaternity || 0);
  const lwp = leaves.lwp || 0;
  const absentUnauthorized = emp.absentDays || 0;

  // Formula: Total Payable Days = Present + Weekly Offs + Holidays + Paid Leaves
  const totalPayableDays = present + wo + ph + paidLeaves;

  // Total LOP days
  const totalLopDays = lwp + absentUnauthorized;

  // Attendance Percentage = (Present Days / Total Working Days) * 100
  const attendancePercentage = Number(((present / totalWorking) * 100).toFixed(1));

  // Mean Working Hours Formula = Total Effective Working Hours / Total Days Present
  const meanWorkingHours = present > 0 ? (emp.timeTracking.effectiveWorkingHours / present).toFixed(2) : "0.00";

  // Attrition Risk
  let attritionRisk = "Low Risk";
  let attritionColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (attendancePercentage < 75 || totalLopDays >= 3 || emp.timeTracking.lateComingCount >= 5) {
    attritionRisk = "High Risk";
    attritionColor = "bg-rose-100 text-rose-800 border-rose-300";
  } else if (attendancePercentage < 88 || emp.timeTracking.lateComingCount >= 3) {
    attritionRisk = "Moderate";
    attritionColor = "bg-amber-100 text-amber-800 border-amber-300";
  }

  // Mean Hours Productivity Status
  let productivityStatus = "Normal Balanced";
  if (parseFloat(meanWorkingHours) > 9.2) {
    productivityStatus = "Overtime Stressed";
  } else if (parseFloat(meanWorkingHours) < 7.5 && present > 0) {
    productivityStatus = "Under-utilization";
  }

  return {
    calendarDays,
    totalWorking,
    present,
    absentUnauthorized,
    wo,
    ph,
    paidLeaves,
    lwp,
    totalPayableDays,
    totalLopDays,
    attendancePercentage,
    meanWorkingHours,
    attritionRisk,
    attritionColor,
    productivityStatus
  };
}

function calculateEmployeePayroll(emp) {
  const att = calculateEmployeeAttendance(emp);
  const s = emp.salary;
  const calendarDays = emp.calendarDays;

  // Earnings
  const basic = s.basic;
  const da = s.da;
  const hra = s.hra;
  const specialAllowance = s.specialAllowance;
  const travelAllowance = s.travelAllowance || 0;

  // Overtime Calculation:
  // Hourly standard rate = (Basic + DA) / (Total Working Days * Standard Daily Hours)
  const hourlyRate = (basic + da) / (COMPANY_CONFIG.totalWorkingDays * COMPANY_CONFIG.standardDailyHours);
  const otHours = emp.timeTracking.overtimeHours || 0;
  const otPay = Math.round(hourlyRate * otHours * 1.5); // 1.5x Overtime premium

  const grossEarningsUnadjusted = basic + da + hra + specialAllowance + travelAllowance;

  // Deductions
  // 1. LOP Deduction: Daily rate = Gross / Calendar Days
  const perDayGross = grossEarningsUnadjusted / calendarDays;
  const lopDeduction = Math.round(perDayGross * att.totalLopDays);

  const grossEarnings = grossEarningsUnadjusted + otPay;

  // 2. PF: 12% of Basic
  const pfDeduction = Math.round(basic * COMPANY_CONFIG.statutory.pfRate);

  // 3. ESI: 0.75% if Gross <= 21000
  const esiDeduction = grossEarningsUnadjusted <= 21000 ? Math.round(grossEarningsUnadjusted * COMPANY_CONFIG.statutory.esiRate) : 0;

  // 4. Professional Tax (PT)
  const ptDeduction = COMPANY_CONFIG.statutory.ptDefault;

  // 5. Estimated TDS / Income Tax
  let annualProjectedGross = grossEarningsUnadjusted * 12;
  let estimatedAnnualTax = 0;
  if (emp.taxDeclarations.regime === "Old Regime") {
    let exemptions = (emp.taxDeclarations.sec80C || 0) + (emp.taxDeclarations.sec80D || 0) + 50000; // Standard deduction
    let taxable = Math.max(0, annualProjectedGross - exemptions);
    estimatedAnnualTax = taxable > 500000 ? (taxable - 500000) * 0.20 + 12500 : 0;
  } else {
    // New simplified regime approx
    let taxable = Math.max(0, annualProjectedGross - 75000); // New Std deduction
    estimatedAnnualTax = taxable > 700000 ? (taxable - 700000) * 0.15 + 25000 : 0;
  }
  const monthlyTds = Math.round(estimatedAnnualTax / 12);

  // 6. Advance / Loan Deduction
  const advanceDeduction = s.advanceDeduction || 0;

  const totalDeductions = lopDeduction + pfDeduction + esiDeduction + ptDeduction + monthlyTds + advanceDeduction;
  const netPayable = Math.max(0, grossEarnings - totalDeductions);

  return {
    basic,
    da,
    hra,
    specialAllowance,
    travelAllowance,
    otPay,
    grossEarnings,
    lopDeduction,
    pfDeduction,
    esiDeduction,
    ptDeduction,
    monthlyTds,
    advanceDeduction,
    totalDeductions,
    netPayable
  };
}

// --- Render Modules ---
function renderAllModules() {
  renderAttendanceTable();
  renderSummaryKPIs();
  renderPaySlipModule();
  renderForm16Module();
  renderApprovalsModule();
  renderGeofencingModule();
  renderNoticesAndMilestones();
  renderFAndFCalculator();
  renderAdminAccessPanel();
  renderSubscriptionPanel();
}

// 1. Attendance MIS Table Rendering
function renderAttendanceTable() {
  const tbody = document.getElementById("attendance-table-body");
  if (!tbody) return;

  let filtered = EMPLOYEES.filter(emp => {
    if (attendanceFilter.department !== "all" && emp.department !== attendanceFilter.department) return false;
    if (attendanceFilter.branch !== "all" && emp.branchId !== attendanceFilter.branch) return false;
    if (attendanceFilter.search) {
      const q = attendanceFilter.search;
      return emp.name.toLowerCase().includes(q) || emp.id.toLowerCase().includes(q) || emp.designation.toLowerCase().includes(q);
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="15" class="py-8 text-center text-slate-400 font-medium">No matching employee records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(emp => {
    const att = calculateEmployeeAttendance(emp);
    const time = emp.timeTracking;

    return `
      <tr class="data-row border-b border-slate-100 hover:bg-slate-50/80 text-xs text-slate-700">
        <!-- 1. Employee Info -->
        <td class="py-3 px-3">
          <div class="flex items-center gap-2.5">
            <img src="${emp.avatar}" alt="${emp.name}" class="w-8 h-8 rounded-full object-cover border border-slate-200">
            <div>
              <div class="font-bold text-slate-900">${emp.name}</div>
              <div class="text-[11px] text-blue-600 font-mono-numeric font-medium">${emp.id}</div>
              <div class="text-[10px] text-slate-400">${emp.department} • ${emp.branch.split(' ')[0]}</div>
            </div>
          </div>
        </td>

        <!-- Designation & Manager -->
        <td class="py-3 px-2">
          <div class="font-medium text-slate-800">${emp.designation}</div>
          <div class="text-[10px] text-slate-500">L1: ${emp.reportingManager.split(' ')[0]} ${emp.reportingManager.split(' ')[1] || ''}</div>
          <div class="text-[10px] text-slate-400">DOJ: ${emp.doj}</div>
        </td>

        <!-- 2. Core Attendance Data -->
        <td class="py-3 px-2 text-center font-mono-numeric font-semibold text-slate-800">${att.calendarDays}</td>
        <td class="py-3 px-2 text-center">
          <span class="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">${att.present}</span>
        </td>
        <td class="py-3 px-2 text-center">
          <span class="inline-block px-2 py-0.5 rounded text-[11px] font-bold ${att.absentUnauthorized > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-slate-400'}">${att.absentUnauthorized}</span>
        </td>
        <td class="py-3 px-2 text-center font-mono-numeric text-slate-600">${att.wo} / ${att.ph}</td>
        
        <!-- Total Payable Days -->
        <td class="py-3 px-2 text-center">
          <span class="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono-numeric shadow-sm">
            ${att.totalPayableDays}
          </span>
        </td>

        <!-- 3. Leave Management -->
        <td class="py-3 px-2 text-center">
          <div class="text-[11px] space-y-0.5">
            <span class="px-1 bg-amber-50 text-amber-700 rounded font-semibold" title="Casual Leave">CL: ${emp.leaves.cl}</span>
            <span class="px-1 bg-sky-50 text-sky-700 rounded font-semibold" title="Sick Leave">SL: ${emp.leaves.sl}</span>
            <span class="px-1 bg-indigo-50 text-indigo-700 rounded font-semibold" title="Earned Leave">EL: ${emp.leaves.el}</span>
          </div>
        </td>
        <td class="py-3 px-2 text-center font-mono-numeric">
          <span class="font-bold ${att.totalLopDays > 0 ? 'text-red-600' : 'text-slate-400'}">${att.totalLopDays}</span>
        </td>

        <!-- 4. Punctuality & Time Tracking -->
        <td class="py-3 px-2 text-center">
          <div class="text-[11px]">
            <span class="${time.lateComingCount > 2 ? 'text-rose-600 font-bold' : 'text-slate-600'}">Late: ${time.lateComingCount} (${time.lateHours}h)</span><br>
            <span class="text-slate-400 text-[10px]">Early: ${time.earlyGoingCount}</span>
          </div>
        </td>
        <td class="py-3 px-2 text-center font-mono-numeric">
          <span class="font-semibold ${time.overtimeHours > 0 ? 'text-indigo-600 font-bold' : 'text-slate-400'}">${time.overtimeHours} hrs</span>
        </td>

        <!-- Mean Working Hours -->
        <td class="py-3 px-2 text-center font-mono-numeric">
          <div class="font-bold text-slate-800">${att.meanWorkingHours} h/d</div>
          <div class="text-[10px] text-slate-400">Total: ${time.effectiveWorkingHours}h</div>
        </td>

        <!-- 5. Exceptions & Regularization -->
        <td class="py-3 px-2 text-center">
          <div class="text-[11px]">
            <span class="${time.missedPunches > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}">Missed: ${time.missedPunches}</span><br>
            <span class="inline-block px-1.5 py-0.2 rounded text-[9px] ${emp.regularization.pending > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">${emp.regularization.status}</span>
          </div>
        </td>

        <!-- 6. Summary / Percentage Metrics -->
        <td class="py-3 px-2 text-center font-mono-numeric">
          <div class="font-bold ${att.attendancePercentage >= 90 ? 'text-emerald-600' : att.attendancePercentage >= 75 ? 'text-amber-600' : 'text-rose-600'}">
            ${att.attendancePercentage}%
          </div>
          <span class="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${att.attritionColor}">
            ${att.attritionRisk}
          </span>
        </td>

        <!-- Quick Action Trigger (Edit, Delete, Payslip, Form 16) -->
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end gap-1">
            <button onclick="openEditEmployeeModal('${emp.id}')" title="Edit Employee Profile" class="p-1.5 rounded-md hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="openPayslipModal('${emp.id}')" title="Generate Instant Pay Slip" class="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition">
              <i class="fa-solid fa-file-invoice-dollar"></i>
            </button>
            <button onclick="openForm16Modal('${emp.id}')" title="View Form 16 Tax Statement" class="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition">
              <i class="fa-solid fa-file-shield"></i>
            </button>
            <button onclick="confirmDeleteEmployee('${emp.id}')" title="Delete Employee" class="p-1.5 rounded-md hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 2. High-level Summary Metrics Cards
function renderSummaryKPIs() {
  const totalEmployees = EMPLOYEES.length;
  let totalPresent = 0;
  let totalPayable = 0;
  let totalOtHours = 0;
  let totalLopDays = 0;

  EMPLOYEES.forEach(emp => {
    const att = calculateEmployeeAttendance(emp);
    totalPresent += att.present;
    totalPayable += att.totalPayableDays;
    totalOtHours += emp.timeTracking.overtimeHours;
    totalLopDays += att.totalLopDays;
  });

  const avgAttendance = ((totalPresent / (totalEmployees * COMPANY_CONFIG.totalWorkingDays)) * 100).toFixed(1);

  document.getElementById("kpi-total-emp").textContent = totalEmployees.toString();
  document.getElementById("kpi-avg-attendance").textContent = `${avgAttendance}%`;
  document.getElementById("kpi-total-ot").textContent = `${totalOtHours} hrs`;
  document.getElementById("kpi-total-lop").textContent = `${totalLopDays} days`;
}

// 3. Finance & Pay Slip Module Rendering
function renderPaySlipModule() {
  const container = document.getElementById("payslip-employee-cards");
  if (!container) return;

  container.innerHTML = EMPLOYEES.map(emp => {
    const pay = calculateEmployeePayroll(emp);
    const att = calculateEmployeeAttendance(emp);

    return `
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
        <div class="flex items-start justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <img src="${emp.avatar}" class="w-10 h-10 rounded-full object-cover border border-slate-200">
            <div>
              <h4 class="font-bold text-slate-900">${emp.name}</h4>
              <p class="text-xs text-slate-500">${emp.id} • ${emp.designation}</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 font-mono-numeric">
            ${att.totalPayableDays} Payable Days
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 my-4 text-xs">
          <div class="bg-slate-50 p-2.5 rounded-lg">
            <span class="text-slate-500 block text-[11px]">Gross Earnings</span>
            <span class="font-bold text-emerald-700 font-mono-numeric text-sm">₹${pay.grossEarnings.toLocaleString('en-IN')}</span>
            <span class="text-[10px] text-slate-400 block mt-0.5">Incl. ₹${pay.otPay.toLocaleString('en-IN')} Overtime</span>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-lg">
            <span class="text-slate-500 block text-[11px]">Total Deductions</span>
            <span class="font-bold text-rose-600 font-mono-numeric text-sm">₹${pay.totalDeductions.toLocaleString('en-IN')}</span>
            <span class="text-[10px] text-slate-400 block mt-0.5">LOP: ₹${pay.lopDeduction.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            <span class="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Net Bank Transfer</span>
            <span class="font-extrabold text-blue-700 font-mono-numeric text-base">₹${pay.netPayable.toLocaleString('en-IN')}</span>
          </div>
          <div class="flex gap-2">
            <button onclick="openPayslipModal('${emp.id}')" class="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition">
              <i class="fa-solid fa-receipt"></i> Generate Slip
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 4. Form 16 Tax Module Rendering
function renderForm16Module() {
  const tableBody = document.getElementById("form16-table-body");
  if (!tableBody) return;

  tableBody.innerHTML = EMPLOYEES.map(emp => {
    const pay = calculateEmployeePayroll(emp);
    const tax = emp.taxDeclarations;
    const grossAnnual = pay.grossEarnings * 12;

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50/80 text-xs text-slate-700">
        <td class="py-3 px-3">
          <div class="font-bold text-slate-900">${emp.name}</div>
          <div class="text-[11px] text-slate-500 font-mono-numeric">${emp.id} • PAN: ${emp.pan}</div>
        </td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${tax.regime === 'Old Regime' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-teal-50 text-teal-700 border border-teal-200'}">
            ${tax.regime}
          </span>
        </td>
        <td class="py-3 px-3 font-mono-numeric font-semibold text-slate-800">
          ₹${grossAnnual.toLocaleString('en-IN')}
        </td>
        <td class="py-3 px-3 font-mono-numeric">
          <div class="text-[11px]">80C: ₹${(tax.sec80C || 0).toLocaleString('en-IN')}</div>
          <div class="text-[10px] text-slate-500">80D: ₹${(tax.sec80D || 0).toLocaleString('en-IN')} • HRA: ₹${(tax.secHRA || 0).toLocaleString('en-IN')}</div>
        </td>
        <td class="py-3 px-3 font-mono-numeric font-bold text-emerald-700">
          ₹${(pay.monthlyTds * 12).toLocaleString('en-IN')}
        </td>
        <td class="py-3 px-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <i class="fa-solid fa-circle-check text-[9px]"></i> TRACES Matched
          </span>
        </td>
        <td class="py-3 px-3 text-right">
          <button onclick="openForm16Modal('${emp.id}')" class="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition shadow-sm">
            <i class="fa-solid fa-file-pdf text-rose-600 mr-1"></i> Form 16 Part A & B
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 5. Multi-Tier Approvals Rendering
function renderApprovalsModule() {
  const container = document.getElementById("approval-cards-container");
  if (!container) return;

  container.innerHTML = APPROVAL_REQUESTS.map(req => {
    return `
      <div id="req-card-${req.id}" class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">${req.type}</span>
            <h4 class="font-bold text-slate-900 mt-1">${req.empName} <span class="text-xs font-normal text-slate-500">(${req.empId})</span></h4>
            <p class="text-xs text-slate-500">${req.dept} • Applied: ${req.appliedOn}</p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            ${req.stage}
          </span>
        </div>

        <div class="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
          <div class="flex justify-between text-slate-600">
            <span><strong>Target Date:</strong> ${req.date}</span>
            <span><strong>Punch Window:</strong> ${req.inTime} - ${req.outTime}</span>
          </div>
          <p class="text-slate-700 pt-1 border-t border-slate-200"><strong>Reason:</strong> ${req.reason}</p>
        </div>

        <div class="flex items-center justify-between text-xs pt-1">
          <div class="text-[11px] text-slate-500">
            <i class="fa-solid fa-route text-blue-500 mr-1"></i> Multi-Tier: <strong>${req.l1Status}</strong>
          </div>
          <div class="flex gap-2">
            <button onclick="handleApprovalAction('${req.id}', 'Reject')" class="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition">
              Reject
            </button>
            <button onclick="handleApprovalAction('${req.id}', 'Approve')" class="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition">
              <i class="fa-solid fa-check mr-1"></i> Authorize Level
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleApprovalAction(reqId, action) {
  const card = document.getElementById(`req-card-${reqId}`);
  if (!card) return;
  card.innerHTML = `
    <div class="p-6 text-center space-y-2">
      <div class="inline-flex items-center justify-center w-10 h-10 rounded-full ${action === 'Approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}">
        <i class="fa-solid ${action === 'Approve' ? 'fa-check' : 'fa-xmark'} text-lg"></i>
      </div>
      <div class="font-bold text-slate-800">Request ${reqId} ${action}d Successfully</div>
      <p class="text-xs text-slate-500">Attendance records & Payable Days recalculated automatically.</p>
    </div>
  `;
  showToast(`Regularization ${reqId} has been ${action.toLowerCase()}d and synced with Finance Payroll engine.`, "success");
}

// 6. Geofencing & GPS Multi-Location Setting
function renderGeofencingModule() {
  const branchList = document.getElementById("geofence-branches-list");
  if (!branchList) return;

  branchList.innerHTML = BRANCH_LOCATIONS.map(loc => {
    return `
      <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
            <i class="fa-solid fa-satellite-dish"></i>
          </div>
          <div>
            <h5 class="font-bold text-slate-900 text-sm">${loc.name}</h5>
            <p class="text-xs text-slate-500">${loc.city} • Lat: ${loc.lat}, Lng: ${loc.lng}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="inline-block px-2.5 py-1 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Radius: ${loc.radiusMeters}m
          </span>
          <span class="text-[11px] text-emerald-600 font-semibold block mt-1">
            <i class="fa-solid fa-circle text-[8px] mr-1"></i>${loc.activeEmployees} Active Devices
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Haversine GPS Distance Calculator
function calculateGpsDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c); // Distance in meters
}

function simulatePunch() {
  const locId = document.getElementById("sim-branch-select").value;
  const target = BRANCH_LOCATIONS.find(b => b.id === locId) || BRANCH_LOCATIONS[0];
  const offsetDistance = parseInt(document.getElementById("sim-distance-offset").value) || 0;

  const resultContainer = document.getElementById("sim-punch-result");
  const isInside = offsetDistance <= target.radiusMeters;

  if (isInside) {
    resultContainer.className = "mt-4 p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 flex items-start gap-3";
    resultContainer.innerHTML = `
      <i class="fa-solid fa-circle-check text-xl text-emerald-600 mt-0.5"></i>
      <div>
        <div class="font-bold text-sm">GEOFENCE PUNCH SUCCESSFUL (IN-RANGE)</div>
        <p class="text-xs text-emerald-700 mt-1">
          Device distance is <strong>${offsetDistance} meters</strong> from ${target.name} center point.
          (Configured Perimeter Radius: <strong>${target.radiusMeters} meters</strong>).
          Biometric timestamp & location coordinate hash logged into Cloud MIS.
        </p>
      </div>
    `;
  } else {
    resultContainer.className = "mt-4 p-4 rounded-xl border bg-rose-50 border-rose-200 text-rose-900 flex items-start gap-3";
    resultContainer.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation text-xl text-rose-600 mt-0.5"></i>
      <div>
        <div class="font-bold text-sm">ATTENDANCE REJECTED: LOCATION MISMATCH ERROR</div>
        <p class="text-xs text-rose-700 mt-1">
          Current device distance is <strong>${offsetDistance} meters</strong>, exceeding the authorized ${target.radiusMeters}m geofence perimeter for <strong>${target.name}</strong>.
          Employee must be physically on premise or request L1 Manager Regularization for client site transit.
        </p>
      </div>
    `;
  }
}

// 7. Notice Board & Milestones Rendering
function renderNoticesAndMilestones() {
  const noticesContainer = document.getElementById("notices-board-list");
  if (noticesContainer) {
    noticesContainer.innerHTML = COMPANY_NOTICES.map(notice => {
      let badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
      if (notice.category === "Urgent Alert") badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
      if (notice.category === "Holiday Notice") badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";

      return `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${badgeClass}">
              ${notice.category}
            </span>
            <span class="text-xs text-slate-400">Valid: ${notice.publishDate} to ${notice.expiryDate}</span>
          </div>
          <h4 class="font-bold text-slate-900 text-sm">${notice.title}</h4>
          <p class="text-xs text-slate-600 leading-relaxed">${notice.content}</p>
          <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span class="text-slate-500 text-[11px]">Audience: <strong>${notice.targetAudience}</strong></span>
            <span class="text-emerald-700 font-semibold text-[11px]">
              <i class="fa-solid fa-eye mr-1"></i>${notice.acknowledgedCount}/${notice.totalCount} Acknowledged
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Milestones (Birthdays & Anniversaries)
  const birthdaysContainer = document.getElementById("milestones-birthdays-list");
  if (birthdaysContainer) {
    birthdaysContainer.innerHTML = `
      <div class="p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-lg">
            🎂
          </div>
          <div>
            <h5 class="font-bold text-slate-900 text-sm">Priyanka Verma</h5>
            <p class="text-xs text-slate-500">Birthday on <strong>04 Nov</strong> • HR Department</p>
          </div>
        </div>
        <button onclick="triggerGreeting('Priyanka Verma', 'Birthday')" class="px-2.5 py-1 text-xs font-semibold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-sm transition">
          <i class="fa-regular fa-paper-plane mr-1"></i> Send Wish
        </button>
      </div>

      <div class="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-lg">
            🏆
          </div>
          <div>
            <h5 class="font-bold text-slate-900 text-sm">Rohan Kulkarni</h5>
            <p class="text-xs text-slate-500">Work Anniversary • <strong>7 Glorious Years</strong></p>
          </div>
        </div>
        <button onclick="triggerGreeting('Rohan Kulkarni', 'Work Anniversary')" class="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition">
          <i class="fa-regular fa-paper-plane mr-1"></i> Celebrate
        </button>
      </div>
    `;
  }
}

function triggerGreeting(name, type) {
  showToast(`Automated WhatsApp & Email Greeting sent to ${name} for ${type}!`, "success");
}

// 8. Full & Final (F&F) Settlement Calculator
function renderFAndFCalculator() {
  const select = document.getElementById("fnf-employee-select");
  if (!select) return;

  select.innerHTML = EMPLOYEES.map(emp => `<option value="${emp.id}">${emp.name} (${emp.id} - ${emp.department})</option>`).join('');
  calculateFnFSettlement();
}

function calculateFnFSettlement() {
  const select = document.getElementById("fnf-employee-select");
  if (!select) return;
  const empId = select.value;
  const emp = EMPLOYEES.find(e => e.id === empId) || EMPLOYEES[0];

  const pendingLeavesEncash = parseInt(document.getElementById("fnf-encash-leaves").value) || 0;
  const noticeRecoveryDays = parseInt(document.getElementById("fnf-notice-recovery").value) || 0;
  const gratuityEligible = document.getElementById("fnf-gratuity-check").checked;

  const perDayBasic = emp.salary.basic / 30;
  const perDayGross = (emp.salary.basic + emp.salary.da + emp.salary.hra + emp.salary.specialAllowance) / 30;

  // 1. Earned Salary for active month days (present + WO)
  const att = calculateEmployeeAttendance(emp);
  const earnedSalary = Math.round(perDayGross * att.totalPayableDays);

  // 2. Leave Encashment = Basic per day * Leaves
  const leaveEncashmentAmount = Math.round(perDayBasic * pendingLeavesEncash);

  // 3. Gratuity (if > 5 years, simplified: 15/26 * last drawn Basic * years)
  const gratuityAmount = gratuityEligible ? Math.round((15 / 26) * emp.salary.basic * 5) : 0;

  // 4. Notice Period Shortage Recovery (Deduction)
  const noticeRecoveryAmount = Math.round(perDayGross * noticeRecoveryDays);

  // 5. Statutory PF deduction on earned salary
  const pfDeduction = Math.round((emp.salary.basic * (att.totalPayableDays / 31)) * 0.12);

  const totalGrossSettlement = earnedSalary + leaveEncashmentAmount + gratuityAmount;
  const totalSettlementDeductions = noticeRecoveryAmount + pfDeduction;
  const netSettlement = Math.max(0, totalGrossSettlement - totalSettlementDeductions);

  document.getElementById("fnf-earned-salary").textContent = `₹${earnedSalary.toLocaleString('en-IN')}`;
  document.getElementById("fnf-leave-encash").textContent = `₹${leaveEncashmentAmount.toLocaleString('en-IN')}`;
  document.getElementById("fnf-gratuity").textContent = `₹${gratuityAmount.toLocaleString('en-IN')}`;
  document.getElementById("fnf-notice-deduct").textContent = `- ₹${noticeRecoveryAmount.toLocaleString('en-IN')}`;
  document.getElementById("fnf-pf-deduct").textContent = `- ₹${pfDeduction.toLocaleString('en-IN')}`;
  document.getElementById("fnf-net-total").textContent = `₹${netSettlement.toLocaleString('en-IN')}`;
}

// --- Pay Slip Modal Popup ---
function openPayslipModal(empId) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  if (!emp) return;

  const pay = calculateEmployeePayroll(emp);
  const att = calculateEmployeeAttendance(emp);

  const modalContainer = document.getElementById("payslip-modal-content");
  modalContainer.innerHTML = `
    <div id="printable-content" class="p-6 md:p-8 bg-white text-slate-800 space-y-6 text-sm">
      <!-- Payslip Header -->
      <div class="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
        <div>
          <h2 class="text-xl font-black tracking-tight text-slate-900">${COMPANY_CONFIG.companyName}</h2>
          <p class="text-xs text-slate-500">${COMPANY_CONFIG.address}</p>
          <p class="text-xs text-slate-500 font-mono-numeric">PF Code: ${COMPANY_CONFIG.pfCode} | ESIC: ${COMPANY_CONFIG.esicCode}</p>
        </div>
        <div class="text-right">
          <span class="inline-block px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest">
            PAYSLIP
          </span>
          <p class="text-xs font-bold text-slate-700 mt-1">${COMPANY_CONFIG.currentMonth}</p>
        </div>
      </div>

      <!-- Employee & Bank Info Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-semibold">Employee ID</span>
          <span class="font-bold text-slate-900 font-mono-numeric">${emp.id}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-semibold">Employee Name</span>
          <span class="font-bold text-slate-900">${emp.name}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
          <span class="font-medium text-slate-800">${emp.department}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-semibold">Designation</span>
          <span class="font-medium text-slate-800">${emp.designation}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-semibold">Bank Name</span>
          <span class="font-medium text-slate-800">${emp.bankName}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-semibold">Account Number</span>
          <span class="font-bold text-slate-900 font-mono-numeric">${emp.accountNo}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-semibold">IFSC Code</span>
          <span class="font-mono-numeric font-medium text-slate-800">${emp.ifsc}</span>
        </div>
        <div>
          <span class="text-slate-400 block text-[10px] uppercase font-semibold">PAN / UAN</span>
          <span class="font-mono-numeric text-slate-800">${emp.pan} / ${emp.uan}</span>
        </div>
      </div>

      <!-- Attendance Synced Days Breakdown -->
      <div class="bg-blue-50/60 p-3 rounded-lg border border-blue-200 grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
        <div>
          <span class="text-slate-500 block text-[10px]">Calendar Days</span>
          <span class="font-bold text-slate-800 font-mono-numeric">${att.calendarDays}</span>
        </div>
        <div>
          <span class="text-slate-500 block text-[10px]">Present (P)</span>
          <span class="font-bold text-emerald-700 font-mono-numeric">${att.present}</span>
        </div>
        <div>
          <span class="text-slate-500 block text-[10px]">Weekly Off / PH</span>
          <span class="font-bold text-slate-800 font-mono-numeric">${att.wo + att.ph}</span>
        </div>
        <div>
          <span class="text-slate-500 block text-[10px]">Paid Leaves</span>
          <span class="font-bold text-slate-800 font-mono-numeric">${att.paidLeaves}</span>
        </div>
        <div>
          <span class="text-slate-500 block text-[10px]">Total LOP (LWP)</span>
          <span class="font-bold text-rose-600 font-mono-numeric">${att.totalLopDays}</span>
        </div>
        <div class="bg-blue-600 text-white rounded p-1">
          <span class="block text-[9px] uppercase font-semibold">Total Payable</span>
          <span class="font-black text-sm font-mono-numeric">${att.totalPayableDays} Days</span>
        </div>
      </div>

      <!-- Earnings vs Deductions Table -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Earnings Column -->
        <div class="border border-slate-200 rounded-lg overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 font-bold text-slate-800 border-b border-slate-200 flex justify-between text-xs">
            <span>EARNINGS HEAD</span>
            <span>AMOUNT (INR)</span>
          </div>
          <div class="p-3 space-y-2 text-xs font-mono-numeric">
            <div class="flex justify-between"><span>Basic Salary</span><span>₹${pay.basic.toLocaleString('en-IN')}</span></div>
            <div class="flex justify-between"><span>Dearness Allowance (DA)</span><span>₹${pay.da.toLocaleString('en-IN')}</span></div>
            <div class="flex justify-between"><span>House Rent Allowance (HRA)</span><span>₹${pay.hra.toLocaleString('en-IN')}</span></div>
            <div class="flex justify-between"><span>Special Allowance</span><span>₹${pay.specialAllowance.toLocaleString('en-IN')}</span></div>
            <div class="flex justify-between"><span>Travel Allowance</span><span>₹${pay.travelAllowance.toLocaleString('en-IN')}</span></div>
            <div class="flex justify-between text-indigo-700 font-semibold bg-indigo-50/50 p-1 rounded">
              <span>Overtime Pay (${emp.timeTracking.overtimeHours} hrs)</span>
              <span>₹${pay.otPay.toLocaleString('en-IN')}</span>
            </div>
            <div class="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
              <span>Gross Earnings (A)</span>
              <span>₹${pay.grossEarnings.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <!-- Deductions Column -->
        <div class="border border-slate-200 rounded-lg overflow-hidden">
          <div class="bg-slate-100 px-3 py-2 font-bold text-slate-800 border-b border-slate-200 flex justify-between text-xs">
            <span>DEDUCTIONS HEAD</span>
            <span>AMOUNT (INR)</span>
          </div>
          <div class="p-3 space-y-2 text-xs font-mono-numeric">
            <div class="flex justify-between ${pay.lopDeduction > 0 ? 'text-rose-600 font-semibold' : ''}">
              <span>LOP / LWP Deduction (${att.totalLopDays} days)</span>
              <span>₹${pay.lopDeduction.toLocaleString('en-IN')}</span>
            </div>
            <div class="flex justify-between"><span>Provident Fund (PF 12%)</span><span>₹${pay.pfDeduction.toLocaleString('en-IN')}</span></div>
            <div class="flex justify-between"><span>ESIC</span><span>₹${pay.esiDeduction.toLocaleString('en-IN')}</span></div>
            <div class="flex justify-between"><span>Professional Tax (PT)</span><span>₹${pay.ptDeduction.toLocaleString('en-IN')}</span></div>
            <div class="flex justify-between"><span>TDS / Income Tax</span><span>₹${pay.monthlyTds.toLocaleString('en-IN')}</span></div>
            <div class="flex justify-between"><span>Advance / Loan Recovery</span><span>₹${pay.advanceDeduction.toLocaleString('en-IN')}</span></div>
            <div class="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
              <span>Total Deductions (B)</span>
              <span>₹${pay.totalDeductions.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Net Payable Summary Banner -->
      <div class="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
        <div>
          <span class="text-xs text-slate-400 uppercase tracking-widest font-semibold block">Net Payable Salary (A - B)</span>
          <span class="text-2xl font-black font-mono-numeric">₹${pay.netPayable.toLocaleString('en-IN')}</span>
        </div>
        <div class="text-right text-xs text-slate-400">
          <span>Mode of Transfer: Direct Bank NEFT/RTGS</span><br>
          <span>Value Date: 31st Oct 2026</span>
        </div>
      </div>

      <!-- Footer Disclaimer -->
      <div class="pt-4 border-t border-slate-200 text-[10px] text-slate-500 text-center">
        This is a system-generated electronic pay slip compliant with Indian Labor Standards and IT Rules. No physical signature required.
      </div>
    </div>

    <!-- Modal Action Buttons (Hidden on Print) -->
    <div class="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center rounded-b-2xl no-print">
      <span class="text-xs text-slate-500">
        <i class="fa-solid fa-lock text-emerald-600 mr-1"></i> 256-Bit Cryptographically Sealed
      </span>
      <div class="flex gap-2">
        <button onclick="closeModal('payslip-modal')" class="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition">
          Close
        </button>
        <button onclick="sendPayslipEmail('${emp.name}', '${emp.email}')" class="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition">
          <i class="fa-regular fa-envelope mr-1"></i> Auto-Email
        </button>
        <button onclick="window.print()" class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition">
          <i class="fa-solid fa-print mr-1"></i> Print / Save PDF
        </button>
      </div>
    </div>
  `;

  document.getElementById("payslip-modal").classList.remove("hidden");
}

function sendPayslipEmail(empName, email) {
  showToast(`Official Pay Slip encrypted and emailed to ${empName} (${email})`, "success");
}

// --- Form 16 Tax Certificate Modal ---
function openForm16Modal(empId) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  if (!emp) return;

  const pay = calculateEmployeePayroll(emp);
  const tax = emp.taxDeclarations;
  const grossAnnual = pay.grossEarnings * 12;
  const sec80C = tax.sec80C || 0;
  const sec80D = tax.sec80D || 0;
  const secHRA = tax.secHRA || 0;
  const stdDeduction = 50000;
  const totalExemptions = sec80C + sec80D + secHRA + stdDeduction;
  const netTaxableIncome = Math.max(0, grossAnnual - totalExemptions);
  const totalTaxDeposited = pay.monthlyTds * 12;

  const modalContainer = document.getElementById("form16-modal-content");
  modalContainer.innerHTML = `
    <div id="printable-content" class="p-6 md:p-8 bg-white text-slate-800 space-y-6 text-xs leading-relaxed">
      <!-- Form 16 Header -->
      <div class="text-center border-b-2 border-slate-800 pb-4">
        <h2 class="text-lg font-black tracking-tight text-slate-900">FORM NO. 16</h2>
        <p class="text-[11px] text-slate-600 font-semibold">[See Rule 31(1)(a) of Income-tax Rules, 1962]</p>
        <p class="text-[11px] text-slate-500 mt-1">Certificate under Section 203 of the Income-tax Act, 1961 for Tax Deducted at Source on Salary</p>
      </div>

      <!-- Deductor & Deductee Matrix -->
      <div class="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-4 bg-slate-50">
        <div class="space-y-1">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Employer (Deductor)</span>
          <div class="font-bold text-slate-900 text-sm">${COMPANY_CONFIG.companyName}</div>
          <div class="text-slate-600">${COMPANY_CONFIG.address}</div>
          <div class="font-mono-numeric text-[11px] pt-1"><strong>PAN:</strong> ${COMPANY_CONFIG.panNumber} | <strong>TAN:</strong> ${COMPANY_CONFIG.tanNumber}</div>
        </div>
        <div class="space-y-1 border-l border-slate-200 pl-4">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Employee (Deductee)</span>
          <div class="font-bold text-slate-900 text-sm">${emp.name} (${emp.id})</div>
          <div class="text-slate-600">${emp.designation} - ${emp.department}</div>
          <div class="font-mono-numeric text-[11px] pt-1"><strong>PAN:</strong> ${emp.pan} | <strong>Assessment Year:</strong> 2027-2028</div>
        </div>
      </div>

      <!-- PART A: TRACES Quarterly TDS Summary -->
      <div class="space-y-2">
        <div class="flex items-center justify-between border-b border-slate-200 pb-1">
          <h3 class="font-black text-slate-900 text-sm uppercase">PART A: Summary of Tax Deducted and Deposited (TRACES Portal)</h3>
          <span class="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
            <i class="fa-solid fa-check-double mr-1"></i> TRACES OLTAS Verified
          </span>
        </div>
        <div class="border border-slate-200 rounded-lg overflow-hidden">
          <table class="w-full text-left font-mono-numeric">
            <thead class="bg-slate-100 text-[10px] text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th class="p-2">Quarter</th>
                <th class="p-2">Receipt / Challan No.</th>
                <th class="p-2">BSR Code</th>
                <th class="p-2">Deposit Date</th>
                <th class="p-2 text-right">Tax Deducted (₹)</th>
                <th class="p-2 text-right">Tax Deposited (₹)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-[11px]">
              ${FORM16_PART_A_MOCK.map(q => `
                <tr>
                  <td class="p-2 font-bold">${q.quarter}</td>
                  <td class="p-2 text-slate-600">${q.challanNo}</td>
                  <td class="p-2 text-slate-600">${q.bsrCode}</td>
                  <td class="p-2 text-slate-600">${q.depositDate}</td>
                  <td class="p-2 text-right">₹${q.taxDeducted.toLocaleString('en-IN')}</td>
                  <td class="p-2 text-right font-bold ${q.taxDeposited > 0 ? 'text-emerald-700' : 'text-slate-400'}">₹${q.taxDeposited.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- PART B: Salary Breakdown & Chapter VI-A Deductions -->
      <div class="space-y-2">
        <div class="flex items-center justify-between border-b border-slate-200 pb-1">
          <h3 class="font-black text-slate-900 text-sm uppercase">PART B: Details of Salary Paid and Deductions Claimed</h3>
          <span class="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold">
            Tax Regime: ${tax.regime}
          </span>
        </div>

        <div class="border border-slate-200 rounded-lg p-3 space-y-2 font-mono-numeric text-xs bg-slate-50/50">
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span>1. Gross Salary received as per Sec 17(1)</span>
            <span class="font-bold">₹${grossAnnual.toLocaleString('en-IN')}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 text-slate-600">
            <span>2. Less: Allowances exempted under Section 10 (HRA Rent Proofs)</span>
            <span>- ₹${secHRA.toLocaleString('en-IN')}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 text-slate-600">
            <span>3. Less: Standard Deduction under Section 16(ia)</span>
            <span>- ₹${stdDeduction.toLocaleString('en-IN')}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 text-slate-600">
            <span>4. Deductions under Chapter VI-A (Section 80C - EPF, PPF, ELSS)</span>
            <span>- ₹${sec80C.toLocaleString('en-IN')}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 text-slate-600">
            <span>5. Deductions under Section 80D (Health Insurance Premium)</span>
            <span>- ₹${sec80D.toLocaleString('en-IN')}</span>
          </div>
          <div class="flex justify-between py-1.5 font-bold text-slate-900 text-sm bg-blue-50/50 px-2 rounded">
            <span>6. Total Net Taxable Income (1 - 2 - 3 - 4 - 5)</span>
            <span class="text-blue-800">₹${netTaxableIncome.toLocaleString('en-IN')}</span>
          </div>
          <div class="flex justify-between py-1.5 font-bold text-slate-900 text-sm bg-emerald-50 px-2 rounded">
            <span>7. Total Tax Liability & Net TDS Deposited with Central Govt</span>
            <span class="text-emerald-700">₹${totalTaxDeposited.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <!-- Verification Seal -->
      <div class="border-t border-slate-200 pt-4 flex justify-between items-end text-[10px] text-slate-500">
        <div>
          <p>Certified that a sum of <strong>₹${totalTaxDeposited.toLocaleString('en-IN')}</strong> has been deducted and credited to Central Government.</p>
          <p class="mt-1">Place: Gurugram, India | Date: 31st Oct 2026</p>
        </div>
        <div class="text-right">
          <div class="font-bold text-slate-800 text-xs">For HR MIS TOTAL SOLUTION</div>
          <div class="text-[10px] text-slate-400 mt-4">Authorized Finance Signatory</div>
        </div>
      </div>
    </div>

    <!-- Modal Actions -->
    <div class="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center rounded-b-2xl no-print">
      <span class="text-xs text-slate-500">
        <i class="fa-solid fa-file-contract text-emerald-600 mr-1"></i> Form 16 IT Rules 1962 Audit-Ready
      </span>
      <div class="flex gap-2">
        <button onclick="closeModal('form16-modal')" class="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition">
          Close
        </button>
        <button onclick="window.print()" class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition">
          <i class="fa-solid fa-file-arrow-down mr-1"></i> Export Official Form 16 PDF
        </button>
      </div>
    </div>
  `;

  document.getElementById("form16-modal").classList.remove("hidden");
}

function viewEmployeeDetailModal(empId) {
  openPayslipModal(empId);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add("hidden");
}

// --- Bulk Exports (CSV/Excel) ---
function exportAttendanceCSV() {
  let csv = "Employee ID,Name,Department,Designation,Branch,Calendar Days,Present Days,Absent Days,Weekly Offs,Paid Holidays,Total Payable Days,CL,SL,EL,LWP (LOP),Late Count,Late Hours,Overtime Hours,Effective Hours,Mean Hours,Attendance %,Attrition Risk\n";

  EMPLOYEES.forEach(emp => {
    const att = calculateEmployeeAttendance(emp);
    const t = emp.timeTracking;
    csv += `"${emp.id}","${emp.name}","${emp.department}","${emp.designation}","${emp.branch}",${att.calendarDays},${att.present},${att.absentUnauthorized},${att.wo},${att.ph},${att.totalPayableDays},${emp.leaves.cl},${emp.leaves.sl},${emp.leaves.el},${att.totalLopDays},${t.lateComingCount},${t.lateHours},${t.overtimeHours},${t.effectiveWorkingHours},${att.meanWorkingHours},${att.attendancePercentage}%,"${att.attritionRisk}"\n`;
  });

  downloadCSV(csv, "HR_MIS_TOTAL_SOLUTION_Attendance_Report_Oct2026.csv");
  showToast("Attendance MIS Master Excel/CSV downloaded successfully!", "success");
}

function exportBankAdviceSheet() {
  let csv = "Serial No,Employee ID,Employee Name,Bank Name,Account Number,IFSC Code,Net Payable Salary (INR),Narration\n";
  let count = 1;

  EMPLOYEES.forEach(emp => {
    const pay = calculateEmployeePayroll(emp);
    csv += `${count},"${emp.id}","${emp.name}","${emp.bankName}","'${emp.accountNo}'","${emp.ifsc}",${pay.netPayable},"October 2026 Salary"\n`;
    count++;
  });

  downloadCSV(csv, "HR_MIS_TOTAL_SOLUTION_Bank_Advice_Salary_Transfer_Oct2026.csv");
  showToast("Bank Salary Advice Sheet exported for Account Dept batch transfer!", "success");
}

function exportStatutoryReports() {
  let csv = "Employee ID,Name,UAN,PAN,Basic,Gross Earnings,PF Employee (12%),PF Employer (12%),ESI Employee,Professional Tax (PT),TDS Monthly\n";

  EMPLOYEES.forEach(emp => {
    const pay = calculateEmployeePayroll(emp);
    const pfEmployer = pay.pfDeduction;
    csv += `"${emp.id}","${emp.name}","${emp.uan}","${emp.pan}",${pay.basic},${pay.grossEarnings},${pay.pfDeduction},${pfEmployer},${pay.esiDeduction},${pay.ptDeduction},${pay.monthlyTds}\n`;
  });

  downloadCSV(csv, "HR_MIS_TOTAL_SOLUTION_Statutory_ECR_PF_ESI_TDS_Oct2026.csv");
  showToast("Statutory Compliance ECR / ESI / TDS Report exported!", "success");
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Chart.js Visualizations
let attendanceDonutChart = null;
let meanHoursBarChart = null;

function initCharts() {
  renderAttendanceCharts();
}

function renderAttendanceCharts() {
  const donutCanvas = document.getElementById("chart-attendance-donut");
  const barCanvas = document.getElementById("chart-mean-hours-bar");
  if (!donutCanvas || !barCanvas) return;

  if (attendanceDonutChart) attendanceDonutChart.destroy();
  if (meanHoursBarChart) meanHoursBarChart.destroy();

  // 1. Donut Chart: Present vs Absent vs Leaves vs Offs
  let sumP = 0, sumA = 0, sumLeaves = 0, sumOffs = 0;
  EMPLOYEES.forEach(emp => {
    const att = calculateEmployeeAttendance(emp);
    sumP += att.present;
    sumA += att.absentUnauthorized;
    sumLeaves += att.paidLeaves + att.lwp;
    sumOffs += att.wo + att.ph;
  });

  attendanceDonutChart = new Chart(donutCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Present Days', 'Paid Leaves & LWP', 'Weekly Offs & PH', 'Unauthorized Absent'],
      datasets: [{
        data: [sumP, sumLeaves, sumOffs, sumA],
        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      },
      cutout: '70%'
    }
  });

  // 2. Bar Chart: Mean Working Hours comparison across employees
  const names = EMPLOYEES.map(e => e.name.split(' ')[0]);
  const meanHours = EMPLOYEES.map(e => parseFloat(calculateEmployeeAttendance(e).meanWorkingHours));

  meanHoursBarChart = new Chart(barCanvas, {
    type: 'bar',
    data: {
      labels: names,
      datasets: [{
        label: 'Mean Daily Hours (Formula: Effective Hrs / Present Days)',
        data: meanHours,
        backgroundColor: meanHours.map(h => h > 9.0 ? '#6366f1' : h < 8.0 ? '#f59e0b' : '#3b82f6'),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 12,
          ticks: { stepSize: 2 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Toast Notifications Helper
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  let bg = "bg-slate-900 text-white";
  let icon = "fa-circle-info text-blue-400";
  if (type === "success") {
    bg = "bg-emerald-900 text-white border border-emerald-700";
    icon = "fa-circle-check text-emerald-300";
  } else if (type === "error") {
    bg = "bg-rose-900 text-white border border-rose-700";
    icon = "fa-triangle-exclamation text-rose-300";
  }

  toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-medium transform transition-all duration-300 translate-y-2 opacity-0 ${bg}`;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  }, 10);

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// AUTHENTICATION & LOGIN MANAGEMENT ENGINE
// ==========================================

let isAuthenticated = false;

function initAuthSession() {
  // DIRECT OPEN ON LOGIN PAGE FIRST ON LINK VISIT (http://localhost/ATTENDANCE%20MIS/)
  showLoginScreen();
}

function showLoginScreen() {
  isAuthenticated = false;
  const loginScreen = document.getElementById("app-login-screen");
  const dashboard = document.getElementById("app-dashboard-workspace");
  if (loginScreen) loginScreen.classList.remove("hidden");
  if (dashboard) dashboard.classList.add("hidden");
}

function showDashboardView() {
  isAuthenticated = true;
  const loginScreen = document.getElementById("app-login-screen");
  const dashboard = document.getElementById("app-dashboard-workspace");
  if (loginScreen) loginScreen.classList.add("hidden");
  if (dashboard) dashboard.classList.remove("hidden");
  updateAuthUI();
}

function updateAuthUI() {
  // Update Topbar Profile
  const emp = EMPLOYEES.find(e => e.id === currentUser.id) || EMPLOYEES[0];
  const userAvatar = document.getElementById("topbar-user-avatar");
  const userName = document.getElementById("topbar-user-name");
  const userRoleText = document.getElementById("topbar-user-role");
  const rbacSelect = document.getElementById("rbac-role-select");
  const roleBadge = document.getElementById("active-role-badge");

  if (userAvatar) userAvatar.src = emp.avatar;
  if (userName) userName.textContent = currentUser.name;
  if (userRoleText) userRoleText.textContent = emp.designation;
  if (rbacSelect) rbacSelect.value = currentUser.role;
  if (roleBadge) roleBadge.textContent = currentUser.role.replace("_", " ").toUpperCase();

  // Update Mobile App Header
  const mobileAvatar = document.getElementById("mobile-user-avatar");
  const mobileName = document.getElementById("mobile-user-name");
  const mobileEmpId = document.getElementById("mobile-user-id");
  const mobileDept = document.getElementById("mobile-user-dept");

  if (mobileAvatar) mobileAvatar.src = emp.avatar;
  if (mobileName) mobileName.textContent = currentUser.name;
  if (mobileEmpId) mobileEmpId.textContent = currentUser.id;
  if (mobileDept) mobileDept.textContent = emp.department;

  applyRolePermissions();
}

function openLoginModal() {
  showLoginScreen();
}

function closeLoginModal() {
  if (isAuthenticated) {
    showDashboardView();
  } else {
    showToast("Please sign in to access the system.", "info");
  }
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (icon) icon.className = "fa-solid fa-eye-slash";
  } else {
    input.type = "password";
    if (icon) icon.className = "fa-solid fa-eye";
  }
}

function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  const usernameInput = document.getElementById("login-username").value.trim().toLowerCase();
  const passwordInput = document.getElementById("login-password").value.trim();

  if (!usernameInput || !passwordInput) {
    showToast("Please enter both username/email and password.", "error");
    return;
  }

  // Developer user or regular account authentication
  const matched = AUTH_ACCOUNTS.find(u => 
    (u.username.toLowerCase() === usernameInput || 
     (usernameInput === "dev" && u.username === "developer") || 
     u.email.toLowerCase() === usernameInput || 
     u.id.toLowerCase() === usernameInput) &&
    (u.password === passwordInput)
  );

  if (matched) {
    currentUser = matched;
    currentRole = matched.role;
    selectedEmployeeId = matched.id;
    localStorage.setItem("hrmis_user_id", matched.id);
    localStorage.setItem("hrmis_is_authenticated", "true");
    showDashboardView();
    renderAllModules();
    initCharts();
    showToast(`Authentication Successful. Welcome, ${matched.name}!`, "success");
  } else {
    showToast("Invalid credentials. Please verify your Username / Employee ID and Password.", "error");
  }
}

function handleLogout() {
  localStorage.removeItem("hrmis_is_authenticated");
  showLoginScreen();
  showToast("Session closed. Welcome to HR MIS Login Portal.", "info");
}

// ==========================================
// EMPLOYEE ONBOARDING & CREATION ENGINE
// ==========================================

function openNewEmployeeModal() {
  const nextNumber = EMPLOYEES.length + 1;
  const autoEmpId = `ZG-100${nextNumber}`;
  const idInput = document.getElementById("new-emp-id");
  const dojInput = document.getElementById("new-emp-doj");
  
  if (idInput) idInput.value = autoEmpId;
  if (dojInput && !dojInput.value) {
    dojInput.value = new Date().toISOString().split('T')[0];
  }

  const modal = document.getElementById("new-employee-modal");
  if (modal) modal.classList.remove("hidden");
}

function closeNewEmployeeModal() {
  const modal = document.getElementById("new-employee-modal");
  if (modal) modal.classList.add("hidden");
}

function handleCreateNewEmployee(e) {
  if (e) e.preventDefault();

  const id = document.getElementById("new-emp-id").value.trim() || `ZG-100${EMPLOYEES.length + 1}`;
  const name = document.getElementById("new-emp-name").value.trim();
  const email = document.getElementById("new-emp-email").value.trim();
  const phone = document.getElementById("new-emp-phone")?.value.trim() || "+91 98765 43210";
  const dept = document.getElementById("new-emp-dept").value;
  const designation = document.getElementById("new-emp-designation").value.trim();
  const branchId = document.getElementById("new-emp-branch").value;
  const reportingManager = document.getElementById("new-emp-manager").value.trim() || "Vikram Singhania (VP Tech)";
  const hodManager = document.getElementById("new-emp-hod")?.value.trim() || "Devendra Patel (CTO)";
  const doj = document.getElementById("new-emp-doj").value || "2026-10-01";
  const dob = document.getElementById("new-emp-dob")?.value || "1996-08-20";

  // Financial & Bank Details
  const basic = parseFloat(document.getElementById("new-emp-basic").value) || 35000;
  const da = parseFloat(document.getElementById("new-emp-da")?.value) || Math.round(basic * 0.25);
  const hra = parseFloat(document.getElementById("new-emp-hra")?.value) || Math.round(basic * 0.50);
  const special = parseFloat(document.getElementById("new-emp-special")?.value) || 12000;
  const bankName = document.getElementById("new-emp-bank-name")?.value.trim() || "HDFC Bank";
  const accountNo = document.getElementById("new-emp-account")?.value.trim() || "50100" + Math.floor(10000000 + Math.random() * 90000000);
  const ifsc = document.getElementById("new-emp-ifsc")?.value.trim() || "HDFC0000240";
  const pan = document.getElementById("new-emp-pan")?.value.trim().toUpperCase() || "ABCDE" + Math.floor(1000 + Math.random() * 9000) + "F";
  const uan = document.getElementById("new-emp-uan")?.value.trim() || "1019" + Math.floor(10000000 + Math.random() * 90000000);
  const taxRegime = document.getElementById("new-emp-tax-regime")?.value || "New Regime";

  if (!name || !email || !designation) {
    showToast("Please fill in all mandatory employee fields.", "error");
    return;
  }

  // Branch mapping
  const branchObj = BRANCH_LOCATIONS.find(b => b.id === branchId) || BRANCH_LOCATIONS[0];

  // Random professional avatar
  const avatarPool = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80"
  ];
  const avatar = avatarPool[EMPLOYEES.length % avatarPool.length];

  // Build clean, compliant Employee record
  const newEmp = {
    id: id,
    name: name,
    email: email,
    phone: phone,
    avatar: avatar,
    department: dept,
    designation: designation,
    branch: branchObj.name,
    branchId: branchObj.id,
    reportingManager: reportingManager,
    hodManager: hodManager,
    matrixManager: "None",
    doj: doj,
    dob: dob,
    pan: pan,
    uan: uan,
    bankName: bankName,
    accountNo: accountNo,
    ifsc: ifsc,

    calendarDays: 31,
    presentDays: 21,
    absentDays: 0,
    weeklyOffs: 5,
    paidHolidays: 2,
    leaves: {
      cl: 1,
      sl: 0,
      el: 1,
      maternityPaternity: 0,
      lwp: 0
    },
    timeTracking: {
      lateComingCount: 0,
      lateHours: 0.0,
      earlyGoingCount: 0,
      earlyHours: 0.0,
      overtimeHours: 6.0,
      effectiveWorkingHours: 185.0,
      totalLoggedHours: 204.0,
      totalBreakHours: 19.0,
      missedPunches: 0
    },
    regularization: {
      pending: 0,
      approved: 0,
      status: "All Matched"
    },
    salary: {
      basic: basic,
      da: da,
      hra: hra,
      specialAllowance: special,
      travelAllowance: 3500,
      advanceDeduction: 0
    },
    taxDeclarations: {
      sec80C: 150000,
      sec80D: 25000,
      secHRA: 180000,
      regime: taxRegime
    }
  };

  // Append to live EMPLOYEES array
  EMPLOYEES.push(newEmp);

  // Add auth account for the employee with Admin-decided role
  const username = name.split(' ')[0].toLowerCase() + (EMPLOYEES.length);
  const assignedRole = document.getElementById("new-emp-role")?.value || "employee";
  AUTH_ACCOUNTS.push({
    id: id,
    username: username,
    password: "123",
    role: assignedRole,
    name: name,
    email: email
  });
  setRoleDefaultPermissions(id, assignedRole);

  // Increment branch active device count
  branchObj.activeEmployees += 1;

  // Refresh all components & calculators
  renderAllModules();
  initCharts();
  closeNewEmployeeModal();

  // Reset form
  document.getElementById("new-emp-form").reset();

  showToast(`🎉 New Employee ${name} (${id}) onboarded as ${assignedRole.replace('_', ' ').toUpperCase()}! Synced to MIS & Payroll.`, "success");
}

// ==========================================
// EMPLOYEE EDIT & DELETE ENGINE
// ==========================================

function openEditEmployeeModal(empId) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  if (!emp) return;
  document.getElementById("edit-emp-id").value = emp.id;
  document.getElementById("edit-emp-name").value = emp.name;
  document.getElementById("edit-emp-email").value = emp.email;
  document.getElementById("edit-emp-dept").value = emp.department;
  document.getElementById("edit-emp-designation").value = emp.designation;
  document.getElementById("edit-emp-branch").value = emp.branchId || "LOC-01";
  document.getElementById("edit-emp-manager").value = emp.reportingManager;
  document.getElementById("edit-emp-basic").value = emp.salary.basic;
  document.getElementById("edit-emp-hra").value = emp.salary.hra;
  document.getElementById("edit-emp-special").value = emp.salary.specialAllowance;

  // Populate Admin-decided role
  const auth = AUTH_ACCOUNTS.find(a => a.id === empId);
  const roleSelect = document.getElementById("edit-emp-role");
  if (roleSelect && auth) {
    roleSelect.value = auth.role || "employee";
  }

  document.getElementById("edit-emp-modal").classList.remove("hidden");
}

function closeEditEmployeeModal() {
  document.getElementById("edit-emp-modal").classList.add("hidden");
}

function handleUpdateEmployee(e) {
  if (e) e.preventDefault();
  const id = document.getElementById("edit-emp-id").value;
  const emp = EMPLOYEES.find(e => e.id === id);
  if (!emp) return;

  emp.name = document.getElementById("edit-emp-name").value.trim();
  emp.email = document.getElementById("edit-emp-email").value.trim();
  emp.department = document.getElementById("edit-emp-dept").value;
  emp.designation = document.getElementById("edit-emp-designation").value.trim();
  const branchId = document.getElementById("edit-emp-branch").value;
  const branchObj = BRANCH_LOCATIONS.find(b => b.id === branchId) || BRANCH_LOCATIONS[0];
  emp.branch = branchObj.name;
  emp.branchId = branchObj.id;
  emp.reportingManager = document.getElementById("edit-emp-manager").value.trim();
  emp.salary.basic = parseFloat(document.getElementById("edit-emp-basic").value) || emp.salary.basic;
  emp.salary.hra = parseFloat(document.getElementById("edit-emp-hra").value) || emp.salary.hra;
  emp.salary.specialAllowance = parseFloat(document.getElementById("edit-emp-special").value) || emp.salary.specialAllowance;

  // Also update corresponding auth account & Admin-decided role
  const auth = AUTH_ACCOUNTS.find(a => a.id === id);
  const roleSelect = document.getElementById("edit-emp-role");
  if (auth) {
    auth.name = emp.name;
    auth.email = emp.email;
    if (roleSelect && auth.role !== roleSelect.value) {
      handleAdminChangeRole(id, roleSelect.value);
    }
  }

  renderAllModules();
  initCharts();
  closeEditEmployeeModal();
  showToast(`Employee ${emp.name} (${emp.id}) updated successfully!`, "success");
}

function confirmDeleteEmployee(empId) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  if (!emp) return;

  const isConfirmed = confirm(`Are you sure you want to delete employee "${emp.name} (${emp.id})"?\n\nThis will remove their attendance logs, salary records, and portal login.`);
  if (!isConfirmed) return;

  // Remove from EMPLOYEES
  const idx = EMPLOYEES.findIndex(e => e.id === empId);
  if (idx !== -1) EMPLOYEES.splice(idx, 1);

  // Remove from AUTH_ACCOUNTS
  const authIdx = AUTH_ACCOUNTS.findIndex(a => a.id === empId);
  if (authIdx !== -1) AUTH_ACCOUNTS.splice(authIdx, 1);

  // Update active employee count in branch
  const branch = BRANCH_LOCATIONS.find(b => b.id === emp.branchId);
  if (branch && branch.activeEmployees > 0) branch.activeEmployees -= 1;

  renderAllModules();
  initCharts();
  showToast(`Employee ${emp.name} has been deleted from the system.`, "info");
}

// ==========================================
// ADMIN PANEL: ACCESS POINTS & PERMISSION MATRIX (ADMIN DECIDES ROLES)
// ==========================================

function setRoleDefaultPermissions(userId, role) {
  if (role === "super_admin") {
    USER_PERMISSIONS[userId] = { attendance: true, payroll: true, form16: true, approvals: true, geofence: true, staffMgmt: true, licenseMgmt: true };
  } else if (role === "hr_admin") {
    USER_PERMISSIONS[userId] = { attendance: true, payroll: false, form16: false, approvals: true, geofence: true, staffMgmt: true, licenseMgmt: false };
  } else if (role === "finance_admin") {
    USER_PERMISSIONS[userId] = { attendance: true, payroll: true, form16: true, approvals: false, geofence: false, staffMgmt: false, licenseMgmt: false };
  } else if (role === "manager") {
    USER_PERMISSIONS[userId] = { attendance: true, payroll: false, form16: false, approvals: true, geofence: true, staffMgmt: false, licenseMgmt: false };
  } else {
    // standard employee
    USER_PERMISSIONS[userId] = { attendance: true, payroll: false, form16: false, approvals: false, geofence: false, staffMgmt: false, licenseMgmt: false };
  }
}

function handleAdminChangeRole(userId, newRole) {
  const user = AUTH_ACCOUNTS.find(u => u.id === userId);
  if (!user) return;

  const oldRole = user.role;
  user.role = newRole;

  setRoleDefaultPermissions(userId, newRole);

  if (currentUser && currentUser.id === userId) {
    currentUser.role = newRole;
    currentRole = newRole;
    updateAuthUI();
  }

  renderAdminAccessPanel();
  showToast(`Admin decided role: ${user.name} is now ${formatRoleName(newRole)}. Default access permissions applied!`, "success");
}

function renderAdminAccessPanel() {
  const tbody = document.getElementById("admin-access-table-body");
  const pwdTbody = document.getElementById("admin-password-table-body");

  // Render Permission Matrix Table with Admin Role Selector
  if (tbody) {
    tbody.innerHTML = AUTH_ACCOUNTS.map(user => {
      const p = USER_PERMISSIONS[user.id] || { attendance: true, payroll: false, form16: false, approvals: false, geofence: false, staffMgmt: false };
      const isSuperAdmin = user.role === "super_admin";

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/80 text-xs text-slate-700">
          <td class="py-3 px-3">
            <div class="font-bold text-slate-900">${user.name}</div>
            <div class="text-[11px] text-slate-400 font-mono-numeric">${user.id} • ${user.email}</div>
          </td>
          <td class="py-3 px-3">
            <select onchange="handleAdminChangeRole('${user.id}', this.value)" class="text-xs font-bold py-1.5 px-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition shadow-sm ${
              user.role === 'super_admin' ? 'bg-blue-50 text-blue-800 border-blue-200' :
              user.role === 'hr_admin' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
              user.role === 'finance_admin' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              user.role === 'manager' ? 'bg-amber-50 text-amber-800 border-amber-200' :
              'bg-slate-50 text-slate-700 border-slate-200'
            }">
              <option value="super_admin" ${user.role === 'super_admin' ? 'selected' : ''}>🛡️ Super Admin</option>
              <option value="hr_admin" ${user.role === 'hr_admin' ? 'selected' : ''}>👥 HR Admin</option>
              <option value="finance_admin" ${user.role === 'finance_admin' ? 'selected' : ''}>💰 Finance Admin</option>
              <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>👔 Manager (L1/L2)</option>
              <option value="employee" ${user.role === 'employee' ? 'selected' : ''}>👤 Employee</option>
            </select>
          </td>
          <td class="py-3 px-2 text-center">
            <input type="checkbox" ${p.attendance ? 'checked' : ''} ${isSuperAdmin ? 'disabled' : ''} onchange="toggleUserPermission('${user.id}', 'attendance')" class="w-4 h-4 text-blue-600 rounded cursor-pointer">
          </td>
          <td class="py-3 px-2 text-center">
            <input type="checkbox" ${p.payroll ? 'checked' : ''} ${isSuperAdmin ? 'disabled' : ''} onchange="toggleUserPermission('${user.id}', 'payroll')" class="w-4 h-4 text-indigo-600 rounded cursor-pointer">
          </td>
          <td class="py-3 px-2 text-center">
            <input type="checkbox" ${p.form16 ? 'checked' : ''} ${isSuperAdmin ? 'disabled' : ''} onchange="toggleUserPermission('${user.id}', 'form16')" class="w-4 h-4 text-emerald-600 rounded cursor-pointer">
          </td>
          <td class="py-3 px-2 text-center">
            <input type="checkbox" ${p.approvals ? 'checked' : ''} ${isSuperAdmin ? 'disabled' : ''} onchange="toggleUserPermission('${user.id}', 'approvals')" class="w-4 h-4 text-amber-600 rounded cursor-pointer">
          </td>
          <td class="py-3 px-2 text-center">
            <input type="checkbox" ${p.geofence ? 'checked' : ''} ${isSuperAdmin ? 'disabled' : ''} onchange="toggleUserPermission('${user.id}', 'geofence')" class="w-4 h-4 text-sky-600 rounded cursor-pointer">
          </td>
          <td class="py-3 px-2 text-center">
            <input type="checkbox" ${p.staffMgmt ? 'checked' : ''} ${isSuperAdmin ? 'disabled' : ''} onchange="toggleUserPermission('${user.id}', 'staffMgmt')" class="w-4 h-4 text-rose-600 rounded cursor-pointer">
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render Password Reset & Account Status Table
  if (pwdTbody) {
    pwdTbody.innerHTML = AUTH_ACCOUNTS.map(user => {
      const isActive = user.status !== "Suspended";

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/80 text-xs text-slate-700">
          <td class="py-3 px-3">
            <div class="font-bold text-slate-900">${user.name}</div>
            <div class="text-[11px] text-slate-400 font-mono-numeric">Login ID: <strong class="text-slate-700">${user.username}</strong></div>
          </td>
          <td class="py-3 px-3 font-mono-numeric text-slate-500">
            ••••••••
          </td>
          <td class="py-3 px-3">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
              <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}"></span> ${user.status || 'Active'}
            </span>
          </td>
          <td class="py-3 px-3 text-right space-x-1.5">
            <button onclick="openResetPasswordModal('${user.id}')" class="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition">
              <i class="fa-solid fa-key mr-1"></i> Reset Password
            </button>
            <button onclick="toggleUserAccountStatus('${user.id}')" class="px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} rounded-lg transition">
              ${isActive ? 'Suspend' : 'Activate'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function toggleUserPermission(userId, moduleKey) {
  if (!USER_PERMISSIONS[userId]) {
    USER_PERMISSIONS[userId] = { attendance: true, payroll: false, form16: false, approvals: false, geofence: false, staffMgmt: false };
  }
  USER_PERMISSIONS[userId][moduleKey] = !USER_PERMISSIONS[userId][moduleKey];
  const user = AUTH_ACCOUNTS.find(u => u.id === userId);
  showToast(`Access permission for "${moduleKey}" updated for ${user ? user.name : userId}.`, "success");
}

function toggleUserAccountStatus(userId) {
  const user = AUTH_ACCOUNTS.find(u => u.id === userId);
  if (!user) return;
  if (user.role === "super_admin") {
    showToast("Super Admin account cannot be suspended.", "error");
    return;
  }
  user.status = user.status === "Suspended" ? "Active" : "Suspended";
  renderAdminAccessPanel();
  showToast(`Account status for ${user.name} changed to ${user.status}.`, "info");
}

let activeResetUserId = null;
function openResetPasswordModal(userId) {
  activeResetUserId = userId;
  const user = AUTH_ACCOUNTS.find(u => u.id === userId);
  if (!user) return;
  document.getElementById("reset-target-user-name").textContent = `${user.name} (${user.id})`;
  document.getElementById("reset-target-username").textContent = user.username;
  document.getElementById("reset-new-password").value = "Welcome@2026";
  document.getElementById("reset-password-modal").classList.remove("hidden");
}

function closeResetPasswordModal() {
  document.getElementById("reset-password-modal").classList.add("hidden");
}

function generateRandomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!";
  let pwd = "";
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById("reset-new-password").value = pwd;
}

function handleAdminPasswordReset(e) {
  if (e) e.preventDefault();
  const newPwd = document.getElementById("reset-new-password").value.trim();
  if (!newPwd) {
    showToast("Please enter a new password.", "error");
    return;
  }
  const user = AUTH_ACCOUNTS.find(u => u.id === activeResetUserId);
  if (user) {
    user.password = newPwd;
    closeResetPasswordModal();
    renderAdminAccessPanel();
    showToast(`Password successfully reset for ${user.name}! New password: "${newPwd}"`, "success");
  }
}

// ==========================================
// YEARLY RECHARGE & SUBSCRIPTION LICENSE ENGINE
// Secret master recharge key: -12072023 (Encrypted/Masked)
// ==========================================

function renderSubscriptionPanel() {
  const statusEl = document.getElementById("recharge-status-badge");
  const planEl = document.getElementById("recharge-plan-name");
  const validEl = document.getElementById("recharge-valid-date");
  const daysEl = document.getElementById("recharge-days-remaining");
  const historyTbody = document.getElementById("recharge-history-tbody");

  if (statusEl) statusEl.textContent = SUBSCRIPTION_CONFIG.status;
  if (planEl) planEl.textContent = SUBSCRIPTION_CONFIG.planName;
  if (validEl) validEl.textContent = SUBSCRIPTION_CONFIG.validUntil;
  if (daysEl) daysEl.textContent = `${SUBSCRIPTION_CONFIG.daysRemaining} Days`;

  if (historyTbody) {
    historyTbody.innerHTML = SUBSCRIPTION_CONFIG.rechargeHistory.map(h => `
      <tr class="border-b border-slate-100 text-xs">
        <td class="py-2.5 px-3 font-bold text-slate-800">${h.date}</td>
        <td class="py-2.5 px-3">${h.period}</td>
        <td class="py-2.5 px-3 font-mono-numeric text-blue-700">${h.receiptNo}</td>
        <td class="py-2.5 px-3 text-slate-600">${h.renewedBy}</td>
        <td class="py-2.5 px-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <i class="fa-solid fa-circle-check text-[8px]"></i> ${h.status}
          </span>
        </td>
      </tr>
    `).join('');
  }
}

function openRechargeModal() {
  const input = document.getElementById("recharge-secret-code");
  if (input) input.value = "";
  document.getElementById("recharge-modal").classList.remove("hidden");
}

function closeRechargeModal() {
  document.getElementById("recharge-modal").classList.add("hidden");
}

function handleYearlyRecharge(e) {
  if (e) e.preventDefault();
  const inputCode = document.getElementById("recharge-secret-code").value.trim();

  // Validate secret master recharge code: -12072023
  if (inputCode === SUBSCRIPTION_CONFIG.secretRechargeCode) {
    // Extend validity by +1 Year
    const currentYear = parseInt(SUBSCRIPTION_CONFIG.validUntil.split("-")[0]) || 2027;
    const nextYear = currentYear + 1;
    SUBSCRIPTION_CONFIG.validUntil = `${nextYear}-10-31`;
    SUBSCRIPTION_CONFIG.daysRemaining += 365;

    const receiptNo = "REC-" + Date.now().toString().slice(-6);
    const todayStr = new Date().toISOString().split("T")[0];

    SUBSCRIPTION_CONFIG.rechargeHistory.unshift({
      date: todayStr,
      period: "+1 Year Enterprise Extension",
      renewedBy: currentUser.name,
      receiptNo: receiptNo,
      status: "Verified & Active"
    });

    renderSubscriptionPanel();
    closeRechargeModal();
    showToast(`🎉 ANNUAL LICENSE RECHARGED! Valid until 31st Oct ${nextYear} (+365 Days). Receipt: ${receiptNo}`, "success");
  } else {
    showToast("SECURITY ERROR: Invalid Master Recharge Code! Verification rejected.", "error");
  }
}

// ==========================================
// MOBILE GPS APP COMPANION ENGINE
// ==========================================

function initMobileGPSApp() {
  updateMobileClock();
  setInterval(updateMobileClock, 1000);
  updateMobileGpsDisplay();
  renderMobilePunchLogs();
}

function updateMobileClock() {
  const mobileClockEl = document.getElementById("mobile-status-clock");
  const mobileBigClockEl = document.getElementById("mobile-punch-time-display");
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' });
  const secTimeStr = now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (mobileClockEl) mobileClockEl.textContent = timeStr;
  if (mobileBigClockEl) mobileBigClockEl.textContent = secTimeStr;

  // Update punch timer if currently punched in
  if (mobilePunchStatus.hasPunchedIn && mobilePunchStatus.punchInTime) {
    const elapsedMs = now - mobilePunchStatus.punchInTime;
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
    const mins = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((elapsedMs % (1000 * 60)) / 1000);
    const durationStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const timerEl = document.getElementById("mobile-shift-timer");
    if (timerEl) timerEl.textContent = durationStr;
  }
}

function detectRealGpsLocation() {
  const statusEl = document.getElementById("mobile-gps-status-badge");
  if (statusEl) {
    statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Acquiring GPS Satellites...`;
  }

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy || 15);

        // Find nearest branch
        let nearest = BRANCH_LOCATIONS[0];
        let minDistance = 99999999;
        BRANCH_LOCATIONS.forEach(b => {
          const d = calculateGpsDistance(userLat, userLng, b.lat, b.lng);
          if (d < minDistance) {
            minDistance = d;
            nearest = b;
          }
        });

        mobileGpsState = {
          lat: Number(userLat.toFixed(5)),
          lng: Number(userLng.toFixed(5)),
          accuracy: accuracy,
          distance: minDistance,
          nearestBranch: nearest,
          isWithinRadius: minDistance <= nearest.radiusMeters
        };

        updateMobileGpsDisplay();
        showToast(`Real GPS Coordinates detected! (${mobileGpsState.distance}m from ${nearest.name})`, "info");
      },
      (error) => {
        console.warn("GPS Geolocation error:", error.message);
        showToast("GPS permission denied or unavailable. Using High-Precision Office Simulator.", "warning");
        setSimulatedGps("gurugram_hq_inside");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  } else {
    showToast("Geolocation not supported on this browser. Using Office Simulator.", "warning");
    setSimulatedGps("gurugram_hq_inside");
  }
}

function setSimulatedGps(locationType) {
  if (locationType === "gurugram_hq_inside") {
    const b = BRANCH_LOCATIONS[0];
    mobileGpsState = {
      lat: b.lat + 0.0001,
      lng: b.lng + 0.0001,
      accuracy: 8,
      distance: 28,
      nearestBranch: b,
      isWithinRadius: true
    };
  } else if (locationType === "bengaluru_hub_inside") {
    const b = BRANCH_LOCATIONS[1];
    mobileGpsState = {
      lat: b.lat + 0.00015,
      lng: b.lng + 0.00012,
      accuracy: 10,
      distance: 35,
      nearestBranch: b,
      isWithinRadius: true
    };
  } else if (locationType === "client_outside") {
    const b = BRANCH_LOCATIONS[0];
    mobileGpsState = {
      lat: b.lat + 0.0075,
      lng: b.lng + 0.0062,
      accuracy: 25,
      distance: 920,
      nearestBranch: b,
      isWithinRadius: false
    };
  } else if (locationType === "home_outside") {
    const b = BRANCH_LOCATIONS[0];
    mobileGpsState = {
      lat: b.lat + 0.035,
      lng: b.lng + 0.042,
      accuracy: 30,
      distance: 4800,
      nearestBranch: b,
      isWithinRadius: false
    };
  }

  updateMobileGpsDisplay();
  showToast(`GPS Position updated to: ${locationType.replace(/_/g, ' ').toUpperCase()}`, "info");
}

function updateMobileGpsDisplay() {
  const coordsEl = document.getElementById("mobile-gps-coords");
  const branchEl = document.getElementById("mobile-nearest-branch");
  const distanceEl = document.getElementById("mobile-gps-distance");
  const statusBadge = document.getElementById("mobile-gps-status-badge");
  const punchBtn = document.getElementById("mobile-punch-action-btn");
  const radiusInfo = document.getElementById("mobile-radius-info");

  if (coordsEl) coordsEl.textContent = `Lat: ${mobileGpsState.lat}, Lng: ${mobileGpsState.lng} (±${mobileGpsState.accuracy}m)`;
  if (branchEl) branchEl.textContent = mobileGpsState.nearestBranch.name;
  if (distanceEl) distanceEl.textContent = `${mobileGpsState.distance} meters`;
  if (radiusInfo) radiusInfo.textContent = `Office Perimeter: ${mobileGpsState.nearestBranch.radiusMeters}m`;

  if (statusBadge) {
    if (mobileGpsState.isWithinRadius) {
      statusBadge.className = "px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-sm";
      statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> IN GEOFENCE (AUTHORIZED)`;
    } else {
      statusBadge.className = "px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-sm";
      statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> OUT OF RANGE (${mobileGpsState.distance}m)`;
    }
  }

  // Update Punch Button state & appearance
  if (punchBtn) {
    if (!mobilePunchStatus.hasPunchedIn) {
      punchBtn.innerHTML = `
        <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-blue-500/40 biometric-scanner-ring cursor-pointer hover:scale-105 active:scale-95 transition">
          <i class="fa-solid fa-fingerprint"></i>
        </div>
        <div class="mt-3 font-extrabold text-sm text-slate-900 uppercase tracking-wider">TAP TO PUNCH IN</div>
        <p class="text-[11px] text-slate-500 mt-0.5">Biometric GPS Attendance Log</p>
      `;
    } else {
      punchBtn.innerHTML = `
        <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-rose-500 to-amber-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-rose-500/40 biometric-scanner-ring cursor-pointer hover:scale-105 active:scale-95 transition">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </div>
        <div class="mt-3 font-extrabold text-sm text-rose-700 uppercase tracking-wider">TAP TO PUNCH OUT</div>
        <p class="text-[11px] text-slate-500 mt-0.5">Shift In Progress • Tap to Conclude</p>
      `;
    }
  }
}

function handleMobilePunchAction() {
  if (!mobileGpsState.isWithinRadius) {
    showToast(`CANNOT PUNCH: You are ${mobileGpsState.distance}m away! Allowed perimeter is ${mobileGpsState.nearestBranch.radiusMeters}m for ${mobileGpsState.nearestBranch.name}. Apply for L1 Regularization.`, "error");
    return;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' });

  if (!mobilePunchStatus.hasPunchedIn) {
    // Punch In
    mobilePunchStatus.hasPunchedIn = true;
    mobilePunchStatus.punchInTime = now;
    mobilePunchLogs.unshift({
      type: "IN",
      time: timeStr,
      location: mobileGpsState.nearestBranch.name,
      distance: `${mobileGpsState.distance}m`,
      status: "Authorized Geofence In"
    });

    // Update corresponding employee record in database
    const emp = EMPLOYEES.find(e => e.id === currentUser.id);
    if (emp) {
      emp.presentDays = Math.min(COMPANY_CONFIG.totalWorkingDays, emp.presentDays + 1);
      emp.regularization.status = "Biometric In Verified";
    }

    renderAttendanceTable();
    renderSummaryKPIs();
    renderMobilePunchLogs();
    updateMobileGpsDisplay();
    showToast(`Punch-IN Successful at ${timeStr}! Biometric GPS timestamp recorded.`, "success");
  } else {
    // Punch Out
    mobilePunchStatus.hasPunchedIn = false;
    mobilePunchStatus.punchOutTime = now;
    mobilePunchLogs.unshift({
      type: "OUT",
      time: timeStr,
      location: mobileGpsState.nearestBranch.name,
      distance: `${mobileGpsState.distance}m`,
      status: "Shift Completed & Locked"
    });

    renderMobilePunchLogs();
    updateMobileGpsDisplay();
    showToast(`Punch-OUT Successful at ${timeStr}! Daily attendance locked for payroll.`, "success");
  }
}

function renderMobilePunchLogs() {
  const container = document.getElementById("mobile-punch-history-list");
  if (!container) return;

  container.innerHTML = mobilePunchLogs.map(log => {
    let icon = "fa-arrow-right-to-bracket text-emerald-600 bg-emerald-50";
    if (log.type === "OUT") icon = "fa-arrow-right-from-bracket text-rose-600 bg-rose-50";
    if (log.type.includes("BREAK")) icon = "fa-mug-hot text-amber-600 bg-amber-50";

    return `
      <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg ${icon} flex items-center justify-center text-sm shadow-sm">
            <i class="fa-solid ${icon.split(' ')[0]}"></i>
          </div>
          <div>
            <div class="font-bold text-slate-800">${log.type.replace('_', ' ')} • <span class="font-mono-numeric text-blue-700">${log.time}</span></div>
            <div class="text-[10px] text-slate-500">${log.location} (${log.distance})</div>
          </div>
        </div>
        <span class="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          ${log.status}
        </span>
      </div>
    `;
  }).join('');
}

function switchMobileTab(tabName) {
  document.querySelectorAll(".mobile-app-panel").forEach(p => p.classList.add("hidden"));
  document.querySelectorAll(".mobile-bottom-nav-btn").forEach(b => b.classList.remove("text-blue-600", "font-bold"));

  const target = document.getElementById(`mobile-panel-${tabName}`);
  const btn = document.getElementById(`mobile-nav-btn-${tabName}`);

  if (target) target.classList.remove("hidden");
  if (btn) btn.classList.add("text-blue-600", "font-bold");
}

