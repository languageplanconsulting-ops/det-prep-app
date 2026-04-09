/** THB display; amounts stored in satang (1 THB = 100 satang). */
export function formatBahtFromSatang(satang: number): string {
  const baht = satang / 100;
  return `฿${baht.toLocaleString("en-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
