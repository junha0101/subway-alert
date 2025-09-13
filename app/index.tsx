// /subway-alert/app/index.tsx
import { Redirect } from "expo-router";
import React from "react";

export default function Index() {
  // ✅ 앱 첫 진입 시 무조건 /(tabs)로 이동
  return <Redirect href="/(tabs)" />;
}
