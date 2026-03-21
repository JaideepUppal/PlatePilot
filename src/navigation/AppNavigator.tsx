import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { platePilotColors as C, platePilotTypography as T } from '../theme/designSystem';
import { AppStackParamList } from '../types/navigation';

const AppStack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator = () => {
  return (
    <AppStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: C.cream },
        headerShadowVisible: false,
      }}
    >
      <AppStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          headerShown: false,
          title: 'Scan Ingredients',
          headerStyle: {
            backgroundColor: C.cream,
          },
          headerTintColor: C.text,
          headerTitleStyle: {
            fontFamily: T.heading,
            fontSize: 28,
          },
        }}
      />
    </AppStack.Navigator>
  );
};