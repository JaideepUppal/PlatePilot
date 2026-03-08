import type { InventoryItem } from '../services/inventoryService';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const NO_EXPIRY_SORT_VALUE = Number.MAX_SAFE_INTEGER;

export type ExpiryStatus = 'expired' | 'soon' | 'upcoming';
export type ExpiryGroup = 'expired' | 'expiringSoon' | 'normal' | 'noExpiry';

export type ExpiryDetails = {
  group: ExpiryGroup;
  status: ExpiryStatus | null;
  expiryTime: number;
  distanceFromToday: number;
};

export type InventoryInsights = {
  expiredCount: number;
  expiringSoonCount: number;
  useSoonItems: InventoryItem[];
};

type InventoryItemWithExpiryDetails = {
  item: InventoryItem;
  index: number;
  expiryDetails: ExpiryDetails;
};

const EXPIRY_GROUP_PRIORITY: Record<ExpiryGroup, number> = {
  expired: 0,
  expiringSoon: 1,
  normal: 2,
  noExpiry: 3,
};

const startOfDay = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getExpiryDetails = (
  expiryDate?: InventoryItem['expiryDate'],
  referenceDate: Date = new Date(),
): ExpiryDetails => {
  if (!expiryDate) {
    return {
      group: 'noExpiry',
      status: null,
      expiryTime: NO_EXPIRY_SORT_VALUE,
      distanceFromToday: NO_EXPIRY_SORT_VALUE,
    };
  }

  const today = startOfDay(referenceDate);
  const expiry = startOfDay(expiryDate.toDate());
  const expiryTime = expiry.getTime();
  const daysUntilExpiry = Math.round((expiryTime - today.getTime()) / DAY_IN_MILLISECONDS);
  const distanceFromToday = Math.abs(expiryTime - today.getTime());

  if (daysUntilExpiry < 0) {
    return {
      group: 'expired',
      status: 'expired',
      expiryTime,
      distanceFromToday,
    };
  }

  if (daysUntilExpiry <= 2) {
    return {
      group: 'expiringSoon',
      status: 'soon',
      expiryTime,
      distanceFromToday,
    };
  }

  return {
    group: 'normal',
    status: 'upcoming',
    expiryTime,
    distanceFromToday,
  };
};

const compareInventoryItemsByExpiry = (
  left: InventoryItemWithExpiryDetails,
  right: InventoryItemWithExpiryDetails,
): number => {
  const priorityDifference =
    EXPIRY_GROUP_PRIORITY[left.expiryDetails.group] - EXPIRY_GROUP_PRIORITY[right.expiryDetails.group];

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const distanceDifference =
    left.expiryDetails.distanceFromToday - right.expiryDetails.distanceFromToday;

  if (distanceDifference !== 0) {
    return distanceDifference;
  }

  const expiryDifference = left.expiryDetails.expiryTime - right.expiryDetails.expiryTime;

  if (expiryDifference !== 0) {
    return expiryDifference;
  }

  return left.index - right.index;
};

const mapItemsWithExpiryDetails = (
  items: InventoryItem[],
  referenceDate: Date,
): InventoryItemWithExpiryDetails[] => {
  return items.map((item, index) => ({
    item,
    index,
    expiryDetails: getExpiryDetails(item.expiryDate, referenceDate),
  }));
};

export const sortInventoryItems = (
  inventoryItems: InventoryItem[],
  referenceDate: Date = new Date(),
): InventoryItem[] => {
  return mapItemsWithExpiryDetails(inventoryItems, referenceDate)
    .sort(compareInventoryItemsByExpiry)
    .map(({ item }) => item);
};

export const getInventoryInsights = (
  items: InventoryItem[],
  referenceDate: Date = new Date(),
): InventoryInsights => {
  const itemsWithExpiryDetails = mapItemsWithExpiryDetails(items, referenceDate);

  const expiredCount = itemsWithExpiryDetails.filter(({ expiryDetails }) => expiryDetails.group === 'expired').length;
  const expiringSoonCount = itemsWithExpiryDetails.filter(
    ({ expiryDetails }) => expiryDetails.group === 'expiringSoon',
  ).length;

  const useSoonItems = itemsWithExpiryDetails
    .filter(({ expiryDetails }) => expiryDetails.group !== 'noExpiry')
    .sort(compareInventoryItemsByExpiry)
    .slice(0, 3)
    .map(({ item }) => item);

  return {
    expiredCount,
    expiringSoonCount,
    useSoonItems,
  };
};
