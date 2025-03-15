import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Share,
  Alert,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import Header from '../../components/common/Header';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.5;
const OUTER_PADDING = 24;
const MIDDLE_PADDING = 20;
const INNER_PADDING = 16;

export default function ReceiveScreen({ navigation }) {
  const { selectedWallet } = useWallet();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleCopyAddress = async () => {
    try {
      await Clipboard.setStringAsync(selectedWallet?.address || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const handleShare = async () => {
    if (isSharing) return; // 防止重复点击
    
    try {
      setIsSharing(true);
      await Share.share({
        message: selectedWallet?.address || '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share address');
    } finally {
      // 使用setTimeout确保状态不会太快重置
      setTimeout(() => {
        setIsSharing(false);
      }, 1000);
    }
  };

  if (!selectedWallet) {
    return (
      <View style={styles.container}>
        <Header 
          title="Receive"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No wallet selected</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Receive"
        onBack={() => navigation.goBack()}
      />
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <View style={styles.qrInner}>
              <QRCode
                value={selectedWallet.address}
                size={QR_SIZE}
                backgroundColor="white"
                color="black"
              />
            </View>
          </View>
        </View>

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Wallet Address</Text>
          <View style={styles.addressWrapper}>
            <Text style={styles.address} numberOfLines={1}>
              {selectedWallet.address}
            </Text>
            <TouchableOpacity 
              style={styles.copyButton} 
              onPress={handleCopyAddress}
            >
              <Ionicons 
                name={copied ? "checkmark" : "copy-outline"} 
                size={20} 
                color={copied ? "#1FC595" : "#8E8E8E"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
          onPress={handleShare}
          disabled={isSharing}
        >
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>Share Address</Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#8E8E8E" />
          <Text style={styles.infoText}>
            Only supports receiving {selectedWallet.chain} assets. Sending other tokens may result in loss of assets.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  qrContainer: {
    width: QR_SIZE + (OUTER_PADDING * 2) + (MIDDLE_PADDING * 2),
    height: QR_SIZE + (OUTER_PADDING * 2) + (MIDDLE_PADDING * 2),
    borderRadius: 24,
    padding: OUTER_PADDING,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B2C41',
  },
  qrWrapper: {
    width: QR_SIZE + (MIDDLE_PADDING * 2),
    height: QR_SIZE + (MIDDLE_PADDING * 2),
    backgroundColor: '#272C52',
    padding: MIDDLE_PADDING,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInner: {
    backgroundColor: 'white',
    padding: INNER_PADDING,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContainer: {
    width: '100%',
    marginTop: 32,
  },
  addressLabel: {
    fontSize: 14,
    color: '#8E8E8E',
    marginBottom: 8,
  },
  addressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#272C52',
    borderRadius: 12,
    padding: 16,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 8,
  },
  copyButton: {
    padding: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1FC595',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 24,
  },
  shareButtonDisabled: {
    opacity: 0.7,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 142, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E8E',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E8E',
  },
});
