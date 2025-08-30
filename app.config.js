// app.config.js
export default {
  expo: {
    name: "subway-alert",
    slug: "subway-alert",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "subwayalert",
    plugins: [
      "expo-router",
      ["expo-location", { isAndroidBackgroundLocationEnabled: true }],
      "expo-notifications",
    ],
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.haengttu.subwayalert",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "알림을 위해 내 주변 역·정류장 진입/이탈을 감지합니다.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "백그라운드에서도 위치 알림을 보내기 위해 필요합니다.",
        NSUserTrackingUsageDescription: "개인화된 알림을 제공하기 위해 필요합니다.",
      },
    },
    android: {
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "POST_NOTIFICATIONS",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
      ],
      package: "com.haengttu.subwayalert",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
    },
    web: { favicon: "./assets/favicon.png" },

    // 🔐 app.json에서 하드코딩했던 값을 환경변수로 주입
    extra: {
      EXPO_PUBLIC_SEOUL_API_KEY: process.env.EXPO_PUBLIC_SEOUL_API_KEY,
      router: {},
      eas: { projectId: "2b865279-0e0d-4cc1-b440-bd12efaee3ca" },
    },
  },
};
