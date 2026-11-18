import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatDistance } from '@/lib/format';
import type { DailyActivityPoint } from '../dashboard';

export interface WeeklyAreaChartProps {
  days: readonly DailyActivityPoint[];
  goalMeters?: number;
  height?: number;
}

interface Point2D {
  x: number;
  y: number;
}

const SVG_WIDTH = 320;
const SVG_HEIGHT = 112;
const PAD_X = 18;
const PAD_TOP = 18;
const PAD_BOTTOM = 12;

/**
 * Generates a smooth cubic-bezier SVG path through an array of 2D points
 * using Catmull-Rom to Bezier conversion.
 */
function buildSmoothCurvePath(points: Point2D[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(
      1
    )}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function WeeklyAreaChart({
  days,
  goalMeters = 15_000,
  height = 124,
}: WeeklyAreaChartProps) {
  const weekDays = useMemo(() => days.slice(-7), [days]);

  const defaultSelectedIndex = useMemo(() => {
    if (weekDays.length === 0) return 0;
    let bestIdx = weekDays.findIndex((d) => d.isToday);
    let maxDist = -1;
    weekDays.forEach((d, idx) => {
      if (d.distanceMeters > maxDist) {
        maxDist = d.distanceMeters;
        bestIdx = idx;
      }
    });
    return bestIdx >= 0 ? bestIdx : weekDays.length - 1;
  }, [weekDays]);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const activeIdx =
    selectedIdx !== null && selectedIdx < weekDays.length
      ? selectedIdx
      : defaultSelectedIndex;

  const totalDistanceMeters = useMemo(
    () => weekDays.reduce((sum, d) => sum + d.distanceMeters, 0),
    [weekDays]
  );

  const { svgUri, activePoint, activeDay } = useMemo(() => {
    const count = Math.max(weekDays.length, 2);
    const maxVal = Math.max(...weekDays.map((d) => d.distanceMeters), 1500);
    const usableW = SVG_WIDTH - PAD_X * 2;
    const usableH = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const pts: Point2D[] = weekDays.map((d, i) => {
      const x = PAD_X + (i / (count - 1)) * usableW;
      const ratio = Math.min(1, d.distanceMeters / maxVal);
      const y = PAD_TOP + usableH * (1 - ratio * 0.88 - 0.06);
      return { x, y };
    });

    const linePath = buildSmoothCurvePath(pts);
    const first = pts[0] ?? { x: PAD_X, y: SVG_HEIGHT - PAD_BOTTOM };
    const last = pts[pts.length - 1] ?? { x: SVG_WIDTH - PAD_X, y: SVG_HEIGHT - PAD_BOTTOM };
    const areaPath = `${linePath} L ${last.x.toFixed(1)} ${SVG_HEIGHT} L ${first.x.toFixed(
      1
    )} ${SVG_HEIGHT} Z`;

    const sel = pts[activeIdx] ?? pts[0] ?? { x: SVG_WIDTH / 2, y: SVG_HEIGHT / 2 };

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="peachFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F4A97B" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#F4A97B" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#peachFill)" />
      <path d="${linePath}" fill="none" stroke="#F4A97B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${sel.x.toFixed(1)}" cy="${sel.y.toFixed(1)}" r="7.5" fill="#FFFFFF" stroke="#191A26" stroke-width="2" />
      <circle cx="${sel.x.toFixed(1)}" cy="${sel.y.toFixed(1)}" r="4" fill="#F4A97B" />
    </svg>`;

    return {
      svgUri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      activePoint: sel,
      activeDay: weekDays[activeIdx] ?? null,
    };
  }, [weekDays, activeIdx]);

  const leftPct = Math.min(82, Math.max(18, (activePoint.x / SVG_WIDTH) * 100));

  return (
    <View className="gap-3">
      {/* Hero Weekly Distance Metric */}
      <View className="flex-row items-baseline justify-between">
        <View className="flex-row items-baseline gap-1.5">
          <Text className="font-display text-3xl font-extrabold tracking-tight text-[#191A26] dark:text-white">
            {(totalDistanceMeters / 1000).toFixed(1)}
          </Text>
          <Text className="text-sm font-bold text-[#6E7085] dark:text-[#9EA1B8]">
            km
          </Text>
        </View>
        <Text variant="caption" className="font-semibold">
          of {(goalMeters / 1000).toFixed(0)} km goal
        </Text>
      </View>

      {/* Smooth Area Curve + Interactive Selected Value Pill */}
      <View className="relative" style={{ height }}>
        {activeDay ? (
          <View
            style={{
              left: `${leftPct}%`,
              transform: [{ translateX: -32 }],
              top: 0,
              zIndex: 10,
            }}
            className="absolute rounded-pill border border-[#191A26] bg-[#191A26] px-2.5 py-0.5 shadow-sm">
            <Text className="text-[11px] font-extrabold text-[#F4A97B]">
              {formatDistance(activeDay.distanceMeters)}
            </Text>
          </View>
        ) : null}

        <View className="mt-4 flex-1 overflow-hidden">
          <Image
            source={{ uri: svgUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="fill"
          />
        </View>
      </View>

      {/* Tappable M T W T F S S Day Labels */}
      <View className="flex-row items-center justify-between px-2">
        {weekDays.map((day, idx) => {
          const isSelected = idx === activeIdx;
          const letter = day.shortLabel.slice(0, 1).toUpperCase();
          return (
            <Pressable
              key={day.date}
              accessibilityRole="button"
              accessibilityLabel={`${day.shortLabel}: ${formatDistance(day.distanceMeters)}`}
              onPress={() => setSelectedIdx(idx)}
              className={`h-7 w-7 items-center justify-center rounded-pill ${
                isSelected ? 'bg-[#191A26]' : 'bg-transparent'
              }`}>
              <Text
                className={`text-[11px] font-extrabold ${
                  isSelected
                    ? 'text-[#F4A97B]'
                    : day.isToday
                      ? 'text-[#191A26] dark:text-white'
                      : 'text-[#6E7085] dark:text-[#9EA1B8]'
                }`}>
                {letter}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
