import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  Easing,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../Components/api';
import { theme } from '../Components/theme';
import WowCard from '../Components/WowCard';
import { SkeletonBlock, SkeletonCard } from '../Components/Skeleton';
import { Icon } from '../Components/icons';
import { useAuthState, useViewMode } from '../App';

const DOC_TYPES = [
  { key: 'istifaa', label: 'ISTIFAA' },
  { key: 'amc', label: 'AMC' },
  { key: 'doe_noc', label: 'DOE NOC' },
  { key: 'coc', label: 'COC' },
  { key: 'tpi', label: 'TPI' },
];

const LIST_INITIAL_NUM_TO_RENDER = 10;
const LIST_MAX_TO_RENDER_PER_BATCH = 12;
const LIST_WINDOW_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 50;

function escapeText(v) {
  return String(v ?? '').trim();
}

function toUiDate(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s.includes('T') ? s : `${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function fmtDate(v) {
  const s = toUiDate(v);
  if (!s) return '—';
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString();
}

function isoToPickerDate(v) {
  const s = toUiDate(v);
  if (!s) return new Date();
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function pickerDateToIso(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function statusFromDate(isoDate) {
  if (!isoDate) return 'unknown';
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return 'unknown';

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffDays = Math.ceil((target - today) / 86400000);

  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'renewal';
  return 'valid';
}

function docStatus(row, key) {
  const map = {
    istifaa: row?.istifaa_expiry_date,
    amc: row?.amc_expiry_date,
    doe_noc: row?.doe_noc_expiry_date,
    coc: row?.coc_expiry_date,
    tpi: row?.tpi_expiry_date,
  };
  return statusFromDate(map[key]);
}

function aggregatedStatus(row) {
  const statuses = DOC_TYPES.map((d) => docStatus(row, d.key));
  if (statuses.some((s) => s === 'expired' || s === 'unknown')) return 'expired';
  if (statuses.some((s) => s === 'renewal')) return 'renewal';
  if (statuses.every((s) => s === 'valid')) return 'valid';
  return 'unknown';
}

function filesCount(row) {
  return (
    (row?.istifaa_has_file ? 1 : 0) +
    (row?.amc_has_file ? 1 : 0) +
    (row?.doe_noc_has_file ? 1 : 0) +
    (row?.coc_has_file ? 1 : 0) +
    (row?.tpi_has_file ? 1 : 0)
  );
}

function countsForRow(row) {
  let expired = 0;
  let renewal = 0;
  let valid = 0;

  DOC_TYPES.forEach((d) => {
    const st = docStatus(row, d.key);
    if (st === 'expired' || st === 'unknown') expired += 1;
    else if (st === 'renewal') renewal += 1;
    else if (st === 'valid') valid += 1;
  });

  return { expired, renewal, valid };
}

function buildRowPayload(form) {
  return {
    building_type: escapeText(form.building_type),
    building_code: escapeText(form.building_code),
    building_name: escapeText(form.building_name),
    gas_type: escapeText(form.gas_type),
    gas_contractor: escapeText(form.gas_contractor),
    plot: escapeText(form.plot),
    sector: escapeText(form.sector),
    latitude: form.latitude === '' ? '' : form.latitude,
    longitude: form.longitude === '' ? '' : form.longitude,
    istifaa_expiry_date: toUiDate(form.istifaa_expiry_date),
    amc_expiry_date: toUiDate(form.amc_expiry_date),
    doe_noc_expiry_date: toUiDate(form.doe_noc_expiry_date),
    coc_expiry_date: toUiDate(form.coc_expiry_date),
    tpi_expiry_date: toUiDate(form.tpi_expiry_date),
    notes: escapeText(form.notes),
  };
}

function defaultForm() {
  return {
    id: '',
    building_type: '',
    building_code: '',
    building_name: '',
    gas_type: '',
    gas_contractor: '',
    plot: '',
    sector: '',
    latitude: '',
    longitude: '',
    istifaa_expiry_date: '',
    amc_expiry_date: '',
    doe_noc_expiry_date: '',
    coc_expiry_date: '',
    tpi_expiry_date: '',
    notes: '',
  };
}

function formFromRow(row) {
  return {
    id: String(row?.id ?? ''),
    building_type: row?.building_type ?? '',
    building_code: row?.building_code ?? '',
    building_name: row?.building_name ?? '',
    gas_type: row?.gas_type ?? '',
    gas_contractor: row?.gas_contractor ?? '',
    plot: row?.plot ?? '',
    sector: row?.sector ?? '',
    latitude: row?.latitude == null ? '' : String(row.latitude),
    longitude: row?.longitude == null ? '' : String(row.longitude),
    istifaa_expiry_date: toUiDate(row?.istifaa_expiry_date),
    amc_expiry_date: toUiDate(row?.amc_expiry_date),
    doe_noc_expiry_date: toUiDate(row?.doe_noc_expiry_date),
    coc_expiry_date: toUiDate(row?.coc_expiry_date),
    tpi_expiry_date: toUiDate(row?.tpi_expiry_date),
    notes: row?.notes ?? '',
  };
}

function enrichRow(row) {
  const normalized = {
    ...row,
    istifaa_expiry_date: toUiDate(row?.istifaa_expiry_date),
    amc_expiry_date: toUiDate(row?.amc_expiry_date),
    doe_noc_expiry_date: toUiDate(row?.doe_noc_expiry_date),
    coc_expiry_date: toUiDate(row?.coc_expiry_date),
    tpi_expiry_date: toUiDate(row?.tpi_expiry_date),
  };

  const __aggStatus = aggregatedStatus(normalized);
  const __counts = countsForRow(normalized);
  const __filesCount = filesCount(normalized);
  const __searchText = [
    normalized.sn,
    normalized.building_name,
    normalized.building_code,
    normalized.gas_type,
    normalized.gas_contractor,
    normalized.plot,
    normalized.sector,
  ]
    .map((v) => String(v || '').trim().toLowerCase())
    .join(' ');

  return {
    ...normalized,
    __aggStatus,
    __counts,
    __filesCount,
    __searchText,
  };
}

function emptySummary() {
  return {
    totalSites: 0,
    byDoc: {
      istifaa: { expired: 0, renewal: 0, valid: 0, unknown: 0 },
      amc: { expired: 0, renewal: 0, valid: 0, unknown: 0 },
      doe_noc: { expired: 0, renewal: 0, valid: 0, unknown: 0 },
      coc: { expired: 0, renewal: 0, valid: 0, unknown: 0 },
      tpi: { expired: 0, renewal: 0, valid: 0, unknown: 0 },
    },
    allValidSites: [],
    allNotValidSites: [],
    renewalDocs: [],
    expiredDocs: [],
    totalDocsRenewal: 0,
    totalDocsExpired: 0,
  };
}

function MenuDrawer({
  open,
  onClose,
  onPressDashboard,
  onPressBrowseView,
  onPressGasSensors,
  onPressDocumentTracker,
  onPressAccountCreator,
  onToggleBrowseMode,
  currentRoute = 'DocumentTracker',
  viewMode = 'grid',
  permissions = {},
}) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const [accountOpen, setAccountOpen] = useState(currentRoute === 'AccountCreator');

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 1 : 0,
      duration: open ? 220 : 180,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (open && currentRoute === 'AccountCreator') setAccountOpen(true);
  }, [open, slide, currentRoute]);

  const pointerEvents = open ? 'auto' : 'none';
  const panelW = 292;

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-panelW - 16, 0],
  });

  const dimOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const canGrid = !!permissions?.perm_grid_view_access;
  const canCommand = !!permissions?.perm_command_view_access;
  const canToggleBrowseMode = canGrid && canCommand;

  const browseLabel = viewMode === 'command' ? 'Command View' : 'Grid View';
  const browseIcon = viewMode === 'command' ? 'cards-outline' : 'view-comfy';

  const isDashboard = currentRoute === 'Dashboard';
  const isGridView = currentRoute === 'ListView';
  const isCommandView = currentRoute === 'CommandView';
  const isBrowseActive = isGridView || isCommandView;
  const isGasSensors = currentRoute === 'GasSensors';
  const isDocumentTracker = currentRoute === 'DocumentTracker';
  const isAccountCreator = currentRoute === 'AccountCreator';

  const canDashboard = !!permissions?.perm_dashboard_access;
  const canBrowse = canGrid || canCommand;
  const canGasSensors = !!permissions?.perm_gas_sensors_access;
  const canDocumentTracker = !!permissions?.perm_document_tracker_access;
  const canSeeAccount = !!permissions?.perm_account_management_access;
  const canCreateAccount = !!permissions?.perm_account_create;

  return (
    <View style={styles.drawerRoot} pointerEvents={pointerEvents}>
      <Animated.View style={[styles.drawerDim, { opacity: dimOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawerPanel,
          {
            paddingTop: Math.max(12, insets.top + 10),
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <View style={styles.drawerHeaderIcon}>
            <Icon name="menu" size={18} color={theme.colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.drawerTitle}>Menu</Text>
            <Text style={styles.drawerSub}>App Navigation Panel</Text>
          </View>

          <Pressable onPress={onClose} style={styles.iconBtn} accessibilityLabel="Close menu">
            <Icon name="close" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={{ height: 10 }} />

        <View style={styles.drawerList}>
          {canDashboard && (
            <>
              <Pressable
                onPress={onPressDashboard}
                style={[styles.menuItem, isDashboard && styles.menuItemActive]}
                accessibilityLabel="Open Dashboard"
              >
                <LinearGradient
                  colors={
                    isDashboard
                      ? ['rgba(41,182,255,0.18)', 'rgba(214,235,255,0.10)', 'rgba(255,255,255,0.04)']
                      : ['rgba(255,255,255,0)', 'rgba(255,255,255,0)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.menuActiveGlow, !isDashboard && styles.menuActiveGlowHidden]}
                />
                <View style={[styles.menuActiveRail, isDashboard && styles.menuActiveRailOn]} />
                <View style={[styles.menuItemIcon, isDashboard && styles.menuItemIconActive]}>
                  <Icon
                    name="view-dashboard-outline"
                    size={18}
                    color={isDashboard ? theme.colors.blue2 : theme.colors.textSecondary}
                  />
                </View>
                <Text style={[styles.menuItemText, isDashboard && styles.menuItemTextActive]}>Dashboard</Text>
              </Pressable>

              <View style={styles.menuDividerTop} />
            </>
          )}

          {canBrowse && (
            <>
              <Pressable
                onPress={onPressBrowseView}
                style={[styles.menuItem, isBrowseActive && styles.menuItemActive]}
                accessibilityLabel={`Open ${browseLabel}`}
              >
                <LinearGradient
                  colors={
                    isBrowseActive
                      ? ['rgba(41,182,255,0.18)', 'rgba(214,235,255,0.10)', 'rgba(255,255,255,0.04)']
                      : ['rgba(255,255,255,0)', 'rgba(255,255,255,0)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.menuActiveGlow, !isBrowseActive && styles.menuActiveGlowHidden]}
                />
                <View style={[styles.menuActiveRail, isBrowseActive && styles.menuActiveRailOn]} />
                <View style={[styles.menuItemIcon, isBrowseActive && styles.menuItemIconActive]}>
                  <Icon
                    name={browseIcon}
                    size={18}
                    color={isBrowseActive ? theme.colors.blue2 : theme.colors.textSecondary}
                  />
                </View>
                <Text style={[styles.menuItemText, isBrowseActive && styles.menuItemTextActive]}>{browseLabel}</Text>
                <View style={{ flex: 1 }} />
                {canToggleBrowseMode && (
                  <Pressable
                    onPress={onToggleBrowseMode}
                    hitSlop={10}
                    style={styles.modeSwitchBtn}
                    accessibilityLabel="Toggle browse mode"
                  >
                    <LinearGradient
                      colors={['rgba(41,182,255,0.18)', 'rgba(214,235,255,0.10)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modeSwitchGlow}
                    />
                    <Icon name="autorenew" size={18} color={theme.colors.blue} />
                  </Pressable>
                )}
              </Pressable>

              <View style={styles.menuDividerTop} />
            </>
          )}

          {canGasSensors && (
            <>
              <Pressable
                onPress={onPressGasSensors}
                style={[styles.menuItem, isGasSensors && styles.menuItemActive]}
                accessibilityLabel="Open Gas Sensor Monitoring"
              >
                <LinearGradient
                  colors={
                    isGasSensors
                      ? ['rgba(41,182,255,0.18)', 'rgba(214,235,255,0.10)', 'rgba(255,255,255,0.04)']
                      : ['rgba(255,255,255,0)', 'rgba(255,255,255,0)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.menuActiveGlow, !isGasSensors && styles.menuActiveGlowHidden]}
                />
                <View style={[styles.menuActiveRail, isGasSensors && styles.menuActiveRailOn]} />
                <View style={[styles.menuItemIcon, isGasSensors && styles.menuItemIconActive]}>
                  <Icon
                    name="cctv"
                    size={18}
                    color={isGasSensors ? theme.colors.blue2 : theme.colors.textSecondary}
                  />
                </View>
                <Text style={[styles.menuItemText, isGasSensors && styles.menuItemTextActive]}>Gas Sensor Monitoring</Text>
              </Pressable>

              <View style={styles.menuDividerTop} />
            </>
          )}

          {canDocumentTracker && (
            <>
              <Pressable
                onPress={onPressDocumentTracker}
                style={[styles.menuItem, isDocumentTracker && styles.menuItemActive]}
                accessibilityLabel="Open Document Tracker"
              >
                <LinearGradient
                  colors={
                    isDocumentTracker
                      ? ['rgba(41,182,255,0.18)', 'rgba(214,235,255,0.10)', 'rgba(255,255,255,0.04)']
                      : ['rgba(255,255,255,0)', 'rgba(255,255,255,0)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.menuActiveGlow, !isDocumentTracker && styles.menuActiveGlowHidden]}
                />
                <View style={[styles.menuActiveRail, isDocumentTracker && styles.menuActiveRailOn]} />
                <View style={[styles.menuItemIcon, isDocumentTracker && styles.menuItemIconActive]}>
                  <Icon
                    name="file-document-multiple-outline"
                    size={18}
                    color={isDocumentTracker ? theme.colors.blue2 : theme.colors.textSecondary}
                  />
                </View>
                <Text style={[styles.menuItemText, isDocumentTracker && styles.menuItemTextActive]}>Document Tracker</Text>
              </Pressable>
            </>
          )}

          {canSeeAccount && (
            <>
              <View style={styles.menuDividerTop} />
              <Pressable
                onPress={() => setAccountOpen((v) => !v)}
                style={[styles.menuItem, isAccountCreator && styles.menuItemActive]}
                accessibilityLabel="Account Management section"
              >
                <LinearGradient
                  colors={
                    isAccountCreator
                      ? ['rgba(41,182,255,0.18)', 'rgba(214,235,255,0.10)', 'rgba(255,255,255,0.04)']
                      : ['rgba(255,255,255,0)', 'rgba(255,255,255,0)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.menuActiveGlow, !isAccountCreator && styles.menuActiveGlowHidden]}
                />
                <View style={[styles.menuActiveRail, isAccountCreator && styles.menuActiveRailOn]} />
                <View style={[styles.menuItemIcon, isAccountCreator && styles.menuItemIconActive]}>
                  <Icon
                    name="account-cog-outline"
                    size={18}
                    color={isAccountCreator ? theme.colors.blue2 : theme.colors.textSecondary}
                  />
                </View>
                <Text style={[styles.menuItemText, isAccountCreator && styles.menuItemTextActive]}>Account Management</Text>
                <View style={{ flex: 1 }} />
                <Icon name={accountOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
              </Pressable>

              {accountOpen && canCreateAccount && (
                <View style={styles.menuChildrenWrap}>
                  <Pressable onPress={onPressAccountCreator} style={styles.menuChildItem}>
                    <View style={styles.menuChildBullet}>
                      <Icon name="account-plus-outline" size={16} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={styles.menuChildText}>Account Creator</Text>
                    <View style={{ flex: 1 }} />
                    <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function ModalShell({ visible, onRequestClose, title, subtitle, children, right, large = false }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onRequestClose} />
        <View
          style={[
            styles.modalCard,
            large && styles.modalCardLarge,
            {
              paddingTop: Math.max(12, insets.top + 10),
              paddingBottom: Math.max(14, insets.bottom + 12),
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>{title}</Text>
              {!!subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
            </View>

            <View style={styles.modalHeaderRight}>
              {right}
              <Pressable onPress={onRequestClose} style={styles.iconBtn} accessibilityLabel="Close modal">
                <Icon name="close" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={{ paddingBottom: 6 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DateField({ label, value, onPress }) {
  return (
    <View style={styles.dateFieldWrap}>
      <Text style={styles.dateFieldLabel}>{label}</Text>
      <Pressable style={styles.dateField} onPress={onPress} accessibilityRole="button">
        <Text style={[styles.dateFieldText, !value && styles.dateFieldPlaceholder]}>
          {value || `${label} (YYYY-MM-DD)`}
        </Text>
        <Icon name="calendar-month-outline" size={20} color={theme.colors.textMuted} />
      </Pressable>
    </View>
  );
}

function StatusBadge({ status }) {
  const cfg =
    status === 'valid'
      ? { bg: 'rgba(236,253,243,0.85)', color: '#0F8A43', border: 'rgba(11,143,62,0.16)', text: 'Valid' }
      : status === 'renewal'
        ? { bg: 'rgba(255,251,235,0.90)', color: '#B45309', border: 'rgba(245,158,11,0.18)', text: 'Renewal' }
        : { bg: 'rgba(254,242,242,0.92)', color: '#B91C1C', border: 'rgba(220,38,38,0.18)', text: 'Expired' };

  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.text}</Text>
    </View>
  );
}

function SummaryRow({ label, expired, renewal, valid }) {
  return (
    <View style={styles.summaryDocRow}>
      <Text style={styles.summaryDocTitle}>{label}</Text>
      <View style={styles.summaryDocCounts}>
        <View style={styles.summaryTinyPillDanger}><Text style={styles.summaryTinyPillTextDanger}>{expired}</Text></View>
        <View style={styles.summaryTinyPillWarn}><Text style={styles.summaryTinyPillTextWarn}>{renewal}</Text></View>
        <View style={styles.summaryTinyPillGood}><Text style={styles.summaryTinyPillTextGood}>{valid}</Text></View>
      </View>
    </View>
  );
}

const DocumentRow = React.memo(function DocumentRow({ item, onPressEdit, onPressDocs }) {
  const agg = item.__aggStatus;
  const counts = item.__counts || { expired: 0, renewal: 0, valid: 0 };
  const attached = item.__filesCount || 0;

  return (
    <View style={styles.documentRowWrap}>
      <Pressable style={styles.documentRow} onPress={() => onPressEdit(item)}>
        <View style={styles.documentRowTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.documentTitle} numberOfLines={2}>
              {item.building_name || item.building_code || item.sn || 'Untitled'}
            </Text>
            <Text style={styles.documentSub} numberOfLines={2}>
              SN {item.sn || '—'} · Code {item.building_code || '—'}
            </Text>
          </View>
          <StatusBadge status={agg} />
        </View>

        <View style={styles.documentMetaGrid}>
          <Text style={styles.documentMetaText}>Gas: {item.gas_type || '—'}</Text>
          <Text style={styles.documentMetaText}>Contractor: {item.gas_contractor || '—'}</Text>
          <Text style={styles.documentMetaText}>Plot: {item.plot || '—'}</Text>
          <Text style={styles.documentMetaText}>Sector: {item.sector || '—'}</Text>
        </View>

        <View style={styles.documentBottomRow}>
          <Text style={styles.documentBottomStat}>Expired: {counts.expired}</Text>
          <Text style={styles.documentBottomStat}>Renewal: {counts.renewal}</Text>
          <Text style={styles.documentBottomStat}>Valid: {counts.valid}</Text>
          <Text style={styles.documentBottomStat}>Files: {attached}/5</Text>
        </View>
      </Pressable>

      <View style={styles.documentActionsRow}>
        <Pressable style={styles.secondaryBtnHalf} onPress={() => onPressEdit(item)}>
          <Icon name="pencil-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.secondaryBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtnHalf} onPress={() => onPressDocs(item)}>
          <Icon name="file-document-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.secondaryBtnText}>Documents</Text>
        </Pressable>
      </View>
    </View>
  );
});

export default function DocumentTracker({ navigation }) {
  const insets = useSafeAreaInsets();
  const { viewMode, toggleViewMode } = useViewMode();
  const { permissions } = useAuthState();

  const [menuOpen, setMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDoc, setFilterDoc] = useState('all');
  const [error, setError] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const [summary, setSummary] = useState(emptySummary());
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [summaryMode, setSummaryMode] = useState('allValid');
  const [selectedRow, setSelectedRow] = useState(null);
  const [form, setForm] = useState(defaultForm());

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState('');
  const [activeDateValue, setActiveDateValue] = useState(new Date());

  const selectedRowIdRef = useRef(null);

  const canAccess = !!permissions?.perm_document_tracker_access;
  const canCreateSite = !!permissions?.perm_doc_create_site;
  const canEditMetadata = !!permissions?.perm_doc_edit_site_metadata;
  const canDeleteSite = !!permissions?.perm_doc_delete_site;
  const canManageAnyDocType = !!(
    permissions?.perm_doc_manage_istifaa ||
    permissions?.perm_doc_manage_amc ||
    permissions?.perm_doc_manage_doe_noc ||
    permissions?.perm_doc_manage_coc ||
    permissions?.perm_doc_manage_tpi
  );

  useEffect(() => {
    selectedRowIdRef.current = selectedRow?.id != null ? String(selectedRow.id) : null;
  }, [selectedRow]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [search]);

  const queryParams = useMemo(() => {
    return {
      q: debouncedSearch,
      status: filterStatus,
      docType: filterDoc,
      pageSize: PAGE_SIZE,
    };
  }, [debouncedSearch, filterDoc, filterStatus]);

  const summaryRows = useMemo(() => {
    if (summaryMode === 'allValid') return summary.allValidSites;
    if (summaryMode === 'allNotValid') return summary.allNotValidSites;
    if (summaryMode === 'renewalDocs') return summary.renewalDocs;
    return summary.expiredDocs;
  }, [summary, summaryMode]);

  const syncSelectedRowFromList = useCallback((nextRows, preferredId = null) => {
    const targetId = preferredId ?? selectedRowIdRef.current;
    if (!targetId) return;
    const fresh = nextRows.find((r) => String(r.id) === String(targetId)) || null;
    setSelectedRow(fresh);
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryError('');
    setSummaryLoading(true);
    try {
      const json = await api.documentSummary({
        q: queryParams.q,
        status: queryParams.status,
        docType: queryParams.docType,
      });

      setSummary(json || emptySummary());
    } catch (e) {
      setSummary(emptySummary());
      setSummaryError(e?.message || 'Failed to fetch tank documents summary.');
    } finally {
      setSummaryLoading(false);
    }
  }, [queryParams.docType, queryParams.q, queryParams.status]);

  const fetchPage = useCallback(async (page, { append = false } = {}) => {
    const json = await api.documentList(queryParams.q, {
      page,
      pageSize: queryParams.pageSize,
      status: queryParams.status,
      docType: queryParams.docType,
    });

    const list = Array.isArray(json?.rows) ? json.rows : [];
    const enriched = list.map(enrichRow);

    setRows((prev) => {
      const next = append ? [...prev, ...enriched] : enriched;
      syncSelectedRowFromList(next);
      return next;
    });

    const total = Number(json?.total || 0);
    const totalPages = Number(json?.totalPages || 1);
    const nextPage = Number(json?.page || page);
    const pageSize = Number(json?.pageSize || queryParams.pageSize);

    setPagination({
      page: nextPage,
      pageSize,
      total,
      totalPages,
      hasMore: nextPage < totalPages,
    });

    return enriched;
  }, [queryParams.docType, queryParams.pageSize, queryParams.q, queryParams.status, syncSelectedRowFromList]);

  const reloadAll = useCallback(async () => {
    if (!canAccess) {
      setRows([]);
      setSummary(emptySummary());
      setLoading(false);
      setSummaryLoading(false);
      return;
    }

    setError('');
    setLoading(true);

    const rowsPromise = fetchPage(1, { append: false });

    fetchSummary().catch(() => {});

    try {
      await rowsPromise;
    } catch (e) {
      setError(e?.message || 'Failed to load document tracker.');
    } finally {
      setLoading(false);
    }
  }, [canAccess, fetchPage, fetchSummary]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  async function onRefresh() {
    if (!canAccess) return;
    try {
      setRefreshing(true);
      await reloadAll();
    } catch (e) {
      setError(e?.message || 'Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (!canAccess || loading || loadingMore || !pagination.hasMore) return;
    try {
      setLoadingMore(true);
      await fetchPage(pagination.page + 1, { append: true });
    } catch (e) {
      setError(e?.message || 'Failed to load more items.');
    } finally {
      setLoadingMore(false);
    }
  }

  function setFormField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    if (!canCreateSite) {
      Alert.alert('Forbidden', 'Your account cannot create document tracker sites.');
      return;
    }
    setSelectedRow(null);
    setForm(defaultForm());
    setEditOpen(true);
  }

  const openEdit = useCallback((row) => {
    if (!canEditMetadata) {
      Alert.alert('Forbidden', 'Your account cannot edit document tracker site metadata.');
      return;
    }
    setSelectedRow(row);
    setForm(formFromRow(row));
    setEditOpen(true);
  }, [canEditMetadata]);

  const openDocs = useCallback((row) => {
    if (!canManageAnyDocType) {
      Alert.alert('Forbidden', 'Your account does not have any document type management permissions.');
      return;
    }
    setSelectedRow(row);
    setDocsOpen(true);
  }, [canManageAnyDocType]);

  function openDatePicker(fieldKey) {
    setActiveDateField(fieldKey);
    setActiveDateValue(isoToPickerDate(form[fieldKey]));
    setDatePickerOpen(true);
  }

  function handleDateChange(event, selectedDate) {
    if (Platform.OS === 'android') {
      setDatePickerOpen(false);
    }

    if (event?.type === 'dismissed') {
      return;
    }

    const chosen = selectedDate || activeDateValue || new Date();
    if (activeDateField) {
      setFormField(activeDateField, pickerDateToIso(chosen));
    }

    if (Platform.OS === 'ios') {
      setActiveDateValue(chosen);
    }
  }

  function confirmIosDate() {
    if (activeDateField) {
      setFormField(activeDateField, pickerDateToIso(activeDateValue));
    }
    setDatePickerOpen(false);
  }

  async function saveForm() {
    const payload = buildRowPayload(form);
    if (!payload.building_code && !payload.building_name) {
      Alert.alert('Missing required fields', 'Please enter building code or building name.');
      return;
    }

    try {
      setSaving(true);

      if (form.id) {
        if (!canEditMetadata) {
          Alert.alert('Forbidden', 'Your account cannot edit document tracker site metadata.');
          return;
        }

        const result = await api.documentUpdate(form.id, payload);
        const updatedRow = enrichRow(result?.row || result);

        setRows((prev) =>
          prev.map((row) => (String(row.id) === String(form.id) ? updatedRow : row))
        );
        setSelectedRow(updatedRow);
      } else {
        if (!canCreateSite) {
          Alert.alert('Forbidden', 'Your account cannot create document tracker sites.');
          return;
        }

        await api.documentCreate(payload);
        await reloadAll();
      }

      fetchSummary().catch(() => {});

      setEditOpen(false);
      setForm(defaultForm());
      Alert.alert('Success', 'Document tracker record saved.');
    } catch (e) {
      Alert.alert('Save failed', e?.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentRow() {
    if (!form.id) return;
    if (!canDeleteSite) {
      Alert.alert('Forbidden', 'Your account cannot delete document tracker sites.');
      return;
    }

    Alert.alert('Delete record', 'Are you sure you want to delete this document tracker entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await api.documentDelete(form.id);
            setRows((prev) => prev.filter((row) => String(row.id) !== String(form.id)));
            setPagination((prev) => ({
              ...prev,
              total: Math.max(0, prev.total - 1),
            }));
            setEditOpen(false);
            setSelectedRow(null);
            setForm(defaultForm());
            fetchSummary().catch(() => {});
            Alert.alert('Deleted', 'Entry deleted successfully.');
          } catch (e) {
            Alert.alert('Delete failed', e?.message || 'Unknown error');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  function canManageDocType(type) {
    const map = {
      istifaa: !!permissions?.perm_doc_manage_istifaa,
      amc: !!permissions?.perm_doc_manage_amc,
      doe_noc: !!permissions?.perm_doc_manage_doe_noc,
      coc: !!permissions?.perm_doc_manage_coc,
      tpi: !!permissions?.perm_doc_manage_tpi,
    };
    return !!map[type];
  }

  async function uploadDocFile(type) {
    if (!selectedRow?.id) return;
    if (!canManageDocType(type)) {
      Alert.alert('Forbidden', `Your account cannot manage ${type.toUpperCase()} files.`);
      return;
    }
    Alert.alert(
      'Upload file',
      `Upload for ${type.toUpperCase()} requires a native picker integration. If you want, next I can wire it to a picker library.`
    );
  }

  async function deleteDocFile(type) {
    if (!selectedRow?.id) return;
    if (!canManageDocType(type)) {
      Alert.alert('Forbidden', `Your account cannot manage ${type.toUpperCase()} files.`);
      return;
    }

    Alert.alert(`Delete ${type.toUpperCase()} file`, 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.documentDeleteFile(selectedRow.id, type);

            setRows((prev) => {
              const next = prev.map((row) => {
                if (String(row.id) !== String(selectedRow.id)) return row;
                const updated = {
                  ...row,
                  [`${type}_has_file`]: false,
                  [`${type}_file_name`]: '',
                  [`${type}_file_uploaded_at`]: '',
                };
                return enrichRow(updated);
              });

              const fresh = next.find((r) => String(r.id) === String(selectedRow.id)) || null;
              setSelectedRow(fresh);
              return next;
            });

            fetchSummary().catch(() => {});
            Alert.alert('Deleted', 'File deleted successfully.');
          } catch (e) {
            Alert.alert('Delete failed', e?.message || 'Unknown error');
          }
        },
      },
    ]);
  }

  async function openDocFile(type) {
    if (!selectedRow?.id) return;
    if (!canManageDocType(type)) {
      Alert.alert('Forbidden', `Your account cannot access ${type.toUpperCase()} files.`);
      return;
    }

    try {
      const url = api.documentFileUrl(selectedRow.id, type);
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert('Cannot open', 'Unable to open this file URL on the device.');
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Open failed', e?.message || 'Unknown error');
    }
  }

  function handleToggleBrowseMode() {
    toggleViewMode();
  }

  function openSummary(mode) {
    setSummaryMode(mode);
    setSummaryOpen(true);
  }

  const renderDocumentRow = useCallback(({ item }) => {
    return (
      <DocumentRow
        item={item}
        onPressEdit={openEdit}
        onPressDocs={openDocs}
      />
    );
  }, [openDocs, openEdit]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  const listHeader = useMemo(() => (
    <>
      <View style={{ marginBottom: 14 }}>
        <View style={styles.heroShell}>
          <LinearGradient
            colors={['rgba(255,255,255,0.88)', 'rgba(255,255,255,0.60)', 'rgba(246,248,251,0.42)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroFrame}
          >
            <View style={styles.heroTopLine} />
            <View style={styles.heroCornerOrb} />
            <View style={styles.heroLowerGlow} />
            <View style={styles.heroBlueBeam} />
            <View style={styles.heroGreenBeam} />

            <View style={styles.heroInner}>
              <LinearGradient
                colors={[
                  'rgba(80,220,255,0.14)',
                  'rgba(170,255,120,0.10)',
                  'rgba(255,255,255,0.05)',
                ]}
                locations={[0, 0.48, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.50)',
                  'rgba(255,255,255,0.08)',
                  'rgba(255,255,255,0.00)',
                ]}
                locations={[0, 0.36, 1]}
                start={{ x: 0.05, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.heroSheen}
                pointerEvents="none"
              />

              <View style={styles.heroPlateBorder}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroLeftBlock}>
                    <Pressable
                      onPress={() => setMenuOpen(true)}
                      style={styles.heroIconPill}
                      accessibilityLabel="Open menu"
                      hitSlop={10}
                    >
                      <LinearGradient
                        colors={['rgba(255,255,255,0.74)', 'rgba(214,235,255,0.24)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <Icon name="menu" size={20} color={theme.colors.textSecondary} />
                    </Pressable>

                    <View style={styles.heroTitleWrap}>
                      <Text style={styles.heroTitle}>Document Tracker</Text>
                    </View>
                  </View>

                  <View style={styles.heroLogoWrap}>
                    <View style={styles.heroLogoHaloOuter} />
                    <View style={styles.heroLogoHaloInner} />
                    <LinearGradient
                      colors={['rgba(255,255,255,0.42)', 'rgba(214,235,255,0.18)', 'rgba(236,253,243,0.14)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.heroLogoGlass}
                    >
                      <View style={styles.heroLogoRing} />
                      <Image
                        source={require('../Components/Static/ALFLogo2.png')}
                        style={styles.headerLogo}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                  </View>
                </View>

                <View style={styles.heroBottomRule} />

                <View style={styles.heroSitesShowcaseWrap}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.86)', 'rgba(214,235,255,0.18)', 'rgba(255,255,255,0.42)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroSitesShowcase}
                  >
                    <View style={styles.heroSitesAuraA} />
                    <View style={styles.heroSitesAuraB} />
                    <View style={styles.heroSitesAuraC} />
                    <View style={styles.heroSitesInnerRing} />
                    <LinearGradient
                      colors={['rgba(255,255,255,0.52)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.00)']}
                      locations={[0, 0.45, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.heroSitesSheen}
                    />
                    <View style={styles.heroSitesCenter}>
                      <Text style={styles.heroSitesValue}>
                        {summaryLoading ? '…' : summary.totalSites || 0}
                      </Text>
                      <Text style={styles.heroSitesLabel}>Sites</Text>
                    </View>
                  </LinearGradient>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>

      {!!error && (
        <WowCard
          gradient={['rgba(254,242,242,0.80)', 'rgba(255,255,255,0.72)']}
          stroke="rgba(220,38,38,0.22)"
          style={{ marginBottom: 12 }}
        >
          <Text style={styles.errTitle}>Couldn’t load document tracker</Text>
          <Text style={styles.errText}>{error}</Text>
        </WowCard>
      )}

      {!!summaryError && (
        <WowCard
          gradient={['rgba(255,251,235,0.90)', 'rgba(255,255,255,0.72)']}
          stroke="rgba(245,158,11,0.22)"
          style={{ marginBottom: 12 }}
        >
          <Text style={styles.warnTitle}>Summary unavailable</Text>
          <Text style={styles.errText}>{summaryError}</Text>
        </WowCard>
      )}

      <WowCard style={styles.panel}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
          {canCreateSite && (
            <Pressable style={styles.primaryAction} onPress={openCreate}>
              <Icon name="plus" size={18} color="#fff" />
              <Text style={styles.primaryActionText}>Add</Text>
            </Pressable>
          )}
        </View>

        {summaryLoading ? (
          <SkeletonCard />
        ) : (
          <View>
            <SummaryRow
              label="ISTIFAA"
              expired={summary.byDoc.istifaa.expired + summary.byDoc.istifaa.unknown}
              renewal={summary.byDoc.istifaa.renewal}
              valid={summary.byDoc.istifaa.valid}
            />
            <SummaryRow
              label="AMC"
              expired={summary.byDoc.amc.expired + summary.byDoc.amc.unknown}
              renewal={summary.byDoc.amc.renewal}
              valid={summary.byDoc.amc.valid}
            />
            <SummaryRow
              label="DOE NOC"
              expired={summary.byDoc.doe_noc.expired + summary.byDoc.doe_noc.unknown}
              renewal={summary.byDoc.doe_noc.renewal}
              valid={summary.byDoc.doe_noc.valid}
            />
            <SummaryRow
              label="COC"
              expired={summary.byDoc.coc.expired + summary.byDoc.coc.unknown}
              renewal={summary.byDoc.coc.renewal}
              valid={summary.byDoc.coc.valid}
            />
            <SummaryRow
              label="TPI"
              expired={summary.byDoc.tpi.expired + summary.byDoc.tpi.unknown}
              renewal={summary.byDoc.tpi.renewal}
              valid={summary.byDoc.tpi.valid}
            />

            <View style={styles.summaryActionsGrid}>
              <Pressable
                style={[styles.summaryActionBtn, styles.summaryActionBtnGood]}
                onPress={() => openSummary('allValid')}
              >
                <Text style={[styles.summaryActionTitle, styles.summaryActionTitleGood]}>All Documents Valid</Text>
                <Text style={[styles.summaryActionSub, styles.summaryActionSubGood]}>{summary.allValidSites.length} sites</Text>
              </Pressable>

              <Pressable
                style={[styles.summaryActionBtn, styles.summaryActionBtnDanger]}
                onPress={() => openSummary('allNotValid')}
              >
                <Text style={[styles.summaryActionTitle, styles.summaryActionTitleDanger]}>All Documents Not Valid</Text>
                <Text style={[styles.summaryActionSub, styles.summaryActionSubDanger]}>{summary.allNotValidSites.length} sites</Text>
              </Pressable>

              <Pressable
                style={[styles.summaryActionBtn, styles.summaryActionBtnWarn]}
                onPress={() => openSummary('renewalDocs')}
              >
                <Text style={[styles.summaryActionTitle, styles.summaryActionTitleWarn]}>Documents Under Renewal</Text>
                <Text style={[styles.summaryActionSub, styles.summaryActionSubWarn]}>{summary.totalDocsRenewal} documents</Text>
              </Pressable>

              <Pressable
                style={[styles.summaryActionBtn, styles.summaryActionBtnDanger]}
                onPress={() => openSummary('expiredDocs')}
              >
                <Text style={[styles.summaryActionTitle, styles.summaryActionTitleDanger]}>Total Documents Expired</Text>
                <Text style={[styles.summaryActionSub, styles.summaryActionSubDanger]}>{summary.totalDocsExpired} documents</Text>
              </Pressable>
            </View>
          </View>
        )}
      </WowCard>

      <WowCard style={styles.panel}>
        <Text style={styles.sectionTitle}>Filters</Text>

        <View style={{ height: 12 }} />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by Name, SN, Code."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterPill, filterStatus === 'all' && styles.filterPillActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterPillText, filterStatus === 'all' && styles.filterPillTextActive]}>All</Text>
          </Pressable>
          <Pressable
            style={[styles.filterPill, filterStatus === 'valid' && styles.filterPillActive]}
            onPress={() => setFilterStatus('valid')}
          >
            <Text style={[styles.filterPillText, filterStatus === 'valid' && styles.filterPillTextActive]}>Valid</Text>
          </Pressable>
          <Pressable
            style={[styles.filterPill, filterStatus === 'renewal' && styles.filterPillActive]}
            onPress={() => setFilterStatus('renewal')}
          >
            <Text style={[styles.filterPillText, filterStatus === 'renewal' && styles.filterPillTextActive]}>Renewal</Text>
          </Pressable>
          <Pressable
            style={[styles.filterPill, filterStatus === 'expired' && styles.filterPillActive]}
            onPress={() => setFilterStatus('expired')}
          >
            <Text style={[styles.filterPillText, filterStatus === 'expired' && styles.filterPillTextActive]}>Expired</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={styles.docTypeRow}>
            <Pressable
              style={[styles.filterPill, filterDoc === 'all' && styles.filterPillActive]}
              onPress={() => setFilterDoc('all')}
            >
              <Text style={[styles.filterPillText, filterDoc === 'all' && styles.filterPillTextActive]}>All Docs</Text>
            </Pressable>
            {DOC_TYPES.map((doc) => (
              <Pressable
                key={doc.key}
                style={[styles.filterPill, filterDoc === doc.key && styles.filterPillActive]}
                onPress={() => setFilterDoc(doc.key)}
              >
                <Text style={[styles.filterPillText, filterDoc === doc.key && styles.filterPillTextActive]}>
                  {doc.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </WowCard>

      <WowCard style={styles.panel}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Projects List</Text>
          <Text style={styles.sectionRightText}>{pagination.total} total</Text>
        </View>

        {loading && (
          <View>
            <SkeletonBlock height={112} width="100%" radius={18} />
            <View style={{ height: 10 }} />
            <SkeletonBlock height={112} width="100%" radius={18} />
            <View style={{ height: 10 }} />
            <SkeletonBlock height={112} width="100%" radius={18} />
          </View>
        )}

        {!loading && rows.length === 0 && (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No document tracker entries found.</Text>
          </View>
        )}
      </WowCard>
    </>
  ), [
    canCreateSite,
    error,
    filterDoc,
    filterStatus,
    loading,
    openCreate,
    pagination.total,
    search,
    summary,
    summaryError,
    summaryLoading,
  ]);

  const listFooter = useMemo(() => {
    if (!loadingMore) return <View style={{ height: 8 }} />;
    return (
      <View style={styles.loadMoreWrap}>
        <ActivityIndicator color={theme.colors.blue} />
        <Text style={styles.loadMoreText}>Loading more…</Text>
      </View>
    );
  }, [loadingMore]);

  const headerTopPad = Math.max(12, insets.top + 10);

  if (!canAccess) {
    return (
      <LinearGradient colors={[theme.colors.bgA, theme.colors.bgB]} style={styles.screen}>
        <MenuDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onPressDashboard={() => {
            setMenuOpen(false);
            navigation.navigate('Dashboard');
          }}
          onPressBrowseView={() => {
            setMenuOpen(false);
            navigation.navigate(viewMode === 'command' ? 'CommandView' : 'ListView');
          }}
          onPressGasSensors={() => {
            setMenuOpen(false);
            navigation.navigate('GasSensors');
          }}
          onPressDocumentTracker={() => {
            setMenuOpen(false);
          }}
          onPressAccountCreator={() => {
            setMenuOpen(false);
            navigation.navigate('AccountCreator');
          }}
          onToggleBrowseMode={handleToggleBrowseMode}
          currentRoute="DocumentTracker"
          viewMode={viewMode}
          permissions={permissions || {}}
        />

        <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerTopPad, paddingBottom: 28 }]}>
          <View style={{ marginBottom: 14 }}>
            <View style={styles.heroShell}>
              <LinearGradient
                colors={['rgba(255,255,255,0.88)', 'rgba(255,255,255,0.60)', 'rgba(246,248,251,0.42)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroFrame}
              >
                <View style={styles.heroTopLine} />
                <View style={styles.heroCornerOrb} />
                <View style={styles.heroLowerGlow} />
                <View style={styles.heroBlueBeam} />
                <View style={styles.heroGreenBeam} />

                <View style={styles.heroInner}>
                  <LinearGradient
                    colors={[
                      'rgba(80,220,255,0.14)',
                      'rgba(170,255,120,0.10)',
                      'rgba(255,255,255,0.05)',
                    ]}
                    locations={[0, 0.48, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />

                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0.50)',
                      'rgba(255,255,255,0.08)',
                      'rgba(255,255,255,0.00)',
                    ]}
                    locations={[0, 0.36, 1]}
                    start={{ x: 0.05, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.heroSheen}
                    pointerEvents="none"
                  />

                  <View style={styles.heroPlateBorder}>
                    <View style={styles.heroTopRow}>
                      <View style={styles.heroLeftBlock}>
                        <Pressable
                          onPress={() => setMenuOpen(true)}
                          style={styles.heroIconPill}
                          accessibilityLabel="Open menu"
                          hitSlop={10}
                        >
                          <LinearGradient
                            colors={['rgba(255,255,255,0.74)', 'rgba(214,235,255,0.24)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                          <Icon name="menu" size={20} color={theme.colors.textSecondary} />
                        </Pressable>

                        <View style={styles.heroTitleWrap}>
                          <Text style={styles.heroTitle}>Document Tracker</Text>
                        </View>
                      </View>

                      <View style={styles.heroLogoWrap}>
                        <View style={styles.heroLogoHaloOuter} />
                        <View style={styles.heroLogoHaloInner} />
                        <LinearGradient
                          colors={['rgba(255,255,255,0.42)', 'rgba(214,235,255,0.18)', 'rgba(236,253,243,0.14)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.heroLogoGlass}
                        >
                          <View style={styles.heroLogoRing} />
                          <Image
                            source={require('../Components/Static/ALFLogo2.png')}
                            style={styles.headerLogo}
                            resizeMode="contain"
                          />
                        </LinearGradient>
                      </View>
                    </View>

                    <View style={styles.heroBottomRule} />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          <WowCard>
            <Text style={styles.errTitle}>Access denied</Text>
            <Text style={styles.errText}>Your account does not have permission to access Document Tracker.</Text>
          </WowCard>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[theme.colors.bgA, theme.colors.bgB]} style={styles.screen}>
      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onPressDashboard={() => {
          setMenuOpen(false);
          navigation.navigate('Dashboard');
        }}
        onPressBrowseView={() => {
          setMenuOpen(false);
          navigation.navigate(viewMode === 'command' ? 'CommandView' : 'ListView');
        }}
        onPressGasSensors={() => {
          setMenuOpen(false);
          navigation.navigate('GasSensors');
        }}
        onPressDocumentTracker={() => {
          setMenuOpen(false);
        }}
        onPressAccountCreator={() => {
          setMenuOpen(false);
          navigation.navigate('AccountCreator');
        }}
        onToggleBrowseMode={handleToggleBrowseMode}
        currentRoute="DocumentTracker"
        viewMode={viewMode}
        permissions={permissions || {}}
      />

      <FlatList
        data={loading ? [] : rows}
        keyExtractor={keyExtractor}
        renderItem={renderDocumentRow}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerTopPad,
            paddingBottom: Math.max(18, insets.bottom + 18),
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={LIST_INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={LIST_MAX_TO_RENDER_PER_BATCH}
        windowSize={LIST_WINDOW_SIZE}
        removeClippedSubviews
        onEndReachedThreshold={0.35}
        onEndReached={loadMore}
      />

      <ModalShell
        visible={editOpen}
        onRequestClose={() => !saving && setEditOpen(false)}
        title={form.id ? 'Edit Site & Expiry' : 'Add Site'}
        subtitle={form.id ? `Record #${form.id}` : 'Create new tracker site'}
        right={
          form.id && canDeleteSite ? (
            <Pressable onPress={deleteCurrentRow} style={styles.iconBtn} accessibilityLabel="Delete entry">
              <Icon name="delete-outline" size={20} color={theme.colors.red} />
            </Pressable>
          ) : null
        }
        large
      >
        <Text style={styles.formSectionTitle}>Site & Position</Text>

        <TextInput style={styles.input} placeholder="Facility Type" placeholderTextColor={theme.colors.textMuted} value={form.building_type} onChangeText={(v) => setFormField('building_type', v)} />
        <TextInput style={styles.input} placeholder="Building Code" placeholderTextColor={theme.colors.textMuted} value={form.building_code} onChangeText={(v) => setFormField('building_code', v)} />
        <TextInput style={styles.input} placeholder="Building Name" placeholderTextColor={theme.colors.textMuted} value={form.building_name} onChangeText={(v) => setFormField('building_name', v)} />
        <TextInput style={styles.input} placeholder="Gas Type" placeholderTextColor={theme.colors.textMuted} value={form.gas_type} onChangeText={(v) => setFormField('gas_type', v)} />
        <TextInput style={styles.input} placeholder="Gas Contractor" placeholderTextColor={theme.colors.textMuted} value={form.gas_contractor} onChangeText={(v) => setFormField('gas_contractor', v)} />
        <TextInput style={styles.input} placeholder="Plot" placeholderTextColor={theme.colors.textMuted} value={form.plot} onChangeText={(v) => setFormField('plot', v)} />
        <TextInput style={styles.input} placeholder="Sector" placeholderTextColor={theme.colors.textMuted} value={form.sector} onChangeText={(v) => setFormField('sector', v)} />
        <TextInput style={styles.input} placeholder="Latitude" placeholderTextColor={theme.colors.textMuted} value={form.latitude} onChangeText={(v) => setFormField('latitude', v)} />
        <TextInput style={styles.input} placeholder="Longitude" placeholderTextColor={theme.colors.textMuted} value={form.longitude} onChangeText={(v) => setFormField('longitude', v)} />
        <TextInput style={styles.input} placeholder="Notes" placeholderTextColor={theme.colors.textMuted} value={form.notes} onChangeText={(v) => setFormField('notes', v)} multiline />

        <Text style={[styles.formSectionTitle, { marginTop: 16 }]}>Expiry Dates</Text>

        <DateField
          label="ISTIFAA Expiry Date"
          value={form.istifaa_expiry_date}
          onPress={() => openDatePicker('istifaa_expiry_date')}
        />
        <DateField
          label="AMC Expiry Date"
          value={form.amc_expiry_date}
          onPress={() => openDatePicker('amc_expiry_date')}
        />
        <DateField
          label="DOE NOC Expiry Date"
          value={form.doe_noc_expiry_date}
          onPress={() => openDatePicker('doe_noc_expiry_date')}
        />
        <DateField
          label="COC Expiry Date"
          value={form.coc_expiry_date}
          onPress={() => openDatePicker('coc_expiry_date')}
        />
        <DateField
          label="TPI Expiry Date"
          value={form.tpi_expiry_date}
          onPress={() => openDatePicker('tpi_expiry_date')}
        />

        <Pressable style={[styles.primarySaveBtn, saving && { opacity: 0.6 }]} onPress={saveForm} disabled={saving}>
          <Icon name="content-save-outline" size={18} color="#fff" />
          <Text style={styles.primarySaveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </Pressable>
      </ModalShell>

      <ModalShell
        visible={docsOpen}
        onRequestClose={() => setDocsOpen(false)}
        title="Documents"
        subtitle={selectedRow ? `${selectedRow.building_name || selectedRow.building_code || selectedRow.sn}` : ''}
        large
      >
        {!selectedRow ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No record selected.</Text>
          </View>
        ) : (
          DOC_TYPES
            .filter((doc) => canManageDocType(doc.key))
            .map((doc) => {
              const hasFile = !!selectedRow[`${doc.key}_has_file`];
              const fileName = selectedRow[`${doc.key}_file_name`] || '';
              const uploadedAt = selectedRow[`${doc.key}_file_uploaded_at`] || '';

              return (
                <View key={doc.key} style={styles.docCard}>
                  <Text style={styles.docCardTitle}>{doc.label}</Text>
                  <Text style={styles.docCardSub}>Expiry: {fmtDate(selectedRow[`${doc.key}_expiry_date`])}</Text>
                  <Text style={styles.docCardSub}>
                    File: {hasFile ? fileName || 'Attached' : 'No file uploaded'}
                  </Text>
                  <Text style={styles.docCardSub}>
                    Uploaded: {uploadedAt ? fmtDate(uploadedAt) : '—'}
                  </Text>

                  <View style={styles.docActionRow}>
                    <Pressable style={styles.secondaryBtn} onPress={() => uploadDocFile(doc.key)}>
                      <Icon name="upload-outline" size={18} color={theme.colors.textSecondary} />
                      <Text style={styles.secondaryBtnText}>Upload</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.secondaryBtn, !hasFile && styles.secondaryBtnDisabled]}
                      onPress={() => hasFile && openDocFile(doc.key)}
                      disabled={!hasFile}
                    >
                      <Icon name="open-in-new" size={18} color={hasFile ? theme.colors.textSecondary : theme.colors.textMuted} />
                      <Text style={[styles.secondaryBtnText, !hasFile && { color: theme.colors.textMuted }]}>Open</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.secondaryBtn, !hasFile && styles.secondaryBtnDisabled]}
                      onPress={() => hasFile && deleteDocFile(doc.key)}
                      disabled={!hasFile}
                    >
                      <Icon name="delete-outline" size={18} color={hasFile ? theme.colors.red : theme.colors.textMuted} />
                      <Text style={[styles.secondaryBtnText, !hasFile && { color: theme.colors.textMuted }]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
        )}

        {selectedRow && !DOC_TYPES.some((doc) => canManageDocType(doc.key)) && (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Your account does not have any document type management permissions.</Text>
          </View>
        )}
      </ModalShell>

      <ModalShell
        visible={summaryOpen}
        onRequestClose={() => setSummaryOpen(false)}
        title={
          summaryMode === 'allValid'
            ? 'All Documents Valid'
            : summaryMode === 'allNotValid'
              ? 'All Documents Not Valid'
              : summaryMode === 'renewalDocs'
                ? 'Documents Under Renewal'
                : 'Expired Documents'
        }
        subtitle={`${summaryRows.length} records`}
        large
      >
        {summaryRows.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No matching records.</Text>
          </View>
        ) : summaryMode === 'allValid' || summaryMode === 'allNotValid' ? (
          summaryRows.map((row) => (
            <View key={String(row.id)} style={styles.summaryListRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryListTitle}>{row.building_name || row.building_code || row.sn}</Text>
                <Text style={styles.summaryListSub}>
                  SN {row.sn || '—'} · Code {row.building_code || '—'}
                </Text>
              </View>
              <StatusBadge status={row.__aggStatus || aggregatedStatus(row)} />
            </View>
          ))
        ) : (
          summaryRows.map((row, idx) => (
            <View key={`${row.id}-${row.document_type}-${idx}`} style={styles.summaryListRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryListTitle}>{row.building_name || row.building_code || row.sn}</Text>
                <Text style={styles.summaryListSub}>
                  {row.document_type} · Expiry {fmtDate(row.expiry_date)}
                </Text>
              </View>
              <StatusBadge status={row.status === 'renewal' ? 'renewal' : 'expired'} />
            </View>
          ))
        )}
      </ModalShell>

      {datePickerOpen && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible={datePickerOpen} onRequestClose={() => setDatePickerOpen(false)}>
            <View style={styles.dateModalOverlay}>
              <Pressable style={styles.dateModalBackdrop} onPress={() => setDatePickerOpen(false)} />
              <View style={styles.dateModalCard}>
                <View style={styles.dateModalHeader}>
                  <Text style={styles.dateModalTitle}>Select Date</Text>
                  <Pressable onPress={confirmIosDate} style={styles.dateDoneBtn}>
                    <Text style={styles.dateDoneBtnText}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={activeDateValue}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={activeDateValue}
            mode="date"
            display="calendar"
            onChange={handleDateChange}
          />
        )
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },

  heroShell: {
    borderRadius: 30,
    shadowColor: '#0B1220',
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  heroFrame: {
    borderRadius: 30,
    padding: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.56)',
  },
  heroTopLine: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
    zIndex: 4,
  },
  heroCornerOrb: {
    position: 'absolute',
    top: -18,
    right: -10,
    width: 130,
    height: 130,
    borderRadius: 130,
    backgroundColor: 'rgba(214,235,255,0.38)',
    zIndex: 0,
  },
  heroLowerGlow: {
    position: 'absolute',
    bottom: -30,
    left: -8,
    width: 150,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    opacity: 0.42,
    zIndex: 0,
  },
  heroBlueBeam: {
    position: 'absolute',
    right: 52,
    top: 18,
    width: 120,
    height: 120,
    borderRadius: 120,
    backgroundColor: 'rgba(41,182,255,0.12)',
  },
  heroGreenBeam: {
    position: 'absolute',
    right: 26,
    top: 10,
    width: 92,
    height: 92,
    borderRadius: 92,
    backgroundColor: 'rgba(130,255,80,0.12)',
  },
  heroInner: {
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.46)',
  },
  heroSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '78%',
  },
  heroPlateBorder: {
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroLeftBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  heroTitle: {
    marginTop: 3,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: 0.24,
  },
  heroLogoWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroLogoHaloOuter: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 94,
    backgroundColor: 'rgba(41,182,255,0.18)',
    transform: [{ scale: 1.06 }],
  },
  heroLogoHaloInner: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 76,
    backgroundColor: 'rgba(130,255,80,0.16)',
    transform: [{ translateX: 4 }, { translateY: -4 }],
  },
  heroLogoGlass: {
    width: 88,
    height: 88,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#29B6FF',
    shadowOpacity: 0.20,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroLogoRing: {
    position: 'absolute',
    inset: 6,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(41,182,255,0.18)',
  },
  headerLogo: {
    width: 78,
    height: 78,
  },
  heroBottomRule: {
    marginTop: 14,
    marginBottom: 14,
    height: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  heroIconPill: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: 'rgba(255,255,255,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0B1220',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  heroSitesShowcaseWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  heroSitesShowcase: {
    width: '100%',
    minHeight: 132,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#29B6FF',
    shadowOpacity: 0.20,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  heroSitesAuraA: {
    position: 'absolute',
    top: -34,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 150,
    backgroundColor: 'rgba(41,182,255,0.18)',
  },
  heroSitesAuraB: {
    position: 'absolute',
    right: -24,
    bottom: -34,
    width: 155,
    height: 155,
    borderRadius: 155,
    backgroundColor: 'rgba(130,255,80,0.12)',
  },
  heroSitesAuraC: {
    position: 'absolute',
    top: 18,
    right: 34,
    width: 70,
    height: 70,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  heroSitesInnerRing: {
    position: 'absolute',
    top: 9,
    left: 9,
    right: 9,
    bottom: 9,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  heroSitesSheen: {
    position: 'absolute',
    top: 0,
    left: -20,
    width: '62%',
    height: '100%',
    opacity: 0.9,
    transform: [{ skewX: '-10deg' }],
  },
  heroSitesCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    zIndex: 2,
  },
  heroSitesValue: {
    fontSize: 46,
    lineHeight: 50,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: 0.6,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  heroSitesLabel: {
    marginTop: 5,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    color: '#0B4E8A',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  panel: { marginBottom: 12 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    color: theme.colors.text,
  },
  sectionRightText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    color: theme.colors.textMuted,
  },

  primaryAction: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.blue,
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },

  summaryDocRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryDocTitle: {
    fontWeight: '900',
    color: theme.colors.text,
    fontSize: 14,
  },
  summaryDocCounts: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryTinyPillDanger: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(254,242,242,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.16)',
    alignItems: 'center',
  },
  summaryTinyPillWarn: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,251,235,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.16)',
    alignItems: 'center',
  },
  summaryTinyPillGood: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(236,253,243,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(11,143,62,0.16)',
    alignItems: 'center',
  },
  summaryTinyPillTextDanger: {
    color: theme.colors.red,
    fontWeight: '900',
    fontSize: 12,
  },
  summaryTinyPillTextWarn: {
    color: theme.colors.orange,
    fontWeight: '900',
    fontSize: 12,
  },
  summaryTinyPillTextGood: {
    color: theme.colors.green,
    fontWeight: '900',
    fontSize: 12,
  },

  summaryActionsGrid: {
    marginTop: 14,
    gap: 10,
  },
  summaryActionBtn: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  summaryActionBtnGood: {
    borderColor: 'rgba(11,143,62,0.18)',
    backgroundColor: 'rgba(236,253,243,0.82)',
  },
  summaryActionBtnWarn: {
    borderColor: 'rgba(245,158,11,0.18)',
    backgroundColor: 'rgba(255,251,235,0.88)',
  },
  summaryActionBtnDanger: {
    borderColor: 'rgba(220,38,38,0.18)',
    backgroundColor: 'rgba(254,242,242,0.84)',
  },
  summaryActionTitle: {
    fontWeight: '900',
    fontSize: 14,
  },
  summaryActionSub: {
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
  },
  summaryActionTitleGood: {
    color: theme.colors.green,
  },
  summaryActionSubGood: {
    color: theme.colors.green,
  },
  summaryActionTitleWarn: {
    color: theme.colors.orange,
  },
  summaryActionSubWarn: {
    color: theme.colors.orange,
  },
  summaryActionTitleDanger: {
    color: theme.colors.red,
  },
  summaryActionSubDanger: {
    color: theme.colors.red,
  },

  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 10,
  },

  dateFieldWrap: {
    marginBottom: 10,
  },
  dateFieldLabel: {
    marginBottom: 8,
    color: theme.colors.textMuted,
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 18,
  },
  dateField: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateFieldText: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  dateFieldPlaceholder: {
    color: theme.colors.textMuted,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docTypeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  filterPill: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: 'rgba(214,235,255,0.62)',
    borderColor: 'rgba(22,119,200,0.18)',
  },
  filterPillText: {
    color: theme.colors.textSecondary,
    fontWeight: '900',
    fontSize: 12,
  },
  filterPillTextActive: {
    color: theme.colors.blue,
  },

  documentRowWrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.68)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  documentRow: {
    padding: 14,
  },
  documentRowTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  documentTitle: {
    fontWeight: '900',
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  documentSub: {
    marginTop: 5,
    fontWeight: '800',
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  documentMetaGrid: {
    marginTop: 10,
    gap: 4,
  },
  documentMetaText: {
    color: theme.colors.textSecondary,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 16,
  },
  documentBottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  documentBottomStat: {
    color: theme.colors.textMuted,
    fontWeight: '900',
    fontSize: 12,
  },
  documentActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  secondaryBtnHalf: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnDisabled: {
    opacity: 0.5,
  },
  secondaryBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '900',
    fontSize: 13,
  },

  statusBadge: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontWeight: '900',
    fontSize: 12,
  },

  drawerRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  drawerDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.26)',
  },
  drawerPanel: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    width: 292,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 14,
    paddingBottom: 16,
    ...theme.shadow.sheet,
    zIndex: 10000,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.70)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    color: theme.colors.text,
  },
  drawerSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  drawerList: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    backgroundColor: 'rgba(255,255,255,0.72)',
    overflow: 'hidden',
  },
  menuItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 54,
    overflow: 'hidden',
  },
  menuItemActive: {
    backgroundColor: 'rgba(214,235,255,0.08)',
  },
  menuActiveGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  menuActiveGlowHidden: {
    opacity: 0,
  },
  menuActiveRail: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 999,
    backgroundColor: 'transparent',
    marginRight: 2,
  },
  menuActiveRailOn: {
    backgroundColor: '#29B6FF',
    shadowColor: '#29B6FF',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  menuItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.70)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemIconActive: {
    borderColor: 'rgba(41,182,255,0.24)',
    backgroundColor: 'rgba(214,235,255,0.52)',
    shadowColor: '#29B6FF',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  menuItemText: {
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    flexShrink: 1,
  },
  menuItemTextActive: {
    color: '#0B4E8A',
    letterSpacing: 0.15,
  },
  menuDividerTop: {
    height: 1,
    backgroundColor: theme.colors.stroke,
    opacity: 0.9,
    marginLeft: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitchBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(41,182,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modeSwitchGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  menuChildrenWrap: {
    paddingLeft: 12,
    paddingBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  menuChildItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  menuChildBullet: {
    width: 30,
    height: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.70)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuChildText: {
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.text,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.22)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  modalCard: {
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 16,
    maxHeight: '86%',
    ...theme.shadow.sheet,
  },
  modalCardLarge: {
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  modalBody: {
    paddingTop: 12,
  },

  formSectionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 10,
  },

  primarySaveBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primarySaveBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },

  docCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.62)',
    padding: 14,
    marginBottom: 12,
  },
  docCardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: theme.colors.text,
  },
  docCardSub: {
    marginTop: 4,
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16,
  },
  docActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  summaryListRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.62)',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  summaryListTitle: {
    fontWeight: '900',
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryListSub: {
    marginTop: 4,
    fontWeight: '700',
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },

  emptyRow: {
    padding: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
  },

  errTitle: {
    color: theme.colors.red,
    fontWeight: '900',
    marginBottom: 6,
    fontSize: 15,
    lineHeight: 22,
  },
  warnTitle: {
    color: theme.colors.orange,
    fontWeight: '900',
    marginBottom: 6,
    fontSize: 15,
    lineHeight: 22,
  },
  errText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },

  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.22)',
    justifyContent: 'flex-end',
  },
  dateModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dateModalCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateModalTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    color: theme.colors.text,
  },
  dateDoneBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDoneBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },

  loadMoreWrap: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadMoreText: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    fontSize: 13,
  },
});