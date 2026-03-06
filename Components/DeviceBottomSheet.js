import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Linking, StyleSheet, View, Pressable, Dimensions } from 'react-native'
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { Text, XStack, YStack } from 'tamagui'
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
  Circle,
  Rect,
  Line,
} from 'react-native-svg'
import { theme } from './theme'
import StatusPill from './StatusPill'
import { Icon } from './icons'
import { SkeletonBlock } from './Skeleton'
import { api } from './api'

function formatPercent(n) {
  if (n == null || !Number.isFinite(n)) return 'N/A'
  return `${Math.round(n)}%`
}

function normalizeWeirdIso(ts) {
  // Fixes strings like: 2026-03-05-05T14:00:00.000Z  (extra "-05" before the "T")
  const s = String(ts || '').trim()
  if (!s) return ''
  return s.replace(/^(\d{4}-\d{2}-\d{2})-\d{2}(T.*)$/i, '$1$2')
}

function fmtTsPretty(ts) {
  if (!ts) return '—'

  const raw = String(ts).trim()
  const normalized = normalizeWeirdIso(raw)

  let d = new Date(normalized)
  if (Number.isNaN(d.getTime())) {
    d = new Date(raw)
  }
  if (Number.isNaN(d.getTime())) return raw

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const dd = String(d.getDate()).padStart(2, '0')
  const mon = months[d.getMonth()] || ''
  const yyyy = String(d.getFullYear())

  let hh = d.getHours()
  const ampm = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12
  if (hh === 0) hh = 12
  const mm = String(d.getMinutes()).padStart(2, '0')

  return `${dd} ${mon} ${yyyy} • ${hh}:${mm} ${ampm}`
}

function fmtDayPretty(dayIso) {
  const s = String(dayIso || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || '—'
  const [yyyy, mm, dd] = s.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mon = months[(parseInt(mm, 10) || 1) - 1] || mm
  return `${dd} ${mon} ${yyyy}`
}

function InfoLine({ label, value }) {
  return (
    <YStack gap={6}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={3}>{value}</Text>
    </YStack>
  )
}

function TabButton({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabBtn,
        {
          backgroundColor: active ? 'rgba(22,119,200,0.14)' : 'rgba(255,255,255,0.40)',
          borderColor: active ? 'rgba(22,119,200,0.22)' : theme.colors.stroke,
        },
      ]}
    >
      <Text style={[styles.tabText, { color: active ? theme.colors.blue : theme.colors.textMuted }]}>{label}</Text>
    </Pressable>
  )
}

function Chip({ label, active, onPress, rightIcon }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? 'rgba(22,119,200,0.14)' : 'rgba(255,255,255,0.40)',
          borderColor: active ? 'rgba(22,119,200,0.22)' : theme.colors.stroke,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? theme.colors.blue : theme.colors.textMuted }]}>{label}</Text>
      {!!rightIcon && (
        <View style={{ marginLeft: 8 }}>
          <Icon name={rightIcon} size={16} color={active ? theme.colors.blue : theme.colors.textMuted} />
        </View>
      )}
    </Pressable>
  )
}

function round2(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return null
  return Math.round(v * 100) / 100
}

function clamp01(t) {
  if (!Number.isFinite(t)) return 0
  return Math.min(1, Math.max(0, t))
}

function niceNumber(x) {
  // Classic "nice ticks" helper: 1/2/5*10^n.
  const v = Number(x)
  if (!Number.isFinite(v) || v <= 0) return 1
  const exp = Math.floor(Math.log10(v))
  const f = v / Math.pow(10, exp)
  let nf = 1
  if (f <= 1) nf = 1
  else if (f <= 2) nf = 2
  else if (f <= 5) nf = 5
  else nf = 10
  return nf * Math.pow(10, exp)
}

function buildTicks(min, max, approxCount = 5) {
  const a = Number(min)
  const b = Number(max)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [0, 1, 2, 3, 4]
  if (a === b) return [a, a + 1, a + 2, a + 3, a + 4]

  const span = b - a
  const step = niceNumber(span / Math.max(1, (approxCount - 1)))
  const start = Math.floor(a / step) * step
  const end = Math.ceil(b / step) * step

  const ticks = []
  for (let v = start; v <= end + step * 0.5; v += step) ticks.push(v)

  while (ticks.length < 5) {
    const last = ticks[ticks.length - 1] ?? end
    ticks.push(last + step)
  }
  return ticks
}

function fmtDayLabel(dayIso) {
  // dayIso: YYYY-MM-DD
  const s = String(dayIso || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const mm = s.slice(5, 7)
  const dd = s.slice(8, 10)
  return `${dd}/${mm}`
}

function formatYLabel(v, unit) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  if (unit === 'percent') return `${Math.round(n)}`
  if (Math.abs(n) >= 100) return String(Math.round(n))
  return String(round2(n) ?? n)
}

function computeXTickIdx(pointsLen, rangeDays) {
  const n = Math.max(0, Number(pointsLen) || 0)
  if (n <= 0) return []
  if (n <= 6) return Array.from({ length: n }, (_, i) => i)
  if (rangeDays <= 7) return Array.from({ length: n }, (_, i) => i)

  const desired = rangeDays <= 30 ? 6 : 7
  const step = Math.max(1, Math.round((n - 1) / (desired - 1)))

  const idx = []
  for (let i = 0; i < n; i += step) idx.push(i)
  if (idx[idx.length - 1] !== n - 1) idx.push(n - 1)
  return Array.from(new Set(idx)).sort((a, b) => a - b)
}

function isTooCloseY(a, b, minGapPx) {
  return Math.abs(a - b) < minGapPx
}

function chooseNonClumpingYLabels(ticks, yToPx, minGapPx = 18) {
  const out = []
  for (const t of ticks) {
    const y = yToPx(t)
    const last = out.length ? out[out.length - 1] : null
    if (!last) {
      out.push({ t, y })
      continue
    }
    if (!isTooCloseY(last.y, y, minGapPx)) {
      out.push({ t, y })
    }
  }
  return out
}

function isTooCloseX(a, b, minGapPx) {
  return Math.abs(a - b) < minGapPx
}

function chooseNonClumpingXLabels(xTickIdx, pointsXY, minGapPx = 44) {
  const out = []
  for (const i of xTickIdx) {
    const p = pointsXY[i]
    if (!p) continue
    const last = out.length ? out[out.length - 1] : null
    if (!last) {
      out.push({ i, x: p.x, day: p.day })
      continue
    }
    if (!isTooCloseX(last.x, p.x, minGapPx)) {
      out.push({ i, x: p.x, day: p.day })
    }
  }
  return out
}

function ValueTooltip({ visible, x, y, unit, value, day, onClose, chartW }) {
  if (!visible) return null

  const unitSuffix = unit === 'percent' ? '%/day' : 'L/day'
  const valTxt = value == null || !Number.isFinite(Number(value)) ? '—' : `${formatYLabel(value, unit)} ${unitSuffix}`
  const dayTxt = fmtDayPretty(day)

  const maxW = 210
  // position relative to chart, not full screen
  const left = Math.max(10, Math.min((x || 0) - maxW / 2, Math.max(10, (chartW || 0) - maxW - 10)))
  const top = Math.max(8, (y || 0) - 76)

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close tooltip">
      <View style={[styles.tooltip, { left, top, width: maxW }]}>
        <Text style={styles.tooltipValue}>{valTxt}</Text>
        <Text style={styles.tooltipDate}>{dayTxt}</Text>
      </View>
    </Pressable>
  )
}

function SeriesChart({
  unit = 'liters', // 'liters' | 'percent'
  points = [], // [{ day, value, readings }]
  yDomain, // { min, max } optional
  title,
  subtitle,
  emptyMessage,
  loading,
  rangeDays,
}) {
  const chartW = Math.max(320, Dimensions.get('window').width - 56)
  const chartH = 220

  // Extra padding to avoid label collisions
  const padL = 64
  const padR = 18
  const padT = 18
  const padB = 54

  const innerW = Math.max(1, chartW - padL - padR)
  const innerH = Math.max(1, chartH - padT - padB)

  const finite = (points || [])
    .map((p) => (p && p.value != null ? Number(p.value) : null))
    .filter((v) => v != null && Number.isFinite(v))

  const hasData = finite.length >= 1 && (points || []).length >= 2

  const y = useMemo(() => {
    if (yDomain && Number.isFinite(yDomain.min) && Number.isFinite(yDomain.max) && yDomain.max > yDomain.min) {
      return { min: Math.max(0, Number(yDomain.min)), max: Number(yDomain.max) }
    }
    if (!finite.length) return { min: 0, max: 1 }
    let min = Math.min(...finite)
    let max = Math.max(...finite)
    if (min === max) {
      if (max === 0) return { min: 0, max: 1 }
      const pad = Math.max(0.05 * Math.abs(max), 0.5)
      return { min: Math.max(0, min - pad), max: max + pad }
    }
    min = Math.max(0, min)
    const span = max - min
    const pad = span * 0.08
    return { min: Math.max(0, min - pad), max: max + pad }
  }, [finite, yDomain])

  const ticks = useMemo(() => buildTicks(y.min, y.max, 6), [y.max, y.min])

  const pointsXY = useMemo(() => {
    const list = Array.isArray(points) ? points : []
    if (list.length <= 1) return []
    const denom = Math.max(1, list.length - 1)

    return list.map((p, i) => {
      const t = i / denom
      const raw = p && p.value != null ? Number(p.value) : null
      const v = raw != null && Number.isFinite(raw) ? raw : null

      const x = padL + t * innerW
      const vv = v == null ? 0 : v
      const ty = (vv - y.min) / Math.max(1e-9, (y.max - y.min))
      const yPx = padT + (1 - clamp01(ty)) * innerH
      return { x, y: yPx, v, day: p?.day, raw: p }
    })
  }, [innerH, innerW, padL, padT, points, y.max, y.min])

  const lineD = useMemo(() => {
    if (!hasData || pointsXY.length < 2) return ''
    let d = ''
    for (let i = 0; i < pointsXY.length; i++) {
      const p = pointsXY[i]
      if (p.v == null) continue
      if (!d) d = `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
      else d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
    }
    return d
  }, [hasData, pointsXY])

  const areaD = useMemo(() => {
    if (!lineD) return ''
    const baselineY = padT + innerH
    const valid = pointsXY.filter((p) => p.v != null)
    if (valid.length < 2) return ''
    const first = valid[0]
    const last = valid[valid.length - 1]
    return `${lineD} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(
      2
    )} Z`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerH, lineD, padT])

  const unitLabel = unit === 'percent' ? '%/day' : 'L/day'

  const plotX = padL
  const plotY = padT
  const plotW = innerW
  const plotH = innerH

  const yToPx = useMemo(() => {
    return (tv) => {
      const ty = (Number(tv) - y.min) / Math.max(1e-9, (y.max - y.min))
      return padT + (1 - clamp01(ty)) * innerH
    }
  }, [innerH, padT, y.max, y.min])

  const yLabels = useMemo(() => {
    const base = ticks.map((t) => ({ t, y: yToPx(t) }))
    const sorted = base.slice().sort((a, b) => a.y - b.y)
    return chooseNonClumpingYLabels(sorted.map((x) => x.t), yToPx, 18)
      .slice()
      .sort((a, b) => a.y - b.y)
  }, [ticks, yToPx])

  const xTickIdx = useMemo(() => computeXTickIdx(pointsXY.length, rangeDays || pointsXY.length), [pointsXY.length, rangeDays])
  const xLabels = useMemo(() => chooseNonClumpingXLabels(xTickIdx, pointsXY, 56), [pointsXY, xTickIdx])

  // Tooltip state (tap on points)
  const [tip, setTip] = useState(null) // { x, y, value, day }
  const tipTimerRef = useRef(null)

  function closeTip() {
    setTip(null)
    if (tipTimerRef.current) {
      clearTimeout(tipTimerRef.current)
      tipTimerRef.current = null
    }
  }

  function openTipForPoint(p) {
    if (!p) return
    const newTip = { x: p.x, y: p.y, value: p.v, day: p.day }
    setTip(newTip)
    if (tipTimerRef.current) clearTimeout(tipTimerRef.current)
    tipTimerRef.current = setTimeout(() => {
      setTip(null)
      tipTimerRef.current = null
    }, 4500)
  }

  useEffect(() => {
    return () => {
      if (tipTimerRef.current) clearTimeout(tipTimerRef.current)
    }
  }, [])

  // Axis captions: centered on axes, moved away from tick labels
  const axisValueTop = padT + plotH / 2 - 10
  const axisDayLeft = padL + plotW / 2 - 12

  return (
    <View style={styles.chartCard}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{subtitle}</Text>
        </View>
        <View style={styles.chartUnitPill}>
          <Text style={styles.chartUnitPillText}>{unitLabel}</Text>
        </View>
      </View>

      <View style={{ height: 12 }} />

      <View style={[styles.svgChartWrap, { width: chartW, height: chartH }]}>
        <Svg width={chartW} height={chartH}>
          <Defs>
            <SvgLinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="rgba(214,235,255,0.26)" />
              <Stop offset="1" stopColor="rgba(255,255,255,0.12)" />
            </SvgLinearGradient>

            <SvgLinearGradient id="plotGlass" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="rgba(255,255,255,0.40)" />
              <Stop offset="1" stopColor="rgba(214,235,255,0.18)" />
            </SvgLinearGradient>

            <SvgLinearGradient id="line" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="rgba(22,119,200,0.94)" />
              <Stop offset="1" stopColor="rgba(41,182,255,0.94)" />
            </SvgLinearGradient>

            <SvgLinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="rgba(22,119,200,0.24)" />
              <Stop offset="1" stopColor="rgba(22,119,200,0.02)" />
            </SvgLinearGradient>
          </Defs>

          {/* full card background */}
          <Rect x="0" y="0" width={chartW} height={chartH} rx="18" ry="18" fill="url(#bg)" />

          {/* inner plot area glass */}
          <Rect x={plotX} y={plotY} width={plotW} height={plotH} rx="14" ry="14" fill="url(#plotGlass)" opacity={0.92} />
          <Rect x={plotX} y={plotY} width={plotW} height={plotH} rx="14" ry="14" fill="transparent" stroke="rgba(15,23,42,0.10)" strokeWidth="1" />

          {/* Axes */}
          <Line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="rgba(15,23,42,0.18)" strokeWidth={1} />
          <Line x1={padL} y1={padT + innerH} x2={chartW - padR} y2={padT + innerH} stroke="rgba(15,23,42,0.18)" strokeWidth={1} />

          {/* gridlines + Y tick marks */}
          {yLabels.map((row, idx) => {
            const tv = row.t
            const yPx = row.y
            const isMid = idx === Math.floor(yLabels.length / 2)
            return (
              <React.Fragment key={`gy-${String(tv)}-${idx}`}>
                <Line x1={padL} y1={yPx} x2={chartW - padR} y2={yPx} stroke={isMid ? 'rgba(15,23,42,0.12)' : 'rgba(15,23,42,0.07)'} strokeWidth={1} />
                <Line x1={padL - 6} y1={yPx} x2={padL} y2={yPx} stroke="rgba(15,23,42,0.20)" strokeWidth={1} />
              </React.Fragment>
            )
          })}

          {/* X tick marks + faint vertical guides */}
          {xLabels.map((xRow) => {
            const x = xRow.x
            return (
              <React.Fragment key={`xt-${xRow.i}`}>
                <Line x1={x} y1={padT + innerH} x2={x} y2={padT + innerH + 6} stroke="rgba(15,23,42,0.20)" strokeWidth={1} />
                <Line x1={x} y1={padT} x2={x} y2={padT + innerH} stroke="rgba(15,23,42,0.05)" strokeWidth={1} />
              </React.Fragment>
            )
          })}

          {/* area fill */}
          {!!areaD && <Path d={areaD} fill="url(#area)" />}

          {/* line */}
          {!!lineD && <Path d={lineD} stroke="url(#line)" strokeWidth="3.7" fill="none" />}

          {/* points */}
          {hasData &&
            pointsXY.map((p, idx) => {
              if (p.v == null) return null
              return (
                <Circle
                  key={`pt-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r="2.4"
                  fill="rgba(255,255,255,0.95)"
                  stroke="rgba(22,119,200,0.55)"
                  strokeWidth="1.2"
                />
              )
            })}

          {/* end cap */}
          {(() => {
            const valid = pointsXY.filter((p) => p.v != null)
            if (!valid.length) return null
            const last = valid[valid.length - 1]
            return (
              <>
                <Circle cx={last.x} cy={last.y} r="6" fill="rgba(255,255,255,0.96)" />
                <Circle cx={last.x} cy={last.y} r="3.6" fill={theme.colors.blue} />
              </>
            )
          })()}
        </Svg>

        {/* tappable hit targets for each point */}
        {hasData &&
          pointsXY.map((p, idx) => {
            if (p.v == null) return null
            const size = 28
            const left = p.x - size / 2
            const top = p.y - size / 2
            return (
              <Pressable
                key={`hit-${idx}`}
                onPress={() => openTipForPoint(p)}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width: size,
                  height: size,
                }}
                hitSlop={10}
                accessibilityLabel={`Show value for ${p.day}`}
              />
            )
          })}

        {/* Axis labels overlay */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { paddingLeft: 0, paddingRight: 0 }]}>
          {/* Y labels */}
          {yLabels.map((row, idx) => (
            <View
              key={`yl-${idx}-${String(row.t)}`}
              style={{
                position: 'absolute',
                left: 8,
                top: row.y - 9,
                width: padL - 18,
                alignItems: 'flex-end',
              }}
            >
              <Text style={styles.axisLabel}>{formatYLabel(row.t, unit)}</Text>
            </View>
          ))}

          {/* Axis captions */}
          <View style={{ position: 'absolute', left: 2, top: axisValueTop, width: padL - 22, alignItems: 'flex-start' }}>
            <Text style={styles.axisCaptionSide}>Value</Text>
          </View>

          <View style={{ position: 'absolute', left: axisDayLeft, bottom: 2, width: 40, alignItems: 'center' }}>
            <Text style={styles.axisCaptionBottom}>Day</Text>
          </View>

          {/* X labels */}
          {xLabels.map((xRow) => {
            const lbl = fmtDayLabel(xRow.day)
            const boxW = 54
            const left = Math.max(padL, Math.min(xRow.x - boxW / 2, chartW - padR - boxW))
            return (
              <View
                key={`xl-${xRow.i}`}
                style={{
                  position: 'absolute',
                  left,
                  bottom: 18,
                  width: boxW,
                  alignItems: 'center',
                }}
              >
                <Text style={styles.axisLabel}>{lbl}</Text>
              </View>
            )
          })}

          {/* empty / loading overlay */}
          {(loading || !hasData || !!emptyMessage) && (
            <View style={styles.chartOverlayEmpty}>
              {loading ? (
                <View style={{ width: '86%' }}>
                  <SkeletonBlock height={12} width="62%" radius={10} />
                  <View style={{ height: 10 }} />
                  <SkeletonBlock height={12} width="78%" radius={10} />
                  <View style={{ height: 14 }} />
                  <SkeletonBlock height={40} width="100%" radius={14} />
                </View>
              ) : (
                <Text style={styles.chartEmptyText}>{emptyMessage || 'Not enough data to plot trend.'}</Text>
              )}
            </View>
          )}
        </View>

        {/* Tooltip overlay */}
        <ValueTooltip
          visible={!!tip}
          x={tip?.x}
          y={tip?.y}
          unit={unit}
          value={tip?.value}
          day={tip?.day}
          chartW={chartW}
          onClose={closeTip}
        />
      </View>
    </View>
  )
}

/**
 * Exported EXACT consumption chart section, extracted from DeviceBottomSheet's "Consumption" tab.
 * This allows reuse (0 chart logic changes) in other screens/modals (e.g., Dashboard ConsumptionDetailsModal).
 */
export function ConsumptionChartSection({ terminalId }) {
  // IMPORTANT: All hooks must be called unconditionally and in the same order every render.

  // ONLY: 7D and 30D
  const RANGE_OPTIONS = useMemo(() => ([
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
  ]), [])

  const [rangeDays, setRangeDays] = useState(30)
  const [unit, setUnit] = useState('liters') // 'liters' | 'percent'
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [seriesError, setSeriesError] = useState('')
  const [series, setSeries] = useState(null) // response json

  const capacityMissing = useMemo(() => {
    const cap = series?.capacity_liters
    return cap == null || !Number.isFinite(Number(cap))
  }, [series?.capacity_liters])

  const chartEmptyMessage = useMemo(() => {
    if (seriesLoading) return ''
    if (seriesError) return seriesError

    if (unit === 'liters' && capacityMissing) {
      return 'Please set tank capacity to activate chart functionality.'
    }

    const pts = Array.isArray(series?.points) ? series.points : []
    const anyValue = pts.some((p) => p && p.value != null && Number.isFinite(Number(p.value)))
    if (!anyValue) return 'Not enough data to plot trend.'
    return ''
  }, [capacityMissing, series?.points, seriesError, seriesLoading, unit])

  const effectivePoints = useMemo(() => {
    const pts = Array.isArray(series?.points) ? series.points : []
    if (unit === 'liters' && capacityMissing) return []
    return pts
  }, [capacityMissing, series?.points, unit])

  const chartSubtitle = useMemo(() => {
    // Keep "Liters/day" / "%/day" wording (requested), but remove the forbidden phrases.
    return unit === 'liters' ? 'Liters/day' : '%/day'
  }, [unit])

  useEffect(() => {
    // Reset series state when device changes
    setSeries(null)
    setSeriesError('')
    setSeriesLoading(false)
    setUnit('liters')
    setRangeDays(30)
  }, [terminalId])

  useEffect(() => {
    let alive = true

    async function load() {
      if (!terminalId) return

      setSeriesError('')
      setSeriesLoading(true)
      try {
        const json = await api.consumptionSeries(String(terminalId), { rangeDays, unit })
        if (!alive) return
        setSeries(json)
      } catch (e) {
        if (!alive) return
        setSeries(null)
        setSeriesError(e?.message || 'Failed to load consumption chart.')
      } finally {
        if (!alive) return
        setSeriesLoading(false)
      }
    }

    load()

    return () => { alive = false }
  }, [rangeDays, terminalId, unit])

  return (
    <YStack gap={12}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Consumption</Text>

        <View style={{ height: 12 }} />

        <Text style={styles.miniLabel}>Range</Text>
        <XStack gap={10} flexWrap="wrap">
          {RANGE_OPTIONS.map((o) => (
            <Chip
              key={o.days}
              label={o.label}
              active={rangeDays === o.days}
              onPress={() => setRangeDays(o.days)}
              rightIcon={rangeDays === o.days ? 'check' : null}
            />
          ))}
        </XStack>

        <View style={{ height: 12 }} />

        <Text style={styles.miniLabel}>Unit</Text>
        <XStack gap={10} flexWrap="wrap">
          <Chip
            label="Liters/day"
            active={unit === 'liters'}
            onPress={() => setUnit('liters')}
            rightIcon={unit === 'liters' ? 'check' : null}
          />
          <Chip
            label="%/day"
            active={unit === 'percent'}
            onPress={() => setUnit('percent')}
            rightIcon={unit === 'percent' ? 'check' : null}
          />
        </XStack>
      </View>

      <SeriesChart
        unit={unit}
        title={`Last ${rangeDays} days`}
        subtitle={chartSubtitle}
        points={effectivePoints}
        yDomain={series?.y}
        loading={seriesLoading}
        emptyMessage={chartEmptyMessage}
        rangeDays={rangeDays}
      />
    </YStack>
  )
}

export default function DeviceBottomSheet({
  sheetRef,
  device,
  onClose,
  consumptionRow,
}) {
  // IMPORTANT: All hooks must be called unconditionally and in the same order every render.
  // The previous hook-order warning typically appears if a component returns early before
  // reaching later hooks or if hooks are placed in conditional blocks.

  const snapPoints = useMemo(() => ['22%', '55%', '90%'], [])
  const [tab, setTab] = useState('Status')

  const terminalId = device?.terminal_id ? String(device.terminal_id) : null

  const pillType = useMemo(() => {
    if (!device) return 'unknown'
    if (device.lastValue == null || !Number.isFinite(device.lastValue)) return 'offline'
    const val = device.lastValue
    const min = device.lpg_min_level != null ? Number(device.lpg_min_level) : null
    const max = device.lpg_max_level != null ? Number(device.lpg_max_level) : null
    if (min != null && Number.isFinite(min) && val < min) return 'min'
    if (max != null && Number.isFinite(max) && val > max) return 'max'
    if (min == null && max == null) return 'unknown'
    return 'normal'
  }, [device])

  const minLabel = device?.lpg_min_level ?? '—'
  const maxLabel = device?.lpg_max_level ?? '—'
  const lastPretty = fmtTsPretty(device?.lastTimestamp)

  async function openLocation(url) {
    const link = (url || '').trim()
    if (!link) return
    const ok = await Linking.canOpenURL(link).catch(() => false)
    if (ok) Linking.openURL(link)
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: 'rgba(255,255,255,0.96)' }}
      handleIndicatorStyle={{ backgroundColor: 'rgba(15,23,42,0.18)', width: 56 }}
    >
      {!device ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Select a device</Text>
          <Text style={styles.emptySub}>Tap a marker or a device row to open details.</Text>
        </View>
      ) : (
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          <XStack alignItems="center" justifyContent="space-between" gap={12}>
            <YStack flex={1} gap={6}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {(device.title || device.site || '').trim() || String(device.terminal_id)}
              </Text>
              <Text style={styles.sheetSub}>
                SN {device.sn || '—'}
              </Text>
            </YStack>

            <StatusPill type={pillType} />
          </XStack>

          <View style={{ height: 12 }} />

          <XStack gap={10} flexWrap="wrap">
            <TabButton label="Status" active={tab === 'Status'} onPress={() => setTab('Status')} />
            <TabButton label="Location" active={tab === 'Location'} onPress={() => setTab('Location')} />
            <TabButton label="Consumption" active={tab === 'Consumption'} onPress={() => setTab('Consumption')} />
          </XStack>

          <View style={{ height: 14 }} />

          {tab === 'Status' && (
            <YStack gap={12}>
              <View style={styles.bigMetricCard}>
                <Text style={styles.bigMetricLabel}>Current Level</Text>
                <Text style={styles.bigMetricValue}>{formatPercent(device.lastValue)}</Text>

                <View style={{ height: 10 }} />
                <Text style={styles.bigMetricMeta}>Minimum Level: {minLabel}</Text>
                <Text style={styles.bigMetricMeta}>Maximum Level: {maxLabel}</Text>
                <View style={{ height: 8 }} />
                <Text style={styles.bigMetricMeta}>Last updated: {lastPretty}</Text>
              </View>

              <View style={styles.sectionCard}>
                <InfoLine label="Project Code" value={device.project_code || '—'} />
                <View style={{ height: 10 }} />
                <InfoLine label="AFG Bld Code" value={device.afg_bld_code || '—'} />
                <View style={{ height: 10 }} />
                <InfoLine label="Client Bld Code" value={device.client_bld_code || '—'} />
                <View style={{ height: 10 }} />
                <InfoLine label="LPG Tank Type" value={device.lpg_tank_type || '—'} />
                <View style={{ height: 10 }} />
                <InfoLine label="LPG Installation Type" value={device.lpg_installation_type || '—'} />
                <View style={{ height: 10 }} />
                <InfoLine label="LPG Tank Details" value={device.lpg_tank_details || '—'} />
              </View>
            </YStack>
          )}

          {tab === 'Location' && (
            <YStack gap={12}>
              <View style={styles.sectionCard}>
                <InfoLine label="Emirate" value={device.emirate || '—'} />
                <View style={{ height: 10 }} />

                <InfoLine label="Building / Company" value={device.building_name || '—'} />
                <View style={{ height: 10 }} />

                <InfoLine label="Address" value={device.address || '—'} />
                <View style={{ height: 10 }} />

                <InfoLine label="Latitude" value={device.lat != null ? String(device.lat) : '—'} />
                <View style={{ height: 10 }} />
                <InfoLine label="Longitude" value={device.lng != null ? String(device.lng) : '—'} />
              </View>

              <Pressable
                onPress={() => openLocation(device.locationLink)}
                disabled={!device.locationLink}
                style={[
                  styles.primaryBtn,
                  { opacity: device.locationLink ? 1 : 0.45 },
                ]}
              >
                <Icon name="map-marker-radius" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Open in Maps</Text>
              </Pressable>
            </YStack>
          )}

          {tab === 'Consumption' && (
            <ConsumptionChartSection terminalId={terminalId} />
          )}

          <View style={{ height: 18 }} />
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },

  emptyWrap: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
  },
  emptySub: {
    marginTop: 6,
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },

  sheetTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  sheetSub: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },

  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '900',
  },

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '900',
  },

  miniLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    color: theme.colors.textMuted,
    marginBottom: 8,
  },

  bigMetricCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(22,119,200,0.22)',
    backgroundColor: 'rgba(214,235,255,0.28)',
    padding: 14,
  },
  bigMetricLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.textMuted,
  },
  bigMetricValue: {
    marginTop: 8,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    color: theme.colors.text,
  },
  bigMetricMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },

  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.stroke,
    backgroundColor: 'rgba(255,255,255,0.70)',
    padding: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.text,
  },
  sectionSub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },

  infoLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },

  primaryBtn: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },

  chartCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: 'rgba(255,255,255,0.70)',
    padding: 14,
  },
  chartUnitPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(22,119,200,0.18)',
    backgroundColor: 'rgba(214,235,255,0.30)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartUnitPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    color: theme.colors.blue,
  },

  svgChartWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  chartOverlayEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chartEmptyText: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  axisLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    color: theme.colors.textMuted,
  },
  axisCaptionSide: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    color: 'rgba(15,23,42,0.46)',
  },
  axisCaptionBottom: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    color: 'rgba(15,23,42,0.46)',
  },

  tooltip: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0B1220',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tooltipValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    color: theme.colors.text,
  },
  tooltipDate: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
})