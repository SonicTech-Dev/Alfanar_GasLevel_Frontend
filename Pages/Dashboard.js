import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Dimensions,
  Modal,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../Components/api';
import { theme } from '../Components/theme';
import WowCard from '../Components/WowCard';
import StatusPill from '../Components/StatusPill';
import OsmMap from '../Components/OsmMap';
import { SkeletonBlock, SkeletonCard } from '../Components/Skeleton';
import DeviceBottomSheet, { ConsumptionChartSection } from '../Components/DeviceBottomSheet';
import { Icon } from '../Components/icons';

// Optional premium blur (degrades gracefully if not installed)
let BlurView = null;
try {
  // eslint-disable-next-line global-require
  BlurView = require('@react-native-community/blur').BlurView;
} catch {}

const POLL_INTERVAL_MS = 30000;

function parsePercent(valueStr) {
  if (valueStr == null) return null;
  const s = String(valueStr).trim().replace(',', '.').replace('%', '');
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

function deviceName(d) {
  return (d?.title || d?.site || '').trim() || String(d?.terminal_id);
}

function deviceIsOffline(d) {
  return d.lastValue == null || !Number.isFinite(d.lastValue);
}

function thresholdStatusForDevice(d) {
  const val = d.lastValue;
  const min = d.lpg_min_level != null ? Number(d.lpg_min_level) : null;
  const max = d.lpg_max_level != null ? Number(d.lpg_max_level) : null;

  if (val == null || !Number.isFinite(val)) return 'unknown';
  if (min != null && Number.isFinite(min) && val < min) return 'min';
  if (max != null && Number.isFinite(max) && val > max) return 'max';
  if (min == null && max == null) return 'unknown';
  return 'normal';
}

function markerColorFor(d) {
  if (deviceIsOffline(d)) return theme.colors.gray;
  const st = thresholdStatusForDevice(d);
  if (st === 'min' || st === 'max') return theme.colors.red;
  if (st === 'normal') return theme.colors.blue;
  return theme.colors.gray;
}

function pillTypeFor(d) {
  if (deviceIsOffline(d)) return 'offline';
  const st = thresholdStatusForDevice(d);
  if (st === 'min') return 'min';
  if (st === 'max') return 'max';
  if (st === 'normal') return 'normal';
  return 'unknown';
}

function formatPercent(n) {
  if (n == null || !Number.isFinite(n)) return 'N/A';
  return `${Math.round(n)}%`;
}

function nowLabel() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function SectionHeader({ title, right }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

function EmptyRow({ text }) {
  return (
    <View style={styles.emptyRow}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

/* ---------------------------
   TOTAL GAS AVAILABLE (Liters)
   (ported from attached web dashboard.js logic)
   --------------------------- */

// Robust capacity parser: accepts "2000", "2,000", "2000 L", "2,000 liters", etc.
// Returns numeric liters or null if missing/unparseable/<=0.
function parseCapacityLiters(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Extract first number-like token
  const tokenMatch = raw.match(/-?[\d][\d\s,\.]*/);
  if (!tokenMatch) return null;
  let token = tokenMatch[0].replace(/\s+/g, '');

  // If token looks like decimal comma (e.g., "2000,5" and no dots), convert comma to dot.
  if (token.includes(',') && !token.includes('.')) {
    const commas = (token.match(/,/g) || []).length;
    if (commas === 1) {
      const parts = token.split(',');
      if (parts[1] && parts[1].length > 0 && parts[1].length <= 2) token = parts[0] + '.' + parts[1];
      else token = parts.join('');
    } else {
      token = token.replace(/,/g, '');
    }
  } else {
    // Has dot (or no comma): remove commas as thousands separators
    token = token.replace(/,/g, '');
  }

  const n = parseFloat(token);
  if (n == null || Number.isNaN(n) || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

// Returns { totalLiters: number|null, includedCount: number, skippedCount: number }
function computeTotalGasAvailableLiters(devicesList = []) {
  let total = 0;
  let included = 0;
  let skipped = 0;

  (devicesList || []).forEach((d) => {
    const level = d?.lastValue;
    if (level == null || !Number.isFinite(level)) {
      skipped++;
      return; // skip offline/unknown
    }

    // NOTE: in the RN app, capacity comes from tank-info as lpg_tank_capacity (string-ish)
    const cap = parseCapacityLiters(d?.lpg_tank_capacity);
    if (cap == null || !Number.isFinite(cap) || cap <= 0) {
      skipped++;
      return; // skip missing/unparseable capacity
    }

    const litersForDevice = cap * (Number(level) / 100);
    if (litersForDevice == null || !Number.isFinite(litersForDevice) || litersForDevice < 0) {
      skipped++;
      return;
    }

    total += litersForDevice;
    included++;
  });

  if (included === 0) return { totalLiters: null, includedCount: 0, skippedCount: skipped };
  return { totalLiters: total, includedCount: included, skippedCount: skipped };
}

function formatLiters(n) {
  // Professional display:
  // - >= 1000 => whole liters with separators
  // - < 1000 => 1 decimal
  try {
    const abs = Math.abs(Number(n));
    if (!Number.isFinite(abs)) return '—';

    if (abs >= 1000) {
      return Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  } catch {
    return '—';
  }
}

/**
 * Drawer-style menu that slides in from the left edge.
 * - Tap outside to close
 * - Overlays cleanly without breaking scroll
 *
 * UPDATED:
 * - Summary / Devices / Consumption are now children under an expandable "Dashboard" group.
 * - NEW: "List view" is a top-level item that navigates immediately.
 */
function MenuDrawer({
  open,
  onClose,
  onPressSummary,
  onPressDevices,
  onPressConsumption,
  onPressListView,
  onPressGasSensors,
}) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  const [dashOpen, setDashOpen] = useState(true);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 1 : 0,
      duration: open ? 220 : 180,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // When opening the drawer, default the group to expanded (nice UX).
    if (open) setDashOpen(true);
  }, [open, slide]);

  // Keep mounted to allow close animation; disable pointer events when closed.
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

  function toggleDashboard() {
    setDashOpen((v) => !v);
  }

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
            <Text style={styles.drawerSub}>Dashboard Navigation Tools.</Text>
          </View>

          <Pressable onPress={onClose} style={styles.iconBtn} accessibilityLabel="Close menu">
            <Icon name="close" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={{ height: 10 }} />

        <View style={styles.drawerList}>
          {/* NEW: Top-level List view (not expandable) */}
          <Pressable onPress={onPressListView} style={styles.menuItem} accessibilityLabel="Open List view">
            <View style={styles.menuItemIcon}>
              <Icon name="table" size={18} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.menuItemText}>List view</Text>
            <View style={{ flex: 1 }} />
            <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
          </Pressable>

          {/* NEW: Gas Sensors button (top-level, immediate navigation) */}
          <Pressable
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.stroke,
            }}
            onPress={onPressGasSensors}
            accessibilityLabel="Open Gas Sensors"
          >
            <Text style={{ fontWeight: '900', color: theme.colors.text }}>Gas Sensors</Text>
          </Pressable>

          <View style={styles.menuDividerTop} />

          {/* Parent group */}
          <Pressable onPress={toggleDashboard} style={styles.menuItem} accessibilityLabel="Toggle Dashboard menu">
            <View style={styles.menuItemIcon}>
              <Icon name="view-dashboard-outline" size={18} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.menuItemText}>Dashboard</Text>
            <View style={{ flex: 1 }} />
            <Icon name={dashOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
          </Pressable>

          {/* Children */}
          {dashOpen && (
            <View style={styles.menuChildrenWrap}>
              <MenuChildItem label="Summary" icon="chart-box-outline" onPress={onPressSummary} />
              <View style={styles.menuDividerChild} />
              <MenuChildItem label="Devices" icon="gas-cylinder" onPress={onPressDevices} />
              <View style={styles.menuDividerChild} />
              <MenuChildItem label="Consumption" icon="chart-timeline-variant" onPress={onPressConsumption} />
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

function MenuItem({ label, icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <View style={styles.menuItemIcon}>
        <Icon name={icon} size={18} color={theme.colors.textSecondary} />
      </View>
      <Text style={styles.menuItemText}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function MenuChildItem({ label, icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.menuChildItem}>
      <View style={styles.menuChildBullet}>
        <Icon name={icon} size={16} color={theme.colors.textSecondary} />
      </View>
      <Text style={styles.menuChildText}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function ModalShell({ visible, onRequestClose, title, subtitle, children, right }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onRequestClose} />

        <View
          style={[
            styles.modalCard,
            {
              paddingTop: Math.max(12, insets.top + 10),
              paddingBottom: Math.max(14, insets.bottom + 12),
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {title}
              </Text>
              {!!subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
            </View>

            <View style={styles.modalHeaderRight}>
              {right}
              <Pressable onPress={onRequestClose} style={styles.iconBtn} accessibilityLabel="Close modal">
                <Icon name="close" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Scrollable modal content */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={{ paddingBottom: 6 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SummaryModal({ visible, onClose, summary, devices }) {
  const rows = [
    { label: 'Online', value: summary.online, icon: 'access-point', tone: 'good' },
    { label: 'Offline', value: summary.offline, icon: 'access-point-off', tone: 'neutral' },
    { label: 'Normal', value: summary.normal, icon: 'check-decagram-outline', tone: 'info' },
    { label: 'Alerts', value: summary.alerts, icon: 'alarm-light-outline', tone: 'bad' },
  ];

  const totalGas = useMemo(() => computeTotalGasAvailableLiters(devices || []), [devices]);
  const totalGasText = useMemo(() => {
    if (!totalGas || totalGas.totalLiters == null) return '—';
    return formatLiters(totalGas.totalLiters);
  }, [totalGas]);

  return (
    <ModalShell visible={visible} onRequestClose={onClose} title="Summary">
      {/* NEW: Total Gas panel */}
      <LinearGradient
        colors={['rgba(214,235,255,0.62)', 'rgba(255,255,255,0.46)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.totalGasCard}
      >
        <Text style={styles.totalGasTitle}>Total Gas Available (Liters)</Text>
        <Text style={styles.totalGasValue}>{totalGasText}</Text>
      </LinearGradient>

      <View style={{ height: 12 }} />

      <View style={styles.listCard}>
        {rows.map((r, idx) => {
          const rowColor =
            r.label === 'Online'
              ? theme.colors.green
              : r.label === 'Normal'
                ? theme.colors.blue
                : r.label === 'Alerts'
                  ? theme.colors.red
                  : theme.colors.textSecondary;

          return (
            <View key={r.label}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <View
                    style={[
                      styles.summaryIcon,
                      {
                        borderColor: theme.colors.stroke,
                        backgroundColor: 'rgba(255,255,255,0.70)',
                      },
                    ]}
                  >
                    <Icon name={r.icon} size={18} color={rowColor} />
                  </View>
                  <Text style={[styles.summaryLabel, { color: rowColor }]}>{r.label}</Text>
                </View>

                <Text style={[styles.summaryValue, { color: rowColor }]}>{String(r.value)}</Text>
              </View>

              {idx !== rows.length - 1 && <View style={styles.rowDivider} />}
            </View>
          );
        })}
      </View>
    </ModalShell>
  );
}

function DevicesModal({ visible, onClose, devices, loading, onSync, onSelectDevice }) {
  return (
    <ModalShell
      visible={visible}
      onRequestClose={onClose}
      title="Devices"
      subtitle={`Total: ${devices.length}`}
      right={
        <Pressable onPress={onSync} style={styles.iconBtn} accessibilityLabel="Sync devices">
          <Icon name="sync" size={20} color={theme.colors.green} />
        </Pressable>
      }
    >
      {loading ? (
        <View>
          <SkeletonBlock height={64} width="100%" radius={20} />
          <View style={{ height: 10 }} />
          <SkeletonBlock height={64} width="100%" radius={20} />
          <View style={{ height: 10 }} />
          <SkeletonBlock height={64} width="100%" radius={20} />
        </View>
      ) : devices.length === 0 ? (
        <EmptyRow text="No devices found." />
      ) : (
        <View style={styles.listCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 6 }}
            keyboardShouldPersistTaps="handled"
          >
            {devices.slice(0, 200).map((d, idx) => {
              const type = pillTypeFor(d);
              const st = thresholdStatusForDevice(d);

              const statusText =
                type === 'offline'
                  ? 'Offline'
                  : st === 'min'
                    ? 'Low Level Alarm'
                    : st === 'max'
                      ? 'High Level Alarm'
                      : st === 'normal'
                        ? 'Normal'
                        : 'Unknown';

              return (
                <View key={String(d.terminal_id)}>
                  <Pressable onPress={() => onSelectDevice(d)} style={styles.deviceRowCompact}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.deviceNameFull} numberOfLines={0}>
                        {deviceName(d)}
                      </Text>
                    </View>

                    <StatusPill type={type} text={statusText} />
                  </Pressable>

                  {idx !== Math.min(200, devices.length) - 1 && <View style={styles.rowDivider} />}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </ModalShell>
  );
}

function ConsumptionDetailsModal({ visible, onClose, device, row }) {
  const name = device ? deviceName(device) : String(row?.terminal_id ?? '—');

  const items = [
    { label: 'Capacity (L)', value: row?.capacity_liters != null ? String(row.capacity_liters) : 'Not Set' },
    { label: 'Avg Daily (L)', value: row?.monthly?.average_liters_per_day != null ? String(row.monthly.average_liters_per_day) : '—' },
    { label: 'Avg Daily (%)', value: row?.monthly?.average_percent_per_day != null ? `${row.monthly.average_percent_per_day}%` : '—' },
    { label: 'Avg Monthly (L)', value: row?.monthly?.total_liters_30d != null ? String(row.monthly.total_liters_30d) : '—' },
  ];

  const terminalId = device?.terminal_id || row?.terminal_id;

  return (
    <ModalShell visible={visible} onRequestClose={onClose} title={name}>
      <View style={styles.listCard}>
        {items.map((it, idx) => (
          <View key={it.label}>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>{it.label}</Text>
              <Text style={styles.kvValue} numberOfLines={1}>
                {it.value}
              </Text>
            </View>
            {idx !== items.length - 1 && <View style={styles.rowDivider} />}
          </View>
        ))}
      </View>

      <View style={{ height: 12 }} />
      <ConsumptionChartSection terminalId={terminalId} />
    </ModalShell>
  );
}

function ConsumptionModal({ visible, onClose, loading, gasRows, devices, onRefresh, onPressRow }) {
  const mappedRows = useMemo(() => {
    const deviceMap = new Map((devices || []).map((d) => [String(d.terminal_id), d]));
    return (gasRows || []).map((r) => ({
      row: r,
      device: deviceMap.get(String(r.terminal_id)) || null,
    }));
  }, [devices, gasRows]);

  return (
    <ModalShell
      visible={visible}
      onRequestClose={onClose}
      title="Consumption"
      right={
        <Pressable onPress={onRefresh} style={styles.iconBtn} accessibilityLabel="Refresh consumption">
          <Icon name="refresh" size={20} color={theme.colors.blue} />
        </Pressable>
      }
    >
      {loading ? (
        <SkeletonCard />
      ) : mappedRows.length === 0 ? (
        <EmptyRow text="No gas data." />
      ) : (
        <View style={styles.listCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
            {mappedRows.slice(0, 300).map(({ row, device }, idx) => {
              const name = device ? deviceName(device) : String(row.terminal_id);
              const avgPct =
                row?.monthly?.average_percent_per_day != null ? `${row.monthly.average_percent_per_day}%` : '—';

              return (
                <View key={String(row.terminal_id)}>
                  <Pressable onPress={() => onPressRow({ row, device })} style={styles.consumptionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        Average Daily Consumption: {avgPct}
                      </Text>
                    </View>

                    <Icon name="chevron-right" size={20} color={theme.colors.textMuted} />
                  </Pressable>

                  {idx !== mappedRows.length - 1 && <View style={styles.rowDivider} />}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </ModalShell>
  );
}

function HeaderChip({ label, value, tone = 'neutral' }) {
  const cfg = (() => {
    if (tone === 'good') {
      return {
        text: theme.colors.green,
        stroke: 'rgba(11,143,62,0.18)',
        bgA: 'rgba(236,253,243,0.62)',
        bgB: 'rgba(255,255,255,0.38)',
      };
    }
    if (tone === 'danger') {
      return {
        text: theme.colors.red,
        stroke: 'rgba(220,38,38,0.16)',
        bgA: 'rgba(254,242,242,0.66)',
        bgB: 'rgba(255,255,255,0.38)',
      };
    }
    if (tone === 'muted') {
      return {
        text: theme.colors.textMuted,
        stroke: theme.colors.stroke,
        bgA: 'rgba(241,245,249,0.70)',
        bgB: 'rgba(255,255,255,0.40)',
      };
    }
    return {
      text: theme.colors.textSecondary,
      stroke: theme.colors.stroke,
      bgA: 'rgba(255,255,255,0.62)',
      bgB: 'rgba(255,255,255,0.38)',
    };
  })();

  return (
    <LinearGradient
      colors={[cfg.bgA, cfg.bgB]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hChip, { borderColor: cfg.stroke }]}
    >
      <Text style={[styles.hChipValue, { color: cfg.text }]}>{String(value)}</Text>
      <Text style={[styles.hChipLabel, { color: cfg.text }]}>{label}</Text>
    </LinearGradient>
  );
}

export default function Dashboard({ navigation }) {
  const insets = useSafeAreaInsets();
  const pollRef = useRef(null);
  const sheetRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState(null);

  const [gasRows, setGasRows] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const [menuOpen, setMenuOpen] = useState(false);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [consumptionOpen, setConsumptionOpen] = useState(false);

  const [consumptionDetailsOpen, setConsumptionDetailsOpen] = useState(false);
  const [consumptionDetails, setConsumptionDetails] = useState(null); // { row, device }

  const selectedDevice = useMemo(() => {
    if (!selectedTerminalId) return null;
    return devices.find((d) => String(d.terminal_id) === String(selectedTerminalId)) || null;
  }, [devices, selectedTerminalId]);

  const selectedConsumptionRow = useMemo(() => {
    if (!selectedTerminalId) return null;
    return (gasRows || []).find((r) => String(r?.terminal_id) === String(selectedTerminalId)) || null;
  }, [gasRows, selectedTerminalId]);

  const mapDevices = useMemo(() => devices.filter((d) => d.lat != null && d.lng != null), [devices]);

  const initialCenter = useMemo(() => {
    if (!mapDevices.length) return { lat: 25.2048, lng: 55.2708 };
    const avgLat = mapDevices.reduce((s, d) => s + d.lat, 0) / mapDevices.length;
    const avgLng = mapDevices.reduce((s, d) => s + d.lng, 0) / mapDevices.length;
    return { lat: avgLat, lng: avgLng };
  }, [mapDevices]);

  async function loadCatalog() {
    const [sites, titles, infos] = await Promise.all([
      api.sites().catch(() => ({ rows: [] })),
      api.titles().catch(() => []),
      api.tankInfo().catch(() => ({ rows: [] })),
    ]);

    const titleMap = new Map((titles || []).map((r) => [String(r.terminal_id), r]));
    const infoMap = new Map((infos.rows || []).map((r) => [String(r.terminal_id), r]));

    const out = [];
    for (const s of sites.rows || []) {
      const tid = String(s.terminal_id);
      const t = titleMap.get(tid);
      const i = infoMap.get(tid);

      out.push({
        terminal_id: tid,
        title: (t && t.tank_title) || '',
        sn: (t && t.sn) || '',
        site: s.site || '',
        locationLink: s.location || '',
        lat: typeof s.latitude === 'number' ? s.latitude : null,
        lng: typeof s.longitude === 'number' ? s.longitude : null,

        emirate: i?.emirate || '',
        project_code: i?.project_code || '',
        building_name: i?.building_name || '',
        address: i?.address || '',
        lpg_min_level: i?.lpg_min_level ?? null,
        lpg_max_level: i?.lpg_max_level ?? null,

        // NEW: needed for Total Gas Available (Liters)
        lpg_tank_capacity: i?.lpg_tank_capacity || '',

        // New fields requested (from tank-info table)
        afg_bld_code: i?.afg_bld_code || '',
        client_bld_code: i?.client_bld_code || '',
        lpg_tank_type: i?.lpg_tank_type || '',
        lpg_installation_type: i?.lpg_installation_type || '',
        lpg_tank_details: i?.lpg_tank_details || '',

        lastValue: null,
        lastTimestamp: null,
      });
    }
    return out;
  }

  async function refreshLevels(list) {
    const updated = await Promise.all(
      list.map(async (d) => {
        try {
          const j = await api.tank(d.terminal_id);
          return { ...d, lastValue: parsePercent(j?.value), lastTimestamp: j?.timestamp ? String(j.timestamp) : null };
        } catch {
          return { ...d, lastValue: null, lastTimestamp: d.lastTimestamp || null };
        }
      })
    );
    return updated;
  }

  async function refreshGas() {
    const data = await api.consumption().catch(() => ({ rows: [] }));
    const rows = Array.isArray(data.rows) ? data.rows : [];
    setGasRows(rows);
  }

  function ensureSelection(list) {
    if (selectedTerminalId) {
      const still = list.find((d) => String(d.terminal_id) === String(selectedTerminalId));
      if (still) return String(still.terminal_id);
    }

    const first =
      list.find((d) => d.lat != null && d.lng != null) ||
      list.find((d) => d.emirate || d.building_name || d.address || d.locationLink) ||
      list[0];

    return first ? String(first.terminal_id) : null;
  }

  async function fullLoad({ keepSelection = true } = {}) {
    setError('');
    const catalog = await loadCatalog();
    const withLevels = await refreshLevels(catalog);
    setDevices(withLevels);

    if (!keepSelection) {
      setSelectedTerminalId(null);
    } else {
      const sel = ensureSelection(withLevels);
      if (sel) setSelectedTerminalId(sel);
    }

    await refreshGas();
    setLastUpdated(nowLabel());
  }

  useEffect(() => {
    (async () => {
      try {
        setLoadingFirst(true);
        await fullLoad({ keepSelection: true });
      } catch (e) {
        setError(e?.message || 'Failed to load dashboard.');
      } finally {
        setLoadingFirst(false);
      }
    })();

    pollRef.current = setInterval(() => {
      (async () => {
        try {
          const catalog = await loadCatalog();
          const withLevels = await refreshLevels(catalog);
          setDevices(withLevels);
          await refreshGas();
          setLastUpdated(nowLabel());
        } catch {}
      })();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    let normal = 0,
      above = 0,
      under = 0,
      offline = 0;
    for (const d of devices) {
      if (deviceIsOffline(d)) {
        offline++;
        continue;
      }
      const st = thresholdStatusForDevice(d);
      if (st === 'normal') normal++;
      if (st === 'max') above++;
      if (st === 'min') under++;
    }
    const online = Math.max(0, devices.length - offline);
    return { total: devices.length, online, offline, normal, above, under, alerts: above + under };
  }, [devices]);

  const alerts = useMemo(() => {
    return devices
      .filter((d) => !deviceIsOffline(d))
      .filter((d) => {
        const st = thresholdStatusForDevice(d);
        return st === 'min' || st === 'max';
      })
      .slice(0, 200);
  }, [devices]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await fullLoad({ keepSelection: true });
    } catch (e) {
      setError(e?.message || 'Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  }

  function onSelectDevice(d, { openSheet = true } = {}) {
    setSelectedTerminalId(String(d.terminal_id));
    if (openSheet && sheetRef.current) {
      sheetRef.current.snapToIndex(1);
    }
  }

  function closeAllOverlays() {
    setMenuOpen(false);
  }

  function openSummaryFromMenu() {
    closeAllOverlays();
    setSummaryOpen(true);
  }

  function openDevicesFromMenu() {
    closeAllOverlays();
    setDevicesOpen(true);
  }

  function openConsumptionFromMenu() {
    closeAllOverlays();
    setConsumptionOpen(true);
  }

  function openListViewFromMenu() {
    closeAllOverlays();
    navigation.navigate('ListView');
  }

  function openGasSensorsFromMenu() {
    closeAllOverlays();
    navigation.navigate('GasSensors');
  }

  const mapHeight = Math.min(520, Math.max(360, Math.round(Dimensions.get('window').height * 0.42)));

  const heroH = Math.max(230, Math.round(Dimensions.get('window').height * 0.26));
  const headerTopPad = Math.max(12, insets.top + 10);

  return (
    <LinearGradient colors={[theme.colors.bgA, theme.colors.bgB]} style={styles.screen}>
      {/* Hero background (luxury cool blues + ivory) */}
      <View style={[styles.heroBg, { height: heroH }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(214,235,255,0.80)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.00)']}
          locations={[0, 0.62, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* soft highlight orb */}
        <View style={styles.heroOrbA} />
        <View style={styles.heroOrbB} />

        {/* subtle bottom separator */}
        <View style={styles.heroDivider} />
      </View>

      {/* Drawer must be above ScrollView and above WebView (OsmMap) */}
      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onPressListView={() => {
          openListViewFromMenu();
        }}
        onPressGasSensors={() => {
          openGasSensorsFromMenu();
        }}
        onPressSummary={() => {
          openSummaryFromMenu();
        }}
        onPressDevices={() => {
          openDevicesFromMenu();
        }}
        onPressConsumption={() => {
          openConsumptionFromMenu();
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerTopPad,
            paddingBottom: Math.max(18, insets.bottom + 18),
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO HEADER (redesigned) */}
        <View style={{ marginBottom: 12 }}>
          <WowCard
            stroke={'rgba(15,23,42,0.10)'}
            gradient={['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.56)']}
            style={styles.heroHeaderCard}
          >
            <View style={styles.heroHeaderClip}>
              {!!BlurView && (
                <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType="light"
                  blurAmount={18}
                  reducedTransparencyFallbackColor="rgba(255,255,255,0.70)"
                />
              )}

              {/* Glass sheen overlay (keeps premium look even without blur) */}
              <LinearGradient
                colors={['rgba(214,235,255,0.22)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              {/* Top row: menu pill - title/subtitle - refresh pill */}
              <View style={styles.heroTopRow}>
                <Pressable
                  onPress={() => setMenuOpen(true)}
                  style={styles.heroIconPill}
                  accessibilityLabel="Open menu"
                  hitSlop={10}
                >
                  <Icon name="menu" size={20} color={theme.colors.textSecondary} />
                </Pressable>

                <View style={styles.heroTitleWrap}>
                  <Text style={styles.heroTitle}>Dashboard</Text>
                  <Text style={styles.heroSubtitle}>Last updated • {lastUpdated || '—'}</Text>
                </View>

                <Pressable
                  onPress={onRefresh}
                  style={[styles.heroIconPill, styles.heroIconPillBlue]}
                  accessibilityLabel="Refresh dashboard"
                  hitSlop={10}
                >
                  <Icon name="refresh" size={20} color={theme.colors.blue} />
                </Pressable>
              </View>

              {/* Chips row */}
              <View style={styles.heroChipsRow}>
                <HeaderChip label="Online" value={summary.online} tone="good" />
                <HeaderChip label="Alerts" value={summary.alerts} tone={summary.alerts > 0 ? 'danger' : 'neutral'} />
                <HeaderChip label="Offline" value={summary.offline} tone="muted" />
              </View>
            </View>
          </WowCard>
        </View>

        {!!error && (
          <WowCard
            gradient={['rgba(254,242,242,0.80)', 'rgba(255,255,255,0.72)']}
            stroke="rgba(220,38,38,0.22)"
            style={{ marginBottom: 12 }}
          >
            <Text style={styles.errTitle}>Couldn’t load everything</Text>
            <Text style={styles.errText}>{error}</Text>
          </WowCard>
        )}

        {/* MAP */}
        <WowCard
          stroke={theme.colors.stroke2}
          gradient={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.70)']}
          style={styles.panel}
        >
          <SectionHeader title="Devices Map" />
          <View style={[styles.mapWrap, { height: mapHeight }]}>
            {loadingFirst ? (
              <View style={{ padding: 14 }}>
                <SkeletonBlock height={14} width="55%" />
                <View style={{ height: 10 }} />
                <SkeletonBlock height={mapHeight - 54} width="100%" radius={18} />
              </View>
            ) : (
              <OsmMap
                height={mapHeight}
                initialCenter={initialCenter}
                initialZoom={10}
                markers={mapDevices.map((d) => ({
                  id: d.terminal_id,
                  lat: d.lat,
                  lng: d.lng,
                  title: deviceName(d),
                  subtitle: `Level: ${formatPercent(d.lastValue)}`,
                  color: markerColorFor(d),
                }))}
                onSelectMarker={(id) => {
                  const d = devices.find((x) => String(x.terminal_id) === String(id));
                  if (d) onSelectDevice(d, { openSheet: true });
                }}
              />
            )}

            <View style={styles.mapLegend} pointerEvents="none">
              <LegendDot color={theme.colors.blue} label="Normal" />
              <LegendDot color={theme.colors.red} label="Alarm" />
              <LegendDot color={theme.colors.gray} label="Offline" />
            </View>
          </View>
        </WowCard>

        {/* ALERTS (vertical list) */}
        <WowCard gradient={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.70)']} style={styles.panel}>
          <SectionHeader
            title="Alerts"
            right={
              <Text style={[styles.alertCount, { color: summary.alerts > 0 ? theme.colors.red : theme.colors.green }]}>
                {summary.alerts} ALERTS
              </Text>
            }
          />

          {loadingFirst ? (
            <SkeletonCard />
          ) : alerts.length === 0 ? (
            <EmptyRow text="No alerts right now." />
          ) : (
            <View style={styles.listCard}>
              {alerts.map((d, idx) => {
                const st = thresholdStatusForDevice(d);
                const label = st === 'max' ? 'High Level Alarm' : 'Low Level Alarm';

                return (
                  <View key={String(d.terminal_id)}>
                    <Pressable onPress={() => onSelectDevice(d, { openSheet: true })} style={styles.alertRowV2}>
                      <View style={styles.alertIcon}>
                        <Icon name="alarm-light-outline" size={20} color={theme.colors.red} />
                      </View>

                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.alertDeviceName} numberOfLines={0}>
                          {deviceName(d)}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 8 }}>
                        <StatusPill type={st} text={label} />
                        <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
                      </View>
                    </Pressable>

                    {idx !== alerts.length - 1 && <View style={styles.rowDivider} />}
                  </View>
                );
              })}
            </View>
          )}
        </WowCard>

        <View style={{ height: 10 }} />
      </ScrollView>

      {/* Modals opened from Menu */}
      <SummaryModal visible={summaryOpen} onClose={() => setSummaryOpen(false)} summary={summary} devices={devices} />

      <DevicesModal
        visible={devicesOpen}
        onClose={() => setDevicesOpen(false)}
        devices={devices}
        loading={loadingFirst}
        onSync={() => fullLoad({ keepSelection: true }).catch(() => {})}
        onSelectDevice={(d) => {
          // Best UX: close modal then open sheet (avoids stacked overlays on iOS)
          setDevicesOpen(false);
          requestAnimationFrame(() => onSelectDevice(d, { openSheet: true }));
        }}
      />

      <ConsumptionModal
        visible={consumptionOpen}
        onClose={() => setConsumptionOpen(false)}
        loading={loadingFirst}
        gasRows={gasRows}
        devices={devices}
        onRefresh={() => refreshGas().catch(() => {})}
        onPressRow={({ row, device }) => {
          setConsumptionDetails({ row, device });
          setConsumptionDetailsOpen(true);
        }}
      />

      <ConsumptionDetailsModal
        visible={consumptionDetailsOpen}
        onClose={() => setConsumptionDetailsOpen(false)}
        device={consumptionDetails?.device || null}
        row={consumptionDetails?.row || null}
      />

      {/* Bottom sheet remains global */}
      <DeviceBottomSheet
        sheetRef={sheetRef}
        device={selectedDevice}
        consumptionRow={selectedConsumptionRow}
        onClose={() => {}}
      />
    </LinearGradient>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  content: { paddingHorizontal: 16 },

  panel: { marginBottom: 12 },

  /* HERO BACKGROUND */
  heroBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 0,
  },
  heroOrbA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 220,
    right: -70,
    top: 30,
    backgroundColor: 'rgba(41,182,255,0.18)',
  },
  heroOrbB: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 180,
    left: -60,
    top: 84,
    backgroundColor: 'rgba(22,119,200,0.12)',
  },
  heroDivider: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(15,23,42,0.06)',
  },

  /* HERO HEADER PLATE */
  heroHeaderCard: {
    borderRadius: theme.radius.xl,
  },
  heroHeaderClip: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    padding: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroTitleWrap: {
    flex: 1,
    paddingHorizontal: 2,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },

  heroIconPill: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: 'rgba(255,255,255,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.soft,
  },
  heroIconPillBlue: {
    backgroundColor: 'rgba(214,235,255,0.56)',
    borderColor: 'rgba(22,119,200,0.14)',
  },

  heroChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  hChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hChipValue: {
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 18,
  },
  hChipLabel: {
    fontWeight: '900',
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.95,
  },

  /* Drawer menu (must be above WebView / Leaflet) */
  drawerRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    ...(Platform.OS === 'android' ? { elevation: 9999 } : null),
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
    ...(Platform.OS === 'android' ? { elevation: 10000 } : null),
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
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.72)',
    overflow: 'hidden',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 52,
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
  menuItemText: {
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },

  menuDividerTop: {
    height: 1,
    backgroundColor: theme.colors.stroke,
    opacity: 0.9,
    marginLeft: 12,
  },

  // Children indentation
  menuChildrenWrap: {
    paddingLeft: 12,
    paddingRight: 0,
    paddingBottom: 4,
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
  menuDividerChild: {
    height: 1,
    backgroundColor: theme.colors.stroke,
    opacity: 0.9,
    marginLeft: 54,
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

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '900', color: theme.colors.text },

  /* Map */
  mapWrap: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: '#EAEAEA',
  },
  mapLegend: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 10 },
  legendText: { fontSize: 12, lineHeight: 16, fontWeight: '900', color: theme.colors.textMuted },

  /* Alerts */
  alertCount: { fontSize: 12, lineHeight: 16, fontWeight: '900' },

  listCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.62)',
    overflow: 'hidden',
  },

  alertRowV2: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(254,242,242,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDeviceName: {
    fontWeight: '900',
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },

  /* Shared rows */
  itemTitle: { fontWeight: '900', color: theme.colors.text, marginBottom: 4, fontSize: 15, lineHeight: 22 },
  itemMeta: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 13, lineHeight: 18 },

  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.stroke,
    opacity: 0.9,
    marginLeft: 12,
  },

  emptyRow: {
    padding: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  emptyText: { color: theme.colors.textMuted, fontWeight: '800', fontSize: 13, lineHeight: 18 },

  errTitle: { color: theme.colors.red, fontWeight: '900', marginBottom: 6, fontSize: 15, lineHeight: 22 },
  errText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 13, lineHeight: 18 },

  /* Modals */
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

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryValue: {
    fontWeight: '900',
    fontSize: 16,
    lineHeight: 22,
  },

  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  kvLabel: {
    flex: 1,
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  kvValue: {
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.text,
  },

  /* Devices modal list rows (compact + dividers) */
  deviceRowCompact: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  deviceNameFull: {
    fontWeight: '900',
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },

  /* Consumption */
  consumptionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 12,
  },

  // NEW: Total Gas panel styles (used in Summary modal)
  totalGasCard: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(22,119,200,0.18)',
    padding: 16,
  },
  totalGasTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    color: theme.colors.textMuted,
  },
  totalGasValue: {
    marginTop: 10,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    color: theme.colors.text,
  },
});