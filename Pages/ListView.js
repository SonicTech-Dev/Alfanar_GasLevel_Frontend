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
import { useAuthState, useViewMode } from '../App';

const POLL_INTERVAL_MS = 30000;

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

function gasBarColorsFor(d) {
  const st = thresholdStatusForDevice(d);
  if (st === 'offline') return { fill: theme.colors.gray, text: 'rgba(255,255,255,0.96)' };
  if (st === 'min' || st === 'max') return { fill: theme.colors.red, text: 'rgba(255,255,255,0.96)' };
  return { fill: theme.colors.green, text: 'rgba(255,255,255,0.96)' };
}

function clamp01(t) {
  const n = Number(t);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function GasLevelCell({ device }) {
  const offline = deviceIsOffline(device);
  const pct = offline ? null : Math.max(0, Math.min(100, Number(device.lastValue)));
  const fillPct = offline ? 0 : clamp01(pct / 100);

  const { fill } = gasBarColorsFor(device);
  const display = offline ? 'N/A' : `${Math.round(pct)}%`;

  return (
    <View style={styles.gasWrap}>
      <View style={styles.gasBarOuter}>
        <View style={[styles.gasBarFill, { width: `${Math.round(fillPct * 100)}%`, backgroundColor: fill }]} />
        <Text style={[styles.gasBarText, { color: '#000' }]} numberOfLines={1}>
          {display}
        </Text>
      </View>
    </View>
  );
}

function ListHeader() {
  return (
    <View style={styles.headerRowB}>
      <Text style={styles.hCellTextBLeft}>Device</Text>
    </View>
  );
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
  currentRoute = 'ListView',
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

export default function ListView({ navigation }) {
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

  const canAccess = !!permissions?.perm_grid_view_access;

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
    setViewMode('grid');
  }, [setViewMode]);

  useEffect(() => {
    if (!canAccess) return undefined;

    (async () => {
      try {
        setLoadingFirst(true);
        await fullLoad({ keepSelection: true });
      } catch (e) {
        setError(e?.message || 'Failed to load list view.');
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
    navigation.replace('CommandView');
  }

  const keyExtractor = (item) => String(item.terminal_id);

  const headerTopPad = Math.max(12, insets.top + 10);
  const listBottomPad = Math.max(24, insets.bottom + 24) + 100;

  if (!canAccess) {
    return (
      <LinearGradient colors={[theme.colors.bgA, theme.colors.bgB]} style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerTopPad, paddingBottom: 28 }]}>
          <WowCard>
            <Text style={styles.errTitle}>Access denied</Text>
            <Text style={styles.errText}>Your account does not have permission to access Grid View.</Text>
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
        currentRoute="ListView"
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
                        <Text style={styles.heroTitle}>Grid View</Text>
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
            gradient={['rgba(254,242,242,0.80)', 'rgba(255,255,255,0.72)']}
            stroke="rgba(220,38,38,0.22)"
            style={{ marginBottom: 12 }}
          >
            <Text style={styles.errTitle}>Couldn’t load everything</Text>
            <Text style={styles.errText}>{error}</Text>
          </WowCard>
        )}

        <WowCard
          stroke={theme.colors.stroke2}
          gradient={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.70)']}
          style={{ flex: 1 }}
        >
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableTitle}>Devices</Text>
            <View style={{ flex: 1 }} />
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{devices.length} total</Text>
            </View>
          </View>

          <View style={{ height: 10 }} />

          {loadingFirst ? (
            <View style={{ paddingBottom: 8 }}>
              <SkeletonBlock height={14} width="42%" radius={10} />
              <View style={{ height: 10 }} />
              <SkeletonBlock height={62} width="100%" radius={18} />
              <View style={{ height: 10 }} />
              <SkeletonBlock height={62} width="100%" radius={18} />
              <View style={{ height: 10 }} />
              <SkeletonBlock height={62} width="100%" radius={18} />
            </View>
          ) : (
            <View style={styles.tableOuter}>
              <FlatList
                data={devices}
                keyExtractor={keyExtractor}
                ListHeaderComponent={<ListHeader />}
                renderItem={({ item, index }) => {
                  const rowBg = index % 2 === 0 ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.34)';
                  const isLast = index === devices.length - 1;

                  return (
                    <Pressable
                      onPress={() => onPressRow(item)}
                      style={[
                        styles.rowCard,
                        { backgroundColor: rowBg },
                        !isLast && styles.rowCardBorder,
                        isLast && styles.rowCardLastBorder,
                      ]}
                    >
                      <View style={styles.rowTop}>
                        <View style={styles.rowTopLeft}>
                          <Text style={styles.deviceTitle}>{deviceName(item)}</Text>
                          <Text style={styles.deviceSub}>SN {item.sn || '—'}</Text>
                        </View>

                        <View style={styles.rowTopRight}>
                          <Text style={styles.gasBlockTitle}>Gas level</Text>
                          <GasLevelCell device={item} />
                        </View>
                      </View>

                      <View style={styles.rowMiddle}>
                        <Text style={styles.locTitle}>{item.emirate || '—'}</Text>
                        <Text style={styles.locSub}>{item.address || '—'}</Text>
                      </View>

                      <View style={styles.rowBottom}>
                        <View style={styles.bottomCol}>
                          <Text style={styles.blockTitle}>Codes</Text>
                          <Text style={styles.blockLine}>Project Code: {item.project_code || '—'}</Text>
                          <Text style={styles.blockMuted}>AFG Code: {item.afg_bld_code || '—'}</Text>
                          <Text style={styles.blockMuted}>Client Code: {item.client_bld_code || '—'}</Text>
                        </View>

                        <View style={styles.bottomDivider} />

                        <View style={styles.bottomCol}>
                          <Text style={styles.blockTitle}>Tank Information</Text>
                          <Text style={styles.blockLine}>{item.lpg_tank_type || '—'}</Text>
                          <Text style={styles.blockMuted}>{item.lpg_installation_type || '—'}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: listBottomPad }}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              />
            </View>
          )}
        </WowCard>
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

  errTitle: { color: theme.colors.red, fontWeight: '900', marginBottom: 6, fontSize: 15, lineHeight: 22 },
  errText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 13, lineHeight: 18 },

  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tableTitle: { fontSize: 16, lineHeight: 22, fontWeight: '900', color: theme.colors.text },
  countPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: { fontSize: 12, lineHeight: 16, fontWeight: '900', color: theme.colors.textMuted },

  tableOuter: {
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.62)',
    overflow: 'hidden',
  },

  headerRowB: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.stroke,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hCellTextBLeft: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.1,
  },

  rowCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  rowCardBorder: {
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(15,23,42,0.55)',
  },

  rowCardLastBorder: {
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(15,23,42,0.75)',
  },

  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowTopLeft: {
    flex: 1,
    minWidth: 0,
  },

  rowTopRight: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  deviceTitle: {
    fontWeight: '900',
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
  },
  deviceSub: {
    marginTop: 5,
    fontWeight: '800',
    color: theme.colors.textMuted,
    fontSize: 11.5,
    lineHeight: 15,
    flexShrink: 1,
  },

  rowMiddle: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.06)',
  },
  locTitle: {
    fontWeight: '900',
    color: theme.colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 16,
    flexShrink: 1,
  },
  locSub: {
    marginTop: 5,
    fontWeight: '800',
    color: theme.colors.textMuted,
    fontSize: 11.5,
    lineHeight: 15,
    flexShrink: 1,
  },

  rowBottom: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.06)',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bottomCol: {
    flex: 1,
    minWidth: 0,
  },
  bottomDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(15,23,42,0.06)',
    marginHorizontal: 10,
  },

  blockTitle: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.1,
    marginBottom: 6,
  },
  blockLine: {
    fontWeight: '900',
    color: theme.colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 15,
    flexShrink: 1,
  },
  blockMuted: {
    marginTop: 5,
    fontWeight: '800',
    color: theme.colors.textMuted,
    fontSize: 11.5,
    lineHeight: 15,
    flexShrink: 1,
  },

  gasBlockTitle: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.1,
    marginBottom: 6,
    textAlign: 'center',
    alignSelf: 'center',
  },

  gasWrap: {
    width: 150,
    maxWidth: 170,
    alignSelf: 'flex-start',
  },
  gasBarOuter: {
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  gasBarFill: { ...StyleSheet.absoluteFillObject, borderRadius: 999, opacity: 0.92 },
  gasBarText: { alignSelf: 'center', fontWeight: '900', fontSize: 11.5, lineHeight: 14, letterSpacing: 0.2 },

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
});