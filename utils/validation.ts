
/**
 * 台灣營利事業統一編號校驗 (UBN Validation)
 * 1. 8位數字
 * 2. 乘數: 1, 2, 1, 2, 1, 2, 4, 1
 * 3. 乘積之個位與十位相加
 * 4. 總和需為 10 之倍數 (若第7位為7，總和加1後為10之倍數亦可)
 */
export function isValidTaiwanTaxId(taxId: string | number): boolean {
  const taxIdStr = String(taxId).trim();
  if (!/^\d{8}$/.test(taxIdStr)) return false;

  const multipliers = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;

  const calculateDigitSum = (n: number) => Math.floor(n / 10) + (n % 10);

  for (let i = 0; i < 8; i++) {
    const digit = parseInt(taxIdStr[i]);
    const product = digit * multipliers[i];
    sum += calculateDigitSum(product);
  }

  if (sum % 10 === 0) return true;

  // 特殊情況：第7位是7時，乘積為 4*7=28，加總為 2+8=10
  // 演算法規定此時加總可以取 1 (即 10 的個位數 0 與十位數 1 相加)
  if (taxIdStr[6] === '7' && (sum + 1) % 10 === 0) return true;

  return false;
}
