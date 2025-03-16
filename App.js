import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { WalletProvider } from './src/contexts/WalletContext';
import * as NavigationBar from 'expo-navigation-bar';
import * as Updates from 'expo-updates';
import { Alert, View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
              source={require('./assets/icon-adaptive.png')} 
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
              source={require('./assets/icon-adaptive.png')} 
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

export default function App() {
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);

  const handleUpdate = async () => {
    try {
      console.log('Starting update download...');
      setUpdateModalVisible(false);
      await Updates.fetchUpdateAsync();
      console.log('Update download complete');
      setCompleteModalVisible(true);
    } catch (error) {
      console.log('Update download error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      Alert.alert(
        "Update Failed",
        "Please check your network connection and try again",
        [{ text: "OK" }]
      );
    }
  };

  const handleRestart = () => {
    console.log('Preparing to restart app...');
    Updates.reloadAsync();
  };

  async function checkForUpdates() {
    try {
      console.log('Starting update check...');
      console.log('Updates config:', {
        runtimeVersion: Updates.runtimeVersion,
        channel: Updates.channel,
        isEnabled: Updates.isEnabled,
        isEmergencyLaunch: Updates.isEmergencyLaunch,
        updateUrl: Updates.updateUrl
      });

      const update = await Updates.checkForUpdateAsync();
      console.log('Update check result:', update);

      if (update.isAvailable) {
        // Use custom modal instead of Alert
        setUpdateModalVisible(true);
      } else {
        console.log('Already on the latest version');
      }
    } catch (error) {
      console.log('Update check error:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        updateConfig: {
          runtimeVersion: Updates.runtimeVersion,
          channel: Updates.channel,
          isEnabled: Updates.isEnabled
        }
      });
    }
  }

  useEffect(() => {
    // Set navigation bar style
    async function setNavigationBarColor() {
      try {
        await NavigationBar.setBackgroundColorAsync('#171C32');
        await NavigationBar.setButtonStyleAsync('light');
        await NavigationBar.setBorderColorAsync('#171C32');
      } catch (error) {
        console.log('Navigation bar style error:', error.message);
      }
    }
    
    setNavigationBarColor();

    // Only check for updates in production
    if (!__DEV__) {
      console.log('App started, preparing to check for updates...');
      // Delay update check by 5 seconds to ensure app and network are ready
      const updateCheckTimer = setTimeout(checkForUpdates, 5000);
      return () => clearTimeout(updateCheckTimer);
    } else {
      console.log('Development environment, skipping update check');
    }
  }, []);

  return (
    <WalletProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      
      <UpdateModal 
        visible={updateModalVisible}
        onLater={() => setUpdateModalVisible(false)}
        onUpdate={handleUpdate}
      />
      
      <UpdateCompleteModal
        visible={completeModalVisible}
        onRestart={handleRestart}
      />
    </WalletProvider>
  );
}

const styles = StyleSheet.create({
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