import React from "react";
import { SafeAreaView, View, Text, StyleSheet } from "react-native";
import COLORS from "../../lib/colors";
import { radiusCard, paddingH, shadowCard } from "../../lib/ui";

export default function Settings(){
  return (
    <SafeAreaView style={{flex:1, backgroundColor:COLORS.screenBg}}>
      <View style={{padding:paddingH}}>
        <Text style={{marginVertical:12, fontWeight:"600"}}>설정</Text>
        <View style={[styles.card]} />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  card:{ height:300, backgroundColor:"#fff", borderRadius:radiusCard, ...shadowCard }
});
