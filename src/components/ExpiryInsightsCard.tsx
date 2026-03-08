import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

import type { InventoryInsights } from '../utils/inventoryInsights';

type ExpiryInsightsCardProps = {
  insights: InventoryInsights;
};

const getCountLabel = (count: number, singular: string, plural: string): string => {
  return `${count} ${count === 1 ? singular : plural}`;
};

export const ExpiryInsightsCard = ({ insights }: ExpiryInsightsCardProps) => {
  const { colors } = useTheme();
  const hasAttentionItems = insights.expiredCount > 0 || insights.expiringSoonCount > 0;

  return (
    <Card style={styles.card} mode="contained">
      <Card.Content>
        <Text variant="titleMedium">Inventory Insights</Text>

        <View style={styles.summarySection}>
          {insights.expiredCount > 0 ? (
            <Text style={[styles.summaryText, { color: colors.error }]} variant="bodyMedium">
              {`❌ ${getCountLabel(insights.expiredCount, 'item expired', 'items expired')}`}
            </Text>
          ) : null}

          {insights.expiringSoonCount > 0 ? (
            <Text style={[styles.summaryText, { color: colors.secondary }]} variant="bodyMedium">
              {`⚠ ${getCountLabel(
                insights.expiringSoonCount,
                'item expiring soon',
                'items expiring soon',
              )}`}
            </Text>
          ) : null}

          {!hasAttentionItems ? (
            <Text style={[styles.summaryText, { color: colors.primary }]} variant="bodyMedium">
              All items look fresh.
            </Text>
          ) : null}
        </View>

        {insights.useSoonItems.length > 0 ? (
          <View style={styles.listSection}>
            <Text style={styles.sectionLabel} variant="labelLarge">
              Use these soon:
            </Text>
            {insights.useSoonItems.map((item) => (
              <Text key={item.id} style={styles.itemText} variant="bodyMedium">
                {`\u2022 ${item.name}`}
              </Text>
            ))}
          </View>
        ) : null}
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
    marginTop: 14,
  },
  sectionLabel: {
    opacity: 0.78,
  },
  summarySection: {
    marginTop: 10,
  },
  summaryText: {
    marginTop: 4,
  },
});
