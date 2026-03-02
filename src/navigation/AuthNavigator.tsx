import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { AuthStackParamList } from '../types/navigation';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

type AuthNavigatorProps = {
  onAuthenticated: () => void;
};

export const AuthNavigator = ({ onAuthenticated }: AuthNavigatorProps) => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLogin={onAuthenticated} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Signup">
        {(props) => <SignupScreen {...props} onSignup={onAuthenticated} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
};
