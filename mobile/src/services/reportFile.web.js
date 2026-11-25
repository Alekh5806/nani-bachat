import { PDF_MIME_TYPE } from './monthlyReport';

export const createReportFile = ({ bytes, name }) => {
  const file = new File([bytes], name, { type: PDF_MIME_TYPE });
  return { file, uri: URL.createObjectURL(file) };
};

export const releaseReportFile = ({ uri }) => {
  // Allow a browser tab or download already opening to read the object URL.
  setTimeout(() => URL.revokeObjectURL(uri), 30_000);
};

export const canShareReport = ({ file }) => navigator.canShare?.({ files: [file] }) ?? false;

export const shareReport = ({ file }) => navigator.share({ files: [file] });

export const openReport = ({ uri }) => {
  window.open(uri, '_blank', 'noopener,noreferrer');
};

export const saveReport = ({ file, uri }) => {
  const link = document.createElement('a');
  link.href = uri;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return false;
};
