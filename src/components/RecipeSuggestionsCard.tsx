import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
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

type NutritionItem = {
  label: string;
  value: string;
};

const formatIngredientPreview = (ingredients: string[], limit = 4): string => {
  if (ingredients.length === 0) {
    return 'No pantry match highlighted yet.';
  }

  const visibleIngredients = ingredients.slice(0, limit);
  const remainingCount = ingredients.length - visibleIngredients.length;

  return remainingCount > 0
    ? `${visibleIngredients.join(', ')} +${remainingCount} more`
    : visibleIngredients.join(', ');
};

const formatTimeLabel = (label: string, value: number | undefined): string | null => {
  if (typeof value !== 'number') {
    return null;
  }

  return `${label} ${value} min`;
};

const getNutritionItems = (suggestion: RecipeMatch): NutritionItem[] => {
  const nutrition = suggestion.nutrition;

  if (!nutrition) {
    return [];
  }

  return [
    nutrition.calories ? { label: 'Calories', value: nutrition.calories } : null,
    nutrition.protein ? { label: 'Protein', value: nutrition.protein } : null,
    nutrition.carbs ? { label: 'Carbs', value: nutrition.carbs } : null,
    nutrition.fat ? { label: 'Fat', value: nutrition.fat } : null,
  ].filter((item): item is NutritionItem => item !== null);
};

export const RecipeSuggestionsCard = ({
  suggestions,
  isLoading = false,
  errorMessage = null,
  onRetry,
}: RecipeSuggestionsCardProps) => {
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<Record<string, boolean>>({});
  const shouldRenderErrorState = Boolean(errorMessage) && suggestions.length === 0;

  if (!isLoading && !shouldRenderErrorState && suggestions.length === 0) {
    return null;
  }

  const toggleRecipeDetails = (recipeId: string) => {
    setExpandedRecipeIds((current) => ({
      ...current,
      [recipeId]: !current[recipeId],
    }));
  };

  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content style={styles.content}>
        <Text style={styles.kicker}>Smart matches</Text>
        <Text style={styles.title}>Suggested Meals</Text>
        <Text style={styles.subtitle}>
          Spoonacular handles the recipe facts. PlatePilot keeps the advice practical and easy to scan.
        </Text>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={C.orange} size="large" />
            <Text style={styles.stateText}>
              Pulling recipe details and pantry-fit cooking tips...
            </Text>
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
              const isExpanded = expandedRecipeIds[suggestion.id] === true;
              const metaItems = [
                formatTimeLabel('Ready', suggestion.readyInMinutes),
                formatTimeLabel('Prep', suggestion.preparationMinutes),
                typeof suggestion.servings === 'number'
                  ? `${suggestion.servings} serving${suggestion.servings === 1 ? '' : 's'}`
                  : null,
              ].filter((item): item is string => Boolean(item));
              const nutritionItems = getNutritionItems(suggestion);
              const instructionSteps = suggestion.instructions?.slice(0, 3) ?? [];
              const platePilotInsight = suggestion.platePilotInsight;
              const supportTips = [
                platePilotInsight?.whatToCookFirst
                  ? `Prep first: ${platePilotInsight.whatToCookFirst}`
                  : null,
                platePilotInsight?.substitutionTip
                  ? `Swap: ${platePilotInsight.substitutionTip}`
                  : null,
                platePilotInsight?.cookingTip ? `Tip: ${platePilotInsight.cookingTip}` : null,
              ].filter((item): item is string => Boolean(item));
              const hasExtraDetails =
                instructionSteps.length > 0 ||
                nutritionItems.length > 0 ||
                supportTips.length > 0;

              return (
                <View key={suggestion.id} style={styles.recipeBlock}>
                  <View style={styles.recipeTopRow}>
                    <View style={styles.recipeTopContent}>
                      <Text style={styles.recipeName}>{suggestion.name}</Text>

                      <View style={styles.metaWrap}>
                        {isReadyToCook ? (
                          <View style={styles.readyBadge}>
                            <Text style={styles.readyBadgeText}>Ready to cook</Text>
                          </View>
                        ) : null}

                        {metaItems.map((item) => (
                          <View key={item} style={styles.metaPill}>
                            <Text style={styles.metaPillText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {suggestion.imageUrl ? (
                      <Image source={{ uri: suggestion.imageUrl }} style={styles.recipeImage} />
                    ) : null}
                  </View>

                  <View style={styles.summarySection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Have</Text>
                      <Text style={styles.haveText}>
                        {formatIngredientPreview(suggestion.matchedIngredients)}
                      </Text>
                    </View>

                    {!isReadyToCook ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Missing</Text>
                        <Text style={styles.missingText}>
                          {formatIngredientPreview(suggestion.missingIngredients, 3)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {platePilotInsight ? (
                    <View style={styles.insightCard}>
                      <Text style={styles.insightTitle}>PlatePilot tip</Text>
                      <Text style={styles.insightText}>{platePilotInsight.summary}</Text>
                    </View>
                  ) : null}

                  {hasExtraDetails ? (
                    <Button
                      compact
                      icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                      labelStyle={styles.detailsButtonLabel}
                      mode="text"
                      onPress={() => toggleRecipeDetails(suggestion.id)}
                      style={styles.detailsButton}
                      textColor={C.orangeDark}
                    >
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </Button>
                  ) : null}

                  {isExpanded ? (
                    <View style={styles.expandedSection}>
                      {instructionSteps.length > 0 ? (
                        <View style={styles.detailStack}>
                          <Text style={styles.detailLabel}>Instructions</Text>
                          <View style={styles.stepList}>
                            {instructionSteps.map((step, index) => (
                              <Text key={`${suggestion.id}-step-${index + 1}`} style={styles.stepText}>
                                {index + 1}. {step}
                              </Text>
                            ))}
                          </View>
                        </View>
                      ) : null}

                      {nutritionItems.length > 0 ? (
                        <View style={styles.detailStack}>
                          <Text style={styles.detailLabel}>Nutrition</Text>
                          <View style={styles.nutritionWrap}>
                            {nutritionItems.map((item) => (
                              <View key={`${suggestion.id}-${item.label}`} style={styles.nutritionPill}>
                                <Text style={styles.nutritionText}>
                                  {item.label} {item.value}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : null}

                      {supportTips.length > 0 ? (
                        <View style={styles.detailStack}>
                          <Text style={styles.detailLabel}>More guidance</Text>
                          <View style={styles.supportList}>
                            {supportTips.map((item) => (
                              <Text key={`${suggestion.id}-${item}`} style={styles.supportText}>
                                {item}
                              </Text>
                            ))}
                          </View>
                        </View>
                      ) : null}
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
    letterSpacing: 1.3,
    minWidth: 62,
    textTransform: 'uppercase',
  },
  detailsButton: {
    alignSelf: 'flex-start',
    marginLeft: -6,
    marginTop: 8,
  },
  detailsButtonLabel: {
    fontFamily: T.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  detailStack: {
    marginTop: 14,
  },
  errorText: {
    color: C.danger,
    fontFamily: T.bodyBold,
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  expandedSection: {
    borderTopColor: C.borderSoft,
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  haveText: {
    color: C.textSoft,
    flex: 1,
    fontFamily: T.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
  },
  insightCard: {
    backgroundColor: C.orangeSoft,
    borderColor: C.borderSoft,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightText: {
    color: C.text,
    fontFamily: T.bodyBold,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  insightTitle: {
    color: C.orangeDark,
    fontFamily: T.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
  metaPill: {
    backgroundColor: C.chipBg,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  metaPillText: {
    color: C.textSoft,
    fontFamily: T.bodyBold,
    fontSize: 11,
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  missingText: {
    color: C.muted,
    flex: 1,
    fontFamily: T.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
  },
  nutritionPill: {
    backgroundColor: C.chipBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nutritionText: {
    color: C.textSoft,
    fontFamily: T.bodyBold,
    fontSize: 11,
  },
  nutritionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  readyBadge: {
    backgroundColor: C.orangeSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  recipeImage: {
    backgroundColor: C.chipBg,
    borderRadius: 16,
    flexShrink: 0,
    height: 84,
    width: 84,
  },
  recipeName: {
    color: C.text,
    flexShrink: 1,
    fontFamily: T.heading,
    fontSize: 26,
    letterSpacing: 0.7,
    lineHeight: 28,
  },
  recipeTopContent: {
    flex: 1,
    minWidth: 0,
    paddingRight: 14,
  },
  recipeTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  retryButtonLabel: {
    fontFamily: T.bodyExtraBold,
    fontSize: 13,
    letterSpacing: 0.6,
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
  stepList: {
    marginTop: 6,
  },
  stepText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  subtitle: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 8,
    maxWidth: '92%',
  },
  summarySection: {
    marginTop: 14,
  },
  supportList: {
    marginTop: 6,
  },
  supportText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
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
