import { create } from 'zustand';

import {
  clearActiveWalkData,
  enqueueWalkUpload,
  getActiveWalkRecord,
  getWalkPoints,
  listPendingWalkUploads,
  saveActiveWalkRecord,
  type ActiveWalkRecord,
  type WalkUploadPayload,
} from '@/lib/db';
import {
  resolveWalkHealthData,
  syncDailyHealthActivity,
  type HealthSourceName,
} from '@/features/health';
import { syncPendingSightings } from '@/features/sightings/sync';
import {
  computeDurations,
  encodePolyline,
  filterPoints,
  simplifyRoute,
  totalDistance,
  type GeoPoint,
  type PauseInterval,
} from './geo';
import { startWalkLocationTracking, stopWalkLocationTracking } from './location-task';
import { syncPendingWalks } from './sync';

export type WalkSessionStatus =
  | 'idle'
  | 'requestingPermission'
  | 'active'
  | 'paused'
  | 'finishing'
  | 'summary';

export interface CompletedWalkSummary {
  walkId: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  movingTimeSeconds: number;
  distanceMeters: number;
  paceSecondsPerKm: number;
  steps: number | null;
  activeKcal: number;
  kcalSource: 'health' | 'estimate';
  healthSourceName: HealthSourceName;
  usedDefaultWeight: boolean;
  routePoints: { latitude: number; longitude: number }[];
  encodedPolyline: string;
  syncStatus: 'uploading' | 'synced' | 'queued_offline';
}

export interface WalkStoreState {
  status: WalkSessionStatus;
  walkId: string | null;
  startedAt: number | null;
  pauseIntervals: PauseInterval[];
  routePoints: GeoPoint[];
  distanceMeters: number;
  lastFixAt: number | null;
  recoverableWalk: ActiveWalkRecord | null;
  summary: CompletedWalkSummary | null;
  pendingUploadCount: number;

  checkCrashRecovery: () => void;
  resumeRecoveredWalk: () => Promise<void>;
  discardRecoveredWalk: () => Promise<void>;
  setRequestingPermission: (requesting: boolean) => void;
  startWalk: () => Promise<void>;
  pauseWalk: () => void;
  resumeWalk: () => void;
  refreshMetricsFromDb: () => void;
  finishWalk: (weightKg?: number | null) => Promise<CompletedWalkSummary | null>;
  discardWalk: () => Promise<void>;
  dismissSummary: () => void;
  triggerSync: () => Promise<void>;
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useWalkStore = create<WalkStoreState>((set, get) => ({
  status: 'idle',
  walkId: null,
  startedAt: null,
  pauseIntervals: [],
  routePoints: [],
  distanceMeters: 0,
  lastFixAt: null,
  recoverableWalk: null,
  summary: null,
  pendingUploadCount: 0,

  checkCrashRecovery: () => {
    const currentStatus = get().status;
    const pendingCount = listPendingWalkUploads().length;
    if (currentStatus !== 'idle') {
      set({ pendingUploadCount: pendingCount });
      return;
    }

    const record = getActiveWalkRecord();
    set({
      recoverableWalk: record,
      pendingUploadCount: pendingCount,
    });
  },

  resumeRecoveredWalk: async () => {
    const record = get().recoverableWalk;
    if (!record) return;

    const rawPoints = getWalkPoints(record.id);
    const filtered = filterPoints(rawPoints, record.pauseIntervals);
    const dist = totalDistance(filtered, record.pauseIntervals);
    const lastPt = rawPoints[rawPoints.length - 1];

    set({
      status: record.state,
      walkId: record.id,
      startedAt: record.startedAt,
      pauseIntervals: record.pauseIntervals,
      routePoints: filtered,
      distanceMeters: dist,
      lastFixAt: lastPt ? lastPt.timestamp : Date.now(),
      recoverableWalk: null,
      summary: null,
    });

    await startWalkLocationTracking(() => {
      get().refreshMetricsFromDb();
    });
  },

  discardRecoveredWalk: async () => {
    const record = get().recoverableWalk;
    await stopWalkLocationTracking();
    clearActiveWalkData(record?.id);
    set({
      recoverableWalk: null,
      status: 'idle',
      walkId: null,
      startedAt: null,
      pauseIntervals: [],
      routePoints: [],
      distanceMeters: 0,
      lastFixAt: null,
    });
  },

  setRequestingPermission: (requesting: boolean) => {
    set({ status: requesting ? 'requestingPermission' : 'idle' });
  },

  startWalk: async () => {
    const walkId = generateUuid();
    const now = Date.now();
    const record: ActiveWalkRecord = {
      id: walkId,
      state: 'active',
      startedAt: now,
      pauseIntervals: [],
    };

    saveActiveWalkRecord(record);

    set({
      status: 'active',
      walkId,
      startedAt: now,
      pauseIntervals: [],
      routePoints: [],
      distanceMeters: 0,
      lastFixAt: now,
      recoverableWalk: null,
      summary: null,
    });

    await startWalkLocationTracking(() => {
      get().refreshMetricsFromDb();
    });
  },

  pauseWalk: () => {
    const { status, walkId, startedAt, pauseIntervals } = get();
    if (status !== 'active' || !walkId || !startedAt) return;

    const updatedIntervals: PauseInterval[] = [
      ...pauseIntervals,
      { pausedAt: Date.now(), resumedAt: null },
    ];

    saveActiveWalkRecord({
      id: walkId,
      state: 'paused',
      startedAt,
      pauseIntervals: updatedIntervals,
    });

    set({
      status: 'paused',
      pauseIntervals: updatedIntervals,
    });
  },

  resumeWalk: () => {
    const { status, walkId, startedAt, pauseIntervals } = get();
    if (status !== 'paused' || !walkId || !startedAt) return;

    const now = Date.now();
    const updatedIntervals = pauseIntervals.map((interval, idx) =>
      idx === pauseIntervals.length - 1 && interval.resumedAt === null
        ? { ...interval, resumedAt: now }
        : interval
    );

    saveActiveWalkRecord({
      id: walkId,
      state: 'active',
      startedAt,
      pauseIntervals: updatedIntervals,
    });

    set({
      status: 'active',
      pauseIntervals: updatedIntervals,
      lastFixAt: now,
    });
  },

  refreshMetricsFromDb: () => {
    const { walkId, pauseIntervals } = get();
    if (!walkId) return;

    const rawPoints = getWalkPoints(walkId);
    const filtered = filterPoints(rawPoints, pauseIntervals);
    const dist = totalDistance(filtered, pauseIntervals);
    const latestRaw = rawPoints[rawPoints.length - 1];

    set({
      routePoints: filtered,
      distanceMeters: dist,
      lastFixAt: latestRaw ? latestRaw.timestamp : get().lastFixAt,
    });
  },

  finishWalk: async (weightKg?: number | null) => {
    const { walkId, startedAt, pauseIntervals } = get();
    if (!walkId || !startedAt) return null;

    set({ status: 'finishing' });
    await stopWalkLocationTracking();

    const endedAt = Date.now();
    const closedIntervals = pauseIntervals.map((interval) =>
      interval.resumedAt === null ? { ...interval, resumedAt: endedAt } : interval
    );

    const rawPoints = getWalkPoints(walkId);
    const filtered = filterPoints(rawPoints, closedIntervals);
    const dist = totalDistance(filtered, closedIntervals);
    const { durationSeconds, movingTimeSeconds } = computeDurations(
      startedAt,
      endedAt,
      closedIntervals
    );

    const simplified = simplifyRoute(filtered, 5);
    const encodedPolyline = encodePolyline(simplified);
    const avgSpeedMps = movingTimeSeconds > 0 ? dist / movingTimeSeconds : 0;
    const paceSecondsPerKm =
      dist >= 10 && movingTimeSeconds > 0 ? movingTimeSeconds / (dist / 1000) : 0;

    const healthData = await resolveWalkHealthData({
      startedAt: new Date(startedAt),
      endedAt: new Date(endedAt),
      movingTimeSeconds,
      distanceMeters: dist,
      weightKg,
    });

    const payload: WalkUploadPayload = {
      client_id: walkId,
      started_at: new Date(startedAt).toISOString(),
      ended_at: new Date(endedAt).toISOString(),
      duration_s: durationSeconds,
      moving_time_s: movingTimeSeconds,
      distance_m: Math.round(dist * 100) / 100,
      avg_speed_mps: Math.round(avgSpeedMps * 1000) / 1000,
      route_polyline: encodedPolyline,
      point_count: simplified.length,
      steps: healthData.steps,
      active_kcal: healthData.activeKcal,
      kcal_source: healthData.kcalSource,
    };

    enqueueWalkUpload(walkId, payload);
    clearActiveWalkData(walkId);

    const initialSummary: CompletedWalkSummary = {
      walkId,
      startedAt,
      endedAt,
      durationSeconds,
      movingTimeSeconds,
      distanceMeters: dist,
      paceSecondsPerKm,
      steps: healthData.steps,
      activeKcal: healthData.activeKcal,
      kcalSource: healthData.kcalSource,
      healthSourceName: healthData.healthSourceName,
      usedDefaultWeight: healthData.usedDefaultWeight,
      routePoints: simplified.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
      encodedPolyline,
      syncStatus: 'uploading',
    };

    set({
      status: 'summary',
      walkId: null,
      startedAt: null,
      pauseIntervals: [],
      routePoints: [],
      distanceMeters: 0,
      lastFixAt: null,
      summary: initialSummary,
      pendingUploadCount: listPendingWalkUploads().length,
    });

    const syncResult = await syncPendingWalks();
    syncPendingSightings().catch(() => {});
    syncDailyHealthActivity(true).catch(() => {});
    const finalSyncStatus: CompletedWalkSummary['syncStatus'] =
      syncResult.remainingCount === 0 ? 'synced' : 'queued_offline';

    set((state) => ({
      pendingUploadCount: syncResult.remainingCount,
      summary: state.summary
        ? { ...state.summary, syncStatus: finalSyncStatus }
        : null,
    }));

    return { ...initialSummary, syncStatus: finalSyncStatus };
  },

  discardWalk: async () => {
    const { walkId } = get();
    await stopWalkLocationTracking();
    clearActiveWalkData(walkId ?? undefined);

    set({
      status: 'idle',
      walkId: null,
      startedAt: null,
      pauseIntervals: [],
      routePoints: [],
      distanceMeters: 0,
      lastFixAt: null,
      summary: null,
    });
  },

  dismissSummary: () => {
    set({
      status: 'idle',
      summary: null,
      pendingUploadCount: listPendingWalkUploads().length,
    });
  },

  triggerSync: async () => {
    const res = await syncPendingWalks();
    await syncPendingSightings().catch(() => {});
    set((state) => ({
      pendingUploadCount: res.remainingCount,
      summary:
        state.summary && res.remainingCount === 0
          ? { ...state.summary, syncStatus: 'synced' }
          : state.summary,
    }));
  },
}));
