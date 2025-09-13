// store/useSystem.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkLocationStatus, isGpsEnabled, isBatteryOptimized } from "../lib/permissions";

type IOSLevel = "unknown" | "denied" | "whenInUse" | "always";
type AndroidPerm = { fg: boolean; bg: boolean; dontAskAgain: boolean };

type PermissionState = {
  iosLevel: IOSLevel;
  precise: boolean;
  android: AndroidPerm;
};

type GeofenceMeta = {
  registeredCount: number;
  lastSyncAt: number | null; // epoch ms
  logs: string[]; // recent short logs
};

type SystemState = {
  onboarded: boolean;
  permission: PermissionState;
  gpsOn: boolean;
  batteryOptimized: boolean;
  geofence: GeofenceMeta;

  // actions
  refreshSystemStatus: () => Promise<void>;
  setOnboarded: (v: boolean) => Promise<void>;
  setGeofenceMeta: (meta: Partial<GeofenceMeta>) => void;
  pushLog: (msg: string) => void;
};

export const useSystem = create<SystemState>((set, get) => ({
  onboarded: false,
  permission: { iosLevel: "unknown", precise: true, android: { fg: false, bg: false, dontAskAgain: false } },
  gpsOn: true,
  batteryOptimized: false,
  geofence: { registeredCount: 0, lastSyncAt: null, logs: [] },

  refreshSystemStatus: async () => {
    const onboardedStr = await AsyncStorage.getItem("onboarded_v2");
    const onboarded = onboardedStr === "true";

    const p = await checkLocationStatus();
    const gps = await isGpsEnabled();
    const battery = await isBatteryOptimized();

    set({
      onboarded,
      permission: p,
      gpsOn: gps,
      batteryOptimized: battery,
    });
  },

  setOnboarded: async (v) => {
    await AsyncStorage.setItem("onboarded_v2", v ? "true" : "false");
    set({ onboarded: v });
  },

  setGeofenceMeta: (meta) => {
    const prev = get().geofence;
    set({ geofence: { ...prev, ...meta } });
  },

  pushLog: (msg) => {
    const prev = get().geofence.logs;
    const now = new Date().toISOString().slice(11, 19); // HH:MM:SS
    const next = [`[${now}] ${msg}`, ...prev].slice(0, 10);
    set((s) => ({ geofence: { ...s.geofence, logs: next } }));
  },
}));
