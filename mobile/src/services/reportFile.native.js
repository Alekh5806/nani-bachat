import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { EncodingType, getContentUriAsync, StorageAccessFramework } from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

import { PDF_MIME_TYPE } from './monthlyReport';

export const createReportFile = ({ bytes, name }) => {
  const directory = new Directory(Paths.cache, 'monthly-reports');
  directory.create({ idempotent: true });
  const file = new File(directory, name);
  file.create({ overwrite: true });
  file.write(bytes);
  return file;
};

// Native viewers and share targets can read the file after the sheet closes.
export const releaseReportFile = () => {};

export const canShareReport = () => Sharing.isAvailableAsync();

export const shareReport = (file) => Sharing.shareAsync(file.uri, {
  mimeType: PDF_MIME_TYPE,
  UTI: 'com.adobe.pdf',
  dialogTitle: 'Share monthly pool report',
});

export const openReport = async (file) => {
  await startActivityAsync('android.intent.action.VIEW', {
    data: await getContentUriAsync(file.uri),
    type: PDF_MIME_TYPE,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
};

export const saveReport = async (file) => {
  if (Platform.OS === 'ios') {
    await shareReport(file);
    return false;
  }
  const { granted, directoryUri } = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!granted) return false;

  const base64 = await file.base64();
  const destination = await StorageAccessFramework.createFileAsync(
    directoryUri, file.name.replace(/\.pdf$/, ''), PDF_MIME_TYPE,
  );
  try {
    await StorageAccessFramework.writeAsStringAsync(destination, base64, { encoding: EncodingType.Base64 });
  } catch (error) {
    await StorageAccessFramework.deleteAsync(destination, { idempotent: true }).catch(() => {});
    throw error;
  }
  return true;
};
