import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import Constants from 'expo-constants';
import { useWallet } from '../../contexts/WalletContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Updates from 'expo-updates';

// Add this constant - increment it with each OTA update
const BUILD_NUMBER = "1"; // This can be updated with OTA updates

// Custom update modal component
const UpdateModal = ({ visible, onLater, onUpdate }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onLater}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#2A3352', '#171C32']}
            style={styles.modalGradient}
          >
            <Image 
              source={require('../../../assets/icon-adaptive.png')} 
              style={styles.updateIcon} 
              resizeMode="contain"
            />
            
            <Text style={styles.updateTitle}>Update Available</Text>
            <Text style={styles.updateMessage}>
              A new version is available with new features and improvements.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.laterButton]} 
                onPress={onLater}
              >
                <Text style={styles.laterButtonText}>Later</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.updateButton]} 
                onPress={onUpdate}
              >
                <LinearGradient
                  colors={['#4A6FFF', '#2E5BFF']}
                  style={styles.updateButtonGradient}
                >
                  <Text style={styles.updateButtonText}>Update Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// Update complete modal component
const UpdateCompleteModal = ({ visible, onRestart }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#2A3352', '#171C32']}
            style={styles.modalGradient}
          >
            <Image 
              source={require('../../../assets/icon-adaptive.png')} 
              style={styles.updateIcon} 
              resizeMode="contain"
            />
            
            <Text style={styles.updateTitle}>Update Complete</Text>
            <Text style={styles.updateMessage}>
              The new version has been downloaded. Restart to apply the update.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.updateButton, {width: '100%'}]} 
                onPress={onRestart}
              >
                <LinearGradient
                  colors={['#4A6FFF', '#2E5BFF']}
                  style={styles.updateButtonGradient}
                >
                  <Text style={styles.updateButtonText}>Restart Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// No updates modal component
const NoUpdatesModal = ({ visible, onClose }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#2A3352', '#171C32']}
            style={styles.modalGradient}
          >
            <View style={[styles.iconContainer, { width: 60, height: 60, backgroundColor: '#1FC595', marginBottom: 16 }]}>
              <Ionicons name="checkmark" size={30} color="#FFFFFF" />
            </View>
            
            <Text style={styles.updateTitle}>You're Up to Date</Text>
            <Text style={styles.updateMessage}>
              You're already using the latest version of the app.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.updateButton, {width: '100%'}]} 
                onPress={onClose}
              >
                <LinearGradient
                  colors={['#4A6FFF', '#2E5BFF']}
                  style={styles.updateButtonGradient}
                >
                  <Text style={styles.updateButtonText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

export default function SettingsScreen({ navigation }) {
  const [hasPaymentPassword, setHasPaymentPassword] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [noUpdatesModalVisible, setNoUpdatesModalVisible] = useState(false);
  const { selectedWallet } = useWallet();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }, [])
  );

  useEffect(() => {
    checkPaymentPasswordStatus();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkPaymentPasswordStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const checkPaymentPasswordStatus = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      const response = await api.checkPaymentPasswordStatus(deviceId);
      setHasPaymentPassword(response || false);
    } catch (error) {
      console.error('Check payment password error:', error);
      setHasPaymentPassword(false);
    }
  };

  const handleSetPaymentPassword = () => {
    if (hasPaymentPassword) {
      navigation.navigate('ChangePaymentPassword');
    } else {
      navigation.navigate('SetPassword', { type: 'payment' });
    }
  };

  const checkForUpdates = async () => {
    if (isCheckingUpdate) return;
    
    setIsCheckingUpdate(true);
    try {
      console.log('Starting update check...');
      console.log('Current runtime version:', Updates.runtimeVersion);
      console.log('Is development build?', __DEV__);
      console.log('Update configuration:', Updates.configuration);
      
      // 检查是否在开发环境
      if (__DEV__) {
        console.log('In development mode, skipping update check');
        Alert.alert(
          "Development Mode",
          "Update checking is only available in production builds.",
          [{ text: "OK" }]
        );
        return;
      }

      console.log('Calling Updates.checkForUpdateAsync()...');
      const update = await Updates.checkForUpdateAsync();
      console.log('Update check result:', update);
      console.log('Update available?', update.isAvailable);
      
      if (update.isAvailable) {
        console.log('Update is available, showing modal');
        setUpdateModalVisible(true);
      } else {
        console.log('No updates available');
        setNoUpdatesModalVisible(true);
      }
    } catch (error) {
      console.error('Update check error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        configuration: Updates.configuration
      });
      
      if (!__DEV__) {
        Alert.alert(
          "Update Check Failed",
          "Please try again later.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleUpdate = async () => {
    try {
      console.log('Starting update download...');
      setUpdateModalVisible(false);
      await Updates.fetchUpdateAsync();
      console.log('Update downloaded successfully');
      setCompleteModalVisible(true);
    } catch (error) {
      console.error('Update download error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert(
        "Update Failed",
        "Please check your network and try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleRestart = () => {
    console.log('Restarting app to apply update...');
    Updates.reloadAsync();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2C2941', '#171C32']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent 
      />
      <View style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.walletSelector}
            onPress={() => navigation.navigate('WalletSelector')}
          >
            <Image 
              source={{ uri: selectedWallet?.avatar }} 
              style={styles.walletAvatar} 
            />
            <Text style={styles.walletName}>{selectedWallet?.name}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E8E" />
          </TouchableOpacity>

          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('QRScanner')}
            >
              <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleSetPaymentPassword}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#1FC595' }]}>
                  <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.menuItemText}>
                  {hasPaymentPassword ? 'Change Password' : 'Set Password'}
                </Text>
              </View>
              <View style={styles.menuItemRight}>
                {hasPaymentPassword && (
                  <View style={styles.checkmarkContainer}>
                    <MaterialIcons name="check" size={16} color="#FFFFFF" />
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#8E8E8E" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={checkForUpdates}
              disabled={isCheckingUpdate}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#5856D6' }]}>
                  <Ionicons name="information" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.menuItemText}>Version</Text>
              </View>
              <View style={styles.menuItemRight}>
                <Text style={styles.versionText}>
                  {Constants.expoConfig.version} (Build {BUILD_NUMBER})
                </Text>
                {isCheckingUpdate ? (
                  <ActivityIndicator size="small" color="#1FC595" style={{ marginLeft: 8 }} />
                ) : (
                  <Ionicons name="refresh" size={20} color="#1FC595" style={{ marginLeft: 8 }} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Custom modals */}
      <UpdateModal 
        visible={updateModalVisible}
        onLater={() => setUpdateModalVisible(false)}
        onUpdate={handleUpdate}
      />
      
      <UpdateCompleteModal
        visible={completeModalVisible}
        onRestart={handleRestart}
      />

      <NoUpdatesModal
        visible={noUpdatesModalVisible}
        onClose={() => setNoUpdatesModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 56,
  },
  walletSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  walletName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#8E8E8E',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E8E',
    marginRight: 8,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#272C52',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  updateIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  updateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  updateMessage: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    width: '48%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  laterButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  updateButton: {
    overflow: 'hidden',
  },
  updateButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});