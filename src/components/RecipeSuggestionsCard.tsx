import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Text } from 'react-native-paper';

import {
  platePilotColors as C,
  platePilotRadii as R,
  platePilotTypography as T,
} from '../theme/designSystem';
import type { RecipeMatch } from '../utils/recipeSuggestions';

type RecipeSuggestionsCardProps = {
  suggestions: RecipeMatch[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
};

const formatIngredientList = (ingredients: string[]): string => {
  return ingredients.join(', ');
};

export const RecipeSuggestionsCard = ({
  suggestions,
  isLoading = false,
  errorMessage = null,
  onRetry,
}: RecipeSuggestionsCardProps) => {
  const shouldRenderErrorState = Boolean(errorMessage) && suggestions.length === 0;

  if (!isLoading && !shouldRenderErrorState && suggestions.length === 0) {
    return null;
  }

  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content style={styles.content}>
        <Text style={styles.kicker}>
          Smart matches
        </Text>
        <Text style={styles.title}>Suggested Meals</Text>
        <Text style={styles.subtitle}>
          Start with ingredients that are already asking to be used.
        </Text>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={C.orange} size="large" />
            <Text style={styles.stateText}>Finding the best ingredient matches...</Text>
          </View>
        ) : shouldRenderErrorState ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            {onRetry ? (
              <Button
                compact
                labelStyle={styles.retryButtonLabel}
                mode="text"
                onPress={onRetry}
                textColor={C.orange}
              >
                Try Again
              </Button>
            ) : null}
          </View>
        ) : (
          <View style={styles.listSection}>
            {suggestions.map((suggestion) => {
              const isReadyToCook = suggestion.missingIngredients.length === 0;

              return (
                <View
                  key={suggestion.id}
                  style={styles.recipeBlock}
                >
                  <View style={styles.recipeHeader}>
                    <Text style={styles.recipeName}>{suggestion.name}</Text>
                    {isReadyToCook ? (
                      <View style={styles.readyBadge}>
                        <Text style={styles.readyBadgeText}>
                          Ready to cook
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      Have
                    </Text>
                    <Text style={styles.haveText}>
                      {formatIngredientList(suggestion.matchedIngredients)}
                    </Text>
                  </View>

                  {!isReadyToCook ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        Missing
                      </Text>
                      <Text style={styles.missingText}>
                        {formatIngredientList(suggestion.missingIngredients)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    elevation: 10,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  content: {
    padding: 24,
  },
  detailLabel: {
    color: C.label,
    fontFamily: T.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 1.4,
    minWidth: 64,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  haveText: {
    color: C.textSoft,
    flex: 1,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 22,
  },
  kicker: {
    color: C.orange,
    fontFamily: T.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  listSection: {
    marginTop: 18,
  },
  missingText: {
    color: C.muted,
    flex: 1,
    fontFamily: T.body,
    fontSize: 13,
    lineHeight: 20,
  },
  retryButtonLabel: {
    fontFamily: T.bodyExtraBold,
    fontSize: 13,
    letterSpacing: 0.6,
  },
  readyBadge: {
    backgroundColor: C.orangeSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readyBadgeText: {
    color: C.successText,
    fontFamily: T.bodyBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  recipeBlock: {
    backgroundColor: C.white,
    borderColor: C.borderSoft,
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
  recipeName: {
    color: C.text,
    flex: 1,
    fontFamily: T.heading,
    fontSize: 28,
    letterSpacing: 0.8,
    lineHeight: 30,
    paddingRight: 10,
  },
  subtitle: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 8,
    maxWidth: '92%',
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: C.chipBg,
    borderColor: C.borderSoft,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  stateText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    color: C.danger,
    fontFamily: T.bodyBold,
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  title: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 34,
    letterSpacing: 0.8,
    lineHeight: 36,
    marginTop: 8,
  },
});
