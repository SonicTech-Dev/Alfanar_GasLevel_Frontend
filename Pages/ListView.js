import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../Components/api';
import { theme } from '../Components/theme';
import WowCard from '../Components/WowCard';
import { SkeletonBlock } from '../Components/Skeleton';
import { Icon } from '../Components/icons';
import DeviceBottomSheet from '../Components/DeviceBottomSheet';

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

/**
 * Header: only shows the always-visible top-line columns.
 * Gas level title is per-row (like Codes/Tank).
 */
function ListHeader() {
  return (
    <View style={styles.headerRowB}>
      <Text style={styles.hCellTextBLeft}>Device</Text>
    </View>
  );
}

export default function ListView({ navigation }) {
  const insets = useSafeAreaInsets();
  const pollRef = useRef(null);
  const sheetRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const [selectedTerminalId, setSelectedTerminalId] = useState(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const keyExtractor = (item) => String(item.terminal_id);

  const headerTopPad = Math.max(12, insets.top + 10);

  const listBottomPad = Math.max(24, insets.bottom + 24) + 100;

  return (
    <LinearGradient colors={[theme.colors.bgA, theme.colors.bgB]} style={styles.screen}>
      <View style={[styles.content, { paddingTop: headerTopPad, paddingBottom: Math.max(40, insets.bottom + 40) }]}>
        <WowCard
          stroke={'rgba(15,23,42,0.10)'}
          gradient={['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.56)']}
          style={styles.heroHeaderCard}
        >
          <View style={styles.heroHeaderClip}>
            <LinearGradient
              colors={['rgba(214,235,255,0.22)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)']}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={styles.heroTopRow}>
              <Pressable onPress={() => navigation.goBack()} style={styles.heroIconPill} accessibilityLabel="Back" hitSlop={10}>
                <Icon name="chevron-left" size={22} color={theme.colors.textSecondary} />
              </Pressable>

              <View style={styles.heroTitleWrap}>
                <Text style={styles.heroTitle}>List View</Text>
                <Text style={styles.heroSubtitle}>Last updated • {lastUpdated || '—'}</Text>
              </View>

              <Pressable
                onPress={onRefresh}
                style={[styles.heroIconPill, styles.heroIconPillBlue]}
                accessibilityLabel="Refresh list view"
                hitSlop={10}
              >
                <Icon name="refresh" size={20} color={theme.colors.blue} />
              </Pressable>
            </View>
          </View>
        </WowCard>

        <View style={{ height: 12 }} />

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
                        !isLast && styles.rowCardBorder, // bold divider between rows
                        isLast && styles.rowCardLastBorder, // special end-of-table border
                      ]}
                    >
                      <View style={styles.rowTop}>
                        <View style={styles.rowTopLeft}>
                          <Text style={styles.deviceTitle}>{deviceName(item)}</Text>
                          <Text style={styles.deviceSub}>SN {item.sn || '—'}</Text>
                        </View>

                        {/* Gas block: center title above the bar */}
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
                          <Text style={styles.blockLine}>{item.project_code || '—'}</Text>
                          <Text style={styles.blockMuted}>AFG {item.afg_bld_code || '—'}</Text>
                          <Text style={styles.blockMuted}>Client {item.client_bld_code || '—'}</Text>
                        </View>

                        <View style={styles.bottomDivider} />

                        <View style={styles.bottomCol}>
                          <Text style={styles.blockTitle}>Tank</Text>
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

  heroHeaderCard: { borderRadius: theme.radius.xl },
  heroHeaderClip: { borderRadius: theme.radius.xl, overflow: 'hidden', padding: 14 },

  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroTitleWrap: { flex: 1, paddingHorizontal: 2 },

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

  // FIX: remove border here to avoid double-outline (WowCard already has a stroke).
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

  // Darker + bold divider between each device (except last).
  rowCardBorder: {
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(15,23,42,0.30)',
  },

  // Special "end of table" border for ONLY the last device row.
  // Slightly thicker + even darker to clearly signify the list end.
  rowCardLastBorder: {
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(15,23,42,0.45)',
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

  // changed: align the whole gas block so it sits centered over the bar (not right-flush)
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

  // changed: center the title over the bar (more to the left than before)
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
});