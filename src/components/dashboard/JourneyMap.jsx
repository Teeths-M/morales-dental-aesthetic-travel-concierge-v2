/**
 * JourneyMap — Patient's spatial orientation card.
 *
 * Shows hotel (🛏️) and clinic (🏥) pins on an interactive OpenStreetMap.
 * A dashed gold route line connects the two. Tapping a pin shows the address
 * and a "Open in Maps" link. A "Directions" button opens Google Maps routing.
 *
 * Uses react-leaflet + OpenStreetMap (free, no API key).
 * Falls back to a glass-morphism placeholder when coordinates are unavailable.
 *
 * Props:
 *   hotelCoords   { lat, lng } | null
 *   hotelName     string
 *   hotelAddress  string
 *   clinicCoords  { lat, lng } | null
 *   clinicAddress string
 */
import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const GOLD = '#D4AF37';

// Fix Vite/Webpack stripping Leaflet's default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Emoji div icons — premium feel, no image dependency
function makeEmojiIcon(emoji) {
  return L.divIcon({
    html: `<span style="font-size:28px;display:block;line-height:1;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6));">${emoji}</span>`,
    className: '',
    iconSize:   [36, 36],
    iconAnchor: [18, 32],
    popupAnchor:[0, -34],
  });
}

const HOTEL_ICON  = makeEmojiIcon('🛏️');
const CLINIC_ICON = makeEmojiIcon('🏥');

// Auto-fit the map viewport to show both markers with padding
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds?.length === 2) {
      map.fitBounds(bounds, { padding: [44, 44] });
    }
  }, [map, JSON.stringify(bounds)]);
  return null;
}

export default function JourneyMap({ hotelCoords, hotelName, hotelAddress, clinicCoords, clinicAddress }) {
  const hasHotel  = !!(hotelCoords?.lat  && hotelCoords?.lng);
  const hasClinic = !!(clinicCoords?.lat && clinicCoords?.lng);
  const hasBoth   = hasHotel && hasClinic;
  const hasAny    = hasHotel || hasClinic;

  const center = useMemo(() => {
    if (hasBoth)   return [(hotelCoords.lat + clinicCoords.lat) / 2, (hotelCoords.lng + clinicCoords.lng) / 2];
    if (hasHotel)  return [hotelCoords.lat,  hotelCoords.lng];
    if (hasClinic) return [clinicCoords.lat, clinicCoords.lng];
    return [10, 0];
  }, [hasBoth, hasHotel, hasClinic, hotelCoords, clinicCoords]);

  const bounds = useMemo(() => hasBoth
    ? [[hotelCoords.lat, hotelCoords.lng], [clinicCoords.lat, clinicCoords.lng]]
    : null,
  [hasBoth, hotelCoords, clinicCoords]);

  const routePositions = useMemo(() => hasBoth
    ? [[hotelCoords.lat, hotelCoords.lng], [clinicCoords.lat, clinicCoords.lng]]
    : null,
  [hasBoth, hotelCoords, clinicCoords]);

  const directionsUrl = hasBoth
    ? `https://www.google.com/maps/dir/${hotelCoords.lat},${hotelCoords.lng}/${clinicCoords.lat},${clinicCoords.lng}`
    : null;

  return (
    <div style={{
      background:   '#060B16',
      border:       `1px solid ${GOLD}28`,
      borderRadius: 20,
      overflow:     'hidden',
    }}>
      {/* ── Card header ── */}
      <div style={{
        padding:       '14px 18px',
        borderBottom:  '1px solid rgba(255,255,255,0.06)',
        display:       'flex',
        alignItems:    'center',
        gap:           10,
        background:    'rgba(12,26,29,0.9)',
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>🗺️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>
            Your Journey Map
          </p>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>
            {hasBoth ? 'Hotel → Clinic · tap pins for details & directions'
              : hasHotel ? 'Hotel located · clinic location pending'
              : hasClinic ? 'Clinic located · hotel pending'
              : 'Finalizing your travel details…'}
          </p>
        </div>
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flexShrink:    0,
              fontSize:      11,
              fontWeight:    700,
              color:         GOLD,
              textDecoration:'none',
              padding:       '5px 14px',
              border:        `1px solid ${GOLD}40`,
              borderRadius:  999,
              whiteSpace:    'nowrap',
            }}
          >
            🧭 Directions
          </a>
        )}
      </div>

      {/* ── Map or placeholder ── */}
      {hasAny ? (
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: 290, width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          {/* Dark-tinted OSM tiles — CartoDB dark matter for premium feel */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />
          {bounds && <FitBounds bounds={bounds} />}

          {/* Hotel marker */}
          {hasHotel && (
            <Marker position={[hotelCoords.lat, hotelCoords.lng]} icon={HOTEL_ICON}>
              <Popup maxWidth={220}>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 180 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#111' }}>
                    🛏️ {hotelName || 'Your Hotel'}
                  </p>
                  {hotelAddress && (
                    <p style={{ margin: 0, fontSize: 11, color: '#555', lineHeight: 1.5 }}>
                      {hotelAddress}
                    </p>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${hotelCoords.lat},${hotelCoords.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#0a7', fontWeight: 600 }}
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Clinic marker */}
          {hasClinic && (
            <Marker position={[clinicCoords.lat, clinicCoords.lng]} icon={CLINIC_ICON}>
              <Popup maxWidth={220}>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 180 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 13, color: '#111' }}>
                    🏥 Your Clinic
                  </p>
                  {clinicAddress && (
                    <p style={{ margin: 0, fontSize: 11, color: '#555', lineHeight: 1.5 }}>
                      {clinicAddress}
                    </p>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${clinicCoords.lat},${clinicCoords.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#0a7', fontWeight: 600 }}
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dashed gold route line */}
          {routePositions && (
            <Polyline
              positions={routePositions}
              pathOptions={{ color: GOLD, weight: 2.5, opacity: 0.75, dashArray: '7 9', lineCap: 'round' }}
            />
          )}
        </MapContainer>
      ) : (
        /* Placeholder when no coordinates yet */
        <div style={{
          height:          220,
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          gap:             12,
          background:      'rgba(6,11,22,0.8)',
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(212,175,55,0.04) 0%, transparent 70%)',
        }}>
          <span style={{ fontSize: 40, opacity: 0.25 }}>🗺️</span>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: 260, lineHeight: 1.7 }}>
            We are finalizing your travel details.<br />
            Your map will appear here soon.
          </p>
        </div>
      )}

      {/* ── Legend ── */}
      {hasAny && (
        <div style={{
          padding:       '9px 18px',
          display:       'flex',
          gap:           16,
          flexWrap:      'wrap',
          alignItems:    'center',
          borderTop:     '1px solid rgba(255,255,255,0.05)',
          background:    'rgba(12,26,29,0.7)',
        }}>
          {hasHotel && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 5 }}>
              🛏️ {hotelName || 'Hotel'}
            </span>
          )}
          {hasClinic && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 5 }}>
              🏥 Clinic
            </span>
          )}
          {hasBoth && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 22, height: 0, borderTop: `2px dashed ${GOLD}60`, display: 'inline-block' }} />
              Route
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>
            © OpenStreetMap
          </span>
        </div>
      )}
    </div>
  );
}
