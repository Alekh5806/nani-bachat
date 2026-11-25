import api from '../config/api';

const REPORT_TIME_ZONE = 'Asia/Kolkata';
const monthNumber = new Intl.DateTimeFormat('en-GB', {
  timeZone: REPORT_TIME_ZONE, year: 'numeric', month: '2-digit',
});
const monthName = new Intl.DateTimeFormat('en-IN', {
  timeZone: REPORT_TIME_ZONE, year: 'numeric', month: 'long',
});

export const PDF_MIME_TYPE = 'application/pdf';

export const getReportMonth = (date = new Date()) => {
  const parts = monthNumber.formatToParts(date);
  const year = parts.find((part) => part.type === 'year').value;
  const month = parts.find((part) => part.type === 'month').value;
  return { key: `${year}-${month}`, label: monthName.format(date) };
};

export const fetchMonthlyReport = async (month, signal) => {
  const { data } = await api.get('/reports/monthly/', {
    params: { month },
    responseType: 'arraybuffer',
    headers: { Accept: PDF_MIME_TYPE },
    signal,
  });
  const bytes = new Uint8Array(data);
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') {
    throw new Error('Invalid PDF response');
  }
  return { bytes, name: `Nani-Bachat-Pool-Report-${month}.pdf` };
};
