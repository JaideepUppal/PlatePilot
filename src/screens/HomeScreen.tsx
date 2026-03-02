import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';

import { HomeScreenProps } from '../types/navigation';

export const HomeScreen = (_props: HomeScreenProps) => {
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
});
