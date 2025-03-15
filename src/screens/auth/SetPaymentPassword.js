import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import PasswordDots from '../../components/common/PasswordDots';
import Header from '../../components/common/Header';
import { useWallet } from '../../contexts/WalletContext';

export default function SetPaymentPassword({ navigation, route }) {
  const { walletType } = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const { selectedChain } = useWallet();

  const handleNumberPress = (number) => {
    if (step === 1 && password.length < 6) {
      const newPassword = password + number;
      setPassword(newPassword);
      // 在输入第6位密码时切换到确认步骤
      if (newPassword.length === 6) {
        // 确保密码显示后再切换到确认步骤
        setTimeout(() => {
          setStep(2); // 自动切换到确认密码步骤
        }, 100); // 100毫秒的延迟
      }
    } else if (step === 2 && confirmPassword.length < 6) {
      const newConfirmPassword = confirmPassword + number;
      setConfirmPassword(newConfirmPassword);
      if (newConfirmPassword.length === 6) {
        handleNext(newConfirmPassword); // Automatically call next step
      }
    }
  };

  const handleDelete = () => {
    if (step === 1) {
      setPassword(password.slice(0, -1));
    } else if (step === 2) {
      setConfirmPassword(confirmPassword.slice(0, -1));
    }
  };

  const handleNext = async (newConfirmPassword) => {
    console.log('Setting password:', password);
    if (password !== newConfirmPassword) {
      setError('Passwords do not match');
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      const deviceId = await DeviceManager.getDeviceId();
      console.log('Device ID for setting password:', deviceId);
      const response = await api.setPaymentPassword(deviceId, password, newConfirmPassword);
      
      if (response.status === 'success') {
        console.log('Password set successfully');
        // 更新密码状态
        await DeviceManager.setPaymentPasswordStatus(true);
        
        // 检查是否有onSuccess回调
        if (route.params?.onSuccess) {
          route.params.onSuccess();
        } else {
          // 如果没有回调，则使用默认导航逻辑
          const { previousScreen, fromOnboarding } = route.params;
          
          // 根据来源页面和目的设置正确的导航参数
          const navigationParams = {
            purpose: previousScreen === 'ImportWallet' ? 'import' : 'create',
            deviceId,
            fromOnboarding: fromOnboarding || false
          };

          // 导航到SelectChain页面
          navigation.navigate('SelectChain', navigationParams);
        }
      } else {
        setError('Failed to set payment password');
        Alert.alert('Error', 'Failed to set payment password');
      }
    } catch (error) {
      console.error('Error setting password:', error);
      setError('Failed to set payment password');
      Alert.alert('Error', 'Failed to set payment password');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Set Payment Password"
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.mainContent}>
        <Text style={styles.title}>
          {step === 1 ? 'Set Payment Password' : 'Confirm Password'}
        </Text>
        <Text style={styles.instructionText}>Please set a 6-digit password</Text>
        <PasswordDots length={6} filledCount={step === 1 ? password.length : confirmPassword.length} />
        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.keypadSection}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'delete'].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.keypadButton}
              onPress={() => {
                if (item === 'delete') {
                  handleDelete();
                } else if (item !== '') {
                  handleNumberPress(item.toString());
                }
              }}
              activeOpacity={0.7}
            >
              {item === 'delete' ? (
                <Ionicons name="backspace-outline" size={24} color="#FFFFFF" />
              ) : (
                <Text style={styles.keypadButtonText}>{item}</Text>
              )}
            </TouchableOpacity>
          ))}
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

  mainContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  errorText: {
    color: '#FF4B55',
    marginTop: 10,
    textAlign: 'center',
  },
  keypadSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 30,
  },
  keypadButton: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1FC595',
    margin: 10,
    borderRadius: 35,
    elevation: 5,
  },
  keypadButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
});