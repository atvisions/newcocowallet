import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
} from 'react-native';

export default function PasswordInput({ value, onChange, autoFocus }) {
  const inputRefs = Array(6).fill(0).map(() => useRef(null));

  useEffect(() => {
    if (autoFocus) {
      inputRefs[0].current.focus();
    }
  }, [autoFocus]);

  const handleNumberInput = (text, index) => {
    const numericText = text.replace(/\D/g, '');
    
    if (numericText.length <= 1) {
      const newPassword = value.slice(0, index) + numericText + value.slice(index + 1);
      onChange(newPassword);
      
      if (numericText.length === 1 && index < 5) {
        setTimeout(() => {
          inputRefs[index + 1].current.focus();
        }, 0);
      }
    }
  };

  const handleBackspace = (index, key) => {
    if (key === 'Backspace') {
      if (value[index] === undefined && index > 0) {
        const newPassword = value.slice(0, index - 1) + value.slice(index);
        onChange(newPassword);
        setTimeout(() => {
          inputRefs[index - 1].current.focus();
        }, 0);
      } else {
        const newPassword = value.slice(0, index) + value.slice(index + 1);
        onChange(newPassword);
      }
    }
  };

  return (
    <View style={styles.inputContainer}>
      {Array(6).fill(0).map((_, index) => (
        <View key={index} style={styles.inputWrapper}>
          <TextInput
            ref={inputRefs[index]}
            style={styles.passwordInput}
            maxLength={1}
            keyboardType="numeric"
            value={value[index] || ''}
            onChangeText={(text) => handleNumberInput(text, index)}
            onKeyPress={({ nativeEvent: { key } }) => handleBackspace(index, key)}
            caretHidden={true}
          />
          {value[index] && (
            <View style={styles.dot} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  inputWrapper: {
    width: 45,
    height: 45,
    backgroundColor: '#272C52',
    borderRadius: 12,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    color: 'transparent',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
}); 