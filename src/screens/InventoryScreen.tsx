import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  FAB,
  HelperText,
  IconButton,
  Modal,
  Portal,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpiryInsightsCard, RecipeSuggestionsCard } from '../components';
import { useAuth } from '../hooks';
import {
  enhanceRecipeSuggestionsWithAssistant,
  findRecipesByIngredients,
} from '../services/backend';
import {
  platePilotColors as C,
  platePilotInputTheme,
  platePilotRadii as R,
  platePilotTypography as T,
} from '../theme/designSystem';
import { usePlatePilotFonts } from '../theme/usePlatePilotFonts';
import {
  InventoryItem,
  addInventory,
  deleteInventory,
  listInventory,
  updateInventory,
} from '../services/inventoryService';
import {
  getExpiryDetails,
  getFallbackRecipeSuggestions,
  getInventoryInsights,
  mergeRecipeInsights,
  mapRecipeSuggestionsToMatches,
  getRecipeSearchIngredients,
  toAiRecipeContext,
  type RecipeMatch,
  sortInventoryItems,
} from '../utils';

const DEFAULT_QUANTITY = '';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const RECIPE_SUGGESTION_LIMIT = 3;

type SnackbarVariant = 'success' | 'error';

type LoadInventoryOptions = {
  refreshing?: boolean;
  showErrorSnackbar?: boolean;
};

const formatDateInput = (expiryDate?: InventoryItem['expiryDate']): string => {
  if (!expiryDate) {
    return '';
  }

  const date = expiryDate.toDate();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
};

const parseDateInput = (value: string): { date: Date | null; isValid: boolean } => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { date: null, isValid: true };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);

  if (!match) {
    return { date: null, isValid: false };
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsedDate = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return { date: null, isValid: false };
  }

  return { date: parsedDate, isValid: true };
};

const formatExpiryDate = (expiryDate?: InventoryItem['expiryDate']): string => {
  if (!expiryDate) {
    return '';
  }

  const date = expiryDate.toDate();
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
};

const AnimatedInventoryRow = ({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) => {
  const rowAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    rowAnim.setValue(0);

    Animated.timing(rowAnim, {
      toValue: 1,
      duration: 420,
      delay: index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, rowAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.985,
      useNativeDriver: true,
      friction: 7,
      tension: 180,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 180,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: rowAnim,
        transform: [
          {
            translateY: rowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
          {
            scale: Animated.multiply(
              pressAnim,
              rowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.985, 1],
              }),
            ),
          },
        ],
      }}
    >
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
};

const AnimatedInsightsCard = ({
  insights,
}: {
  insights: ReturnType<typeof getInventoryInsights>;
}) => {
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    entranceAnim.setValue(0);

    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    glowAnim.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.985,
      useNativeDriver: true,
      friction: 7,
      tension: 180,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 180,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [
          {
            translateY: entranceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [24, 0],
            }),
          },
          {
            scale: Animated.multiply(
              pressAnim,
              entranceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            ),
          },
        ],
        opacity: entranceAnim,
      }}
    >
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View style={{ position: 'relative' }}>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: C.orangeGlow,
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.15, 0.35],
              }),
            }}
          />

          {/* actual card */}
          <ExpiryInsightsCard insights={insights} />
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const InventoryScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [fontsLoaded] = usePlatePilotFonts();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [recipeSuggestions, setRecipeSuggestions] = useState<RecipeMatch[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<InventoryItem | null>(null);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);
  const [unit, setUnit] = useState('');
  const [expiryDateInput, setExpiryDateInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVariant, setSnackbarVariant] = useState<SnackbarVariant>('success');
  const recipeRequestIdRef = useRef(0);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const insightsAnim = useRef(new Animated.Value(0)).current;
  const recipesAnim = useRef(new Animated.Value(0)).current;
  const fabPulseAnim = useRef(new Animated.Value(0)).current;
  const emptyStateAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const refreshFadeAnim = useRef(new Animated.Value(1)).current;

  const nameFieldAnim = useRef(new Animated.Value(0)).current;
  const quantityFieldAnim = useRef(new Animated.Value(0)).current;
  const unitFieldAnim = useRef(new Animated.Value(0)).current;
  const expiryFieldAnim = useRef(new Animated.Value(0)).current;
  const helperAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  const nameFocusAnim = useRef(new Animated.Value(0)).current;
  const quantityFocusAnim = useRef(new Animated.Value(0)).current;
  const unitFocusAnim = useRef(new Animated.Value(0)).current;
  const expiryFocusAnim = useRef(new Animated.Value(0)).current;

  const animateFocus = useCallback((anim: Animated.Value, isFocused: boolean) => {
    Animated.spring(anim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 140,
    }).start();
  }, []);

  const showSnackbar = useCallback((message: string, variant: SnackbarVariant) => {
    setSnackbarMessage(message);
    setSnackbarVariant(variant);
    setSnackbarVisible(true);
  }, []);

  const loadInventory = useCallback(
    async ({
      refreshing: shouldRefresh = false,
      showErrorSnackbar = true,
    }: LoadInventoryOptions = {}) => {
      if (!user) {
        setItems([]);
        setLoadError(null);
        setLoading(false);
        setRefreshing(false);
        return false;
      }

      if (shouldRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError(null);

      try {
        const fetchedItems = await listInventory(user.uid);
        setItems(fetchedItems);
        return true;
      } catch (inventoryError) {
        const message =
          inventoryError instanceof Error
            ? inventoryError.message
            : 'Unable to load inventory right now.';

        setLoadError(message);

        if (showErrorSnackbar) {
          showSnackbar(message, 'error');
        }

        return false;
      } finally {
        if (shouldRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [showSnackbar, user],
  );

  useEffect(() => {
    if (modalVisible) {
      modalAnim.setValue(0);
      nameFieldAnim.setValue(0);
      quantityFieldAnim.setValue(0);
      unitFieldAnim.setValue(0);
      expiryFieldAnim.setValue(0);
      helperAnim.setValue(0);
      actionsAnim.setValue(0);

      Animated.parallel([
        Animated.timing(modalAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.stagger(80, [
          Animated.timing(nameFieldAnim, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(quantityFieldAnim, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(unitFieldAnim, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(expiryFieldAnim, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(helperAnim, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(actionsAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [
    modalVisible,
    modalAnim,
    nameFieldAnim,
    quantityFieldAnim,
    unitFieldAnim,
    expiryFieldAnim,
    helperAnim,
    actionsAnim,
  ]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    headerAnim.setValue(0);
    insightsAnim.setValue(0);
    recipesAnim.setValue(0);

    Animated.stagger(110, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(insightsAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(recipesAnim, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, insightsAnim, recipesAnim]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    fabPulseAnim.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fabPulseAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => loop.stop();
  }, [fabPulseAnim]);

  const loadRecipeSuggestions = useCallback(async (inventoryItems: InventoryItem[]) => {
    const requestId = recipeRequestIdRef.current + 1;
    recipeRequestIdRef.current = requestId;
    const searchIngredients = getRecipeSearchIngredients(inventoryItems);
    const pantryContext = Array.from(
      new Set(inventoryItems.map((item) => item.name.trim()).filter(Boolean)),
    ).slice(0, 12);
    const setIfCurrent = (callback: () => void) => {
      if (recipeRequestIdRef.current === requestId) {
        callback();
      }
    };

    if (searchIngredients.length === 0) {
      setIfCurrent(() => {
        setRecipeSuggestions([]);
        setRecipeError(null);
        setRecipeLoading(false);
      });
      return;
    }

    setIfCurrent(() => {
      setRecipeLoading(true);
      setRecipeError(null);
    });

    try {
      const recipes = await findRecipesByIngredients(searchIngredients);
      const mappedRecipes = mapRecipeSuggestionsToMatches(recipes).slice(
        0,
        RECIPE_SUGGESTION_LIMIT,
      );

      if (mappedRecipes.length > 0) {
        setIfCurrent(() => {
          setRecipeSuggestions(mappedRecipes);
          setRecipeError(null);
        });

        try {
          const recipeInsights = await enhanceRecipeSuggestionsWithAssistant(
            toAiRecipeContext(mappedRecipes),
            pantryContext,
          );

          if (recipeInsights.length > 0) {
            setIfCurrent(() => {
              setRecipeSuggestions(mergeRecipeInsights(mappedRecipes, recipeInsights));
            });
          }
        } catch {
          // Keep rendering Spoonacular recipe data if the AI enhancement request fails.
        }

        return;
      }

      const fallbackSuggestions = getFallbackRecipeSuggestions(inventoryItems).slice(
        0,
        RECIPE_SUGGESTION_LIMIT,
      );
      setIfCurrent(() => {
        setRecipeSuggestions(fallbackSuggestions);
        setRecipeError(
          fallbackSuggestions.length === 0 ? 'No recipe suggestions available right now.' : null,
        );
      });
    } catch (recipeSuggestionError) {
      const fallbackSuggestions = getFallbackRecipeSuggestions(inventoryItems).slice(
        0,
        RECIPE_SUGGESTION_LIMIT,
      );
      const message =
        recipeSuggestionError instanceof Error
          ? recipeSuggestionError.message
          : 'Unable to load recipe suggestions right now.';

      setIfCurrent(() => {
        setRecipeSuggestions(fallbackSuggestions);
        setRecipeError(fallbackSuggestions.length === 0 ? message : null);
      });
    } finally {
      setIfCurrent(() => {
        setRecipeLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    void loadRecipeSuggestions(items);
  }, [items, loadRecipeSuggestions]);

  const resetForm = () => {
    setName('');
    setQuantity(DEFAULT_QUANTITY);
    setUnit('');
    setExpiryDateInput('');
    setFormError(null);
  };

  const openAddModal = () => {
    setEditingItem(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setQuantity(String(item.quantity));
    setUnit(item.unit ?? '');
    setExpiryDateInput(formatDateInput(item.expiryDate));
    setFormError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (!saving) {
      setModalVisible(false);
    }
  };

  const validateForm = (): {
    trimmedName: string;
    parsedQuantity: number;
    trimmedUnit?: string;
    parsedExpiryDate: Date | null;
  } | null => {
    const trimmedName = name.trim();
    const parsedQuantity = Number(quantity);
    const trimmedUnit = unit.trim();
    const parsedExpiryDate = parseDateInput(expiryDateInput);

    if (!trimmedName) {
      setFormError('Item name is required.');
      return null;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFormError('Quantity must be a number greater than 0.');
      return null;
    }

    if (!parsedExpiryDate.isValid) {
      setFormError('Expiry date must use YYYY-MM-DD.');
      return null;
    }

    return {
      trimmedName,
      parsedQuantity,
      trimmedUnit: trimmedUnit || undefined,
      parsedExpiryDate: parsedExpiryDate.date,
    };
  };

  const handleSave = async () => {
    if (!user) {
      setFormError('Please sign in again to continue.');
      return;
    }

    const validated = validateForm();

    if (!validated) {
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const isEditing = Boolean(editingItem);

      if (editingItem) {
        await updateInventory(user.uid, editingItem.id, {
          name: validated.trimmedName,
          quantity: validated.parsedQuantity,
          unit: validated.trimmedUnit ?? null,
          expiryDate: validated.parsedExpiryDate,
        });
      } else {
        await addInventory(user.uid, {
          name: validated.trimmedName,
          quantity: validated.parsedQuantity,
          unit: validated.trimmedUnit,
          expiryDate: validated.parsedExpiryDate,
        });
      }

      setModalVisible(false);
      setEditingItem(null);
      resetForm();

      const refreshed = await loadInventory({ refreshing: true });

      if (refreshed) {
        showSnackbar(isEditing ? 'Item updated' : 'Item added successfully', 'success');
      }
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : 'Unable to save item right now.';

      setFormError(message);
      showSnackbar(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (item: InventoryItem) => {
    setPendingDeleteItem(item);
  };

  const handleDelete = async () => {
    if (!user || !pendingDeleteItem) {
      return;
    }

    const itemId = pendingDeleteItem.id;
    setPendingDeleteItem(null);
    setDeletingItemId(itemId);

    try {
      await deleteInventory(user.uid, itemId);
      const refreshed = await loadInventory({ refreshing: true });

      if (refreshed) {
        showSnackbar('Item removed', 'success');
      }
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Unable to delete item right now.';

      showSnackbar(message, 'error');
    } finally {
      setDeletingItemId(null);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!user) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyTitle}>You are not signed in.</Text>
        <Text style={styles.emptyMessage}>Please sign in to manage your inventory.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator color={C.orange} size="large" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  if (loadError && items.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Card mode="contained" style={styles.errorCard}>
          <Card.Content style={styles.errorCardContent}>
            <Text style={styles.emptyTitle}>Couldn&apos;t load inventory</Text>
            <Text style={styles.emptyMessage}>{loadError}</Text>
            <Button
              buttonColor={C.black}
              contentStyle={styles.primaryButtonContent}
              labelStyle={styles.primaryButtonLabel}
              mode="contained"
              onPress={() => {
                void loadInventory();
              }}
              textColor={C.white}
            >
              Try Again
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  const sortedItems = sortInventoryItems(items);
  const insights = getInventoryInsights(items);
  const showFloatingAction = sortedItems.length > 0;
  const floatingActionBottom = insets.bottom + 28;
  const listBottomPadding = showFloatingAction ? floatingActionBottom + 148 : 64;
  const listFooterHeight = showFloatingAction ? floatingActionBottom + 84 : 20;

  const getFieldAnimatedStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  });

  const getFocusWrapStyle = (focusAnim: Animated.Value) => ({
    transform: [
      {
        scale: focusAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.015],
        }),
      },
    ],
    shadowOpacity: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.04, 0.14],
    }),
    shadowRadius: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 20],
    }),
    borderColor: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [C.borderSoft, C.orange],
    }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.amb1} />
      <View style={styles.amb2} />
      <View style={styles.amb3} />

      <FlatList<InventoryItem>
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: listBottomPadding },
          sortedItems.length === 0 ? styles.emptyListContainer : null,
        ]}
        data={sortedItems}
        keyboardDismissMode="on-drag"
        keyExtractor={(item) => item.id}
        ListFooterComponent={<View style={{ height: listFooterHeight }} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Animated.View
              style={{
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <Text style={styles.kicker}>Smart pantry</Text>
              <Text style={styles.screenTitle}>
                PANTRY{'\n'}
                <Text style={styles.screenTitleAccent}>INVENTORY.</Text>
              </Text>
              <Text style={styles.screenSubtitle}>
                See what needs attention next and turn ingredients into dinner before they go to
                waste.
              </Text>
            </Animated.View>

            {sortedItems.length > 0 ? (
              <Animated.View
                style={{
                  opacity: insightsAnim,
                  transform: [
                    {
                      translateY: insightsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, 0],
                      }),
                    },
                  ],
                }}
              >
                <AnimatedInsightsCard insights={insights} />
              </Animated.View>
            ) : null}

            {sortedItems.length > 0 ? (
              <Animated.View
                style={{
                  opacity: recipesAnim,
                  transform: [
                    {
                      translateY: recipesAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [28, 0],
                      }),
                    },
                  ],
                }}
              >
                <RecipeSuggestionsCard
                  errorMessage={recipeError}
                  isLoading={recipeLoading}
                  onRetry={() => {
                    void loadRecipeSuggestions(items);
                  }}
                  suggestions={recipeSuggestions}
                />
              </Animated.View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyCard}>
              <Text style={styles.kicker}>Inventory</Text>
              <Text style={styles.emptyTitle}>No inventory yet</Text>
              <Text style={styles.emptyMessage}>
                Add your first ingredient to start tracking your kitchen.
              </Text>
              <Button
                buttonColor={C.black}
                contentStyle={styles.primaryButtonContent}
                labelStyle={styles.primaryButtonLabel}
                mode="contained"
                onPress={openAddModal}
                textColor={C.white}
              >
                Add Item
              </Button>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            colors={[C.orange]}
            onRefresh={() => {
              void loadInventory({ refreshing: true });
            }}
            refreshing={refreshing}
            tintColor={C.orange}
          />
        }
        renderItem={({ item, index }) => {
          const expiryStatus = getExpiryDetails(item.expiryDate).status;
          const quantityUnitLabel = item.unit ?? 'qty';
          const expiryChipLabel =
            expiryStatus === 'expired'
              ? 'Expired'
              : expiryStatus === 'soon'
                ? 'Use soon'
                : item.expiryDate
                  ? `Expires ${formatExpiryDate(item.expiryDate)}`
                  : null;
          const expiryChipColors =
            expiryStatus === 'expired'
              ? {
                  backgroundColor: C.dangerSurface,
                  textColor: C.dangerText,
                }
              : expiryStatus === 'soon'
                ? {
                    backgroundColor: C.orangeSoft,
                    textColor: C.orangeDark,
                  }
                : {
                    backgroundColor: C.chipBg,
                    textColor: C.textSoft,
                  };

          return (
            <AnimatedInventoryRow index={index}>
              <Card mode="contained" style={styles.itemCard}>
                <Card.Content style={styles.itemCardContent}>
                  <View style={styles.itemTopRow}>
                    <View style={styles.itemTextColumn}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemMeta}>
                        {item.expiryDate
                          ? `Use by ${formatExpiryDate(item.expiryDate)}`
                          : 'No expiry date'}
                      </Text>
                    </View>

                    <View style={styles.quantityPill}>
                      <Text style={styles.quantityValue}>{item.quantity}</Text>
                      <Text style={styles.quantityUnit}>{quantityUnitLabel}</Text>
                    </View>
                  </View>

                  <View style={styles.itemBottomRow}>
                    <View style={styles.itemStatusArea}>
                      {expiryChipLabel ? (
                        <Chip
                          compact
                          icon={
                            expiryStatus === 'expired'
                              ? 'alert-circle-outline'
                              : expiryStatus === 'soon'
                                ? 'clock-alert-outline'
                                : 'calendar-range-outline'
                          }
                          style={[
                            styles.expiryChip,
                            { backgroundColor: expiryChipColors.backgroundColor },
                          ]}
                          textStyle={[styles.expiryChipText, { color: expiryChipColors.textColor }]}
                        >
                          {expiryChipLabel}
                        </Chip>
                      ) : (
                        <View style={styles.flexibleBadge}>
                          <Text style={styles.flexibleBadgeText}>Flexible shelf life</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.itemActions}>
                      <IconButton
                        accessibilityLabel={`Edit ${item.name}`}
                        containerColor={C.white}
                        disabled={saving}
                        icon="pencil-outline"
                        iconColor={C.text}
                        mode="contained"
                        onPress={() => openEditModal(item)}
                        size={18}
                        style={styles.actionIcon}
                      />
                      <IconButton
                        accessibilityLabel={`Delete ${item.name}`}
                        containerColor={C.dangerSurface}
                        disabled={deletingItemId === item.id}
                        icon="trash-can-outline"
                        iconColor={C.dangerText}
                        loading={deletingItemId === item.id}
                        mode="contained"
                        onPress={() => requestDelete(item)}
                        size={18}
                        style={[styles.actionIcon, styles.deleteActionIcon]}
                      />
                    </View>
                  </View>
                </Card.Content>
              </Card>
            </AnimatedInventoryRow>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      {showFloatingAction ? (
        <Animated.View
          style={{
            transform: [
              {
                scale: fabPulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1],
                }),
              },
            ],
          }}
        >
          <FAB
            color={C.white}
            icon="plus"
            label="Add item"
            onPress={openAddModal}
            style={[styles.fab, { bottom: floatingActionBottom }]}
          />
        </Animated.View>
      ) : null}

      <Portal>
        <Modal
          contentContainerStyle={styles.modalOverlay}
          onDismiss={closeModal}
          visible={modalVisible}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={32}
            style={styles.modalKeyboardContainer}
          >
            <Animated.View
              style={[
                styles.modalAnimatedWrap,
                {
                  opacity: modalAnim,
                  transform: [
                    {
                      translateY: modalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, 0],
                      }),
                    },
                    {
                      scale: modalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.modalContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalCard}>
                  <View style={styles.modalGlow} />
                  <View style={styles.modalInner}>
                    <Text style={styles.modalEyebrow}>
                      {editingItem ? 'Update item' : 'Add item'}
                    </Text>
                    <Text style={styles.modalTitle}>
                      {editingItem ? 'Edit Inventory' : 'New Inventory Item'}
                    </Text>

                    <Animated.View
                      style={[styles.fieldBlock, getFieldAnimatedStyle(nameFieldAnim)]}
                    >
                      <Text style={styles.fieldLabel}>NAME</Text>
                      <Animated.View style={[styles.inputWrap, getFocusWrapStyle(nameFocusAnim)]}>
                        <TextInput
                          autoCapitalize="words"
                          mode="outlined"
                          onBlur={() => animateFocus(nameFocusAnim, false)}
                          onChangeText={setName}
                          onFocus={() => animateFocus(nameFocusAnim, true)}
                          outlineStyle={styles.inputOutline}
                          placeholder="Enter an item name"
                          placeholderTextColor={C.placeholder}
                          style={styles.input}
                          theme={platePilotInputTheme}
                          value={name}
                        />
                      </Animated.View>
                    </Animated.View>

                    <Animated.View
                      style={[styles.fieldBlock, getFieldAnimatedStyle(quantityFieldAnim)]}
                    >
                      <Text style={styles.fieldLabel}>QUANTITY</Text>
                      <Animated.View
                        style={[styles.inputWrap, getFocusWrapStyle(quantityFocusAnim)]}
                      >
                        <TextInput
                          keyboardType="numeric"
                          mode="outlined"
                          onBlur={() => animateFocus(quantityFocusAnim, false)}
                          onChangeText={setQuantity}
                          onFocus={() => animateFocus(quantityFocusAnim, true)}
                          outlineStyle={styles.inputOutline}
                          placeholder="1"
                          placeholderTextColor={C.placeholder}
                          style={styles.input}
                          theme={platePilotInputTheme}
                          value={quantity}
                        />
                      </Animated.View>
                    </Animated.View>

                    <Animated.View
                      style={[styles.fieldBlock, getFieldAnimatedStyle(unitFieldAnim)]}
                    >
                      <Text style={styles.fieldLabel}>UNIT (OPTIONAL)</Text>
                      <Animated.View style={[styles.inputWrap, getFocusWrapStyle(unitFocusAnim)]}>
                        <TextInput
                          mode="outlined"
                          onBlur={() => animateFocus(unitFocusAnim, false)}
                          onChangeText={setUnit}
                          onFocus={() => animateFocus(unitFocusAnim, true)}
                          outlineStyle={styles.inputOutline}
                          placeholder="pcs, lbs, cups..."
                          placeholderTextColor={C.placeholder}
                          style={styles.input}
                          theme={platePilotInputTheme}
                          value={unit}
                        />
                      </Animated.View>
                    </Animated.View>

                    <Animated.View
                      style={[styles.fieldBlock, getFieldAnimatedStyle(expiryFieldAnim)]}
                    >
                      <Text style={styles.fieldLabel}>EXPIRY DATE</Text>
                      <Animated.View style={[styles.inputWrap, getFocusWrapStyle(expiryFocusAnim)]}>
                        <TextInput
                          autoCapitalize="none"
                          mode="outlined"
                          onBlur={() => animateFocus(expiryFocusAnim, false)}
                          onChangeText={setExpiryDateInput}
                          onFocus={() => animateFocus(expiryFocusAnim, true)}
                          outlineStyle={styles.inputOutline}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={C.placeholder}
                          style={styles.input}
                          theme={platePilotInputTheme}
                          value={expiryDateInput}
                        />
                      </Animated.View>
                    </Animated.View>

                    <Animated.View
                      style={{
                        opacity: helperAnim,
                        transform: [
                          {
                            translateY: helperAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [10, 0],
                            }),
                          },
                        ],
                      }}
                    >
                      <HelperText style={styles.inputHint} type="info" visible>
                        Use YYYY-MM-DD or leave blank.
                      </HelperText>
                      <HelperText
                        style={styles.errorText}
                        type="error"
                        visible={Boolean(formError)}
                      >
                        {formError ?? ''}
                      </HelperText>
                    </Animated.View>

                    <Animated.View
                      style={[
                        styles.modalActions,
                        {
                          opacity: actionsAnim,
                          transform: [
                            {
                              translateY: actionsAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [16, 0],
                              }),
                            },
                            {
                              scale: actionsAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.97, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Button
                        disabled={saving}
                        labelStyle={styles.modalSecondaryButtonLabel}
                        mode="text"
                        onPress={closeModal}
                        textColor={C.orange}
                      >
                        Cancel
                      </Button>
                      <Button
                        buttonColor={C.black}
                        contentStyle={styles.modalPrimaryButtonContent}
                        disabled={saving}
                        labelStyle={styles.modalPrimaryButtonLabel}
                        loading={saving}
                        mode="contained"
                        onPress={() => {
                          void handleSave();
                        }}
                        textColor={C.white}
                      >
                        Save
                      </Button>
                    </Animated.View>
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>

        <Dialog
          dismissable={!Boolean(deletingItemId)}
          onDismiss={() => {
            if (!deletingItemId) {
              setPendingDeleteItem(null);
            }
          }}
          style={styles.dialog}
          visible={Boolean(pendingDeleteItem)}
        >
          <Dialog.Title style={styles.dialogTitle}>Delete Item</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogBody}>Delete this item from inventory?</Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              disabled={Boolean(deletingItemId)}
              labelStyle={styles.modalSecondaryButtonLabel}
              onPress={() => setPendingDeleteItem(null)}
              textColor={C.orange}
            >
              Cancel
            </Button>
            <Button
              buttonColor={C.danger}
              contentStyle={styles.modalPrimaryButtonContent}
              disabled={Boolean(deletingItemId)}
              labelStyle={styles.modalPrimaryButtonLabel}
              loading={Boolean(deletingItemId)}
              mode="contained"
              onPress={() => {
                void handleDelete();
              }}
              textColor={C.white}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Snackbar
          duration={3000}
          onDismiss={() => setSnackbarVisible(false)}
          style={[
            styles.snackbar,
            snackbarVariant === 'error' ? styles.snackbarError : styles.snackbarSuccess,
          ]}
          visible={snackbarVisible}
        >
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.cream,
    flex: 1,
    width: '100%',
  },
  amb1: {
    backgroundColor: C.orange,
    borderRadius: 110,
    height: 220,
    opacity: 0.12,
    position: 'absolute',
    right: -44,
    top: -16,
    width: 220,
  },
  amb2: {
    backgroundColor: C.orangeGlow,
    borderRadius: 96,
    height: 192,
    left: -86,
    opacity: 0.35,
    position: 'absolute',
    top: 320,
    width: 192,
  },
  amb3: {
    alignSelf: 'center',
    backgroundColor: C.orange,
    borderRadius: 140,
    bottom: 140,
    height: 280,
    opacity: 0.06,
    position: 'absolute',
    width: 280,
  },
  centeredContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  listContainer: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listFooter: {
    height: 8,
  },
  listHeader: {
    marginBottom: 16,
  },
  kicker: {
    color: C.orange,
    fontFamily: T.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 1.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  screenTitle: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 54,
    letterSpacing: 1.2,
    lineHeight: 54,
  },
  screenTitleAccent: {
    color: C.orange,
    fontSize: 50,
    letterSpacing: 0.1,
    lineHeight: 50,
  },
  screenSubtitle: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 24,
    marginTop: 12,
    maxWidth: '94%',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 12,
  },
  emptyCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    padding: 24,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    width: '100%',
  },
  emptyTitle: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 34,
    letterSpacing: 0.8,
    lineHeight: 36,
    textAlign: 'center',
  },
  emptyMessage: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    maxWidth: 420,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    width: '100%',
  },
  errorCardContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 15,
    marginTop: 12,
  },
  primaryButtonContent: {
    height: 56,
    paddingHorizontal: 10,
  },
  primaryButtonLabel: {
    color: C.white,
    fontFamily: T.heading,
    fontSize: 22,
    letterSpacing: 1.8,
  },
  itemCard: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    elevation: 10,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  itemCardContent: {
    padding: 22,
  },
  itemTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemTextColumn: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 25,
    letterSpacing: 0.8,
    lineHeight: 32,
  },
  itemMeta: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 13,
    marginTop: 6,
  },
  quantityPill: {
    alignItems: 'center',
    backgroundColor: C.orangeSoft,
    borderRadius: 20,
    minWidth: 78,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quantityValue: {
    color: C.orangeDark,
    fontFamily: T.heading,
    fontSize: 32,
    letterSpacing: 0.6,
    lineHeight: 32,
  },
  quantityUnit: {
    color: C.orangeDark,
    fontFamily: T.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  itemBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  itemStatusArea: {
    flex: 1,
    paddingRight: 12,
  },
  expiryChip: {
    borderRadius: 999,
    paddingVertical: 2,
  },
  expiryChipText: {
    fontFamily: T.bodyBold,
    fontSize: 12,
    marginVertical: 2,
  },
  flexibleBadge: {
    backgroundColor: C.chipBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  flexibleBadgeText: {
    color: C.textSoft,
    fontFamily: T.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    borderColor: C.borderSoft,
    borderWidth: 1,
    margin: 0,
  },
  deleteActionIcon: {
    borderColor: '#F3CBB9',
  },
  fab: {
    backgroundColor: C.black,
    borderColor: '#2F2017',
    borderRadius: 20,
    borderWidth: 1,
    position: 'absolute',
    right: 20,
    shadowColor: C.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
  },
  modalOverlay: {
    justifyContent: 'center',
    marginHorizontal: 13,
    marginVertical: 4,
    maxHeight: '100%',
  },
  modalKeyboardContainer: {
    maxHeight: '100%',
    width: '100%',
  },
  modalContainer: {
    padding: 0,
  },
  modalEyebrow: {
    color: C.orange,
    fontFamily: T.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalTitle: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 32,
    letterSpacing: 0.6,
    lineHeight: 34,
    marginBottom: 8,
  },
  fieldBlock: {
    marginTop: 10,
  },
  fieldLabel: {
    color: C.label,
    fontFamily: T.bodyExtraBold,
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    fontFamily: T.bodyMedium,
    fontSize: 14,
    minHeight: 54,
  },
  inputOutline: {
    borderRadius: 16,
    borderColor: 'transparent',
  },
  inputHint: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 10,
    marginTop: 4,
    marginBottom: -2,
  },
  errorText: {
    color: C.danger,
    fontFamily: T.bodyBold,
    fontSize: 10,
    marginBottom: 0,
    marginTop: -4,
  },
  modalActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  modalPrimaryButtonContent: {
    height: 50,
    paddingHorizontal: 12,
  },
  modalPrimaryButtonLabel: {
    color: C.white,
    fontFamily: T.heading,
    fontSize: 18,
    letterSpacing: 1.6,
  },
  modalSecondaryButtonLabel: {
    color: C.orange,
    fontFamily: T.bodyExtraBold,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  dialog: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
  },
  dialogTitle: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 30,
    letterSpacing: 0.5,
  },
  dialogBody: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 24,
  },
  dialogActions: {
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 18,
  },
  snackbar: {
    borderRadius: 20,
    margin: 16,
  },
  snackbarError: {
    backgroundColor: C.dangerDark,
  },
  snackbarSuccess: {
    backgroundColor: C.black,
  },
  snackbarText: {
    color: C.white,
    fontFamily: T.bodyBold,
    fontSize: 13,
  },
  modalAnimatedWrap: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: C.borderSubtle,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
    minHeight: '85%',
    flexGrow: 1,
  },

  modalGlow: {
    position: 'absolute',
    right: -30,
    top: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: C.cardGlow,
    opacity: 0.55,
  },

  modalInner: {
    position: 'relative',
  },
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: C.borderSoft,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: C.orangeDark,
    shadowOffset: { width: 0, height: 6 },
  },
});
