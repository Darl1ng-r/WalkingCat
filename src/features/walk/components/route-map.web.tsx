import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon, Text } from '@/components/ui';
import { DEMO_WALK_ROUTE } from '@/lib/demo-data';
import { env, isGoogleMapsConfigured } from '@/lib/env';

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
    google?: any;
    gm_authFailure?: () => void;
    __walkingcatGoogleMapsReady?: () => void;
    L?: any;
  }
}

const GOOGLE_MAPS_SCRIPT_ID = 'walkingcat-google-maps-js';
const LEAFLET_CSS_ID = 'walkingcat-leaflet-css';
const LEAFLET_JS_ID = 'walkingcat-leaflet-js';

// Clean silver-white custom style for Google Maps JS API to match the "Blobs" reference GPS screen
const GOOGLE_MAPS_SILVER_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e8ece6' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#dadada' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#d8e2eb' }],
  },
];

const BLOB_CAT_PIN_SVG_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="56" viewBox="0 0 46 56">
    <path d="M 23 54 C 23 54 43 35 43 21 C 43 10 34 2 23 2 C 12 2 3 10 3 21 C 3 35 23 54 23 54 Z" fill="#191A26" stroke="#FFFFFF" stroke-width="2" />
    <circle cx="23" cy="21" r="13" fill="#FFFFFF" />
    <path d="M 14 23 L 16 12 L 22 17 Z" fill="#191A26" />
    <path d="M 32 23 L 30 12 L 24 17 Z" fill="#191A26" />
    <ellipse cx="23" cy="23" rx="9" ry="7.5" fill="#191A26" />
    <circle cx="19.5" cy="22.5" r="2.2" fill="#FFFFFF" />
    <circle cx="26.5" cy="22.5" r="2.2" fill="#FFFFFF" />
  </svg>`
)}`;

const START_DOT_SVG_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7" fill="#F4A97B" stroke="#191A26" stroke-width="3.5" />
  </svg>`
)}`;

function ensureGoogleMapsLoaded(apiKey: string): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }

  return new Promise((resolve) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const checkReady = () => {
        if (window.google?.maps?.Map) {
          resolve(window.google.maps);
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
      return;
    }

    window.__walkingcatGoogleMapsReady = () => {
      resolve(window.google?.maps ?? null);
    };

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=weekly&loading=async&callback=__walkingcatGoogleMapsReady`;
    script.async = true;
    script.defer = true;
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

function addHtmlOverlayPin(
  gmaps: any,
  map: any,
  position: { lat: number; lng: number },
  html: string,
  anchorX: number,
  anchorY: number
) {
  class CustomPinOverlay extends gmaps.OverlayView {
    private div: HTMLDivElement | null = null;
    onAdd() {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.pointerEvents = 'none';
      div.innerHTML = html;
      this.div = div;
      const panes = this.getPanes();
      panes?.overlayMouseTarget?.appendChild(div);
    }
    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(new gmaps.LatLng(position.lat, position.lng));
      if (point) {
        this.div.style.left = `${point.x - anchorX}px`;
        this.div.style.top = `${point.y - anchorY}px`;
      }
    }
    onRemove() {
      if (this.div?.parentNode) {
        this.div.parentNode.removeChild(this.div);
      }
      this.div = null;
    }
  }
  const overlay = new CustomPinOverlay();
  overlay.setMap(map);
}

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
  const googleMapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const [styleOverride, setStyleOverride] = useState<'satellite' | 'street' | null>(null);
  const [lastPropStyle, setLastPropStyle] = useState(initialMapStyle);
  const [mapReady, setMapReady] = useState(false);
  const [useTileFallback, setUseTileFallback] = useState(false);

  if (lastPropStyle !== initialMapStyle) {
    setLastPropStyle(initialMapStyle);
    setStyleOverride(null);
  }

  const activeStyle = styleOverride ?? initialMapStyle;
  const routeCoords = coordinates.length >= 2 ? coordinates : DEMO_WALK_ROUTE;

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      const el = containerRef.current;
      if (!el) return;

      // Path A: Official Google Maps JavaScript SDK when EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is configured
      if (!useTileFallback && isGoogleMapsConfigured && env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
        if (typeof window !== 'undefined') {
          window.gm_authFailure = () => {
            if (isMounted) {
              setUseTileFallback(true);
            }
          };
        }
        const gmaps = await ensureGoogleMapsLoaded(env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
        if (!isMounted) return;

        if (gmaps && containerRef.current) {
          const pathLatLngs = routeCoords.map((pt) => ({
            lat: pt.latitude,
            lng: pt.longitude,
          }));
          const center = pathLatLngs[Math.floor(pathLatLngs.length / 2)] ?? {
            lat: 34.0153,
            lng: -118.4951,
          };

          const map = new gmaps.Map(containerRef.current, {
            center,
            zoom: 16,
            mapTypeId: activeStyle === 'satellite' ? 'hybrid' : 'roadmap',
            styles: activeStyle === 'street' ? GOOGLE_MAPS_SILVER_STYLE : undefined,
            disableDefaultUI: true,
            zoomControl: false,
            gestureHandling: 'greedy',
          });

          googleMapRef.current = map;

          // Soft warm-peach glow under the walked route
          new gmaps.Polyline({
            path: pathLatLngs,
            geodesic: true,
            strokeColor: '#F4A97B',
            strokeOpacity: 0.28,
            strokeWeight: 14,
            map,
          });

          // Core Warm Peach (#F4A97B) walked route polyline
          new gmaps.Polyline({
            path: pathLatLngs,
            geodesic: true,
            strokeColor: '#F4A97B',
            strokeOpacity: 1.0,
            strokeWeight: 5,
            map,
          });

          // Start marker (via OverlayView to avoid deprecated google.maps.Marker warning)
          const startPt = pathLatLngs[0];
          if (startPt) {
            addHtmlOverlayPin(
              gmaps,
              map,
              startPt,
              `<img src="${START_DOT_SVG_URI}" style="width:20px;height:20px;filter:drop-shadow(0 2px 5px rgba(25,26,38,0.28));" />`,
              10,
              10
            );
          }

          // End marker (Black-Ink Blob-Cat Teardrop Pin)
          const endPt = pathLatLngs[pathLatLngs.length - 1];
          if (endPt) {
            addHtmlOverlayPin(
              gmaps,
              map,
              endPt,
              `<img src="${BLOB_CAT_PIN_SVG_URI}" style="width:46px;height:56px;filter:drop-shadow(0 6px 10px rgba(25,26,38,0.3));" />`,
              23,
              54
            );
          }

          if (pathLatLngs.length >= 2) {
            const bounds = new gmaps.LatLngBounds();
            for (const pt of pathLatLngs) {
              bounds.extend(pt);
            }
            map.fitBounds(bounds, 36);
          }

          setMapReady(true);
          return;
        }
      }

      // Path B: Google Maps Tile Layer (mt1.google.com) fallback when API key is not yet in .env.local
      const L = await ensureLeafletLoaded();
      if (!isMounted || !L || !containerRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const latLngs: [number, number][] = routeCoords.map((pt) => [
        pt.latitude,
        pt.longitude,
      ]);
      const center = latLngs[Math.floor(latLngs.length / 2)] ?? [34.0153, -118.4951];

      const map = L.map(containerRef.current, {
        center,
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      leafletMapRef.current = map;

      // Google Maps Street (lyrs=m) and Google Satellite Hybrid (lyrs=y) tile servers
      const googleTileUrl =
        activeStyle === 'satellite'
          ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
          : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

      L.tileLayer(googleTileUrl, {
        maxZoom: 20,
      }).addTo(map);

      // Soft warm-peach glow under the walked route
      L.polyline(latLngs, {
        color: '#F4A97B',
        weight: 14,
        opacity: 0.28,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Core Warm Peach (#F4A97B) walked route polyline
      const mainLine = L.polyline(latLngs, {
        color: '#F4A97B',
        weight: 5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Start marker
      const startPt = latLngs[0];
      if (startPt) {
        const startIcon = L.divIcon({
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          html: `<img src="${START_DOT_SVG_URI}" style="width:20px;height:20px;filter:drop-shadow(0 2px 5px rgba(25,26,38,0.28));" />`,
        });
        L.marker(startPt, { icon: startIcon }).addTo(map);
      }

      // Black-Ink Blob-Cat Teardrop Pin at head of route
      const endPt = latLngs[latLngs.length - 1];
      if (endPt) {
        const catPinIcon = L.divIcon({
          className: '',
          iconSize: [46, 56],
          iconAnchor: [23, 54],
          html: `<img src="${BLOB_CAT_PIN_SVG_URI}" style="width:46px;height:56px;filter:drop-shadow(0 6px 10px rgba(25,26,38,0.3));" />`,
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
    }

    initMap();

    return () => {
      isMounted = false;
      googleMapRef.current = null;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [activeStyle, routeCoords, showSightingPins, useTileFallback]);

  const handleRecenter = () => {
    if (googleMapRef.current && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      for (const pt of routeCoords) {
        bounds.extend({ lat: pt.latitude, lng: pt.longitude });
      }
      googleMapRef.current.fitBounds(bounds, 36);
      return;
    }

    if (leafletMapRef.current && window.L) {
      const latLngs: [number, number][] = routeCoords.map((pt) => [
        pt.latitude,
        pt.longitude,
      ]);
      if (latLngs.length >= 2) {
        const bounds = window.L.latLngBounds(latLngs);
        leafletMapRef.current.flyToBounds(bounds, {
          padding: [36, 36],
          maxZoom: 16,
          duration: 0.6,
        });
      }
    }
  };

  return (
    <View
      style={{ height }}
      className={`relative w-full overflow-hidden bg-[#F2F1EE] ${
        borderless ? '' : 'rounded-card border-[1.5px] border-[#191A26]'
      }`}>
      {/* Interactive Google Map Host Container */}
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
              Loading Google Maps…
            </Text>
          </View>
        </View>
      ) : null}

      {/* Right-Side Map Controls (Outlined Ink-on-White Circular Badges) */}
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
          <AppIcon name="navigation" size={14} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Bottom-left Google Maps status pill */}
      <View
        style={{ zIndex: 20 }}
        className="absolute bottom-4 left-3.5 flex-row items-center gap-1.5 rounded-pill border-[1.5px] border-[#191A26] bg-white px-3 py-1">
        <View className="h-2 w-2 rounded-pill bg-[#F4A97B]" />
        <Text className="text-[10px] font-extrabold text-[#191A26]">
          Google Maps · {routeCoords.length} pts
        </Text>
      </View>
    </View>
  );
}
