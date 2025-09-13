// app.config.js
export default {
  expo: {
    name: "행뚜",
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
      // ✅ iOS에서 백그라운드 위치 권한 사용
      backgroundModes: ["location"],
      infoPlist: {
        // --- 위치 권한 문구 (심사용) ---
        NSLocationWhenInUseUsageDescription:
          "역/정류장 진입·이탈을 확인하여 도착 알림을 보내기 위해 앱 사용 중 위치가 필요합니다.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "앱이 꺼져 있어도 설정한 역 반경에 들어오면 알림을 보내기 위해 항상 위치가 필요합니다.",
        NSLocationAlwaysUsageDescription:
          "앱이 꺼져 있어도 설정한 역 반경에 들어오면 알림을 보내기 위해 항상 위치가 필요합니다.",
        // --- 기존 항목 유지 ---
        NSUserTrackingUsageDescription:
          "개인화된 알림을 제공하기 위해 필요합니다.",

        // --- ATS 예외 (서울시 OpenAPI http 사용 대비) ---
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSExceptionDomains: {
            "openapi.seoul.go.kr": {
              NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
              NSTemporaryExceptionMinimumTLSVersion: "TLSv1.0",
              NSIncludesSubdomains: true,
            },
          },
        },
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

    extra: {
      EXPO_PUBLIC_SEOUL_API_KEY: process.env.EXPO_PUBLIC_SEOUL_API_KEY,
      router: {},
      eas: { projectId: "2b865279-0e0d-4cc1-b440-bd12efaee3ca" },
    },
  },
};
