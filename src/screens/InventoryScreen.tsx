import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  HelperText,
  Modal,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { ExpiryInsightsCard, RecipeSuggestionsCard } from '../components';
import { useAuth } from '../hooks';
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
  const { colors } = useTheme();
  const { user } = useAuth();

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
    async ({ refreshing: shouldRefresh = false, showErrorSnackbar = true }: LoadInventoryOptions = {}) => {
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

  if (!user) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyTitle} variant="titleLarge">
          You are not signed in.
        </Text>
        <Text style={styles.emptyMessage} variant="bodyMedium">
          Please go back and sign in to manage your inventory.
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Back
        </Button>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText} variant="bodyLarge">
          Loading inventory...
        </Text>
      </View>
    );
  }

  if (loadError && items.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Card style={styles.errorCard} mode="contained">
          <Card.Content style={styles.errorCardContent}>
            <Text style={styles.emptyTitle} variant="titleLarge">
              Couldn&apos;t load inventory
            </Text>
            <Text style={styles.emptyMessage} variant="bodyMedium">
              {loadError}
            </Text>
            <Button
              mode="contained"
              onPress={() => {
                void loadInventory();
              }}
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
  const recipeSuggestions = getRecipeSuggestions(items);

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle} variant="headlineMedium">
        Inventory
      </Text>

      {sortedItems.length > 0 ? <ExpiryInsightsCard insights={insights} /> : null}
      {sortedItems.length > 0 ? <RecipeSuggestionsCard suggestions={recipeSuggestions} /> : null}

      <View style={styles.actionRow}>
        <Button mode="contained" onPress={openAddModal}>
          Add Item
        </Button>
      </View>

      <FlatList<InventoryItem>
        contentContainerStyle={sortedItems.length === 0 ? styles.emptyListContainer : styles.listContainer}
        data={sortedItems}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void loadInventory({ refreshing: true });
            }}
            refreshing={refreshing}
          />
        }
        renderItem={({ item }) => {
          const expiryStatus = getExpiryDetails(item.expiryDate).status;

          return (
            <Card style={styles.itemCard} mode="contained">
              <Card.Content>
                <Text variant="titleMedium">{item.name}</Text>
                <Text style={styles.itemMeta} variant="bodyMedium">
                  Qty: {item.quantity}
                  {item.unit ? ` ${item.unit}` : ''}
                </Text>
                {item.expiryDate ? (
                  <Text style={styles.expiryText} variant="bodySmall">
                    Expires: {formatExpiryDate(item.expiryDate)}
                  </Text>
                ) : null}
                {expiryStatus === 'expired' ? (
                  <Text style={[styles.expiryWarning, { color: colors.error }]} variant="bodySmall">
                    Expired
                  </Text>
                ) : null}
                {expiryStatus === 'soon' ? (
                  <Text style={[styles.expiryWarning, { color: colors.secondary }]} variant="bodySmall">
                    Expires soon
                  </Text>
                ) : null}
                <View style={styles.rowActions}>
                  <Button disabled={saving} mode="text" onPress={() => openEditModal(item)}>
                    Edit
                  </Button>
                  <Button
                    disabled={deletingItemId === item.id}
                    loading={deletingItemId === item.id}
                    mode="text"
                    onPress={() => requestDelete(item)}
                    textColor={colors.error}
                  >
                    Delete
                  </Button>
                </View>
              </Card.Content>
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle} variant="titleMedium">
              No inventory yet
            </Text>
            <Text style={styles.emptyMessage} variant="bodyMedium">
              Add your first ingredient to start tracking your kitchen.
            </Text>
            <Button mode="contained" onPress={openAddModal}>
              Add Item
            </Button>
          </View>
        }
      />

      <Portal>
        <Modal
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: colors.elevation.level3 },
          ]}
          onDismiss={closeModal}
          visible={modalVisible}
        >
          <Text variant="titleLarge">{editingItem ? 'Edit Item' : 'Add Item'}</Text>
          <TextInput
            autoCapitalize="words"
            label="Name"
            mode="outlined"
            onChangeText={setName}
            style={styles.inputSpacing}
            value={name}
          />
          <TextInput
            keyboardType="numeric"
            label="Quantity"
            mode="outlined"
            onChangeText={setQuantity}
            style={styles.inputSpacing}
            value={quantity}
          />
          <TextInput
            label="Unit (optional)"
            mode="outlined"
            onChangeText={setUnit}
            style={styles.inputSpacing}
            value={unit}
          />
          <TextInput
            autoCapitalize="none"
            label="Expiry Date"
            mode="outlined"
            onChangeText={setExpiryDateInput}
            placeholder="YYYY-MM-DD"
            style={styles.inputSpacing}
            value={expiryDateInput}
          />
          <HelperText type="info" visible>
            Use YYYY-MM-DD or leave blank.
          </HelperText>
          <HelperText type="error" visible={Boolean(formError)}>
            {formError ?? ''}
          </HelperText>
          <View style={styles.modalActions}>
            <Button disabled={saving} mode="text" onPress={closeModal}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              loading={saving}
              mode="contained"
              onPress={() => {
                void handleSave();
              }}
            >
              Save
            </Button>
          </View>
        </Modal>

        <Dialog
          dismissable={!Boolean(deletingItemId)}
          onDismiss={() => {
            if (!deletingItemId) {
              setPendingDeleteItem(null);
            }
          }}
          visible={Boolean(pendingDeleteItem)}
        >
          <Dialog.Title>Delete Item</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Delete this item from inventory?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={Boolean(deletingItemId)}
              onPress={() => setPendingDeleteItem(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={Boolean(deletingItemId)}
              loading={Boolean(deletingItemId)}
              onPress={() => {
                void handleDelete();
              }}
              textColor={colors.error}
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
            snackbarVariant === 'error'
              ? { backgroundColor: colors.error }
              : { backgroundColor: colors.primary },
          ]}
          visible={snackbarVisible}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  centeredContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  emptyMessage: {
    marginBottom: 20,
    marginTop: 6,
    opacity: 0.75,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  errorCard: {
    borderRadius: 20,
    width: '100%',
  },
  errorCardContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionRow: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  inputSpacing: {
    marginTop: 12,
  },
  itemCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  itemMeta: {
    marginTop: 4,
    opacity: 0.8,
  },
  expiryText: {
    marginTop: 4,
    opacity: 0.72,
  },
  expiryWarning: {
    marginTop: 2,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 16,
  },
  loadingText: {
    marginTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalContainer: {
    borderRadius: 20,
    margin: 20,
    padding: 20,
  },
  screenTitle: {
    marginBottom: 12,
  },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  snackbar: {
    margin: 16,
  },
});
