import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Animated,
  Easing,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../Components/api';
import { theme } from '../Components/theme';
import WowCard from '../Components/WowCard';
import { Icon } from '../Components/icons';
import { useAuthState, useViewMode } from '../App';

const FIXED_ROLE = 'viewer';

const PERMISSION_GROUPS = [
  {
    title: 'General Access',
    main: null,
    items: [
      ['perm_grid_view_access', 'Grid View'],
      ['perm_command_view_access', 'Command View'],
      ['perm_gas_sensors_access', 'Gas Sensor Monitoring'],
    ],
  },
  {
    title: 'Dashboard Permissions',
    main: ['perm_dashboard_access', 'Dashboard'],
    items: [
      ['perm_dashboard_summary_access', 'Dashboard Summary'],
      ['perm_dashboard_devices_access', 'Dashboard Devices'],
      ['perm_dashboard_consumption_access', 'Dashboard Consumption'],
    ],
  },
  {
    title: 'Document Tracker Permissions',
    main: ['perm_document_tracker_access', 'Document Tracker'],
    items: [
      ['perm_doc_create_site', 'Create Site'],
      ['perm_doc_edit_site_metadata', 'Edit Site Metadata'],
      ['perm_doc_delete_site', 'Delete Site'],
      ['perm_doc_import', 'Import'],
      ['perm_doc_export', 'Export'],
      ['perm_doc_manage_istifaa', 'Manage ISTIFAA'],
      ['perm_doc_manage_amc', 'Manage AMC'],
      ['perm_doc_manage_doe_noc', 'Manage DOE NOC'],
      ['perm_doc_manage_coc', 'Manage COC'],
      ['perm_doc_manage_tpi', 'Manage TPI'],
    ],
  },
  {
    title: 'Account Permissions',
    main: ['perm_account_management_access', 'Account Management'],
    items: [
      ['perm_account_create', 'Account Creator'],
    ],
  },
];

function emptyPermissions() {
  const out = {};
  PERMISSION_GROUPS.forEach((group) => {
    if (group.main) {
      out[group.main[0]] = false;
    }
    group.items.forEach(([key]) => {
      out[key] = false;
    });
  });
  return out;
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
  currentRoute = 'AccountCreator',
  viewMode = 'grid',
  permissions = {},
}) {
  const insets = useSafeAreaInsets();
  const slide = React.useRef(new Animated.Value(0)).current;
  const [accountOpen, setAccountOpen] = useState(currentRoute === 'AccountCreator');

  React.useEffect(() => {
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
  const canSeeAccount = !!permissions?.perm_account_management_access;

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
          {!!permissions?.perm_dashboard_access && (
            <>
              <Pressable onPress={onPressDashboard} style={[styles.menuItem, isDashboard && styles.menuItemActive]}>
                <View style={[styles.menuItemIcon, isDashboard && styles.menuItemIconActive]}>
                  <Icon name="view-dashboard-outline" size={18} color={isDashboard ? theme.colors.blue2 : theme.colors.textSecondary} />
                </View>
                <Text style={[styles.menuItemText, isDashboard && styles.menuItemTextActive]}>Dashboard</Text>
              </Pressable>
              <View style={styles.menuDividerTop} />
            </>
          )}

          {(canGrid || canCommand) && (
            <>
              <Pressable onPress={onPressBrowseView} style={[styles.menuItem, isBrowseActive && styles.menuItemActive]}>
                <View style={[styles.menuItemIcon, isBrowseActive && styles.menuItemIconActive]}>
                  <Icon name={browseIcon} size={18} color={isBrowseActive ? theme.colors.blue2 : theme.colors.textSecondary} />
                </View>
                <Text style={[styles.menuItemText, isBrowseActive && styles.menuItemTextActive]}>{browseLabel}</Text>
                <View style={{ flex: 1 }} />
                {canToggleBrowseMode && (
                  <Pressable onPress={onToggleBrowseMode} hitSlop={10} style={styles.modeSwitchBtn}>
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

          {!!permissions?.perm_gas_sensors_access && (
            <>
              <Pressable onPress={onPressGasSensors} style={[styles.menuItem, isGasSensors && styles.menuItemActive]}>
                <View style={[styles.menuItemIcon, isGasSensors && styles.menuItemIconActive]}>
                  <Icon name="cctv" size={18} color={isGasSensors ? theme.colors.blue2 : theme.colors.textSecondary} />
                </View>
                <Text style={[styles.menuItemText, isGasSensors && styles.menuItemTextActive]}>Gas Sensor Monitoring</Text>
              </Pressable>
              <View style={styles.menuDividerTop} />
            </>
          )}

          {!!permissions?.perm_document_tracker_access && (
            <>
              <Pressable onPress={onPressDocumentTracker} style={[styles.menuItem, isDocumentTracker && styles.menuItemActive]}>
                <View style={[styles.menuItemIcon, isDocumentTracker && styles.menuItemIconActive]}>
                  <Icon name="file-document-multiple-outline" size={18} color={isDocumentTracker ? theme.colors.blue2 : theme.colors.textSecondary} />
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
              >
                <View style={[styles.menuItemIcon, isAccountCreator && styles.menuItemIconActive]}>
                  <Icon name="account-cog-outline" size={18} color={isAccountCreator ? theme.colors.blue2 : theme.colors.textSecondary} />
                </View>
                <Text style={[styles.menuItemText, isAccountCreator && styles.menuItemTextActive]}>Account Management</Text>
                <View style={{ flex: 1 }} />
                <Icon name={accountOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
              </Pressable>

              {accountOpen && !!permissions?.perm_account_create && (
                <View style={styles.menuChildrenWrap}>
                  <Pressable onPress={onPressAccountCreator} style={styles.menuChildItem}>
                    <View style={styles.menuChildBullet}>
                      <Icon name="account-plus-outline" size={16} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={styles.menuChildText}>Account Creator</Text>
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

function PermissionSwitch({ label, value, onValueChange, compact = false, last = false }) {
  return (
    <View style={[styles.switchRow, compact && styles.switchRowCompact, last && styles.switchRowLast]}>
      <Text style={[styles.switchLabel, compact && styles.switchLabelCompact]}>{label}</Text>
      <Switch
        value={!!value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(148,163,184,0.35)', true: 'rgba(41,182,255,0.42)' }}
        thumbColor={value ? theme.colors.blue : '#F8FAFC'}
      />
    </View>
  );
}

function MainPermissionSwitch({ label, value, onValueChange }) {
  return (
    <LinearGradient
      colors={['rgba(214,235,255,0.42)', 'rgba(255,255,255,0.80)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.mainSwitchShell}
    >
      <View style={styles.mainSwitchRow}>
        <Text style={styles.mainSwitchLabel}>{label}</Text>
        <Switch
          value={!!value}
          onValueChange={onValueChange}
          trackColor={{ false: 'rgba(148,163,184,0.35)', true: 'rgba(41,182,255,0.42)' }}
          thumbColor={value ? theme.colors.blue : '#F8FAFC'}
        />
      </View>
    </LinearGradient>
  );
}

function NestedPermissionGroup({ items, permState, setPerm }) {
  return (
    <View style={styles.nestedGroupWrap}>
      <View style={styles.nestedGuideRail} />
      <View style={styles.nestedGroupCard}>
        {items.map(([key, label], idx) => (
          <PermissionSwitch
            key={key}
            label={label}
            value={permState[key]}
            onValueChange={(v) => setPerm(key, v)}
            compact
            last={idx === items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

export default function AccountCreator({ navigation }) {
  const insets = useSafeAreaInsets();
  const { viewMode, toggleViewMode } = useViewMode();
  const { permissions, authUser } = useAuthState();

  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permState, setPermState] = useState(emptyPermissions());
  const [submitting, setSubmitting] = useState(false);

  const canAccess = !!permissions?.perm_account_management_access && !!permissions?.perm_account_create;

  function setPerm(key, value) {
    setPermState((prev) => ({ ...prev, [key]: !!value }));
  }

  async function submit() {
    if (!canAccess) {
      Alert.alert('Forbidden', 'Your account cannot access Account Creator.');
      return;
    }

    if (!username.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter username and password.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        username: username.trim(),
        password,
        role: FIXED_ROLE,
        ...permState,
      };

      const result = await api.createAccount(payload);
      Alert.alert('Success', `Account ${result?.account?.username || username.trim()} created successfully.`);
      setUsername('');
      setPassword('');
      setPermState(emptyPermissions());
    } catch (e) {
      Alert.alert('Create failed', e?.message || 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleToggleBrowseMode() {
    toggleViewMode();
  }

  const headerTopPad = Math.max(12, insets.top + 10);

  if (!canAccess) {
    return (
      <LinearGradient colors={[theme.colors.bgA, theme.colors.bgB]} style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerTopPad, paddingBottom: 28 }]}>
          <WowCard>
            <Text style={styles.deniedTitle}>Access denied</Text>
            <Text style={styles.deniedText}>
              Your account does not have permission to access Account Creator.
            </Text>
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
          navigation.navigate('DocumentTracker');
        }}
        onPressAccountCreator={() => {
          setMenuOpen(false);
        }}
        onToggleBrowseMode={handleToggleBrowseMode}
        currentRoute="AccountCreator"
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
                        <Text style={styles.heroTitle}>Account Creator</Text>
                        <Text style={styles.heroSub}>Signed in as {authUser?.username || '—'}</Text>
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

        <WowCard style={styles.panel}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <View style={{ height: 12 }} />

          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={theme.colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </WowCard>

        {PERMISSION_GROUPS.map((group) => (
          <WowCard key={group.title} style={styles.panel}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <View style={{ height: 12 }} />

            {!!group.main ? (
              <>
                <MainPermissionSwitch
                  label={group.main[1]}
                  value={permState[group.main[0]]}
                  onValueChange={(v) => setPerm(group.main[0], v)}
                />
                <View style={{ height: 10 }} />
                <NestedPermissionGroup items={group.items} permState={permState} setPerm={setPerm} />
              </>
            ) : (
              group.items.map(([key, label], idx) => (
                <PermissionSwitch
                  key={key}
                  label={label}
                  value={permState[key]}
                  onValueChange={(v) => setPerm(key, v)}
                  last={idx === group.items.length - 1}
                />
              ))
            )}
          </WowCard>
        ))}

        <Pressable style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
          <Icon name="account-plus-outline" size={20} color="#fff" />
          <Text style={styles.submitBtnText}>{submitting ? 'Creating Account...' : 'Create Account'}</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },

  deniedTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: theme.colors.red,
  },
  deniedText: {
    marginTop: 8,
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
  },

  panel: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    color: theme.colors.text,
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

  mainSwitchShell: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(41,182,255,0.28)',
    overflow: 'hidden',
    shadowColor: '#29B6FF',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  mainSwitchRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mainSwitchLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: theme.colors.text,
  },

  nestedGroupWrap: {
    position: 'relative',
    paddingLeft: 16,
  },
  nestedGuideRail: {
    position: 'absolute',
    left: 7,
    top: 6,
    bottom: 6,
    width: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(41,182,255,0.18)',
  },
  nestedGroupCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    backgroundColor: 'rgba(248,250,252,0.55)',
    padding: 10,
  },

  switchRow: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.62)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  switchRowCompact: {
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(15,23,42,0.05)',
  },
  switchRowLast: {
    marginBottom: 0,
  },
  switchLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  switchLabelCompact: {
    fontSize: 13.5,
    color: theme.colors.textSecondary,
  },

  submitBtn: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    ...theme.shadow.hard,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 22,
  },

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
  heroSub: {
    marginTop: 6,
    color: theme.colors.textMuted,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
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