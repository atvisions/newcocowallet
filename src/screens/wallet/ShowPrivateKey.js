import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import Header from '../../components/common/Header';
import { CommonActions } from '@react-navigation/native';

export default function ShowPrivateKey({ route, navigation }) {
  const { wallet } = route.params;
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleContinue = () => {
    if (isConfirmed) {
      navigation.navigate('PaymentPassword', {
        title: 'Show Private Key',
        purpose: 'show_private_key',
        walletId: wallet.id,
        onSuccess: async (password) => {
          try {
            const deviceId = await DeviceManager.getDeviceId();
            const response = await api.getPrivateKey(wallet.id, deviceId, password);
            
            if (response.status === 'success' && response.data?.private_key) {
              navigation.navigate('PrivateKeyDisplay', {
                privateKey: response.data.private_key
              });
              return true;
            }
            return false;
          } catch (error) {
            console.error('Failed to get private key:', error);
            return false;
          }
        }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Security Check"
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.content}>
        <View style={styles.securityContainer}>
          <View style={styles.topSection}>
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning" size={48} color="#FF4B55" />
            </View>
            
            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Security Warning</Text>
              <View style={styles.warningList}>
                <View style={styles.warningItem}>
                  <Ionicons name="alert-circle" size={20} color="#FF4B55" />
                  <Text style={styles.warningItemText}>
                    Never share your private key with anyone
                  </Text>
                </View>
                <View style={styles.warningItem}>
                  <Ionicons name="alert-circle" size={20} color="#FF4B55" />
                  <Text style={styles.warningItemText}>
                    Never enter your private key on any website
                  </Text>
                </View>
                <View style={styles.warningItem}>
                  <Ionicons name="alert-circle" size={20} color="#FF4B55" />
                  <Text style={styles.warningItemText}>
                    Anyone with your private key can access your wallet
                  </Text>
                </View>
                <View style={styles.warningItem}>
                  <Ionicons name="alert-circle" size={20} color="#FF4B55" />
                  <Text style={styles.warningItemText}>
                    Keep it in a safe place
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setIsConfirmed(!isConfirmed)}
              >
                <Ionicons
                  name={isConfirmed ? "checkbox" : "square-outline"}
                  size={20}
                  color={isConfirmed ? "#1FC595" : "#8E8E8E"}
                />
                <Text style={styles.checkboxText}>
                  I understand the risks and want to proceed
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.confirmationSection}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !isConfirmed && styles.confirmButtonDisabled
              ]}
              onPress={handleContinue}
              disabled={!isConfirmed}
            >
              <Text style={[
                styles.confirmButtonText,
                !isConfirmed && styles.confirmButtonTextDisabled
              ]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  securityContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    marginTop: -40,
  },
  warningIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  securityContent: {
    paddingHorizontal: 20,
  },
  securityTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  warningList: {
    backgroundColor: '#272C52',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  warningItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  confirmationSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  checkboxText: {
    color: '#8E8E8E',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#1FC595',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#272C52',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonTextDisabled: {
    color: '#8E8E8E',
  },
});