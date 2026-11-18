import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon, Text } from '@/components/ui';
import { DEMO_WALK_ROUTE } from '@/lib/demo-data';
import { env, isGoogleMapsConfigured } from '@/lib/env';

export interface RouteSightingMarker {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
}

export interface RouteMapProps {
  coordinates: readonly { latitude: number; longitude: number }[];
  sightingMarkers?: readonly RouteSightingMarker[];
  showUserLocation?: boolean;
  fitToBounds?: boolean;
  height?: number | '100%';
  fill?: boolean;
  mapStyle?: 'satellite' | 'street';
  borderless?: boolean;
  showSightingPins?: boolean;
  showDemoRouteWhenEmpty?: boolean;
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

// Clean silver-white custom style for Google Maps JS API
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
  `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 46 56">
    <path d="M 23 54 C 23 54 43 35 43 21 C 43 10 34 2 23 2 C 12 2 3 10 3 21 C 3 35 23 54 23 54 Z" fill="#191A26" stroke="#FFFFFF" stroke-width="2" />
    <circle cx="23" cy="21" r="13" fill="#FFFFFF" />
    <path d="M 14 23 L 16 12 L 22 17 Z" fill="#191A26" />
    <path d="M 32 23 L 30 12 L 24 17 Z" fill="#191A26" />
    <ellipse cx="23" cy="23" rx="9" ry="7.5" fill="#191A26" />
    <circle cx="19.5" cy="22.5" r="2.2" fill="#FFFFFF" />
    <circle cx="26.5" cy="22.5" r="2.2" fill="#FFFFFF" />
  </svg>`
)}`;

const CAT_SIGHTING_PIN_SVG_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 46 56">
    <path d="M 23 54 C 23 54 43 35 43 21 C 43 10 34 2 23 2 C 12 2 3 10 3 21 C 3 35 23 54 23 54 Z" fill="#F4A97B" stroke="#191A26" stroke-width="3" />
    <circle cx="23" cy="21" r="11" fill="#191A26" />
    <path d="M 16 23 L 17.5 14 L 22 18 Z" fill="#FFFFFF" />
    <path d="M 30 23 L 28.5 14 L 24 18 Z" fill="#FFFFFF" />
    <ellipse cx="23" cy="22.5" rx="7" ry="5.5" fill="#FFFFFF" />
  </svg>`
)}`;

const START_DOT_SVG_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20">
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
  return overlay;
}

export function RouteMap({
  coordinates,
  sightingMarkers = [],
  height = 280,
  fill = false,
  mapStyle: initialMapStyle = 'street',
  borderless = false,
  showSightingPins = true,
  showDemoRouteWhenEmpty = true,
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
  const routeCoords =
    coordinates.length >= 1
      ? coordinates
      : showDemoRouteWhenEmpty
        ? DEMO_WALK_ROUTE
        : [];

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      const el = containerRef.current;
      if (!el) return;

      const defaultCenter = { lat: 34.0153, lng: -118.4951 };

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
          const center =
            pathLatLngs[Math.floor(pathLatLngs.length / 2)] ?? defaultCenter;

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

          if (pathLatLngs.length >= 2) {
            new gmaps.Polyline({
              path: pathLatLngs,
              geodesic: true,
              strokeColor: '#F4A97B',
              strokeOpacity: 0.28,
              strokeWeight: 14,
              map,
            });

            new gmaps.Polyline({
              path: pathLatLngs,
              geodesic: true,
              strokeColor: '#F4A97B',
              strokeOpacity: 1.0,
              strokeWeight: 5,
              map,
            });
          }

          // Start marker
          const startPt = pathLatLngs[0];
          if (startPt) {
            addHtmlOverlayPin(
              gmaps,
              map,
              startPt,
              `<img src="${START_DOT_SVG_URI}" style="width:18px;height:18px;filter:drop-shadow(0 2px 5px rgba(25,26,38,0.28));" />`,
              9,
              9
            );
          }

          // Walker current position pin
          const endPt = pathLatLngs[pathLatLngs.length - 1];
          if (endPt) {
            addHtmlOverlayPin(
              gmaps,
              map,
              endPt,
              `<img src="${BLOB_CAT_PIN_SVG_URI}" style="width:44px;height:54px;filter:drop-shadow(0 6px 10px rgba(25,26,38,0.3));" />`,
              22,
              52
            );
          }

          // Cat sighting pins placed where the user found cats
          if (showSightingPins) {
            for (const marker of sightingMarkers) {
              addHtmlOverlayPin(
                gmaps,
                map,
                { lat: marker.latitude, lng: marker.longitude },
                `<img src="${CAT_SIGHTING_PIN_SVG_URI}" style="width:38px;height:46px;filter:drop-shadow(0 4px 8px rgba(25,26,38,0.3));" />`,
                19,
                44
              );
            }
          }

          if (pathLatLngs.length >= 2) {
            const bounds = new gmaps.LatLngBounds();
            for (const pt of pathLatLngs) {
              bounds.extend(pt);
            }
            map.fitBounds(bounds, 48);
          }

          setMapReady(true);
          return;
        }
      }

      // Path B: Google Maps Tile Layer fallback
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
      const center = latLngs[Math.floor(latLngs.length / 2)] ?? [
        defaultCenter.lat,
        defaultCenter.lng,
      ];

      const map = L.map(containerRef.current, {
        center,
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      leafletMapRef.current = map;

      const googleTileUrl =
        activeStyle === 'satellite'
          ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
          : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

      L.tileLayer(googleTileUrl, {
        maxZoom: 20,
      }).addTo(map);

      let mainLine: any = null;
      if (latLngs.length >= 2) {
        L.polyline(latLngs, {
          color: '#F4A97B',
          weight: 14,
          opacity: 0.28,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        mainLine = L.polyline(latLngs, {
          color: '#F4A97B',
          weight: 5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      const startPt = latLngs[0];
      if (startPt) {
        const startIcon = L.divIcon({
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html: `<img src="${START_DOT_SVG_URI}" style="width:18px;height:18px;filter:drop-shadow(0 2px 5px rgba(25,26,38,0.28));" />`,
        });
        L.marker(startPt, { icon: startIcon }).addTo(map);
      }

      const endPt = latLngs[latLngs.length - 1];
      if (endPt) {
        const catPinIcon = L.divIcon({
          className: '',
          iconSize: [44, 54],
          iconAnchor: [22, 52],
          html: `<img src="${BLOB_CAT_PIN_SVG_URI}" style="width:44px;height:54px;filter:drop-shadow(0 6px 10px rgba(25,26,38,0.3));" />`,
        });
        L.marker(endPt, { icon: catPinIcon }).addTo(map);
      }

      if (showSightingPins) {
        for (const marker of sightingMarkers) {
          const sIcon = L.divIcon({
            className: '',
            iconSize: [38, 46],
            iconAnchor: [19, 44],
            html: `<img src="${CAT_SIGHTING_PIN_SVG_URI}" style="width:38px;height:46px;filter:drop-shadow(0 4px 8px rgba(25,26,38,0.3));" />`,
          });
          L.marker([marker.latitude, marker.longitude], { icon: sIcon }).addTo(map);
        }
      }

      if (mainLine) {
        map.fitBounds(mainLine.getBounds(), { padding: [48, 48], maxZoom: 16 });
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
  }, [activeStyle, routeCoords, showSightingPins, sightingMarkers, useTileFallback]);

  const handleRecenter = () => {
    if (googleMapRef.current && window.google?.maps && routeCoords.length >= 1) {
      if (routeCoords.length === 1) {
        googleMapRef.current.panTo({
          lat: routeCoords[0].latitude,
          lng: routeCoords[0].longitude,
        });
        return;
      }
      const bounds = new window.google.maps.LatLngBounds();
      for (const pt of routeCoords) {
        bounds.extend({ lat: pt.latitude, lng: pt.longitude });
      }
      googleMapRef.current.fitBounds(bounds, 48);
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
          padding: [48, 48],
          maxZoom: 16,
          duration: 0.6,
        });
      }
    }
  };

  const containerStyle = fill ? { flex: 1 as const, width: '100%' as const } : { height };

  return (
    <View
      style={containerStyle}
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

      {/* Right-Side Map Controls */}
      <View
        style={{ zIndex: 20 }}
        className="absolute right-3.5 top-4 items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset map north and toggle satellite"
          hitSlop={6}
          onPress={() =>
            setStyleOverride(activeStyle === 'satellite' ? 'street' : 'satellite')
          }
          className="h-10 w-10 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-white shadow-sm active:scale-95">
          <View className="h-1.5 w-1.5 rounded-pill bg-[#F4A97B]" />
          <Text className="text-[10px] font-extrabold leading-none text-[#191A26]">N</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recenter walked route"
          hitSlop={6}
          onPress={handleRecenter}
          className="h-10 w-10 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-[#191A26] shadow-sm active:scale-95">
          <AppIcon name="navigation" size={14} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
