import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from './theme';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function OsmMap({
  height = 460,
  initialCenter = { lat: 25.2048, lng: 55.2708 },
  initialZoom = 10,
  markers = [], // [{ id, lat, lng, title, subtitle, color }]
  onSelectMarker, // (id) => void
}) {
  const html = useMemo(() => {
    const markersJson = JSON.stringify(
      markers.map((m) => ({
        id: String(m.id),
        lat: Number(m.lat),
        lng: Number(m.lng),
        title: escapeHtml(m.title),
        subtitle: escapeHtml(m.subtitle),
        color: m.color || theme.colors.blue,
      }))
    );

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body { margin:0; padding:0; height:100%; background:#fff; }
    #map { height:100%; width:100%; }
    .leaflet-control-attribution { font-size: 10px; }

    /*
      NOTE: Making attribution invisible may violate OpenStreetMap tile usage requirements.
      If you proceed anyway, this will hide it visually.
    */
    .leaflet-control-attribution {
      opacity: 0;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const markers = ${markersJson};
    const map = L.map('map', { zoomControl: true }).setView([${Number(initialCenter.lat)}, ${Number(initialCenter.lng)}], ${Number(initialZoom)});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const leafletMarkers = [];
    for (const m of markers) {
      const icon = L.divIcon({
        html: '<div style="width:22px;height:22px;border-radius:999px;background:'+m.color+';border:3px solid rgba(255,255,255,0.95);box-shadow:0 8px 18px rgba(0,0,0,.25)"></div>',
        iconSize: [22,22],
        iconAnchor: [11,11],
        className: ''
      });

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      marker.bindPopup('<div style="font-weight:700;margin-bottom:4px;">'+m.title+'</div><div style="font-size:12px;color:#64748B">'+m.subtitle+'</div>');
      marker.on('click', () => {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type:'select', id: m.id }));
      });
      leafletMarkers.push(marker);
    }

    try {
      if (leafletMarkers.length > 1) {
        const group = L.featureGroup(leafletMarkers);
        map.fitBounds(group.getBounds().pad(0.12));
      }
    } catch (e) {}
  </script>
</body>
</html>`;
  }, [markers, initialCenter.lat, initialCenter.lng, initialZoom]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
        onMessage={(ev) => {
          try {
            const msg = JSON.parse(ev.nativeEvent.data);
            if (msg?.type === 'select' && onSelectMarker) onSelectMarker(String(msg.id));
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: theme.radius.lg ?? 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.stroke ?? 'rgba(15,23,42,0.10)',
    backgroundColor: '#EAEAEA',
  },
});