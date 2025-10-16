import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  Animated,
  Text,
  StyleSheet,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { BlurView } from 'expo-blur';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { CircadianIntelligenceService } from '../../services/health/CircadianIntelligenceService';
import { ChromotherapyService } from '../../services/health/ChromotherapyService';
import { HabitFormationService } from '../../services/health/HabitFormationService';
import { HRVAnalysisService } from '../../services/health/HRVAnalysisService';

interface HealthDashboardProps {
  userId: string;
  theme: 'light' | 'dark' | 'adaptive';
}

const AdaptiveHealthDashboard: React.FC<HealthDashboardProps> = ({
  userId,
  theme,
}) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [biometricData, setBiometricData] = useState<any>(null);
  const [adaptiveColors, setAdaptiveColors] = useState<any>(null);

  const screenWidth = Dimensions.get('window').width;
  const colorAnimation = useSharedValue(0);

  const circadianService = CircadianIntelligenceService.getInstance();
  const chromotherapyService = new ChromotherapyService();
  const habitService = new HabitFormationService();
  const hrvService = new HRVAnalysisService();

  useEffect(() => {
    loadHealthData();
    loadBiometricData();
    setupColorAdaptation();
  }, [userId]);

  const loadHealthData = async () => {
    try {
      const [crdi, sleepPressure, habitAnalysis] = await Promise.all([
        circadianService.calculateCRDI(userId),
        circadianService.calculateSleepPressure(userId),
        habitService.analyzeHabitFormation(userId, 'primary-health-habit'),
      ]);

      setHealthData({
        circadianHealth: crdi,
        sleepPressure: sleepPressure.currentPressure,
        alertnessScore: sleepPressure.alertnessScore,
        habitStrength: habitAnalysis.motivationLevel,
      });
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  };

  const loadBiometricData = async () => {
    try {
      const [stressAnalysis, autonomicBalance] = await Promise.all([
        hrvService.analyzeStressLevels(userId),
        hrvService.assessAutonomicBalance(userId),
      ]);

      setBiometricData({
        stressLevel: stressAnalysis.currentStress,
        stressPattern: stressAnalysis.stressPattern,
        autonomicBalance: autonomicBalance.balance,
        breathingRecommendation: stressAnalysis.breathingExercise,
      });

      // Adapt colors based on physiological state
      const currentTime = new Date().getHours();
      const colors = chromotherapyService.adaptColorsToPhysiology(
        100 - stressAnalysis.currentStress, // Higher HRV = lower stress
        stressAnalysis.currentStress,
        'balanced', // Recovery status
      );

      setAdaptiveColors(colors);

      // Animate color transition
      colorAnimation.value = withTiming(1, { duration: 2000 });
    } catch (error) {
      console.error('Error loading biometric data:', error);
    }
  };

  const setupColorAdaptation = () => {
    const currentHour = new Date().getHours();
    const therapeuticColors = chromotherapyService.getTherapeuticColors(
      currentHour,
      'focused', // Would come from mood tracking
      ['recovery', 'performance'],
    );

    setAdaptiveColors(therapeuticColors);
  };

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    if (!adaptiveColors) return {};

    return {
      backgroundColor: adaptiveColors.primary + '20',
    };
  });

  const renderHealthScore = () => (
    <Reanimated.View style={[styles.scoreCard, animatedBackgroundStyle]}>
      <BlurView intensity={20} style={styles.blurContainer}>
        <HealthScoreRing
          score={healthData?.circadianHealth || 75}
          color={adaptiveColors?.primary}
          size={120}
        />
        <BiometricIndicators data={biometricData} colors={adaptiveColors} />
      </BlurView>
    </Reanimated.View>
  );

  const renderCircadianChart = () => (
    <View style={styles.chartCard}>
      <CircadianRhythmChart
        data={healthData}
        width={screenWidth - 32}
        height={200}
        colors={adaptiveColors}
      />
    </View>
  );

  const renderAdaptiveRecommendations = () => (
    <View style={styles.recommendationsCard}>
      <AdaptiveRecommendations
        healthData={healthData}
        biometricData={biometricData}
        colors={adaptiveColors}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {renderHealthScore()}
      {renderCircadianChart()}
      {renderAdaptiveRecommendations()}

      {biometricData?.breathingRecommendation && (
        <BreathingExerciseCard
          exercise={biometricData.breathingRecommendation}
          colors={adaptiveColors}
        />
      )}
    </ScrollView>
  );
};

// Custom Components for Advanced Visualizations

const HealthScoreRing: React.FC<{
  score: number;
  color: string;
  size: number;
}> = ({ score, color, size }) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(score, { duration: 2000 });
  }, [score]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotation = (animatedValue.value / 100) * 360;
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  return (
    <View style={[styles.scoreRing, { width: size, height: size }]}>
      <Reanimated.View
        style={[styles.scoreProgress, { borderColor: color }, animatedStyle]}
      />
      <View style={styles.scoreCenter}>
        <Text style={styles.scoreText}>{score}</Text>
        <Text style={styles.scoreLabel}>Health Score</Text>
      </View>
    </View>
  );
};

const CircadianRhythmChart: React.FC<{
  data: any;
  width: number;
  height: number;
  colors: any;
}> = ({ data, width, height, colors }) => {
  const chartData = useMemo(() => {
    // Generate circadian rhythm visualization
    return {
      labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM', '3AM'],
      datasets: [
        {
          data: [20, 80, 95, 85, 70, 40, 10, 5], // Example alertness curve
          color: (opacity = 1) =>
            colors?.primary || `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  }, [colors]);

  return (
    <LineChart
      data={chartData}
      width={width}
      height={height}
      chartConfig={{
        backgroundColor: colors?.background || '#ffffff',
        backgroundGradientFrom: colors?.background || '#ffffff',
        backgroundGradientTo: colors?.accent || '#f0f0f0',
        decimalPlaces: 0,
        color: (opacity = 1) =>
          colors?.primary || `rgba(134, 65, 244, ${opacity})`,
        labelColor: (opacity = 1) =>
          colors?.text || `rgba(0, 0, 0, ${opacity})`,
        style: {
          borderRadius: 16,
        },
        propsForDots: {
          r: '6',
          strokeWidth: '2',
          stroke: colors?.accent || '#ffa726',
        },
      }}
      bezier
      style={styles.chart}
    />
  );
};

const BiometricIndicators: React.FC<{
  data: any;
  colors: any;
}> = ({ data, colors }) => {
  if (!data) return null;

  return (
    <View style={styles.biometricGrid}>
      <BiometricCard
        title="Stress Level"
        value={data.stressLevel}
        unit="%"
        color={data.stressLevel > 70 ? '#FF6B6B' : colors?.primary}
        trend={data.stressPattern}
      />
      <BiometricCard
        title="HRV Balance"
        value={data.autonomicBalance}
        unit=""
        color={colors?.accent}
        trend={
          data.autonomicBalance === 'balanced' ? 'optimal' : 'needs-attention'
        }
      />
    </View>
  );
};

const AdaptiveRecommendations: React.FC<{
  healthData: any;
  biometricData: any;
  colors: any;
}> = ({ healthData, biometricData, colors }) => {
  const recommendations = useMemo(() => {
    const recs: any[] = [];

    if (biometricData?.stressLevel > 70) {
      recs.push({
        title: 'Stress Management',
        description:
          'Your stress levels are elevated. Try the recommended breathing exercise.',
        action: 'Start Breathing',
        priority: 'high',
        color: '#FF6B6B',
      });
    }

    if (healthData?.sleepPressure > 80) {
      recs.push({
        title: 'Sleep Optimization',
        description:
          'High sleep pressure detected. Consider an earlier bedtime.',
        action: 'View Sleep Plan',
        priority: 'medium',
        color: colors?.primary,
      });
    }

    return recs;
  }, [healthData, biometricData, colors]);

  return (
    <View style={styles.recommendationsContainer}>
      {recommendations.map((rec, index) => (
        <RecommendationCard key={index} recommendation={rec} />
      ))}
    </View>
  );
};

const BiometricCard: React.FC<{
  title: string;
  value: any;
  unit: string;
  color: string;
  trend: string;
}> = ({ title, value, unit, color, trend }) => (
  <View style={{ padding: 8, backgroundColor: color + '20', borderRadius: 8 }}>
    <Text>{title}</Text>
    <Text>
      {value}
      {unit}
    </Text>
    <Text>{trend}</Text>
  </View>
);

const RecommendationCard: React.FC<{ recommendation: any }> = ({
  recommendation,
}) => (
  <View
    style={{
      padding: 16,
      margin: 8,
      backgroundColor: recommendation.color + '20',
      borderRadius: 8,
    }}
  >
    <Text style={{ fontWeight: 'bold' }}>{recommendation.title}</Text>
    <Text>{recommendation.description}</Text>
    <Text>{recommendation.action}</Text>
  </View>
);

const BreathingExerciseCard: React.FC<{ exercise: any; colors: any }> = ({
  exercise,
  colors,
}) => (
  <View
    style={{
      padding: 16,
      margin: 16,
      backgroundColor: colors?.primary + '20',
      borderRadius: 8,
    }}
  >
    <Text>Breathing Exercise</Text>
    <Text>{exercise}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scoreCard: { margin: 16, borderRadius: 16, overflow: 'hidden' },
  blurContainer: { padding: 16 },
  chartCard: { margin: 16 },
  recommendationsCard: { margin: 16 },
  scoreRing: { justifyContent: 'center', alignItems: 'center' },
  scoreProgress: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderWidth: 4,
    borderRadius: 60,
  },
  scoreCenter: { justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 24, fontWeight: 'bold' },
  scoreLabel: { fontSize: 12 },
  chart: { borderRadius: 16 },
  biometricGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  recommendationsContainer: {},
});

export default AdaptiveHealthDashboard;
