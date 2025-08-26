import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface Props {
  progress: number; // 0-100 percentage
  savedAmount: number;
  goalAmount: number;
}

export default function ProgressBar({ progress, savedAmount, goalAmount }: Props) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.min(progress, 100),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animatedValue.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
        
        {/* Progress dots */}
        <View style={styles.dotsContainer}>
          {[...Array(5)].map((_, index) => {
            const dotProgress = (index + 1) * 20;
            const isActive = progress >= dotProgress;
            
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: isActive ? '#22c55e' : '#d1d5db' }
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  track: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  dotsContainer: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
});