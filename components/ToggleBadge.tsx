import React from "react";
import { Switch } from "react-native";
import COLORS from "../lib/colors";

export default function ToggleBadge({ value, onChange }: { value:boolean; onChange:(v:boolean)=>void }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: COLORS.toggleTrackOff, true: COLORS.green }}
      thumbColor={COLORS.toggleThumb}
      ios_backgroundColor={COLORS.toggleTrackOff}
    />
  );
}
