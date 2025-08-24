import { Platform } from "react-native";

export const shadowCard = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.09, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 4 }
});
export const radiusCard = 18;
export const paddingH = 16;
