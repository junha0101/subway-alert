import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import COLORS from "../lib/colors";

export default function FabPlus({ onPress }: { onPress:()=>void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={()=>setPressed(true)}
      onPressOut={()=>setPressed(false)}
      onPress={onPress}
      style={[styles.fab, { transform:[{ scale: pressed?0.96:1 }] }]}
    >
      <View style={styles.plusV} />
      <View style={styles.plusH} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  fab:{ position:"absolute", right:22, bottom:22, width:56, height:56, borderRadius:28, backgroundColor:COLORS.primary, alignItems:"center", justifyContent:"center" },
  plusV:{ position:"absolute", width:4, height:24, borderRadius:2, backgroundColor:"#fff" },
  plusH:{ position:"absolute", width:24, height:4, borderRadius:2, backgroundColor:"#fff" }
});
