import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
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

const AnimatedInsightItem = ({
  children,
  index,
  style,
}: {
  children: React.ReactNode;
  index: number;
  style?: object;
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);

    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay: index * 90,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export const ExpiryInsightsCard = ({ insights }: ExpiryInsightsCardProps) => {
  const hasAttentionItems = insights.expiredCount > 0 || insights.expiringSoonCount > 0;
  const expiredPulseAnim = useRef(new Animated.Value(0)).current;
  const soonPulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (insights.expiredCount <= 0) return;

    expiredPulseAnim.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(expiredPulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(expiredPulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [expiredPulseAnim, insights.expiredCount]);

  useEffect(() => {
    if (insights.expiringSoonCount <= 0) return;

    soonPulseAnim.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(soonPulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(soonPulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [insights.expiringSoonCount, soonPulseAnim]);

  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content style={styles.content}>
        <Text style={styles.kicker}>Today</Text>
        <Text style={styles.title}>Inventory Insights</Text>
        <Text style={styles.subtitle}>A quick look at what needs attention first.</Text>

        {hasAttentionItems ? (
          <View style={styles.metricRow}>
            {insights.expiredCount > 0 ? (
              <AnimatedInsightItem index={0} style={styles.metricItemWrap}>
                <Animated.View
                  style={[
                    styles.metricCard,
                    styles.metricCardDanger,
                    {
                      transform: [
                        {
                          scale: expiredPulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.03],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.metricValue, styles.metricValueDanger]}>
                    {insights.expiredCount}
                  </Text>
                  <Text style={[styles.metricLabel, styles.metricLabelDanger]}>
                    {getCountLabel(insights.expiredCount, 'Expired item', 'Expired items')}
                  </Text>
                </Animated.View>
              </AnimatedInsightItem>
            ) : null}

            {insights.expiringSoonCount > 0 ? (
              <AnimatedInsightItem index={1} style={styles.metricItemWrap}>
                <Animated.View
                  style={[
                    styles.metricCard,
                    styles.metricCardWarm,
                    {
                      transform: [
                        {
                          scale: soonPulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.025],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.metricValue, styles.metricValueWarm]}>
                    {insights.expiringSoonCount}
                  </Text>
                  <Text style={[styles.metricLabel, styles.metricLabelWarm]}>
                    {getCountLabel(insights.expiringSoonCount, 'Use soon', 'Use soon')}
                  </Text>
                </Animated.View>
              </AnimatedInsightItem>
            ) : null}
          </View>
        ) : (
          <AnimatedInsightItem index={0}>
            <View style={styles.freshBanner}>
              <Text style={styles.freshBannerText}>All items look fresh.</Text>
            </View>
          </AnimatedInsightItem>
        )}

        {insights.useSoonItems.length > 0 ? (
          <View style={styles.listSection}>
            <AnimatedInsightItem index={2}>
              <Text style={styles.sectionLabel}>Use first</Text>
            </AnimatedInsightItem>

            {insights.useSoonItems.map((item, index) => (
              <AnimatedInsightItem key={item.id} index={index + 3}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
              </AnimatedInsightItem>
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
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
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
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
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
  metricItemWrap: {
    flex: 1,
  },
});
