import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  FlatList,
  Animated,
  Easing,
  Image,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../Components/api';
import { theme } from '../Components/theme';
import WowCard from '../Components/WowCard';
import { SkeletonBlock } from '../Components/Skeleton';
import { Icon } from '../Components/icons';
import DeviceBottomSheet from '../Components/DeviceBottomSheet';
import StatusPill from '../Components/StatusPill';
import { useAuthState, useViewMode } from '../App';

const POLL_INTERVAL_MS = 30000;

const ACCENTS = {
  normal: {
    strong: '#22C55E',
    dark: '#0F8A43',
    border: 'rgba(34,197,94,0.22)',
    soft: 'rgba(34,197,94,0.16)',
    soft2: 'rgba(236,253,243,0.72)',
    glow: 'rgba(34,197,94,0.18)',
  },
  alarm: {
    strong: '#DC2626',
    dark: '#B91C1C',
    border: 'rgba(220,38,38,0.22)',
    soft: 'rgba(220,38,38,0.14)',
    soft2: 'rgba(254,242,242,0.72)',
    glow: 'rgba(220,38,38,0.16)',
  },
  offline: {
    strong: '#6B7280',
    dark: '#4B5563',
    border: 'rgba(107,114,128,0.20)',
    soft: 'rgba(107,114,128,0.12)',
    soft2: 'rgba(241,245,249,0.70)',
    glow: 'rgba(107,114,128,0.14)',
  },
};

function parsePercent(valueStr) {
  if (valueStr == null) return null;
  const s = String(valueStr).trim().replace(',', '.').replace('%', '');
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

function nowLabel() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function deviceName(d) {
  return (d?.title || d?.site || '').trim() || String(d?.terminal_id);
}

function deviceIsOffline(d) {
  return d?.lastValue == null || !Number.isFinite(d.lastValue);
}

function thresholdStatusForDevice(d) {
  const val = d?.lastValue;
  const min = d?.lpg_min_level != null ? Number(d.lpg_min_level) : null;
  const max = d?.lpg_max_level != null ? Number(d.lpg_max_level) : null;

  if (val == null || !Number.isFinite(val)) return 'offline';

  const hasMin = min != null && Number.isFinite(min);
  const hasMax = max != null && Number.isFinite(max);

  if (hasMin && val < min) return 'min';
  if (hasMax && val > max) return 'max';
  if (!hasMin && !hasMax) return 'unknown';
  return 'normal';
}

function getAccent(type, offline) {
  if (offline) return ACCENTS.offline;
  if (type === 'min' || type === 'max') return ACCENTS.alarm;
  return ACCENTS.normal;
}

function statusVisual(type, offline) {
  if (offline) {
    return {
      shellA: 'rgba(241,245,249,0.95)',
      shellB: 'rgba(255,255,255,0.82)',
      fillA: 'rgba(107,114,128,0.72)',
      fillB: 'rgba(148,163,184,0.86)',
      glow: 'rgba(107,114,128,0.24)',
      ring: 'rgba(107,114,128,0.20)',
      highlight: 'rgba(255,255,255,0.18)',
      cap: 'rgba(107,114,128,0.30)',
    };
  }

  if (type === 'min' || type === 'max') {
    return {
      shellA: 'rgba(255,248,248,0.96)',
      shellB: 'rgba(255,255,255,0.84)',
      fillA: 'rgba(220,38,38,0.88)',
      fillB: 'rgba(248,113,113,0.96)',
      glow: 'rgba(220,38,38,0.28)',
      ring: 'rgba(220,38,38,0.22)',
      highlight: 'rgba(255,255,255,0.20)',
      cap: 'rgba(220,38,38,0.26)',
    };
  }

  return {
    shellA: 'rgba(255,255,255,0.96)',
    shellB: 'rgba(255,255,255,0.84)',
    fillA: 'rgba(11,143,62,0.86)',
    fillB: 'rgba(34,197,94,0.98)',
    glow: 'rgba(34,197,94,0.24)',
    ring: 'rgba(34,197,94,0.18)',
    highlight: 'rgba(255,255,255,0.20)',
    cap: 'rgba(34,197,94,0.24)',
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
  currentRoute = 'CommandView',
  viewMode = 'command',
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
  const isCommandView = currentRoute === 'CommandView';
  const isGridView = currentRoute === 'ListView';
  const isBrowseActive = isCommandView || isGridView;
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
                      ? ['rgba(34,197,94,0.18)', 'rgba(236,253,243,0.10)', 'rgba(255,255,255,0.04)']
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
                    color={isDashboard ? ACCENTS.normal.strong : theme.colors.textSecondary}
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
                      ? ['rgba(34,197,94,0.18)', 'rgba(236,253,243,0.10)', 'rgba(255,255,255,0.04)']
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
                    color={isBrowseActive ? ACCENTS.normal.strong : theme.colors.textSecondary}
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
                      colors={['rgba(34,197,94,0.18)', 'rgba(236,253,243,0.14)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modeSwitchGlow}
                    />
                    <Icon name="autorenew" size={18} color={ACCENTS.normal.strong} />
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
                      ? ['rgba(34,197,94,0.18)', 'rgba(236,253,243,0.10)', 'rgba(255,255,255,0.04)']
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
                    color={isGasSensors ? ACCENTS.normal.strong : theme.colors.textSecondary}
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
                      ? ['rgba(34,197,94,0.18)', 'rgba(236,253,243,0.10)', 'rgba(255,255,255,0.04)']
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
                    color={isDocumentTracker ? ACCENTS.normal.strong : theme.colors.textSecondary}
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
                      ? ['rgba(34,197,94,0.18)', 'rgba(236,253,243,0.10)', 'rgba(255,255,255,0.04)']
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
                    color={isAccountCreator ? ACCENTS.normal.strong : theme.colors.textSecondary}
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

function TankLevelVisual({ value, offline, type }) {
  const pct = offline ? 0 : Math.max(0, Math.min(100, Number(value || 0)));
  const fillHeight = `${pct}%`;
  const visual = statusVisual(type, offline);

  return (
    <View style={styles.tankFrame}>
      <View style={[styles.tankAura, { backgroundColor: visual.glow }]} />
      <View style={[styles.tankTopCap, { backgroundColor: visual.cap }]} />
      <LinearGradient
        colors={[visual.shellA, visual.shellB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tankBody, { borderColor: visual.ring }]}
      >
        <LinearGradient
          colors={[visual.fillA, visual.fillB]}
          start={{ x: 0.2, y: 1 }}
          end={{ x: 0.8, y: 0 }}
          style={[styles.tankFill, { height: fillHeight }]}
        />
        <LinearGradient
          colors={[visual.highlight, 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.tankGloss}
        />
        <View style={[styles.tankInnerRing, { borderColor: visual.ring }]} />
        <Text style={styles.tankPercentText}>{offline ? 'N/A' : `${Math.round(pct)}%`}</Text>
      </LinearGradient>
    </View>
  );
}

function MetricBadge({ value, label, accent, textColor, isTankType = false }) {
  return (
    <LinearGradient
      colors={[accent, 'rgba(255,255,255,0.12)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.metricBadge}
    >
      <Text
        style={[
          styles.metricBadgeValue,
          { color: textColor },
          isTankType && styles.metricBadgeValueTankType,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
      <Text style={styles.metricBadgeLabel}>{label}</Text>
    </LinearGradient>
  );
}

export default function CommandView({ navigation }) {
  const insets = useSafeAreaInsets();
  const pollRef = useRef(null);
  const sheetRef = useRef(null);
  const { viewMode, setViewMode, toggleViewMode } = useViewMode();
  const { permissions } = useAuthState();

  const [devices, setDevices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const [selectedTerminalId, setSelectedTerminalId] = useState(null);

  const canAccess = !!permissions?.perm_command_view_access;

  const selectedDevice = useMemo(() => {
    if (!selectedTerminalId) return null;
    return devices.find((d) => String(d.terminal_id) === String(selectedTerminalId)) || null;
  }, [devices, selectedTerminalId]);

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
        address: i?.address || '',

        afg_bld_code: i?.afg_bld_code || '',
        client_bld_code: i?.client_bld_code || '',
        lpg_tank_type: i?.lpg_tank_type || '',
        lpg_installation_type: i?.lpg_installation_type || '',

        lpg_min_level: i?.lpg_min_level ?? null,
        lpg_max_level: i?.lpg_max_level ?? null,

        lastValue: null,
        lastTimestamp: null,
      });
    }

    return out;
  }

  async function refreshLevels(list) {
    const updated = await Promise.all(
      (list || []).map(async (d) => {
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

  function ensureSelection(list) {
    if (selectedTerminalId) {
      const still = list.find((d) => String(d.terminal_id) === String(selectedTerminalId));
      if (still) return String(still.terminal_id);
    }
    return list?.[0] ? String(list[0].terminal_id) : null;
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

    setLastUpdated(nowLabel());
  }

  useEffect(() => {
    setViewMode('command');
  }, [setViewMode]);

  useEffect(() => {
    if (!canAccess) return undefined;

    (async () => {
      try {
        setLoadingFirst(true);
        await fullLoad({ keepSelection: true });
      } catch (e) {
        setError(e?.message || 'Failed to load command view.');
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
          setLastUpdated(nowLabel());
        } catch {}
      })();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [canAccess]);

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

  function onPressRow(d) {
    setSelectedTerminalId(String(d.terminal_id));
    requestAnimationFrame(() => {
      if (sheetRef.current) sheetRef.current.snapToIndex(1);
    });
  }

  function handleToggleBrowseMode() {
    toggleViewMode();
    navigation.replace('ListView');
  }

  const headerTopPad = Math.max(12, insets.top + 10);
  const listBottomPad = Math.max(24, insets.bottom + 24) + 100;

  if (!canAccess) {
    return (
      <LinearGradient colors={[theme.colors.bgA, theme.colors.bgB]} style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerTopPad, paddingBottom: 28 }]}>
          <WowCard>
            <Text style={styles.errTitle}>Access denied</Text>
            <Text style={styles.errText}>Your account does not have permission to access Command View.</Text>
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
        }}
        onPressGasSensors={() => {
          setMenuOpen(false);
          navigation.navigate('GasSensors');
        }}
        onPressDocumentTracker={() => {
          setMenuOpen(false);
          navigation.navigate('DocumentTracker');
        }}
        onPressAccountCreator={() => {
          setMenuOpen(false);
          navigation.navigate('AccountCreator');
        }}
        onToggleBrowseMode={handleToggleBrowseMode}
        currentRoute="CommandView"
        viewMode={viewMode}
        permissions={permissions || {}}
      />

      <View style={[styles.content, { paddingTop: headerTopPad, paddingBottom: Math.max(40, insets.bottom + 40) }]}>
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
                      <Pressable onPress={() => setMenuOpen(true)} style={styles.heroIconPill} accessibilityLabel="Open menu" hitSlop={10}>
                        <LinearGradient
                          colors={['rgba(255,255,255,0.74)', 'rgba(214,235,255,0.24)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Icon name="menu" size={22} color={theme.colors.textSecondary} />
                      </Pressable>

                      <View style={styles.heroTitleWrap}>
                        <Text style={styles.heroTitle}>Command View</Text>
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

        {!!error && (
          <WowCard
            gradient={['rgba(254,242,242,0.82)', 'rgba(255,255,255,0.74)']}
            stroke="rgba(220,38,38,0.22)"
            style={{ marginBottom: 12 }}
          >
            <Text style={styles.errTitle}>Couldn’t load everything</Text>
            <Text style={styles.errText}>{error}</Text>
          </WowCard>
        )}

        {loadingFirst ? (
          <View style={{ gap: 12 }}>
            <SkeletonBlock height={210} width="100%" radius={28} />
            <SkeletonBlock height={210} width="100%" radius={28} />
            <SkeletonBlock height={210} width="100%" radius={28} />
          </View>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={(item) => String(item.terminal_id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: listBottomPad, gap: 14 }}
            renderItem={({ item }) => {
              const type = thresholdStatusForDevice(item);
              const offline = deviceIsOffline(item);
              const pillType = offline ? 'offline' : type;
              const statusText =
                pillType === 'offline'
                  ? 'Offline'
                  : type === 'min'
                    ? 'Low Alarm'
                    : type === 'max'
                      ? 'High Alarm'
                      : type === 'normal'
                        ? 'Normal'
                        : 'Unknown';

              const accent = getAccent(type, offline);

              const cardAccent = accent.soft;
              const cardStroke = accent.border;
              const metricTint = accent.soft;
              const actionTint = accent.soft2;
              const locationTintA = accent.soft2;
              const locationTintB = accent.soft;

              return (
                <Pressable onPress={() => onPressRow(item)}>
                  <View style={[styles.commandShell, { shadowColor: accent.strong }]}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.84)', 'rgba(248,250,252,0.72)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.commandCard, { borderColor: cardStroke }]}
                    >
                      <LinearGradient
                        colors={[cardAccent, 'rgba(255,255,255,0.00)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.commandAmbientGlow}
                      />

                      <View style={styles.commandTopRow}>
                        <View style={[styles.commandHeroIcon, { borderColor: accent.border }]}>
                          <LinearGradient
                            colors={[accent.soft2, 'rgba(255,255,255,0.22)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.commandHeroIconGlow}
                          />
                          <Icon name="gas-cylinder" size={20} color={accent.strong} />
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.commandTitle} numberOfLines={2}>
                            {deviceName(item)}
                          </Text>
                          <Text style={styles.commandSub}>SN {item.sn || '—'}</Text>
                        </View>

                        <StatusPill type={pillType} text={statusText} />
                      </View>

                      <View style={styles.commandMiddleRow}>
                        <View style={styles.commandLeftCol}>
                          <LinearGradient
                            colors={[locationTintA, locationTintB]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.locationCard, { borderColor: accent.border }]}
                          >
                            <Text style={styles.locationLabel}>Location</Text>
                            <Text style={styles.locationTitle}>{item.emirate || '—'}</Text>
                            <Text style={styles.locationSub} numberOfLines={2}>
                              {item.address || '—'}
                            </Text>
                          </LinearGradient>

                          <View style={styles.metricsRow}>
                            <MetricBadge
                              value={item.project_code || '—'}
                              label="Project Code"
                              accent={metricTint}
                              textColor={accent.dark}
                            />
                            <MetricBadge
                              value={item.afg_bld_code || '—'}
                              label="AFG Code"
                              accent={metricTint}
                              textColor={accent.dark}
                            />
                          </View>

                          <View style={styles.metricsRow}>
                            <MetricBadge
                              value={item.client_bld_code || '—'}
                              label="Client Code"
                              accent={metricTint}
                              textColor={accent.dark}
                            />
                            <MetricBadge
                              value={item.lpg_tank_type || '—'}
                              label="Tank Type"
                              accent={metricTint}
                              textColor={accent.dark}
                              isTankType
                            />
                          </View>
                        </View>

                        <View style={styles.commandRightCol}>
                          <TankLevelVisual value={item.lastValue} offline={offline} type={type} />
                          <Text style={styles.visualCaption}>Current Level</Text>

                          <LinearGradient
                            colors={[actionTint, 'rgba(255,255,255,0.34)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.actionOrb, { borderColor: accent.border, shadowColor: accent.strong }]}
                          >
                            <Icon name="arrow-top-right-thick" size={20} color={accent.strong} />
                          </LinearGradient>
                        </View>
                      </View>

                      <View style={[styles.bottomLuxuryRule, { backgroundColor: accent.glow }]} />
                    </LinearGradient>
                  </View>
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator
          />
        )}
      </View>

      <DeviceBottomSheet sheetRef={sheetRef} device={selectedDevice} consumptionRow={null} onClose={() => {}} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },

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
    backgroundColor: 'rgba(236,253,243,0.40)',
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
  heroIconPillGlow: {
    ...StyleSheet.absoluteFillObject,
  },

  errTitle: { color: theme.colors.red, fontWeight: '900', marginBottom: 6, fontSize: 15, lineHeight: 22 },
  errText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 13, lineHeight: 18 },

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
    backgroundColor: 'rgba(236,253,243,0.18)',
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
    backgroundColor: ACCENTS.normal.strong,
    shadowColor: ACCENTS.normal.strong,
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
    borderColor: ACCENTS.normal.border,
    backgroundColor: 'rgba(236,253,243,0.72)',
    shadowColor: ACCENTS.normal.strong,
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
    color: '#166534',
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
    borderColor: ACCENTS.normal.border,
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

  commandShell: {
    borderRadius: 30,
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  commandCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    minHeight: 228,
  },
  commandAmbientGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  commandTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  commandHeroIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commandHeroIconGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  commandTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: 0.1,
  },
  commandSub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },

  commandMiddleRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'stretch',
  },
  commandLeftCol: {
    flex: 1,
    minWidth: 0,
  },
  commandRightCol: {
    width: 108,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },

  locationCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
  },
  locationLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    color: theme.colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  locationTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    color: theme.colors.textSecondary,
  },
  locationSub: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  metricBadge: {
    flex: 1,
    minHeight: 70,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    paddingHorizontal: 11,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  metricBadgeValue: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  metricBadgeValueTankType: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '900',
  },
  metricBadgeLabel: {
    marginTop: 6,
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.15,
  },

  tankFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tankAura: {
    position: 'absolute',
    width: 98,
    height: 148,
    borderRadius: 30,
    opacity: 0.9,
    transform: [{ scale: 1.04 }],
  },
  tankTopCap: {
    width: 34,
    height: 8,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    marginBottom: 5,
  },
  tankBody: {
    width: 74,
    height: 138,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#0B1220',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  tankFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  tankGloss: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: 8,
    width: 14,
    borderRadius: 999,
  },
  tankInnerRing: {
    position: 'absolute',
    left: 7,
    right: 7,
    top: 7,
    bottom: 7,
    borderRadius: 18,
    borderWidth: 1,
    opacity: 0.45,
  },
  tankPercentText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 12,
    zIndex: 2,
  },
  visualCaption: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.15,
  },

  actionOrb: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: 'hidden',
  },

  bottomLuxuryRule: {
    marginTop: 14,
    height: 1,
    borderRadius: 999,
  },
});