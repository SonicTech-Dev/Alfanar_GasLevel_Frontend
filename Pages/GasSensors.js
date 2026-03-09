import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing, Image } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import io from 'socket.io-client'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { api } from '../Components/api'
import { theme } from '../Components/theme'
import WowCard from '../Components/WowCard'
import { Icon } from '../Components/icons'
import { useViewMode } from '../App'

function MenuDrawer({
  open,
  onClose,
  onPressDashboard,
  onPressBrowseView,
  onPressGasSensors,
  onToggleBrowseMode,
  currentRoute = 'GasSensors',
  viewMode = 'grid',
}) {
  const insets = useSafeAreaInsets()
  const slide = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 1 : 0,
      duration: open ? 220 : 180,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [open, slide])

  const pointerEvents = open ? 'auto' : 'none'
  const panelW = 292

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-panelW - 16, 0],
  })

  const dimOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  const browseLabel = viewMode === 'command' ? 'Command View' : 'Grid View'
  const browseIcon = viewMode === 'command' ? 'cards-outline' : 'view-comfy'

  const isDashboard = currentRoute === 'Dashboard'
  const isGridView = currentRoute === 'ListView'
  const isCommandView = currentRoute === 'CommandView'
  const isBrowseActive = isGridView || isCommandView
  const isGasSensors = currentRoute === 'GasSensors'

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
          </Pressable>

          <View style={styles.menuDividerTop} />

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
        </View>
      </Animated.View>
    </View>
  )
}

export default function GasSensors({ navigation }) {
  const insets = useSafeAreaInsets()
  const { viewMode, toggleViewMode } = useViewMode()
  const [status,setStatus] = useState(null)
  const [socketConnected,setSocketConnected] = useState(false)
  const [error,setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const socketRef = useRef(null)
  const pollRef = useRef(null)

  async function pollStatus() {
    try {
      const json = await api.deviceStatus('230346')
      setStatus(json)
      setError('')
    } catch (e) {
      if (String(e.message).includes('401')) {
        setError('Please login to view sensor status.')
      } else {
        setError('Unable to fetch sensor status.')
      }
    }
  }

  function startPolling() {
    if (pollRef.current) return
    pollStatus()
    pollRef.current = setInterval(pollStatus,10000)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(()=>{

    const base = api.BASE_URL || 'https://gaslevel-alfanar.soniciot.com'

    const socket = io(base,{
      path:'/ws',
      transports:['websocket'],
      withCredentials:true
    })

    socketRef.current = socket

    socket.on('connect',()=>{
      setSocketConnected(true)
      stopPolling()
    })

    socket.on('disconnect',()=>{
      setSocketConnected(false)
      startPolling()
    })

    socket.on('init',(map)=>{
      const data = map?.['230346']
      if (data) setStatus(data)
    })

    socket.on('status_update',(payload)=>{
      if (String(payload?.terminal_id) === '230346') {
        setStatus(payload)
      }
    })

    socket.on('connect_error',()=>{
      setSocketConnected(false)
      startPolling()
    })

    return ()=>{
      stopPolling()
      socket.close()
    }

  },[])

  const online = status?.panelOnline === true
  const lel = online ? status?.lel : null

  const solenoidOn = online && Number(lel) > 25

  const gasSensorText = online ? 'Online' : 'Offline'
  const gasSensorColor = online ? theme.colors.green : theme.colors.red

  const solenoidText = !online ? '—' : solenoidOn ? 'On' : 'Off'
  const solenoidColor = !online ? theme.colors.textMuted : solenoidOn ? theme.colors.red : theme.colors.green

  const lelNum = Number(lel)
  const lelIsNumber = Number.isFinite(lelNum)
  const lelText = !lelIsNumber ? 'N/A' : `${Math.round(lelNum)}%`
  const lelColor = !lelIsNumber ? theme.colors.textMuted : lelNum > 25 ? theme.colors.red : theme.colors.green

  function handleToggleBrowseMode() {
    toggleViewMode()
  }

  const headerTopPad = Math.max(12, insets.top + 10)

  return (
    <LinearGradient colors={[theme.colors.bgA,theme.colors.bgB]} style={styles.screen}>
      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onPressDashboard={() => {
          setMenuOpen(false)
          navigation.navigate('Dashboard')
        }}
        onPressBrowseView={() => {
          setMenuOpen(false)
          navigation.navigate(viewMode === 'command' ? 'CommandView' : 'ListView')
        }}
        onPressGasSensors={() => {
          setMenuOpen(false)
        }}
        onToggleBrowseMode={handleToggleBrowseMode}
        currentRoute="GasSensors"
        viewMode={viewMode}
      />

      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: headerTopPad, paddingBottom: 28 }]}>
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
                        <Text style={styles.title}>Gas Sensor Monitoring</Text>
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

        <WowCard style={styles.card}>
          <Text style={styles.site}>Site name: Sonic Testing</Text>

          <Row
            label="Gas Sensor"
            value={gasSensorText}
            valueColor={gasSensorColor}
          />

          {online && (
            <>
              <Row
                label="Solenoid"
                value={solenoidText}
                valueColor={solenoidColor}
              />

              <Row
                label="LEL"
                value={lelText}
                valueColor={lelColor}
              />
            </>
          )}
        </WowCard>

        {!!error && (
          <Text style={styles.error}>{error}</Text>
        )}

      </ScrollView>
    </LinearGradient>
  )
}

function Row({label,value,valueColor}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({

  screen:{
    flex:1
  },

  wrap:{
    padding:20,
    gap:16
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
    gap: 10,
  },
  heroLeftBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
    paddingRight: 6,
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
    flexShrink: 0,
  },

  title:{
    marginTop: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight:'900',
    color:theme.colors.text,
    letterSpacing: 0.12,
    flexShrink: 1,
  },
  heroLogoWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
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

  card:{
    padding:16
  },

  site:{
    fontSize:15,
    fontWeight:'900',
    color:theme.colors.text,
    marginBottom:14
  },

  row:{
    flexDirection:'row',
    justifyContent:'space-between',
    marginBottom:10
  },

  label:{
    fontWeight:'800',
    color:theme.colors.textSecondary
  },

  value:{
    fontWeight:'900',
    color:theme.colors.text
  },

  error:{
    color:theme.colors.red,
    fontWeight:'700'
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

})