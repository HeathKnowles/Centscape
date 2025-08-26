import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WishlistItem as WishlistItemType } from '../store/wishlist';
import { extractDomain } from '../utils/normalizeUrl';
import { useWishlistStore } from '../store/wishlist';

interface Props {
  item: WishlistItemType;
}

export default function WishlistItem({ item }: Props) {
  const [imageError, setImageError] = useState(false);
  const removeItem = useWishlistStore(state => state.removeItem);

  const handleRemove = () => {
    removeItem(item.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const domain = extractDomain(item.sourceUrl);
  const price = item.price ? `$${item.price}` : 'N/A';
  const fallbackImage = 'https://via.placeholder.com/60x60/e5e7eb/6b7280?text=?';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ 
              uri: imageError || !item.image ? fallbackImage : item.image 
            }}
            style={styles.image}
            onError={() => setImageError(true)}
            accessibilityLabel={`Product image for ${item.title}`}
          />
        </View>

        {/* Product Info */}
        <View style={styles.info}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>{item.siteName || domain}</Text>
            <TouchableOpacity
              onPress={handleRemove}
              style={styles.removeButton}
              accessibilityLabel={`Remove ${item.title} from wishlist`}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.title} numberOfLines={2}>
            {item.title || 'Untitled Item'}
          </Text>
          
          <View style={styles.bottomRow}>
            <Text style={styles.price}>{price}</Text>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: 16,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  info: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  removeButton: {
    padding: 4,
  },
  title: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
  },
});