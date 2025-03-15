import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SlippageSettingModal = ({ visible, onClose, currentSlippage, onConfirm }) => {
  const [slippage, setSlippage] = useState(currentSlippage || '0.5');
  const [customSlippage, setCustomSlippage] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [warning, setWarning] = useState('');
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [backdropVisible, setBackdropVisible] = useState(visible);

  // Preset slippage options
  const presetOptions = ['0.1', '0.5', '1.0', '2.0'];

  // Debug logs
  console.log('SlippageSettingModal render:', { visible, currentSlippage });

  useEffect(() => {
    console.log('SlippageSettingModal visible change:', visible);
    
    if (visible) {
      setModalVisible(true);
      setBackdropVisible(true);
      console.log('Showing slippage modal');
      setSlippage(currentSlippage || '0.5');
      setCustomSlippage('');
      setIsCustom(!presetOptions.includes(currentSlippage));
      if (!presetOptions.includes(currentSlippage)) {
        setCustomSlippage(currentSlippage);
      }
      
      // Start animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      console.log('Hiding slippage modal');
      // Close animation
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, currentSlippage]);

  useEffect(() => {
    validateSlippage();
  }, [slippage, customSlippage, isCustom]);

  const validateSlippage = () => {
    const value = isCustom ? customSlippage : slippage;
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      setWarning('Please enter a valid number');
      return false;
    }
    
    if (numValue <= 0) {
      setWarning('Slippage must be greater than 0');
      return false;
    }
    
    if (numValue < 0.05) {
      setWarning('Low slippage may cause transaction failure');
      return true; // Allow but warn
    }
    
    if (numValue > 5) {
      setWarning('High slippage increases price impact risk');
      return true; // Allow but warn
    }
    
    setWarning('');
    return true;
  };

  const handleSelectPreset = (value) => {
    setSlippage(value);
    setIsCustom(false);
    Keyboard.dismiss();
  };

  const handleCustomChange = (text) => {
    // Remove non-numeric characters, keep one decimal point
    let cleanedValue = text.replace(/[^\d.]/g, '');
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
      cleanedValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // If starts with decimal point, add leading zero
    if (cleanedValue.startsWith('.')) {
      cleanedValue = '0' + cleanedValue;
    }
    
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      cleanedValue = parts[0] + '.' + parts[1].slice(0, 2);
    }
    
    setCustomSlippage(cleanedValue);
    setIsCustom(true);
  };

  const handleConfirm = () => {
    if (validateSlippage()) {
      const finalValue = isCustom ? customSlippage : slippage;
      console.log('Confirm slippage setting:', finalValue);
      onConfirm(finalValue);
      
      setBackdropVisible(false);
      
      // Close with animation
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onClose();
      });
    }
  };

  const handleCloseModal = () => {
    setBackdropVisible(false);
    
    // Close with animation
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="none"
      onRequestClose={handleCloseModal}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="transparent" translucent />
      
      <View style={styles.modalContainer}>
        {backdropVisible && (
          <TouchableWithoutFeedback onPress={handleCloseModal}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
        )}
        
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.dragIndicator} />
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Slippage Tolerance</Text>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#8E8E8E" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={18} color="#8E8E8E" />
            <Text style={styles.infoText}>
              Your transaction will revert if the price changes unfavorably by more than this percentage.
            </Text>
          </View>
          
          <View style={styles.optionsContainer}>
            {presetOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  slippage === option && !isCustom && styles.selectedOption
                ]}
                onPress={() => handleSelectPreset(option)}
              >
                <Text 
                  style={[
                    styles.optionText,
                    slippage === option && !isCustom && styles.selectedOptionText
                  ]}
                >
                  {option}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={[
              styles.customButton,
              isCustom && styles.selectedCustomButton
            ]}
            onPress={() => setIsCustom(true)}
          >
            <Text 
              style={[
                styles.customButtonText,
                isCustom && styles.selectedCustomText
              ]}
            >
              Custom
            </Text>
          </TouchableOpacity>
          
          {isCustom && (
            <View style={styles.customInputWrapper}>
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Enter value"
                  placeholderTextColor="#8E8E8E"
                  keyboardType="decimal-pad"
                  value={customSlippage}
                  onChangeText={handleCustomChange}
                  onFocus={() => setIsCustom(true)}
                  maxLength={5}
                  autoFocus={true}
                />
                <Text style={styles.percentSign}>%</Text>
              </View>
            </View>
          )}
          
          {warning ? (
            <View style={styles.warningContainer}>
              <Ionicons 
                name="warning-outline" 
                size={16} 
                color={warning.includes('failure') ? "#FF9500" : "#FF3B30"} 
              />
              <Text style={[
                styles.warningText,
                { color: warning.includes('failure') ? "#FF9500" : "#FF3B30" }
              ]}>
                {warning}
              </Text>
            </View>
          ) : (
            <View style={styles.warningPlaceholder} />
          )}
          
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <LinearGradient
              colors={['#1FC595', '#17A982']}
              style={styles.confirmButtonGradient}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1A1E2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    height: SCREEN_HEIGHT * 0.65, // 增加高度到屏幕的65%
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#3A3F55',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31, 197, 149, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#8E8E8E',
    lineHeight: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionButton: {
    width: '23%',
    backgroundColor: '#242838',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOption: {
    backgroundColor: 'rgba(31, 197, 149, 0.2)',
    borderWidth: 1,
    borderColor: '#1FC595',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  selectedOptionText: {
    color: '#1FC595',
  },
  customButton: {
    width: '100%',
    backgroundColor: '#242838',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  selectedCustomButton: {
    backgroundColor: 'rgba(31, 197, 149, 0.2)',
    borderWidth: 1,
    borderColor: '#1FC595',
  },
  customButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  selectedCustomText: {
    color: '#1FC595',
  },
  customInputWrapper: {
    marginBottom: 16,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242838',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  customInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  percentSign: {
    color: '#8E8E8E',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
  warningPlaceholder: {
    height: 20,
    marginBottom: 20,
  },
  warningText: {
    marginLeft: 6,
    fontSize: 13,
    flex: 1,
  },
  confirmButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 'auto',
    marginBottom: 16,
  },
  confirmButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SlippageSettingModal; 