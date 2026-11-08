import { Image } from 'expo-image';
import { useEffect, useId, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { DEMO_AVATARS, DEMO_WALK_ROUTE } from '@/lib/demo-data';

export interface RouteMapProps {
  coordinates: readonly { latitude: number; longitude: number }[];
  showUserLocation?: boolean;
  fitToBounds?: boolean;
  height?: number;
  mapStyle?: 'satellite' | 'street';
  borderless?: boolean;
  showSightingPins?: boolean;
}

declare global {
  interface Window {
    L?: any;
  }
}

const LEAFLET_CSS_ID = 'walkingcat-leaflet-css';
const LEAFLET_JS_ID = 'walkingcat-leaflet-js';

function ensureLeafletLoaded(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const link = document.createElement('link');
    link.id = LEAFLET_CSS_ID;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  return new Promise((resolve) => {
    const existingScript = document.getElementById(LEAFLET_JS_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.L));
      existingScript.addEventListener('error', () => resolve(null));
      return;
    }

    const script = document.createElement('script');
    script.id = LEAFLET_JS_ID;
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}

const SIGHTING_MARKERS = [
  {
    id: 'marmalade',
    name: 'Marmalade',
    subtitle: 'Sunlit Stoop · +23 sightings',
    photo: '/demo/marmalade.jpg',
    badgeCount: '+23',
    offsetIndex: 2,
  },
  {
    id: 'whiskers',
    name: 'Prof. Whiskers',
    subtitle: 'Maple Library · +8 sightings',
    photo: '/demo/whiskers.jpg',
    badgeCount: '+8',
    offsetIndex: 4,
  },
];

export function RouteMap({
  coordinates,
  height = 280,
  mapStyle: initialMapStyle = 'satellite',
  borderless = false,
  showSightingPins = true,
}: RouteMapProps) {
  const reactId = useId().replace(/:/g, '');
  const containerId = `walkingcat-map-${reactId}`;
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [styleOverride, setStyleOverride] = useState<'satellite' | 'street' | null>(null);
  const [lastPropStyle, setLastPropStyle] = useState(initialMapStyle);
  const [mapReady, setMapReady] = useState(false);

  if (lastPropStyle !== initialMapStyle) {
    setLastPropStyle(initialMapStyle);
    setStyleOverride(null);
  }

  const activeStyle = styleOverride ?? initialMapStyle;

  const routeCoords = coordinates.length >= 2 ? coordinates : DEMO_WALK_ROUTE;

  useEffect(() => {
    let isMounted = true;

    ensureLeafletLoaded().then((L) => {
      if (!isMounted || !L) return;
      const el = document.getElementById(containerId);
      if (!el) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const latLngs: [number, number][] = routeCoords.map((pt) => [
        pt.latitude,
        pt.longitude,
      ]);

      const center = latLngs[Math.floor(latLngs.length / 2)] ?? [37.7758, -122.416];

      const map = L.map(el, {
        center,
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      mapRef.current = map;

      const tileUrl =
        activeStyle === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      tileLayerRef.current = L.tileLayer(tileUrl, {
        maxZoom: 19,
      }).addTo(map);

      // Soft glowing corridor around walked path (like Reference Image 2 green route zone)
      L.polyline(latLngs, {
        color: '#58B957',
        weight: 22,
        opacity: 0.28,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Outer white casing for crisp contrast on satellite & street tiles
      L.polyline(latLngs, {
        color: '#FFFFFF',
        weight: 9,
        opacity: 0.92,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Core walked path polyline
      const mainLine = L.polyline(latLngs, {
        color: '#58B957',
        weight: 5.5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Start marker (emerald ring)
      const startPt = latLngs[0];
      if (startPt) {
        const startIcon = L.divIcon({
          className: '',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          html: `<div style="width:22px;height:22px;border-radius:999px;background:#181A22;border:3px solid #FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
            <div style="width:8px;height:8px;border-radius:999px;background:#58B957;"></div>
          </div>`,
        });
        L.marker(startPt, { icon: startIcon }).addTo(map);
      }

      // Current walker marker (end of walked route, Reference Image 2 "nearby" pill + avatar)
      const endPt = latLngs[latLngs.length - 1];
      if (endPt) {
        const walkerIcon = L.divIcon({
          className: '',
          iconSize: [120, 64],
          iconAnchor: [60, 56],
          html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
            <div style="background:#3B82F6;color:#FFFFFF;font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;box-shadow:0 4px 10px rgba(37,99,235,0.45);white-space:nowrap;margin-bottom:4px;font-family:system-ui,-apple-system,sans-serif;">
              Mina walking live
            </div>
            <div style="width:36px;height:36px;border-radius:999px;border:3px solid #FFFFFF;overflow:hidden;background:#7C66DC;box-shadow:0 6px 16px rgba(0,0,0,0.4);">
              <img src="${DEMO_AVATARS.mina}" style="width:100%;height:100%;object-fit:cover;" />
            </div>
          </div>`,
        });
        L.marker(endPt, { icon: walkerIcon }).addTo(map);
      }

      // Cat sighting floating glass callout markers along the path (like Reference Image 2)
      if (showSightingPins) {
        for (const item of SIGHTING_MARKERS) {
          const pt = latLngs[Math.min(item.offsetIndex, latLngs.length - 1)];
          if (!pt) continue;
          const catPin = L.divIcon({
            className: '',
            iconSize: [168, 48],
            iconAnchor: [24, 24],
            html: `<div style="display:flex;align-items:center;gap:8px;background:rgba(28,30,38,0.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.28);border-radius:999px;padding:4px 11px 4px 4px;box-shadow:0 10px 24px rgba(0,0,0,0.38);">
              <img src="${item.photo}" style="width:34px;height:34px;border-radius:999px;object-fit:cover;border:2px solid #FFFFFF;" />
              <div style="display:flex;flex-direction:column;min-width:0;">
                <span style="color:#FFFFFF;font-size:11px;font-weight:700;line-height:1.15;white-space:nowrap;font-family:system-ui,-apple-system,sans-serif;">${item.name}</span>
                <span style="color:rgba(255,255,255,0.76);font-size:9px;font-weight:600;line-height:1.15;white-space:nowrap;font-family:system-ui,-apple-system,sans-serif;">${item.subtitle}</span>
              </div>
            </div>`,
          });
          L.marker(pt, { icon: catPin }).addTo(map);
        }
      }

      if (latLngs.length >= 2) {
        map.fitBounds(mainLine.getBounds(), { padding: [36, 36], maxZoom: 16 });
      }

      setMapReady(true);
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [containerId, activeStyle, routeCoords, showSightingPins]);

  const handleRecenter = () => {
    if (!mapRef.current || !window.L) return;
    const latLngs: [number, number][] = routeCoords.map((pt) => [
      pt.latitude,
      pt.longitude,
    ]);
    if (latLngs.length >= 2) {
      const bounds = window.L.latLngBounds(latLngs);
      mapRef.current.flyToBounds(bounds, { padding: [36, 36], maxZoom: 16, duration: 0.6 });
    }
  };

  return (
    <View
      style={{ height }}
      className={`relative w-full overflow-hidden bg-[#1D2432] ${
        borderless ? '' : 'rounded-bento border border-white/60 shadow-card'
      }`}>
      {/* Interactive Leaflet Map Host Container */}
      <View
        nativeID={containerId}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      />

      {/* Fallback preview while Leaflet tiles initialize */}
      {!mapReady ? (
        <View className="absolute inset-0 items-center justify-center bg-[#1D2432]">
          <Image
            source={{ uri: '/demo/marmalade.jpg' }}
            style={{ width: '100%', height: '100%', opacity: 0.25 }}
            contentFit="cover"
          />
          <View className=" rounded-pill bg-black/60 px-4 py-2">
            <Text className="text-xs font-bold text-white">Loading live neighborhood map…</Text>
          </View>
        </View>
      ) : null}

      {/* Right-Side Floating Compass "N" & Recenter Controls (Reference Image 2) */}
      <View
        style={{ zIndex: 20 }}
        className="absolute right-3.5 top-1/2 -translate-y-8 items-center gap-2.5">
        {/* White Circular Compass N Badge */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset map north and toggle satellite"
          onPress={() =>
            setStyleOverride(activeStyle === 'satellite' ? 'street' : 'satellite')
          }
          className="h-10 w-10 items-center justify-center rounded-pill border border-black/10 bg-white shadow-md active:scale-95">
          <View className="h-1.5 w-1.5 rounded-pill bg-[#E9806E]" />
          <Text className="text-[11px] font-extrabold leading-none text-[#181A22]">N</Text>
        </Pressable>

        {/* Frosted Dark-Glass Recenter Navigation Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recenter walked route"
          onPress={handleRecenter}
          style={{ backgroundColor: 'rgba(28, 30, 38, 0.78)' }}
          className="h-10 w-10 items-center justify-center rounded-pill border border-white/25 shadow-md active:scale-95">
          <Text className="text-xs font-bold text-white">➤</Text>
        </Pressable>
      </View>

      {/* Bottom-left live route pill */}
      <View
        style={{ zIndex: 20, backgroundColor: 'rgba(28, 30, 38, 0.76)' }}
        className="absolute bottom-3 left-3.5 flex-row items-center gap-2 rounded-pill border border-white/20 px-3 py-1.5">
        <View className="h-2 w-2 rounded-pill bg-[#58B957]" />
        <Text className="text-[11px] font-bold text-white">
          {routeCoords.length} GPS pts · {activeStyle === 'satellite' ? 'Satellite' : 'Street'}
        </Text>
      </View>
    </View>
  );
}
