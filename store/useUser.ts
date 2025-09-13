// /subway-alert/store/useUser.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist } from "zustand/middleware";

type UserState = {
  nickname: string | null;
  hasOnboarded: boolean;
  setNickname: (name: string) => void;
  setHasOnboarded: (v: boolean) => void;
};

export const useUser = create<UserState>()(
  persist(
    (set) => ({
      nickname: null, // 기본값
      hasOnboarded: false, // 첫 실행 시 false
      setNickname: (name) => set({ nickname: name }),
      setHasOnboarded: (v) => set({ hasOnboarded: v }),
    }),
    {
      name: "user-storage", // AsyncStorage key
      getStorage: () => AsyncStorage,
    }
  )
);