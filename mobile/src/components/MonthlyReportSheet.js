import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { ArrowRight2, DocumentDownload, ExportSquare, Share } from 'iconsax-react-native';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';

import { ProfileSheet } from './ProfileSheet';
import { fetchMonthlyReport } from '../services/monthlyReport';
import {
  canShareReport, createReportFile, openReport, releaseReportFile, saveReport, shareReport,
} from '../services/reportFile';
import { useAuthStore } from '../store/authStore';
import { COLORS, RADIUS, SPACING, TYPE, themedStyles } from '../theme/colors';

const INLINE_PREVIEW = Platform.OS === 'ios';

export const MonthlyReportSheet = ({ month, onDismiss }) => {
  const [report, setReport] = useState(null);
  const [canShare, setCanShare] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const actionInProgress = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const token = useAuthStore.getState().token;
    let localFile;

    const download = async () => {
      try {
        const pdf = await fetchMonthlyReport(month.key, controller.signal);
        if (controller.signal.aborted || token !== useAuthStore.getState().token) return;
        localFile = createReportFile(pdf);
        setReport(localFile);
        const available = await canShareReport(localFile);
        if (!controller.signal.aborted) setCanShare(available);
      } catch {
        if (!controller.signal.aborted && !localFile) setDownloadFailed(true);
      }
    };
    download();

    return () => {
      controller.abort();
      if (localFile) releaseReportFile(localFile);
    };
  }, [month.key, attempt]);

  const retry = () => {
    setDownloadFailed(false);
    setAttempt((count) => count + 1);
  };

  const runAction = async (action, errorMessage) => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setBusy(true);
    setActionError('');
    try {
      if (await action(report)) {
        Toast.show({ type: 'success', text1: 'PDF saved' });
      }
    } catch (error) {
      if (error.name !== 'AbortError') setActionError(errorMessage);
    } finally {
      actionInProgress.current = false;
      setBusy(false);
    }
  };

  const showPreview = INLINE_PREVIEW && !!report && !previewFailed;

  return (
    <ProfileSheet
      title="Monthly pool report"
      subtitle={month.label}
      onDismiss={onDismiss}
      expanded={showPreview}
    >
      {!report ? (
        <View style={styles.status}>
          {downloadFailed ? (
            <>
              <Text accessibilityLiveRegion="polite" style={styles.statusText}>
                Couldn’t download the PDF.
              </Text>
              <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color={COLORS.accent} />
              <Text accessibilityLiveRegion="polite" style={styles.statusText}>Preparing PDF…</Text>
            </>
          )}
        </View>
      ) : (
        <>
          {showPreview && (
            <View style={styles.preview}>
              <WebView
                accessibilityLabel="Monthly pool report PDF"
                source={{ uri: report.uri }}
                allowingReadAccessToURL={report.uri}
                originWhitelist={['file://*']}
                javaScriptEnabled={false}
                onError={() => setPreviewFailed(true)}
                startInLoadingState
              />
            </View>
          )}
          {previewFailed && (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              Couldn’t preview this PDF. You can open it from Files after saving.
            </Text>
          )}
          {!!actionError && (
            <Text accessibilityLiveRegion="polite" style={styles.error}>{actionError}</Text>
          )}
          <View style={styles.actions}>
            {!INLINE_PREVIEW && (
              <ReportAction
                label="Open PDF"
                Icon={ExportSquare}
                disabled={busy}
                onPress={() => runAction(openReport, 'Couldn’t open the PDF. Save it and try a PDF reader.')}
              />
            )}
            {(!INLINE_PREVIEW || canShare) && (
              <ReportAction
                label={INLINE_PREVIEW ? 'Save or share PDF' : 'Save PDF'}
                Icon={DocumentDownload}
                disabled={busy}
                onPress={() => runAction(saveReport, 'Couldn’t save the PDF. Try again.')}
              />
            )}
            {!INLINE_PREVIEW && canShare && (
              <ReportAction
                label="Share PDF"
                Icon={Share}
                disabled={busy}
                onPress={() => runAction(shareReport, 'Couldn’t share the PDF. Try again.')}
              />
            )}
          </View>
        </>
      )}
    </ProfileSheet>
  );
};

const ReportAction = ({ Icon, label, onPress, disabled }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [styles.action, (pressed || disabled) && styles.dim]}
  >
    <Icon size={20} color={COLORS.textSecondary} />
    <Text style={styles.actionLabel}>{label}</Text>
    <ArrowRight2 size={16} color={COLORS.textSecondary} />
  </Pressable>
);

const styles = themedStyles(() => ({
  status: { minHeight: 108, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  statusText: { ...TYPE.body, color: COLORS.textSecondary, textAlign: 'center' },
  retry: {
    minHeight: 44, paddingHorizontal: SPACING.lg, justifyContent: 'center',
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
  },
  retryText: { ...TYPE.button, color: COLORS.textPrimary },
  preview: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.md },
  actions: { gap: SPACING.xs },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 48,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.surface,
  },
  actionLabel: { ...TYPE.button, color: COLORS.textPrimary, flex: 1 },
  error: { ...TYPE.secondary, color: COLORS.loss, marginBottom: SPACING.md },
  dim: { opacity: 0.65 },
}));
