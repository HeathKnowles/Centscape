import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Image,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { testConnection } from '../utils/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootTabParamList } from '../navigation';
import { useWishlistStore } from '../store/wishlist';
import { fetchPreviewWithRetry, PreviewResponse } from '../utils/api';
import Skeleton from '../components/Skeleton';
import { extractDomain } from '../utils/normalizeUrl';

type AddScreenRouteProp = RouteProp<RootTabParamList, 'Add'>;

export default function AddScreen() {
    const navigation = useNavigation();
    const route = useRoute<AddScreenRouteProp>();
    const { addItem, setError, error, clearError } = useWishlistStore();

    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [preview, setPreview] = useState<PreviewResponse | null>(null);
    const [imageError, setImageError] = useState(false);

    // Handle deep link URL
    useEffect(() => {
        if (route.params?.url) {
            setUrl(route.params.url);
            handleFetchPreview(route.params.url);
        }
    }, [route.params?.url]);

    const validateUrl = (urlString: string): boolean => {
        try {
            const urlObj = new URL(urlString);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    };

    const handleFetchPreview = async (urlToFetch?: string) => {
        const targetUrl = urlToFetch || url.trim();
        
        if (!targetUrl) {
            Alert.alert('Error', 'Please enter a URL');
            return;
        }

        if (!validateUrl(targetUrl)) {
            Alert.alert('Error', 'Please enter a valid HTTP or HTTPS URL');
            return;
        }

        setIsLoading(true);
        setPreview(null);
        setImageError(false);
        clearError();

        try {
            const previewData = await fetchPreviewWithRetry(targetUrl);
            setPreview({
                ...previewData,
                sourceUrl: targetUrl,
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preview';
            setError(errorMessage);
            Alert.alert('Preview Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToWishlist = () => {
        if (!preview) return;

        const success = addItem({
            title: preview.title || 'Untitled Item',
            image: preview.image,
            price: preview.price,
            currency: preview.currency,
            siteName: preview.siteName,
            sourceUrl: preview.sourceUrl || url,
        });

        if (success) {
            Alert.alert(
                'Success!', 
                'Item added to your wishlist',
                [
                    {
                        text: 'Add Another',
                        onPress: () => {
                            setUrl('');
                            setPreview(null);
                            clearError();
                        },
                    },
                    {
                        text: 'View Wishlist',
                        onPress: () => navigation.navigate('Dashboard' as never),
                    },
                ]
            );
        } else {
            Alert.alert('Duplicate Item', 'This item is already in your wishlist');
        }
    };

    const fallbackImage = 'https://via.placeholder.com/100x100/e5e7eb/6b7280?text=?';

    return (
        <LinearGradient
            colors={['#d1fae5', '#a7f3d0', '#6ee7b7']}
            style={styles.container}
        >
            <SafeAreaView style={styles.safeArea}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={styles.backButton}
                                accessibilityLabel="Go back"
                                accessibilityRole="button"
                            >
                                <Ionicons name="arrow-back" size={24} color="black" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>ADD TO WISHLIST</Text>
                            <View style={styles.placeholder} />
                        </View>

                        {/* Test Connection Button */}
                        <TouchableOpacity
                            onPress={async () => {
                                const connected = await testConnection();
                                Alert.alert('Connection Test', connected ? 'Success!' : 'Failed');
                            }}
                            style={{
                                backgroundColor: '#2563eb',
                                borderRadius: 8,
                                padding: 12,
                                alignItems: 'center',
                                marginBottom: 16,
                            }}
                            accessibilityLabel="Test API connection"
                            accessibilityRole="button"
                        >
                            <Text style={{ color: 'white', fontWeight: '600' }}>Test Connection</Text>
                        </TouchableOpacity>

                        {/* URL Input */}
                        <View style={styles.inputCard}>
                            <Text style={styles.inputLabel}>Paste product URL</Text>
                            <TextInput
                                style={styles.textInput}
                                value={url}
                                onChangeText={setUrl}
                                placeholder="https://example.com/product"
                                placeholderTextColor="#9ca3af"
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                returnKeyType="done"
                                onSubmitEditing={() => handleFetchPreview()}
                                accessibilityLabel="Product URL input"
                            />
                            
                            <TouchableOpacity
                                style={[styles.previewButton, isLoading && styles.previewButtonDisabled]}
                                onPress={() => handleFetchPreview()}
                                disabled={isLoading || !url.trim()}
                                accessibilityLabel="Fetch product preview"
                                accessibilityRole="button"
                            >
                                <Text style={styles.previewButtonText}>
                                    {isLoading ? 'Loading...' : 'Get Preview'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Loading Skeleton */}
                        {isLoading && (
                            <View style={styles.previewCard}>
                                <Skeleton width={100} height={100} style={styles.skeletonImage} />
                                <View style={styles.skeletonInfo}>
                                    <Skeleton width="60%" height={16} style={styles.skeletonBrand} />
                                    <Skeleton width="90%" height={20} style={styles.skeletonTitle} />
                                    <Skeleton width="40%" height={18} style={styles.skeletonPrice} />
                                </View>
                            </View>
                        )}

                        {/* Preview Card */}
                        {preview && !isLoading && (
                            <View style={styles.previewCard}>
                                <View style={styles.previewContent}>
                                    <View style={styles.previewImageContainer}>
                                        <Image
                                            source={{ 
                                                uri: imageError || !preview.image ? fallbackImage : preview.image 
                                            }}
                                            style={styles.previewImage}
                                            onError={() => setImageError(true)}
                                            accessibilityLabel={`Preview image for ${preview.title}`}
                                        />
                                    </View>

                                    <View style={styles.previewInfo}>
                                        <Text style={styles.previewBrand}>
                                            {preview.siteName || extractDomain(preview.sourceUrl || url)}
                                        </Text>
                                        <Text style={styles.previewTitle} numberOfLines={3}>
                                            {preview.title || 'Untitled Item'}
                                        </Text>
                                        <Text style={styles.previewPrice}>
                                            {preview.price ? `$${preview.price}` : 'Price not available'}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={handleAddToWishlist}
                                    accessibilityLabel="Add item to wishlist"
                                    accessibilityRole="button"
                                >
                                    <Ionicons name="add" size={20} color="white" />
                                    <Text style={styles.addButtonText}>Add to Wishlist</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Error Message */}
                        {error && (
                            <View style={styles.errorCard}>
                                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity onPress={clearError}>
                                    <Ionicons name="close" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Instructions */}
                        <View style={styles.instructionsCard}>
                            <Text style={styles.instructionsTitle}>How to add items:</Text>
                            <Text style={styles.instructionsText}>
                                1. Copy a product URL from any online store{'\n'}
                                2. Paste it in the field above{'\n'}
                                3. Tap "Get Preview" to see the item details{'\n'}
                                4. Add it to your wishlist to track your savings progress
                            </Text>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
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
  placeholder: {
    width: 40,
  },
  inputCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  previewButton: {
    backgroundColor: 'black',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  previewButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  previewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  previewContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  previewImageContainer: {
    marginRight: 16,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewBrand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 8,
  },
  previewPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
  },
  addButton: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  skeletonImage: {
    marginRight: 16,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonBrand: {
    marginBottom: 8,
  },
  skeletonTitle: {
    marginBottom: 8,
  },
  skeletonPrice: {
    marginBottom: 0,
  },
  errorCard: {
    backgroundColor: 'rgba(254, 226, 226, 0.9)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 12,
    marginRight: 12,
  },
  instructionsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});