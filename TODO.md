# 🧾 QuickLedger Next Version TODO

Here is the proposal and roadmap for the next system upgrade:

---

## 📅 Roadmap & Action Plan

### 🚀 Priority 1: Establish C.R.U.D. (Read, Update, Delete) & Search
**Current Status:** The system is Write-Only. We have Voucher No. (流水號), which is perfect for fetching, updating, and deleting specific rows.
*   **Search Function (Read):** Add `action: 'search'` to Google Apps Script. Create a `SearchPanel.tsx` in UI with Date & Keyword search.
*   **Update & Delete (Modify):** Add Edit/Delete buttons to search results. Build GAS endpoints (`action: 'update'`, `action: 'delete'`) to find the row by Voucher No. and modify/delete it.

### 🛡️ Priority 2: Front-end Pre-submission Validation (Math Safeguards)
*   **Math Check:** Before `action: 'submit'`, strictly verify `Sales Amount + Tax Amount === Total Amount` (especially for Format Codes 21, 25).
*   **Alert:** Prevent submission and alert the user if AI hallucinates numbers causing an imbalance. 

### 📊 Priority 3: Micro Dashboard for Founders 
*   **Estimated Tax:** Calculate `Total Output Tax - Total Input Tax` of the current period to estimate VAT (營業稅).
*   **Cash Flow Alerts:** Highlight items where "Actual Payment/Receipt Date" is missing but "Expected Date" is overdue.

---

## 🛠️ Implementation Details (Priority 1)

### 1. Data Storage Strategy: Single Google Sheet
*   Maintain the One-Sheet strategy to ensure the continuous Voucher No. (e.g., `VCH-YYYYMMDD-XXXX`) logic works and doesn't duplicate across files. 

### 2. Search Function Architecture
*   **Backend (GAS):** 
    *   Find row operations using the Voucher No. (Column A).
    *   Return JSON arrays of matching objects, mapping sheet columns (A-P) into a structured frontend type.
*   **Frontend Data Handling:** 
    *   `SearchPanel.tsx` with "Date Search" and "Keyword Search" tabs.
    *   Handle `search`, `update`, `delete` API calls.

### 3. UI/UX
*   **Search Interface:** Clean mobile-first design.
*   **Result Cards:** Top: Voucher & Date, Middle: Vendor & Category, Bottom: Amounts & Actions (Edit/Delete).
