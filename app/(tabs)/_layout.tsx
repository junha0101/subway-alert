// /app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Image } from "react-native";
import COLORS from "../../lib/colors"; // 네가 쓰는 색상 토큰 있으면 유지, 없으면 제거

// 아이콘 이미지 불러오기 (상대경로 주의!)
const ICONS = {
  home: require("../../assets/tab/home.png"),
  my: require("../../assets/tab/my.png"),
  setting: require("../../assets/tab/setting.png"),
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        tabBarActiveTintColor: COLORS?.primary ?? "#5A4DFF",
        tabBarInactiveTintColor: "#9AA3AF",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Image
              source={ICONS.home}
              style={{
                width: 20,
                height: 20,
                tintColor: focused ? (COLORS?.primary ?? "#5A4DFF") : "#9AA3AF",
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: "My",
          tabBarIcon: ({ focused }) => (
            <Image
              source={ICONS.my}
              style={{
                width: 28,
                height: 28,
                tintColor: focused ? (COLORS?.primary ?? "#5A4DFF") : "#9AA3AF",
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="setting"
        options={{
          title: "Setting",
          tabBarIcon: ({ focused }) => (
            <Image
              source={ICONS.setting}
              style={{
                width: 20,
                height: 20,
                tintColor: focused ? (COLORS?.primary ?? "#5A4DFF") : "#9AA3AF",
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
