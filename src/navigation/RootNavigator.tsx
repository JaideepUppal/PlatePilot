import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { useAuth } from '../hooks';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export const RootNavigator = () => {
  const { isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
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
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
});
