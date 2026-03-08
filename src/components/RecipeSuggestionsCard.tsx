import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';

import type { RecipeSuggestion } from '../utils/recipeSuggestions';

type RecipeSuggestionsCardProps = {
  suggestions: RecipeSuggestion[];
};

export const RecipeSuggestionsCard = ({ suggestions }: RecipeSuggestionsCardProps) => {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card style={styles.card} mode="contained">
      <Card.Content>
        <Text variant="titleMedium">Suggested Meals</Text>

        <View style={styles.listSection}>
          {suggestions.map((suggestion) => (
            <Text key={suggestion.name} style={styles.itemText} variant="bodyMedium">
              {`\u2022 ${suggestion.name}`}
            </Text>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 16,
  },
  itemText: {
    marginTop: 6,
    opacity: 0.82,
  },
  listSection: {
    marginTop: 10,
  },
});
