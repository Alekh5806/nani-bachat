/** Rupee formatting shared by the screens. */
const sign = (n) => (n < 0 ? '-' : '');

export const fmtFull = (v) => {
  const n = Number(v) || 0;
  return sign(n) + '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtShort = (v) => {
  const n = Number(v) || 0;
  const a = Math.abs(n);
  if (a >= 10000000) return sign(n) + '₹' + (a / 10000000).toFixed(2) + ' Cr';
  if (a >= 100000) return sign(n) + '₹' + (a / 100000).toFixed(2) + ' L';
  if (a >= 1000) return sign(n) + '₹' + (a / 1000).toFixed(1) + 'K';
  return sign(n) + '₹' + a.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};
