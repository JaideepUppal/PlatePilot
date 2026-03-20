import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpiryInsightsCard, RecipeSuggestionsCard } from '../components';
import { useAuth } from '../hooks';
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
import { InventoryScreenProps } from '../types/navigation';
import {
  getExpiryDetails,
  getInventoryInsights,
  getRecipeSuggestions,
  sortInventoryItems,
} from '../utils';

const DEFAULT_QUANTITY = '1';
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export const InventoryScreen = ({ navigation }: InventoryScreenProps) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [fontsLoaded] = usePlatePilotFonts();

  const [items, setItems] = useState<InventoryItem[]>([]);
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
    void loadInventory();
  }, [loadInventory]);

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

  const validateForm = ():
    | {
        trimmedName: string;
        parsedQuantity: number;
        trimmedUnit?: string;
        parsedExpiryDate: Date | null;
      }
    | null => {
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
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete item right now.';

      showSnackbar(message, 'error');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Home');
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!user) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.centeredContainer}>
          <Text style={styles.emptyTitle}>You are not signed in.</Text>
          <Text style={styles.emptyMessage}>
            Please go back and sign in to manage your inventory.
          </Text>
          <Button
            buttonColor={C.black}
            contentStyle={styles.primaryButtonContent}
            labelStyle={styles.primaryButtonLabel}
            mode="contained"
            onPress={handleBackPress}
            textColor={C.white}
          >
            Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator color={C.orange} size="large" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError && items.length === 0) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
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
      </SafeAreaView>
    );
  }

  const sortedItems = sortInventoryItems(items);
  const insights = getInventoryInsights(items);
  const recipeSuggestions = getRecipeSuggestions(items);
  const showFloatingAction = sortedItems.length > 0;
  const floatingActionBottom = insets.bottom + 20;
  const listBottomPadding = showFloatingAction ? floatingActionBottom + 88 : 48;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
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
          ListFooterComponent={<View style={styles.listFooter} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.navRow}>
                <Pressable
                  onPress={handleBackPress}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.backButtonPressed,
                  ]}
                >
                  <Text style={styles.backArrow}>←</Text>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>

                <View style={styles.logoRow}>
                  <View style={styles.hex}>
                    <Text style={styles.hexLetter}>P</Text>
                  </View>
                  <Text style={styles.brandName}>PLATEPILOT</Text>
                </View>
              </View>

              <Text style={styles.kicker}>Smart pantry</Text>
              <Text style={styles.screenTitle}>
                PANTRY{'\n'}
                <Text style={styles.screenTitleAccent}>INVENTORY.</Text>
              </Text>
              <Text style={styles.screenSubtitle}>
                See what needs attention next and turn ingredients into dinner before
                they go to waste.
              </Text>

              {sortedItems.length > 0 ? <ExpiryInsightsCard insights={insights} /> : null}
              {sortedItems.length > 0 ? (
                <RecipeSuggestionsCard suggestions={recipeSuggestions} />
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
          renderItem={({ item }) => {
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
                          textStyle={[
                            styles.expiryChipText,
                            { color: expiryChipColors.textColor },
                          ]}
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
            );
          }}
          showsVerticalScrollIndicator={false}
        />

        {showFloatingAction ? (
          <FAB
            color={C.white}
            icon="plus"
            label="Add item"
            onPress={openAddModal}
            style={[styles.fab, { bottom: floatingActionBottom }]}
          />
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
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.modalContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalEyebrow}>
                  {editingItem ? 'Update item' : 'Add item'}
                </Text>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'Edit Inventory' : 'New Inventory Item'}
                </Text>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>NAME</Text>
                  <TextInput
                    autoCapitalize="words"
                    mode="outlined"
                    onChangeText={setName}
                    outlineStyle={styles.inputOutline}
                    placeholder="Enter an item name"
                    placeholderTextColor={C.placeholder}
                    style={styles.input}
                    theme={platePilotInputTheme}
                    value={name}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>QUANTITY</Text>
                  <TextInput
                    keyboardType="numeric"
                    mode="outlined"
                    onChangeText={setQuantity}
                    outlineStyle={styles.inputOutline}
                    placeholder="1"
                    placeholderTextColor={C.placeholder}
                    style={styles.input}
                    theme={platePilotInputTheme}
                    value={quantity}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>UNIT (OPTIONAL)</Text>
                  <TextInput
                    mode="outlined"
                    onChangeText={setUnit}
                    outlineStyle={styles.inputOutline}
                    placeholder="pcs, lbs, cups..."
                    placeholderTextColor={C.placeholder}
                    style={styles.input}
                    theme={platePilotInputTheme}
                    value={unit}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>EXPIRY DATE</Text>
                  <TextInput
                    autoCapitalize="none"
                    mode="outlined"
                    onChangeText={setExpiryDateInput}
                    outlineStyle={styles.inputOutline}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={C.placeholder}
                    style={styles.input}
                    theme={platePilotInputTheme}
                    value={expiryDateInput}
                  />
                </View>

                <HelperText style={styles.inputHint} type="info" visible>
                  Use YYYY-MM-DD or leave blank.
                </HelperText>
                <HelperText style={styles.errorText} type="error" visible={Boolean(formError)}>
                  {formError ?? ''}
                </HelperText>

                <View style={styles.modalActions}>
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
                </View>
              </ScrollView>
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
              <Text style={styles.dialogBody}>
                Delete this item from inventory?
              </Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: C.cream,
    flex: 1,
  },
  container: {
    backgroundColor: C.cream,
    flex: 1,
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
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: C.pillBg,
    borderColor: C.borderSubtle,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  backButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  backArrow: {
    color: C.orange,
    fontFamily: T.heading,
    fontSize: 22,
    lineHeight: 22,
  },
  backText: {
    color: C.text,
    fontFamily: T.bodyExtraBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  logoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  hex: {
    alignItems: 'center',
    backgroundColor: C.orange,
    borderRadius: 11,
    height: 40,
    justifyContent: 'center',
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    width: 40,
  },
  hexLetter: {
    color: C.white,
    fontFamily: T.heading,
    fontSize: 22,
    letterSpacing: 1,
  },
  brandName: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 23,
    letterSpacing: 3,
  },
  listContainer: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
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
    fontSize: 56,
    letterSpacing: 1.2,
    lineHeight: 56,
  },
  screenTitleAccent: {
    color: C.orange,
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
    fontSize: 30,
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
    margin: 20,
    maxHeight: '85%',
  },
  modalKeyboardContainer: {
    maxHeight: '100%',
  },
  modalContainer: {
    backgroundColor: C.surfaceGlassStrong,
    borderColor: C.borderSubtle,
    borderRadius: R.cardLarge,
    borderWidth: 1,
    padding: 24,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  modalEyebrow: {
    color: C.orange,
    fontFamily: T.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: C.text,
    fontFamily: T.heading,
    fontSize: 36,
    letterSpacing: 0.8,
    lineHeight: 38,
    marginBottom: 12,
    marginTop: 8,
  },
  fieldBlock: {
    marginTop: 14,
  },
  fieldLabel: {
    color: C.label,
    fontFamily: T.bodyExtraBold,
    fontSize: 13,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.white,
    fontFamily: T.bodyMedium,
    fontSize: 15,
  },
  inputOutline: {
    borderRadius: R.input,
  },
  inputHint: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 12,
    marginTop: 8,
  },
  errorText: {
    color: C.danger,
    fontFamily: T.bodyBold,
    fontSize: 11,
    marginBottom: 2,
    marginTop: -2,
  },
  modalActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalPrimaryButtonContent: {
    height: 48,
    paddingHorizontal: 8,
  },
  modalPrimaryButtonLabel: {
    color: C.white,
    fontFamily: T.heading,
    fontSize: 20,
    letterSpacing: 1.6,
  },
  modalSecondaryButtonLabel: {
    color: C.orange,
    fontFamily: T.bodyExtraBold,
    fontSize: 13,
    letterSpacing: 0.6,
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
    fontSize: 34,
    letterSpacing: 0.8,
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
});
