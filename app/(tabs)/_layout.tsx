// /app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Image } from "react-native";
import COLORS from "../../lib/colors";

const ICONS = {
  home: require("../../assets/tab/home.png"),
  my: require("../../assets/tab/my.png"),
  setting: require("../../assets/tab/setting.png"),
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,                   // ✅ 모든 탭 헤더 숨김
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
