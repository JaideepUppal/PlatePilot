import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Text } from 'react-native-paper';

import { useAuth } from '../hooks';
import { HomeScreenProps } from '../types/navigation';

export const HomeScreen = (_props: HomeScreenProps) => {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Unable to sign out right now.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting} variant="headlineMedium">
        Welcome to PlatePilot
      </Text>
      <Text style={styles.subtitle} variant="bodyLarge">
        Choose your mode to get started.
      </Text>

      <Card style={styles.modeCard} mode="contained">
        <Card.Content>
          <Text variant="titleLarge">Inventory Mode</Text>
          <Text style={styles.modeDescription} variant="bodyMedium">
            Capture what you have and keep your pantry in sync.
          </Text>
          <Button mode="contained-tonal">Coming Soon</Button>
        </Card.Content>
      </Card>

      <Card style={styles.modeCard} mode="contained">
        <Card.Content>
          <Text variant="titleLarge">VibeCheck</Text>
          <Text style={styles.modeDescription} variant="bodyMedium">
            Discover recipes by mood, time, and cravings.
          </Text>
          <Button mode="contained-tonal">Coming Soon</Button>
        </Card.Content>
      </Card>

      <Button
        disabled={isSigningOut}
        loading={isSigningOut}
        mode="outlined"
        onPress={handleSignOut}
        style={styles.signOutButton}
      >
        Logout
      </Button>
      <HelperText type="error" visible={Boolean(error)}>
        {error ?? ''}
      </HelperText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  greeting: {
    marginTop: 12,
  },
  subtitle: {
    marginBottom: 24,
    marginTop: 6,
    opacity: 0.75,
  },
  modeCard: {
    borderRadius: 20,
    marginBottom: 16,
    paddingVertical: 10,
  },
  modeDescription: {
    marginBottom: 16,
    marginTop: 8,
    opacity: 0.78,
  },
  signOutButton: {
    marginTop: 8,
  },
});
