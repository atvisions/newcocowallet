import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { WalletProvider } from './src/contexts/WalletContext';
import * as NavigationBar from 'expo-navigation-bar';
import * as Updates from 'expo-updates';
import { Alert, View, Text, StyleSheet, Modal, TouchableOpacity, Image, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveReferralInfo } from './src/utils/referral';
import * as Network from 'expo-network';
import { api } from './src/services/api';
import NetInfo from '@react-native-community/netinfo';
import { DeviceManager } from './src/utils/device';

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

  useEffect(() => {
    // 检查启动参数
    const checkInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          const params = new URLSearchParams(url.split('?')[1]);
          const install_params = params.get('install_params');
          
          if (install_params) {
            const decodedParams = JSON.parse(
              Buffer.from(install_params, 'base64').toString()
            );
            
            if (decodedParams.referrer && decodedParams.temp_device_id) {
              // 保存推荐信息
              await saveReferralInfo(
                decodedParams.referrer,
                decodedParams.temp_device_id
              );
              
              // 获取当前设备ID并更新
              const currentDeviceId = await DeviceManager.getDeviceId();
              if (currentDeviceId && decodedParams.temp_device_id !== currentDeviceId) {
                console.log('【COCO_APP】更新设备ID:', {
                  old: decodedParams.temp_device_id,
                  new: currentDeviceId
                });
                
                try {
                  // 调用更新设备ID的API
                  await api.updateDeviceId(
                    decodedParams.temp_device_id, 
                    currentDeviceId
                  );
                } catch (error) {
                  console.error('【COCO_APP】设备ID更新失败:', error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to check initial URL:', error);
      }
    };

    checkInitialURL();
  }, []);

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        console.log('Network state:', {
          isConnected: networkState.isConnected,
          type: networkState.type,
          isInternetReachable: networkState.isInternetReachable
        });
        
        if (!networkState.isConnected || !networkState.isInternetReachable) {
          Alert.alert(
            'Network Error',
            'Please check your internet connection and try again',
            [
              {
                text: 'Retry',
                onPress: checkNetwork
              },
              {
                text: 'OK',
                style: 'cancel'
              }
            ]
          );
        }
      } catch (error) {
        console.error('Network check error:', {
          message: error.message,
          stack: error.stack
        });
      }
    };

    checkNetwork();
  }, []);

  useEffect(() => {
    // 应用启动诊断
    console.log('【COCO_APP】应用启动');
    console.log('【COCO_APP】开发环境状态:', { isDev: __DEV__ });
    
    // 开始网络测试
    const testNetworkConnections = async () => {
      console.log('【COCO_APP】开始网络诊断');
      
      // 测试网络状态
      try {
        const netState = await Network.getNetworkStateAsync();
        console.log('【COCO_APP】网络状态:', {
          isConnected: netState.isConnected,
          type: netState.type,
          isInternetReachable: netState.isInternetReachable
        });
      } catch (e) {
        console.log('【COCO_APP】获取网络状态失败:', e.message);
      }
      
      // 测试基础URL连接
      const testURLs = [
        'https://www.cocowallet.io/api/v1/',
        // 测试一个知名网站作为对照
        'https://www.google.com'
      ];
      
      for (const url of testURLs) {
        try {
          console.log(`【COCO_APP】测试URL: ${url}`);
          const startTime = Date.now();
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
          });
          const elapsed = Date.now() - startTime;
          console.log(`【COCO_APP】URL ${url} 测试结果:`, {
            success: response.ok,
            status: response.status, 
            time: elapsed,
            type: response.headers.get('content-type')
          });
        } catch (error) {
          console.log(`【COCO_APP】URL ${url} 测试失败:`, {
            message: error.message,
            code: error.code,
            name: error.name
          });
        }
      }
      
      // 测试API入口
      try {
        console.log('【COCO_APP】测试API入口点');
        const response = await api.getSupportedChains();
        console.log('【COCO_APP】API入口测试成功:', response);
      } catch (error) {
        console.log('【COCO_APP】API入口测试失败:', {
          message: error.message,
          stack: error.stack
        });
      }
    };
    
    // 执行测试
    setTimeout(testNetworkConnections, 2000); // 延迟2秒执行，确保应用已完全初始化
  }, []);

  useEffect(() => {
    // 检查当前网络状态
    const checkNetworkStatus = async () => {
      try {
        const state = await NetInfo.fetch();
        console.log('【COCO_NET】当前网络状态:', {
          isConnected: state.isConnected,
          type: state.type,
          isInternetReachable: state.isInternetReachable,
          details: state.details
        });
        
        // 如果没有网络连接，显示提示
        if (!state.isConnected) {
          Alert.alert(
            '网络连接错误',
            '请检查您的网络连接并重试',
            [{ text: '确定' }]
          );
        }
      } catch (error) {
        console.error('【COCO_NET】获取网络状态失败:', error);
      }
    };
    
    // 执行网络检查
    checkNetworkStatus();
    
    // 添加网络状态变化监听
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('【COCO_NET】网络状态变化:', {
        isConnected: state.isConnected,
        type: state.type
      });
    });
    
    return () => unsubscribe();
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