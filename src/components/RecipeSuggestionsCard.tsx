import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
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
const AnimatedRecipeBlock = ({
  children,
  index,
  pulseBadge = false,
}: {
  children: (args: {
    badgePulseAnim: Animated.Value;
    contentAnim: Animated.Value;
  }) => React.ReactNode;
  index: number;
  pulseBadge?: boolean;
}) => {
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const badgePulseAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entranceAnim.setValue(0);
    contentAnim.setValue(0);

    Animated.sequence([
      Animated.timing(entranceAnim, {
        toValue: 1,
        duration: 380,
        delay: index * 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentAnim, entranceAnim, index]);

  useEffect(() => {
    if (!pulseBadge) return;

    badgePulseAnim.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [badgePulseAnim, pulseBadge]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.985,
      friction: 7,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: entranceAnim,
        transform: [
          {
            translateY: entranceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
          {
            scale: Animated.multiply(
              pressAnim,
              entranceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.985, 1],
              }),
            ),
          },
        ],
      }}
    >
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {children({ badgePulseAnim, contentAnim })}
      </Pressable>
    </Animated.View>
  );
};

export const RecipeSuggestionsCard = ({
  suggestions,
  isLoading = false,
  errorMessage = null,
  onRetry,
}: RecipeSuggestionsCardProps) => {
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<Record<string, boolean>>({});
  const shouldRenderErrorState = Boolean(errorMessage) && suggestions.length === 0;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const stateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    headerAnim.setValue(0);

    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  useEffect(() => {
    stateAnim.setValue(0);

    Animated.timing(stateAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isLoading, errorMessage, suggestions.length, stateAnim]);

  const toggleRecipeDetails = (recipeId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setExpandedRecipeIds((current) => ({
      ...current,
      [recipeId]: !current[recipeId],
    }));
  };

  if (!isLoading && !shouldRenderErrorState && suggestions.length === 0) {
    return null;
  }

  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content style={styles.content}>
        <Animated.View
          style={{
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          }}
        >
          <Text style={styles.kicker}>Smart matches</Text>
          <Text style={styles.title}>Suggested Recipes</Text>
          <Text style={styles.subtitle}>
            Smart recipe matches based on what you already have at home.
          </Text>
        </Animated.View>

        {isLoading ? (
          <Animated.View
            style={[
              styles.stateCard,
              {
                opacity: stateAnim,
                transform: [
                  {
                    translateY: stateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                  {
                    scale: stateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <ActivityIndicator color={C.orange} size="large" />
            <Text style={styles.stateText}>
              Pulling recipe details and pantry-fit cooking tips...
            </Text>
          </Animated.View>
        ) : shouldRenderErrorState ? (
          <Animated.View
            style={[
              styles.stateCard,
              {
                opacity: stateAnim,
                transform: [
                  {
                    translateY: stateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
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
          </Animated.View>
        ) : (
          <View style={styles.listSection}>
            {suggestions.map((suggestion, index) => {
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
                  ? `Substitution: ${platePilotInsight.substitutionTip}`
                  : null,
                platePilotInsight?.cookingTip ? `Tip: ${platePilotInsight.cookingTip}` : null,
              ].filter((item): item is string => Boolean(item));
              const hasExtraDetails =
                instructionSteps.length > 0 || nutritionItems.length > 0 || supportTips.length > 0;

              return (
                <AnimatedRecipeBlock key={suggestion.id} index={index} pulseBadge={isReadyToCook}>
                  {({ badgePulseAnim, contentAnim }) => (
                    <View style={styles.recipeBlock}>
                      <View style={styles.recipeTopRow}>
                        <View style={styles.recipeTopContent}>
                          <Text style={styles.recipeName}>{suggestion.name}</Text>

                          <View style={styles.metaWrap}>
                            {isReadyToCook ? (
                              <Animated.View
                                style={[
                                  styles.readyBadge,
                                  {
                                    transform: [
                                      {
                                        scale: badgePulseAnim.interpolate({
                                          inputRange: [0, 1],
                                          outputRange: [1, 1.04],
                                        }),
                                      },
                                    ],
                                  },
                                ]}
                              >
                                <Text style={styles.readyBadgeText}>Ready to cook</Text>
                              </Animated.View>
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
                        <Animated.View
                          style={[
                            styles.insightCard,
                            {
                              opacity: contentAnim,
                              transform: [
                                {
                                  translateY: contentAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [10, 0],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          <Text style={styles.insightTitle}>PlatePilot tip</Text>
                          <Text style={styles.insightText}>{platePilotInsight.summary}</Text>
                        </Animated.View>
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
                        <Animated.View
                          style={[
                            styles.expandedSection,
                            {
                              opacity: contentAnim,
                              transform: [
                                {
                                  translateY: contentAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [8, 0],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          {instructionSteps.length > 0 ? (
                            <View style={styles.detailStack}>
                              <Text style={styles.detailLabel}>Instructions</Text>
                              <View style={styles.stepList}>
                                {instructionSteps.map((step, index) => (
                                  <Text
                                    key={`${suggestion.id}-step-${index + 1}`}
                                    style={styles.stepText}
                                  >
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
                                  <View
                                    key={`${suggestion.id}-${item.label}`}
                                    style={styles.nutritionPill}
                                  >
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
                        </Animated.View>
                      ) : null}
                    </View>
                  )}
                </AnimatedRecipeBlock>
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
    elevation: 8,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  content: {
    padding: 22,
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
    marginLeft: -4,
    marginTop: 10,
  },
  detailsButtonLabel: {
    fontFamily: T.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
  },
  detailStack: {
    marginTop: 16,
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
    marginTop: 12,
    paddingTop: 14,
  },
  haveText: {
    color: C.textSoft,
    flex: 1,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 22,
  },
  insightCard: {
    backgroundColor: C.orangeSoft,
    borderColor: C.borderSoft,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  insightText: {
    color: C.text,
    fontFamily: T.bodyBold,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
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
    fontSize: 14,
    lineHeight: 22,
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
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  recipeImage: {
    backgroundColor: C.chipBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderSoft,
    flexShrink: 0,
    height: 88,
    width: 88,
  },
  recipeName: {
    color: C.text,
    flexShrink: 1,
    fontFamily: T.heading,
    fontSize: 24,
    letterSpacing: 0.6,
    lineHeight: 30,
  },
  recipeTopContent: {
    flex: 1,
    minWidth: 0,
    paddingRight: 14,
  },
  recipeTopRow: {
    alignItems: 'center',
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
    overflow: 'hidden',
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
    marginTop: 8,
    gap: 8,
  },
  stepText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: C.chipBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.borderSoft,
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
    marginTop: 8,
    gap: 8,
  },
  supportText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 13,
    lineHeight: 21,
    backgroundColor: C.surfaceGlass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
