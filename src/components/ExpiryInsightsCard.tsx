import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';

import {
  platePilotColors as C,
  platePilotRadii as R,
  platePilotTypography as T,
} from '../theme/designSystem';
import type { InventoryInsights } from '../utils/inventoryInsights';

type ExpiryInsightsCardProps = {
  insights: InventoryInsights;
};

const getCountLabel = (count: number, singular: string, plural: string): string => {
  return count === 1 ? singular : plural;
};

export const ExpiryInsightsCard = ({ insights }: ExpiryInsightsCardProps) => {
  const hasAttentionItems = insights.expiredCount > 0 || insights.expiringSoonCount > 0;

  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content style={styles.content}>
        <Text style={styles.kicker}>
          Today
        </Text>
        <Text style={styles.title}>Inventory Insights</Text>
        <Text style={styles.subtitle}>
          A quick pulse on what needs attention first.
        </Text>

        {hasAttentionItems ? (
          <View style={styles.metricRow}>
            {insights.expiredCount > 0 ? (
              <View style={[styles.metricCard, styles.metricCardDanger]}>
                <Text style={[styles.metricValue, styles.metricValueDanger]}>
                  {insights.expiredCount}
                </Text>
                <Text style={[styles.metricLabel, styles.metricLabelDanger]}>
                  {getCountLabel(insights.expiredCount, 'Expired item', 'Expired items')}
                </Text>
              </View>
            ) : null}

            {insights.expiringSoonCount > 0 ? (
              <View style={[styles.metricCard, styles.metricCardWarm]}>
                <Text style={[styles.metricValue, styles.metricValueWarm]}>
                  {insights.expiringSoonCount}
                </Text>
                <Text style={[styles.metricLabel, styles.metricLabelWarm]}>
                  {getCountLabel(insights.expiringSoonCount, 'Use soon', 'Use soon')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.freshBanner}>
            <Text style={styles.freshBannerText}>
              All items look fresh.
            </Text>
          </View>
        )}

        {insights.useSoonItems.length > 0 ? (
          <View style={styles.listSection}>
            <Text style={styles.sectionLabel}>
              Use first
            </Text>
            {insights.useSoonItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
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
  freshBanner: {
    backgroundColor: C.orangeSoft,
    borderRadius: 18,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  freshBannerText: {
    color: C.successText,
    fontFamily: T.bodyMedium,
    fontSize: 14,
  },
  itemRow: {
    backgroundColor: C.white,
    borderColor: C.borderSoft,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemName: {
    color: C.text,
    fontFamily: T.bodyMedium,
    fontSize: 14,
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
  metricCard: {
    borderRadius: 18,
    flex: 1,
    minHeight: 94,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metricCardDanger: {
    backgroundColor: C.dangerSurface,
  },
  metricCardWarm: {
    backgroundColor: C.orangeSoft,
  },
  metricLabel: {
    fontFamily: T.bodyBold,
    fontSize: 12,
    letterSpacing: 0.2,
    marginTop: 6,
    opacity: 0.78,
  },
  metricLabelDanger: {
    color: C.dangerText,
  },
  metricLabelWarm: {
    color: C.successText,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  metricValue: {
    fontFamily: T.heading,
    fontSize: 34,
    letterSpacing: 0.6,
  },
  metricValueDanger: {
    color: C.dangerText,
  },
  metricValueWarm: {
    color: C.orangeDark,
  },
  sectionLabel: {
    color: C.label,
    fontFamily: T.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 1.4,
    opacity: 0.9,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: C.textSoft,
    fontFamily: T.bodyMedium,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 8,
    maxWidth: '92%',
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
