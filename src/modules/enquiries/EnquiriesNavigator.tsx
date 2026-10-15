import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EnquiriesScreen from "./screens/EnquiriesScreen";
import EnquiryFormScreen from "./screens/EnquiryFormScreen";
import EnquiryDetailScreen from "./screens/EnquiryDetailScreen";

export type EnquiriesParamList = {
  EnquiriesList: undefined;
  EnquiryNew: undefined;
  EnquiryDetail: { id: string };
};

const Stack = createNativeStackNavigator<EnquiriesParamList>();

export default function EnquiriesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EnquiriesList" component={EnquiriesScreen} options={{ title: "Enquiries" }} />
      <Stack.Screen name="EnquiryNew" component={EnquiryFormScreen} options={{ title: "New enquiry" }} />
      <Stack.Screen name="EnquiryDetail" component={EnquiryDetailScreen} options={{ title: "Enquiry" }} />
    </Stack.Navigator>
  );
}
