import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import io from 'socket.io-client'

import { api } from '../Components/api'
import { theme } from '../Components/theme'
import WowCard from '../Components/WowCard'

const TERMINAL_ID = '230346'

function fmtTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '—'

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const dd = String(d.getDate()).padStart(2,'0')
  const mon = months[d.getMonth()]
  const yyyy = d.getFullYear()

  let hh = d.getHours()
  const ampm = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12
  if (hh === 0) hh = 12

  const mm = String(d.getMinutes()).padStart(2,'0')

  return `${dd} ${mon} ${yyyy} • ${hh}:${mm} ${ampm}`
}

export default function GasSensors() {
  const [status,setStatus] = useState(null)
  const [socketConnected,setSocketConnected] = useState(false)
  const [error,setError] = useState('')

  const socketRef = useRef(null)
  const pollRef = useRef(null)

  async function pollStatus() {
    try {
      const json = await api.deviceStatus(TERMINAL_ID)
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
      const data = map?.[TERMINAL_ID]
      if (data) setStatus(data)
    })

    socket.on('status_update',(payload)=>{
      if (String(payload?.terminal_id) === TERMINAL_ID) {
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

  // Solenoid condition unchanged: On if LEL > 25, else Off.
  const solenoidOn = online && Number(lel) > 25

  // UI color rules
  const gasSensorText = online ? 'Online' : 'Offline'
  const gasSensorColor = online ? theme.colors.green : theme.colors.red

  const solenoidText = !online ? '—' : solenoidOn ? 'On' : 'Off'
  const solenoidColor = !online ? theme.colors.textMuted : solenoidOn ? theme.colors.red : theme.colors.green

  // LEL rules:
  // - if offline -> hidden (because we hide everything underneath)
  // - <= 25 => green
  // - > 25 => red
  const lelNum = Number(lel)
  const lelIsNumber = Number.isFinite(lelNum)
  const lelText = !lelIsNumber ? 'N/A' : `${Math.round(lelNum)}%`
  const lelColor = !lelIsNumber ? theme.colors.textMuted : lelNum > 25 ? theme.colors.red : theme.colors.green

  return (
    <LinearGradient colors={[theme.colors.bgA,theme.colors.bgB]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.wrap}>

        <Text style={styles.title}>Gas Sensors</Text>

        <Text style={styles.realtime}>
          Realtime: {socketConnected ? 'Connected' : 'Disconnected'}
        </Text>

        <WowCard style={styles.card}>
          <Text style={styles.site}>Site name: Sonic Testing</Text>

          <Row
            label="Gas Sensor"
            value={gasSensorText}
            valueColor={gasSensorColor}
          />

          {/* If Gas Sensor is offline, hide everything underneath it. */}
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

  title:{
    fontSize:22,
    fontWeight:'900',
    color:theme.colors.text
  },

  realtime:{
    fontSize:12,
    fontWeight:'700',
    color:theme.colors.textMuted
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
  }

})