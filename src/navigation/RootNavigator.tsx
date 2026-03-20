import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { useAuth } from '../hooks';
import { platePilotColors as C, platePilotTypography as T } from '../theme/designSystem';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export const RootNavigator = () => {
  const { initializing, user } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText} variant="bodyLarge">
          Loading session...
        </Text>
      </View>
    );
  }

  if (user) {
    return <AppNavigator />;
  }

  return <AuthNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: C.cream,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 15,
    marginTop: 12,
  },
});
