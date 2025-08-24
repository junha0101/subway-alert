// utils/geocode.ts
import * as Location from "expo-location";

export async function geocodeAddress(address: string) {
  try {
    const results = await Location.geocodeAsync(address);
    if (!results || results.length === 0) return null;
    const { latitude, longitude } = results[0];
    return { latitude, longitude };
  } catch {
    return null;
  }
}
