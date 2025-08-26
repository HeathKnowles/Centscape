import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useWishlistStore } from '../store/wishlist';
import WishlistItem from '../components/WishlistItem';
import ProgressBar from '../components/ProgressBar';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const {
    items,
    savedAmount,
    goalAmount,
    getDaysToGoal,
    getProgressPercentage,
  } = useWishlistStore();

  const progressPercentage = getProgressPercentage();
  const daysToGoal = getDaysToGoal();
  const remainingAmount = goalAmount - savedAmount;

  return (
    <LinearGradient
      colors={['#d1fae5', '#a7f3d0', '#6ee7b7']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>MY DASHBOARD</Text>
          </View>

          {/* Progress Section */}
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>Your progress</Text>
            <Text style={styles.savedAmount}>You have saved ${savedAmount}</Text>
            <Text style={styles.goalAmount}>Goal ${goalAmount}</Text>
            
            <ProgressBar 
              progress={progressPercentage}
              savedAmount={savedAmount}
              goalAmount={goalAmount}
            />
            
            <View style={styles.remainingBadge}>
              <Text style={styles.remainingText}>${remainingAmount.toFixed(2)} to go</Text>
            </View>
          </View>

          {/* Wishlist Section */}
          <View style={styles.wishlistHeader}>
            <Text style={styles.wishlistTitle}>MY WISHLIST</Text>
          </View>

          {/* Wishlist Items */}
          <View style={styles.wishlistContainer}>
            {items.map((item) => (
              <WishlistItem key={item.id} item={item} />
            ))}
            
            {/* Add Items Button */}
            <Pressable
              style={styles.addButton}
              onPress={() => navigation.navigate('Add' as never)}
              accessibilityLabel="Add items to your wishlist"
              accessibilityRole="button"
            >
              <View style={styles.addButtonIcon}>
                <Ionicons name="add" size={24} color="white" />
              </View>
              <Text style={styles.addButtonText}>Add items to your Centscape Wishlist</Text>
            </Pressable>
          </View>

          {/* Motivation Section */}
          <View style={styles.motivationSection}>
            <Text style={styles.motivationText}>
              Keep going ! According to your spending habits you will reach your goal of ${goalAmount} in
            </Text>
            <Text style={styles.daysText}>{daysToGoal} DAYS !</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'black',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    overflow: 'hidden',
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    position: 'relative',
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  savedAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22c55e',
    marginBottom: 4,
  },
  goalAmount: {
    fontSize: 14,
    color: '#6b7280',
    position: 'absolute',
    top: 20,
    right: 20,
  },
  remainingBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'black',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  remainingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  wishlistHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  wishlistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'black',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    overflow: 'hidden',
  },
  wishlistContainer: {
    marginBottom: 30,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  addButtonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
    flex: 1,
  },
  motivationSection: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  motivationText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#374151',
    lineHeight: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  daysText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
  },
});