import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { DEMO_WALK_ROUTE } from '@/lib/demo-data';

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

export function RouteMap({
  coordinates,
  height = 280,
  mapStyle: initialMapStyle = 'street',
  borderless = false,
  showSightingPins = true,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
      const el = containerRef.current;
      if (!el) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const latLngs: [number, number][] = routeCoords.map((pt) => [
        pt.latitude,
        pt.longitude,
      ]);

      const center = latLngs[Math.floor(latLngs.length / 2)] ?? [34.0153, -118.4951];

      const map = L.map(el, {
        center,
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      mapRef.current = map;

      // Clean silver-white street tiles matching the Reference "GPS" screen (with Satellite toggle)
      const tileUrl =
        activeStyle === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      tileLayerRef.current = L.tileLayer(tileUrl, {
        maxZoom: 19,
      }).addTo(map);

      // Soft warm-peach glow under the walked route
      L.polyline(latLngs, {
        color: '#F4A97B',
        weight: 14,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Core Warm Peach (#F4A97B) walked route polyline matching the Reference GPS screen
      const mainLine = L.polyline(latLngs, {
        color: '#F4A97B',
        weight: 4.5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Start marker (Warm Peach circle with dark ink ring, matching the Reference GPS map dot)
      const startPt = latLngs[0];
      if (startPt) {
        const startIcon = L.divIcon({
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html: `<div style="width:18px;height:18px;border-radius:999px;background:#F4A97B;border:3px solid #191A26;box-shadow:0 2px 6px rgba(25,26,38,0.25);"></div>`,
        });
        L.marker(startPt, { icon: startIcon }).addTo(map);
      }

      // Black-Ink Teardrop Pin with Cute Blob Cat Face inside (matching Reference "GPS" center pin!)
      const endPt = latLngs[latLngs.length - 1];
      if (endPt) {
        const catPinIcon = L.divIcon({
          className: '',
          iconSize: [48, 58],
          iconAnchor: [24, 54],
          html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 6px 10px rgba(25,26,38,0.28));">
            <svg xmlns="http://www.w3.org/2000/svg" width="46" height="56" viewBox="0 0 46 56">
              <path d="M 23 54 C 23 54 43 35 43 21 C 43 10 34 2 23 2 C 12 2 3 10 3 21 C 3 35 23 54 23 54 Z" fill="#191A26" stroke="#FFFFFF" stroke-width="2" />
              <circle cx="23" cy="21" r="13" fill="#FFFFFF" />
              <!-- Blob Cat inside pin -->
              <path d="M 14 23 L 16 12 L 22 17 Z" fill="#191A26" />
              <path d="M 32 23 L 30 12 L 24 17 Z" fill="#191A26" />
              <ellipse cx="23" cy="23" rx="9" ry="7.5" fill="#191A26" />
              <circle cx="19.5" cy="22.5" r="2.2" fill="#FFFFFF" />
              <circle cx="26.5" cy="22.5" r="2.2" fill="#FFFFFF" />
            </svg>
          </div>`,
        });
        L.marker(endPt, { icon: catPinIcon }).addTo(map);
      }

      if (showSightingPins && latLngs.length >= 4) {
        const midPt = latLngs[Math.floor(latLngs.length / 2)];
        if (midPt) {
          const midDot = L.divIcon({
            className: '',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            html: `<div style="width:22px;height:22px;border-radius:999px;background:#191A26;border:2.5px solid #FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(25,26,38,0.25);">
              <div style="width:8px;height:8px;border-radius:999px;background:#F4A97B;"></div>
            </div>`,
          });
          L.marker(midPt, { icon: midDot }).addTo(map);
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
  }, [activeStyle, routeCoords, showSightingPins]);

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
      className={`relative w-full overflow-hidden bg-[#F2F1EE] ${
        borderless ? '' : 'rounded-card border-[1.5px] border-[#191A26]'
      }`}>
      {/* Interactive Leaflet Map Host Container */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      />

      {!mapReady ? (
        <View className="absolute inset-0 items-center justify-center bg-[#F2F1EE]">
          <Image
            source={{ uri: '/demo/marmalade.jpg' }}
            style={{ width: '100%', height: '100%', opacity: 0.15 }}
            contentFit="cover"
          />
          <View className="rounded-pill border-[1.5px] border-[#191A26] bg-white px-4 py-1.5">
            <Text className="text-xs font-extrabold text-[#191A26]">
              Loading GPS map…
            </Text>
          </View>
        </View>
      ) : null}

      {/* Right-Side Map Controls (Outlined Ink-on-White Circular Badges matching Reference) */}
      <View
        style={{ zIndex: 20 }}
        className="absolute bottom-4 right-3.5 items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset map north and toggle satellite"
          onPress={() =>
            setStyleOverride(activeStyle === 'satellite' ? 'street' : 'satellite')
          }
          className="h-9 w-9 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-white active:scale-95">
          <View className="h-1.5 w-1.5 rounded-pill bg-[#F4A97B]" />
          <Text className="text-[10px] font-extrabold leading-none text-[#191A26]">N</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recenter walked route"
          onPress={handleRecenter}
          className="h-9 w-9 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-[#191A26] active:scale-95">
          <Text className="text-xs font-bold text-white">➤</Text>
        </Pressable>
      </View>

      {/* Bottom-left GPS points pill */}
      <View
        style={{ zIndex: 20 }}
        className="absolute bottom-4 left-3.5 flex-row items-center gap-1.5 rounded-pill border-[1.5px] border-[#191A26] bg-white px-3 py-1">
        <View className="h-2 w-2 rounded-pill bg-[#F4A97B]" />
        <Text className="text-[10px] font-extrabold text-[#191A26]">
          {routeCoords.length} GPS pts
        </Text>
      </View>
    </View>
  );
}
