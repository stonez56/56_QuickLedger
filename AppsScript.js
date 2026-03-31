// Google 記帳 Sheet: https://docs.google.com/spreadsheets/d/1J0wYR-pnMWFVDOU_cA_GxF2WGn86e-nZQ0RP4HJ8Je4/edit?gid=1903772853#gid=1903772853
const DATA_SHEET_NAME = "Data_2026總帳";
const CONFIG_SHEET_NAME = "Config";

// 1. 處理 CORS 預檢請求
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

// 2. 處理 POST 請求
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const config = getConfig(ss);

    // 驗證 API Secret
    if (payload.secret !== config.secret) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Invalid Secret' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理 getConfig 請求 (前端登入驗證用)
    if (payload.action === 'getConfig') {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        users: config.users 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理新增資料請求
    if (payload.action === 'submit') {
      const sheet = ss.getSheetByName(DATA_SHEET_NAME);
      if (!sheet) {
        throw new Error(`找不到工作表：${DATA_SHEET_NAME}，請先執行 setup()`);
      }

      // 產生流水號 (VCH-YYYYMMDD-000X)
      const dateObj = new Date(payload.date || new Date());
      const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyyMMdd");
      const prefix = `VCH-${dateStr}-`;
      
      // 尋找當天最大序號
      const data = sheet.getDataRange().getValues();
      const records = [];
      let maxSeq = 0;
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row[0] || row[0] === '流水號') continue; // Skip empty rows and headers
        const id = row[0]; // A欄是流水號
        if (id && id.toString().startsWith(prefix)) {
          const seq = parseInt(id.toString().split('-')[2], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
      const newSeq = (maxSeq + 1).toString().padStart(4, '0');
      const newId = `${prefix}${newSeq}`;

      const rowData = buildRowData(newId, payload);
      sheet.appendRow(rowData);

      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        row: sheet.getLastRow(),
        id: newId 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理查詢請求
    if (payload.action === 'search') {
      const sheet = ss.getSheetByName(DATA_SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      const result = [];
      
      const query = (payload.query || '').toLowerCase();
      const startDate = payload.startDate ? new Date(payload.startDate) : null;
      const endDate = payload.endDate ? new Date(payload.endDate) : null;
      
      // index mapping (0-15 correspond to columns A-P)
      for (let i = data.length - 1; i >= 0; i--) { // Reverse order to show latest first
        const row = data[i];
        if (!row[0] || row[0] === '流水號') continue; // Skip empty rows and headers
        
        let match = false;
        
        if (payload.type === 'keyword') {
          // Search in ID (0), Type (5), Date (2), Category (13), Note (14), Vendor(8), InvoiceNo(7), Total(11)
          const searchStr = `${row[0]} ${row[5]} ${row[2]} ${row[13]} ${row[14]} ${row[8]} ${row[7]} ${row[11]}`.toLowerCase();
          if (searchStr.includes(query) || !query) match = true;
        } else if (payload.type === 'date') {
           const rDateStr = safeFormatDate(row[2]); // e.g. "2026-04-20"
           if (rDateStr) {
               if (payload.startDate && rDateStr < payload.startDate) continue;
               if (payload.endDate && rDateStr > payload.endDate) continue;
               match = true;
           }
        }
        
        if (match) {
          result.push({
            id: row[0],
            recordType: row[1],
            date: safeFormatDate(row[2]),
            paymentDate: safeFormatDate(row[3]),
            expectedDate: safeFormatDate(row[4]),
            type: row[5],
            formatCode: row[6],
            invoiceNo: row[7],
            taxId: row[8],
            amount: row[9],
            tax: row[10],
            total: row[11],
            taxType: row[12],
            category: row[13],
            note: row[14],
            userEmail: row[15],
            rowIndex: i + 1
          });
        }
        
        if (result.length >= 100) break; // Limit to 100 results for performance
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        data: result 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理獲取所有資料請求 (不限制筆數，供儀表板使用)
    if (payload.action === 'getData') {
      const sheet = ss.getSheetByName(DATA_SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      const result = [];
      
      for (let i = data.length - 1; i > 0; i--) {
        const row = data[i];
        if (!row[0]) continue;
        
        result.push({
          id: row[0],
          recordType: row[1],
          date: safeFormatDate(row[2]),
          paymentDate: safeFormatDate(row[3]),
          expectedDate: safeFormatDate(row[4]),
          type: row[5],
          formatCode: row[6],
          invoiceNo: row[7],
          taxId: row[8],
          amount: row[9],
          tax: row[10],
          total: row[11],
          taxType: row[12],
          category: row[13],
          note: row[14],
          userEmail: row[15],
          rowIndex: i + 1
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        data: result 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理取得設定資料 (科目與格式代號)
    if (payload.action === 'getSettings') {
      let sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      let categories = [];
      let formatCodes = [];
      
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === 'CATEGORIES') {
          categories = data[i][1] ? JSON.parse(data[i][1]) : [];
        } else if (data[i][0] === 'FORMAT_CODES') {
          formatCodes = data[i][1] ? JSON.parse(data[i][1]) : [];
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        categories,
        formatCodes
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理儲存設定資料 (科目與格式代號)
    if (payload.action === 'saveSettings') {
      let sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      const key = payload.type === 'categories' ? 'CATEGORIES' : 'FORMAT_CODES';
      const value = JSON.stringify(payload.data || []);
      
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === key) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex !== -1) {
        sheet.getRange(rowIndex, 2).setValue(value);
      } else {
        sheet.appendRow([key, value]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: '設定儲存成功' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理更新請求
    if (payload.action === 'update') {
      const sheet = ss.getSheetByName(DATA_SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === payload.id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex === -1) {
        throw new Error('找不到該筆紀錄');
      }
      
      const rowData = buildRowData(payload.id, payload);
      sheet.getRange(rowIndex, 1, 1, 16).setValues([rowData]);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: '更新成功' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理刪除請求
    if (payload.action === 'delete') {
      const sheet = ss.getSheetByName(DATA_SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === payload.id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex === -1) {
        throw new Error('找不到該筆紀錄');
      }
      
      sheet.deleteRow(rowIndex);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: '刪除成功' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理系統設定儲存 (ID/Password/Allowed Users)
    if (payload.action === 'saveSystemSettings') {
      let sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
      sheet.getRange("B1").setValue(payload.data.secret);
      sheet.getRange("B2").setValue(payload.data.users);
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: '系統設定儲存成功' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理手動備份請求
    if (payload.action === 'backupData') {
       const backupName = backupData();
       return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: `備份成功: ${backupName}` 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理列出備份檔案
    if (payload.action === 'listBackups') {
       const backups = listBackups();
       return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        data: backups
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 處理還原請求
    if (payload.action === 'restoreData') {
       if (!payload.backupFileId) throw new Error("缺少備份檔案 ID");
       restoreData(payload.backupFileId);
       return ContentService.createTextOutput(JSON.stringify({ 
        status: 'success', 
        message: '還原成功' 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error('未知的 action: ' + payload.action);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper to format date safely
function safeFormatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val.toString();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function buildRowData(id, payload) {
  return [
    id,                              // A: 流水號
    payload.recordType || 'Both',    // B: 入帳類型
    payload.date || '',              // C: 發票日期
    payload.paymentDate || '',       // D: 收/付款日期
    payload.expectedDate || '',      // E: 預計收/付款日
    payload.type || '',              // F: 憑證種類
    payload.formatCode || '',        // G: 格式代號
    payload.invoiceNo || '',         // H: 發票號碼
    payload.taxId || '',             // I: 對方統編
    payload.amount || 0,             // J: 銷售額
    payload.tax || 0,                // K: 營業稅額
    payload.total || 0,              // L: 總金額
    payload.taxType || '',           // M: 課稅別
    payload.category || '',          // N: 會計科目
    payload.note || '',              // O: 備註
    payload.userEmail || ''          // P: 紀錄者
  ];
}

// 3. 取得設定與允許的使用者
function getConfig(ss) {
  let sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG_SHEET_NAME);
    sheet.getRange("A1").setValue("API_SECRET");
    sheet.getRange("B1").setValue("my-secret-888");
    sheet.getRange("A2").setValue("ALLOWED_USERS");
    sheet.getRange("B2").setValue("stonez56@gmail.com,stonez.chen@gmail.com");
    sheet.getRange("A3").setValue("CATEGORIES");
    sheet.getRange("B3").setValue("[]");
    sheet.getRange("A4").setValue("FORMAT_CODES");
    sheet.getRange("B4").setValue("[]");
  }
  const secret = sheet.getRange("B1").getValue();
  const usersStr = sheet.getRange("B2").getValue();
  const users = (usersStr || "").toString().split(',').map(u => u.trim().toLowerCase()).filter(u => u);
  return { secret, users };
}

// 4. 初始化設定 (請在 GAS 編輯器中手動執行此函式一次)
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 建立 Config
  getConfig(ss);

  // 2. 建立總帳
  let dataSheet = ss.getSheetByName(DATA_SHEET_NAME);
  if (!dataSheet) {
    dataSheet = ss.insertSheet(DATA_SHEET_NAME);
    const headers = [
      "流水號", "入帳類型", "發票日期", "收/付款日期", "預計收/付款日", 
      "憑證種類", "格式代號", "發票號碼", "對方統編", "銷售額", 
      "營業稅額", "總金額", "課稅別", "會計科目", "備註", "紀錄者"
    ];
    dataSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    dataSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
    dataSheet.setFrozenRows(1);
  }

  // 3. 建立內帳 Tab
  let internalSheet = ss.getSheetByName("Data_2026內帳");
  if (!internalSheet) {
    internalSheet = ss.insertSheet("Data_2026內帳");
    internalSheet.getRange("A1").setFormula(`=QUERY('Data_2026總帳'!A:P, "SELECT * WHERE B = 'Internal' OR B = 'Both'", 1)`);
  }

  // 4. 建立外帳 Tab 
  let externalSheet = ss.getSheetByName("Data_2026外帳");
  if (!externalSheet) {
    externalSheet = ss.insertSheet("Data_2026外帳");
    externalSheet.getRange("A1").setFormula(`=QUERY('Data_2026總帳'!A:P, "SELECT * WHERE B = 'Both'", 1)`);
  }

  // 5. 確保每日備份觸發器已設置
  setupDailyBackupTrigger();
}

// 5. 確保每日自動化備份觸發器 (Server-Side Cron)
function setupDailyBackupTrigger() {
  const functionName = "backupData";
  // 檢查是否已經有觸發器
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === functionName) {
      return; // 已經存在
    }
  }
  
  // 建立每日凌晨 2 點到 3 點之間的自動備份
  ScriptApp.newTrigger(functionName)
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
}

// 6. 核心備份邏輯 (手動或自動皆可呼叫)
function backupData(isFailSafe = false) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(DATA_SHEET_NAME);
  if (!sourceSheet) throw new Error(`${DATA_SHEET_NAME} 不存在`);

  // 1. 取得或建立備份資料夾 (與原試算表同層級)
  const file = DriveApp.getFileById(ss.getId());
  const parents = file.getParents();
  let parentFolder = DriveApp.getRootFolder();
  if (parents.hasNext()) {
    parentFolder = parents.next();
  }
  
  const backupFolderName = "_Backups_QuickLedger";
  let backupFolder;
  const folders = parentFolder.getFoldersByName(backupFolderName);
  if (folders.hasNext()) {
    backupFolder = folders.next();
  } else {
    backupFolder = parentFolder.createFolder(backupFolderName);
  }

  // 2. 建立新備份
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  const backupName = isFailSafe 
    ? `most recent backup_${dateStr}` 
    : `Data_2026總帳_Backup_${dateStr}`;

  // 我們只備份 Data_2026總帳 (建立一個新的 SpreadSheet 存放備份)
  const backupSs = SpreadsheetApp.create(backupName);
  const backupFile = DriveApp.getFileById(backupSs.getId());
  backupFile.moveTo(backupFolder);

  // 複製資料到備份檔
  const backupSheet = backupSs.getSheets()[0];
  const data = sourceSheet.getDataRange().getValues();
  if (data.length > 0) {
     backupSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  }
  
  // 3. 執行 30 天滾動保留策略 (僅針對非 Fail-Safe)
  if (!isFailSafe) {
    const backupFiles = backupFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
    const filesArray = [];
    while (backupFiles.hasNext()) {
      const bf = backupFiles.next();
      if (!bf.getName().startsWith("most recent backup_")) {
         filesArray.push(bf);
      }
    }
    
    // 由舊到新排序
    filesArray.sort((a, b) => a.getDateCreated() - b.getDateCreated());
    
    // 超過 30 個，刪除最舊的
    while (filesArray.length > 30) {
      const oldest = filesArray.shift();
      oldest.setTrashed(true);
    }
  }

  return backupName;
}

// 7. 列出所有備份檔案
function listBackups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const file = DriveApp.getFileById(ss.getId());
  const parents = file.getParents();
  let parentFolder = DriveApp.getRootFolder();
  if (parents.hasNext()) {
    parentFolder = parents.next();
  }
  
  const folders = parentFolder.getFoldersByName("_Backups_QuickLedger");
  if (!folders.hasNext()) return [];
  
  const backupFolder = folders.next();
  const backupFiles = backupFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const result = [];
  
  while (backupFiles.hasNext()) {
    const bf = backupFiles.next();
    result.push({
      id: bf.getId(),
      name: bf.getName(),
      dateCreated: Utilities.formatDate(bf.getDateCreated(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
    });
  }
  
  // 依建立日期降序排列 (最新在前)
  result.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
  return result;
}

// 8. 還原資料核心邏輯
function restoreData(backupFileId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheet = ss.getSheetByName(DATA_SHEET_NAME);
  if (!targetSheet) throw new Error(`${DATA_SHEET_NAME} 不存在`);

  // 1. Fail-Safe: 先執行一次現有資料的備份
  backupData(true);

  // 2. 獲取備份檔案
  const backupFile = DriveApp.getFileById(backupFileId);
  const backupSs = SpreadsheetApp.open(backupFile);
  const backupSheet = backupSs.getSheets()[0];
  
  const data = backupSheet.getDataRange().getValues();
  if (data.length === 0) throw new Error("備份檔案內沒有資料");

  // 3. 覆寫當前總帳
  targetSheet.clear(); // 清空舊資料
  targetSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  targetSheet.getRange(1, 1, 1, data[0].length).setFontWeight("bold").setBackground("#f3f4f6");
  targetSheet.setFrozenRows(1);
}

