import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Keyboard,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import Header from '../../components/common/Header';
import PasswordDots from '../../components/common/PasswordDots';
import { CommonActions } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const PIN_LENGTH = 6;

export default function ChangePaymentPassword({ navigation }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [pendingValidation, setPendingValidation] = useState(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setShowKeyboard(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setShowKeyboard(false));

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (pendingValidation && pendingValidation.length === 6) {
      handleNext(pendingValidation);
      setPendingValidation(null);
    }
  }, [pendingValidation]);

  const handleNumberPress = (number) => {
    const currentPassword = step === 1 ? oldPassword :
                          step === 2 ? newPassword : confirmPassword;
    
    if (currentPassword.length < 6) {
      const newValue = currentPassword + number;
      
      if (step === 1) {
        setOldPassword(newValue);
        if (newValue.length === 6) {
          setPendingValidation(newValue);
        }
      } else if (step === 2) {
        setNewPassword(newValue);
        if (newValue.length === 6) {
          setPendingValidation(newValue);
        }
      } else {
        setConfirmPassword(newValue);
        if (newValue.length === 6) {
          setPendingValidation(newValue);
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 1 && oldPassword.length > 0) {
      setOldPassword(oldPassword.slice(0, -1));
    } else if (step === 2 && newPassword.length > 0) {
      setNewPassword(newPassword.slice(0, -1));
    } else if (step === 3 && confirmPassword.length > 0) {
      setConfirmPassword(confirmPassword.slice(0, -1));
    }
  };

  const handleNext = async (passwordValue) => {
    setError('');
    
    if (step === 1) {
      const currentOldPassword = passwordValue || oldPassword;
      if (currentOldPassword.length !== 6) {
        setError('Please enter your current password');
        return;
      }
      
      setIsVerifying(true);
      try {
        const deviceId = await DeviceManager.getDeviceId();
        const response = await api.verifyPaymentPassword(deviceId, currentOldPassword).catch(() => null);
        
        if (response?.status === 'success') {
          setStep(2);
        } else {
          setError('Current password is incorrect');
          setOldPassword('');
        }
      } catch {
        setError('Current password is incorrect');
        setOldPassword('');
      } finally {
        setIsVerifying(false);
      }
    } else if (step === 2) {
      const currentNewPassword = passwordValue || newPassword;
      if (currentNewPassword.length !== 6) {
        setError('Please enter new password');
        return;
      }
      if (currentNewPassword === oldPassword) {
        setError('New password cannot be the same as current password');
        setNewPassword('');
        return;
      }
      setStep(3);
    } else {
      const currentConfirmPassword = passwordValue || confirmPassword;
      if (currentConfirmPassword.length !== 6) {
        setError('Please enter confirmation password');
        return;
      }

      if (newPassword !== currentConfirmPassword) {
        setError('Passwords do not match');
        setConfirmPassword('');
        return;
      }

      setIsVerifying(true);
      try {
        const deviceId = await DeviceManager.getDeviceId();
        const response = await api.changePaymentPassword(
          deviceId, 
          oldPassword, 
          newPassword, 
          currentConfirmPassword
        ).catch(() => null);
        
        if (response?.status === 'success') {
          setStep(4);
          setTimeout(() => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: 'MainStack',
                    state: {
                      routes: [
                        {
                          name: 'Tabs',
                          state: {
                            routes: [{ name: 'Settings' }],
                            index: 2, // Settings tab index
                          },
                        },
                      ],
                      index: 0,
                    },
                  },
                ],
              })
            );
          }, 2000);
        } else {
          setError('Failed to change password');
        }
      } catch {
        setError('Failed to change password');
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Settings' }],
      });
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Current Password';
      case 2:
        return 'New Password';
      case 3:
        return 'Confirm Password';
      case 4:
        return 'Password Updated';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Change Password"
        onBack={handleBack}
      />
      
      <View style={styles.mainContent}>
        {step === 4 ? (
          <View style={styles.successContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#1FC595" />
            </View>
            <Text style={styles.successTitle}>Success</Text>
            <Text style={styles.successDescription}>Password changed successfully</Text>
          </View>
        ) : (
          <>
            <View style={styles.headerSection}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, step >= 1 && styles.activeStepDot]} />
                <View style={[styles.stepLine, step >= 2 && styles.activeStepLine]} />
                <View style={[styles.stepDot, step >= 2 && styles.activeStepDot]} />
                <View style={[styles.stepLine, step >= 3 && styles.activeStepLine]} />
                <View style={[styles.stepDot, step >= 3 && styles.activeStepDot]} />
              </View>
              <Text style={styles.stepTitle}>
                {step === 1 ? 'Current Password' :
                 step === 2 ? 'New Password' :
                 'Confirm Password'}
              </Text>
            </View>

            <View style={styles.pinSection}>
              <PasswordDots
                length={6}
                filledCount={
                  step === 1 ? oldPassword.length : 
                  step === 2 ? newPassword.length : 
                  confirmPassword.length
                }
              />
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#FF4B55" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.keypadSection}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'delete'].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.keypadButton,
                    item === '' && styles.emptyButton
                  ]}
                  onPress={() => {
                    if (item === 'delete') {
                      handleDelete();
                    } else if (item !== '') {
                      handleNumberPress(item.toString());
                    }
                  }}
                >
                  {item === 'delete' ? (
                    <Ionicons name="backspace-outline" size={24} color="#FFFFFF" />
                  ) : item !== '' ? (
                    <Text style={styles.keypadButtonText}>{item}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
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
    paddingHorizontal: 24,
  },
  headerSection: {
    paddingTop: 32,
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeStepDot: {
    backgroundColor: '#1FC595',
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
  },
  activeStepLine: {
    backgroundColor: '#1FC595',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pinSection: {
    marginTop: 48,
    alignItems: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotFilled: {
    backgroundColor: '#1FC595',
    borderColor: '#1FC595',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 75, 85, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 24,
  },
  errorText: {
    color: '#FF4B55',
    fontSize: 14,
    marginLeft: 8,
  },
  keypadSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 'auto',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  keypadButton: {
    width: (width - 96) / 3,
    height: (width - 96) / 3,
    borderRadius: (width - 96) / 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyButton: {
    backgroundColor: 'transparent',
  },
  keypadButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '500',
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(31, 197, 149, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    color: '#8E8E8E',
    textAlign: 'center',
  },
}); 