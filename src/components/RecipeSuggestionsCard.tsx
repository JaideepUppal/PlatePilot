import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

import type { RecipeMatch } from '../utils/recipeSuggestions';

type RecipeSuggestionsCardProps = {
  suggestions: RecipeMatch[];
};

const formatIngredientList = (ingredients: string[]): string => {
  return ingredients.join(', ');
};

export const RecipeSuggestionsCard = ({ suggestions }: RecipeSuggestionsCardProps) => {
  const { colors } = useTheme();

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card
      mode="contained"
      style={[
        styles.card,
        {
          backgroundColor: colors.elevation.level1,
          borderColor: colors.outlineVariant,
        },
      ]}
    >
      <Card.Content>
        <Text style={styles.kicker} variant="labelLarge">
          Smart matches
        </Text>
        <Text variant="titleLarge">Suggested Meals</Text>
        <Text style={styles.subtitle} variant="bodyMedium">
          Start with ingredients that are already asking to be used.
        </Text>

        <View style={styles.listSection}>
          {suggestions.map((suggestion) => {
            const isReadyToCook = suggestion.missingIngredients.length === 0;

            return (
              <View
                key={suggestion.name}
                style={[
                  styles.recipeBlock,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <View style={styles.recipeHeader}>
                  <Text variant="titleMedium">{suggestion.name}</Text>
                  {isReadyToCook ? (
                    <View
                      style={[
                        styles.readyBadge,
                        { backgroundColor: colors.primaryContainer },
                      ]}
                    >
                      <Text
                        style={{ color: colors.onPrimaryContainer }}
                        variant="labelMedium"
                      >
                        Ready to cook
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel} variant="labelMedium">
                    Have
                  </Text>
                  <Text style={styles.haveText} variant="bodyMedium">
                    {formatIngredientList(suggestion.matchedIngredients)}
                  </Text>
                </View>

                {!isReadyToCook ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel} variant="labelMedium">
                      Missing
                    </Text>
                    <Text style={styles.missingText} variant="bodySmall">
                      {formatIngredientList(suggestion.missingIngredients)}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  detailLabel: {
    letterSpacing: 0.4,
    minWidth: 64,
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  haveText: {
    flex: 1,
    opacity: 0.88,
  },
  kicker: {
    letterSpacing: 1,
    opacity: 0.54,
    textTransform: 'uppercase',
  },
  listSection: {
    marginTop: 18,
  },
  missingText: {
    flex: 1,
    opacity: 0.56,
  },
  readyBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recipeBlock: {
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  recipeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtitle: {
    marginTop: 8,
    maxWidth: '92%',
    opacity: 0.7,
  },
});
