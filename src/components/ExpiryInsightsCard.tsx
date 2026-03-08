import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

import type { InventoryInsights } from '../utils/inventoryInsights';

type ExpiryInsightsCardProps = {
  insights: InventoryInsights;
};

const getCountLabel = (count: number, singular: string, plural: string): string => {
  return count === 1 ? singular : plural;
};

export const ExpiryInsightsCard = ({ insights }: ExpiryInsightsCardProps) => {
  const { colors } = useTheme();
  const hasAttentionItems = insights.expiredCount > 0 || insights.expiringSoonCount > 0;

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
          Today
        </Text>
        <Text variant="titleLarge">Inventory Insights</Text>
        <Text style={styles.subtitle} variant="bodyMedium">
          A quick pulse on what needs attention first.
        </Text>

        {hasAttentionItems ? (
          <View style={styles.metricRow}>
            {insights.expiredCount > 0 ? (
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.errorContainer },
                ]}
              >
                <Text style={[styles.metricValue, { color: colors.onErrorContainer }]} variant="headlineSmall">
                  {insights.expiredCount}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.onErrorContainer }]} variant="labelMedium">
                  {getCountLabel(insights.expiredCount, 'Expired item', 'Expired items')}
                </Text>
              </View>
            ) : null}

            {insights.expiringSoonCount > 0 ? (
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.secondaryContainer },
                ]}
              >
                <Text
                  style={[styles.metricValue, { color: colors.onSecondaryContainer }]}
                  variant="headlineSmall"
                >
                  {insights.expiringSoonCount}
                </Text>
                <Text
                  style={[styles.metricLabel, { color: colors.onSecondaryContainer }]}
                  variant="labelMedium"
                >
                  {getCountLabel(insights.expiringSoonCount, 'Use soon', 'Use soon')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View
            style={[
              styles.freshBanner,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <Text style={{ color: colors.onPrimaryContainer }} variant="bodyMedium">
              All items look fresh.
            </Text>
          </View>
        )}

        {insights.useSoonItems.length > 0 ? (
          <View style={styles.listSection}>
            <Text style={styles.sectionLabel} variant="labelLarge">
              Use first
            </Text>
            {insights.useSoonItems.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text variant="bodyMedium">{item.name}</Text>
              </View>
            ))}
          </View>
        ) : null}
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
  freshBanner: {
    borderRadius: 18,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemRow: {
    borderRadius: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  kicker: {
    letterSpacing: 1,
    opacity: 0.54,
    textTransform: 'uppercase',
  },
  listSection: {
    marginTop: 18,
  },
  metricCard: {
    borderRadius: 18,
    flex: 1,
    minHeight: 94,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricLabel: {
    marginTop: 6,
    opacity: 0.78,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  metricValue: {
    letterSpacing: -0.6,
  },
  sectionLabel: {
    opacity: 0.6,
  },
  subtitle: {
    marginTop: 8,
    maxWidth: '92%',
    opacity: 0.7,
  },
});
