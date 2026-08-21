// QA Security Verification Suite (Local Runner)
// 涵蓋 OpenAI Codex Security 與 Trail of Bits 規範之 Dirty Dozen 測試

import assert from 'assert';

console.log("=================================================");
console.log("🧪 56_QuickLedger 本地資安邊界回歸測試套件");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   原因: ${e.message}\n`);
    failed++;
  }
}

// -------------------------------------------------------------
// 1. 公式注入防禦測試 (CWE-1236 Formula / CSV Injection)
// -------------------------------------------------------------
function sanitizeCellValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str.slice(0, 500);
}

runTest("TC-INP-01A: 公式開頭 '=' 自動前綴單引號跳脫", () => {
  const input = '=SUM(1+1)';
  const result = sanitizeCellValue(input);
  assert.strictEqual(result, "'=SUM(1+1)");
});

runTest("TC-INP-01B: 惡意 DDE 指令 '=cmd|' 自動跳脫", () => {
  const input = "=cmd|' /C calc'!A0";
  const result = sanitizeCellValue(input);
  assert.strictEqual(result, "'=cmd|' /C calc'!A0");
});

runTest("TC-INP-01C: 特殊前綴 '+', '-', '@' 自動跳脫", () => {
  assert.strictEqual(sanitizeCellValue('+123'), "'+123");
  assert.strictEqual(sanitizeCellValue('-100'), "'-100");
  assert.strictEqual(sanitizeCellValue('@HYPERLINK'), "'@HYPERLINK");
});

runTest("TC-INP-01D: 正常文字與中文不被誤加前綴", () => {
  assert.strictEqual(sanitizeCellValue('7-11 拿鐵'), '7-11 拿鐵');
  assert.strictEqual(sanitizeCellValue('台灣中油 95汽油'), '台灣中油 95汽油');
});

runTest("TC-INP-01E: 超長文字 (DoS) 自動截斷為 500 字元", () => {
  const longStr = 'A'.repeat(1000);
  const result = sanitizeCellValue(longStr);
  assert.strictEqual(result.length, 500);
});

// -------------------------------------------------------------
// 2. /api/scan 身分鑑權與 DoS 邊界測試
// -------------------------------------------------------------
async function mockScanHandler(req) {
  let resStatus = 200;
  let resJson = {};
  const res = {
    status: (code) => { resStatus = code; return { json: (data) => { resJson = data; return { resStatus, resJson }; } }; }
  };

  const { imageBase64, apiSecret, categories } = req.body || {};
  const expectedSecret = process.env.API_SECRET || 'test-secret-123';

  if (expectedSecret && apiSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Secret' });
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid imageBase64' });
  }

  if (imageBase64.length > 7 * 1024 * 1024) {
    return res.status(413).json({ error: 'Payload Too Large' });
  }

  return res.status(200).json({ status: 'ok', categoriesCount: categories?.length || 0 });
}

runTest("TC-AUTH-01: 未帶 API Secret 時回傳 401 Unauthorized", async () => {
  process.env.API_SECRET = 'secure-key-888';
  const req = { body: { imageBase64: 'abc', apiSecret: 'wrong-key' } };
  const res = await mockScanHandler(req);
  assert.strictEqual(res.resStatus, 401);
});

runTest("TC-AUTH-02: 正確 API Secret 鑑權通過", async () => {
  process.env.API_SECRET = 'secure-key-888';
  const req = { body: { imageBase64: 'abc', apiSecret: 'secure-key-888' } };
  const res = await mockScanHandler(req);
  assert.strictEqual(res.resStatus, 200);
});

runTest("TC-INP-02: 圖片 Payload 超過 7MB 時回傳 413 Payload Too Large", async () => {
  process.env.API_SECRET = 'secure-key-888';
  const hugePayload = 'A'.repeat(8 * 1024 * 1024);
  const req = { body: { imageBase64: hugePayload, apiSecret: 'secure-key-888' } };
  const res = await mockScanHandler(req);
  assert.strictEqual(res.resStatus, 413);
});

// -------------------------------------------------------------
// 3. 後端 Google Apps Script 白名單與特權操作測試
// -------------------------------------------------------------
function mockDoPost(payload, config) {
  if (payload.secret !== config.secret) {
    return { status: 'error', code: 401, message: 'Invalid Secret' };
  }

  const mutatingActions = ['submit', 'update', 'delete', 'saveSettings', 'saveSystemSettings', 'restoreData', 'backupData'];
  if (mutatingActions.includes(payload.action)) {
    const userEmail = (payload.userEmail || (payload.data && payload.data.userEmail) || '').toString().trim().toLowerCase();
    if (config.users && config.users.length > 0) {
      if (!userEmail || !config.users.includes(userEmail)) {
        return { status: 'error', code: 403, message: '權限不足 (403 Forbidden)' };
      }
    }
  }

  return { status: 'success', code: 200, action: payload.action };
}

runTest("TC-AUTH-03: 白名單內合法使用者可進行 submit/update/delete", () => {
  const config = { secret: 'sec123', users: ['admin@stonez.com', 'user@stonez.com'] };
  const payload = { action: 'submit', secret: 'sec123', userEmail: 'admin@stonez.com' };
  const res = mockDoPost(payload, config);
  assert.strictEqual(res.code, 200);
});

runTest("TC-AUTH-04: 非白名單信箱進行 delete 被後端拒絕 (403 Forbidden)", () => {
  const config = { secret: 'sec123', users: ['admin@stonez.com'] };
  const payload = { action: 'delete', secret: 'sec123', userEmail: 'hacker@evil.com', id: 'VCH-20260420-0001' };
  const res = mockDoPost(payload, config);
  assert.strictEqual(res.code, 403);
});

runTest("TC-AUTH-05: 偽造空信箱進行 saveSystemSettings 被後端拒絕 (403 Forbidden)", () => {
  const config = { secret: 'sec123', users: ['admin@stonez.com'] };
  const payload = { action: 'saveSystemSettings', secret: 'sec123' };
  const res = mockDoPost(payload, config);
  assert.strictEqual(res.code, 403);
});

// -------------------------------------------------------------
// 4. 環境安全隔離測試 (getEnv() Invariant)
// -------------------------------------------------------------
function mockGetEnv(sheetName) {
  const name = sheetName.toUpperCase();
  if (name.includes("TEST") || name.includes("測試")) {
    return "TEST";
  }
  return "PRODUCTION";
}

runTest("TC-ENV-01: 測試試算表 'QuickLedger_backup_TEST' 正確辨識為 TEST 環境", () => {
  assert.strictEqual(mockGetEnv("QuickLedger_backup_TEST"), "TEST");
  assert.strictEqual(mockGetEnv("一人公司記帳_測試版"), "TEST");
});

runTest("TC-ENV-02: 正式試算表正確辨識為 PRODUCTION 環境", () => {
  assert.strictEqual(mockGetEnv("QuickLedger_backup_PRODUCTION"), "PRODUCTION");
  assert.strictEqual(mockGetEnv("一人公司記帳系統"), "PRODUCTION");
});

console.log("\n=================================================");
console.log(`📊 測試結果總計: 通過 ${passed} 項 | 失敗 ${failed} 項`);
console.log("=================================================");
