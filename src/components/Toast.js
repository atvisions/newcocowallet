import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let toastTimeout;

const Toast = {
  show: null,
  hide: null
};

export const ToastView = () => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [type, setType] = React.useState('');

  useEffect(() => {
    Toast.show = (msg, messageType = 'success') => {
      setMessage(msg);
      setType(messageType);
      setVisible(true);

      if (toastTimeout) {
        clearTimeout(toastTimeout);
      }

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 50,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();

      if (messageType !== 'pending') {
        toastTimeout = setTimeout(() => {
          hide();
        }, 2000);
      }
    };

    Toast.hide = hide;
    return () => {
      Toast.show = null;
      Toast.hide = null;
    };
  }, []);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setVisible(false);
    });
  };

  if (!visible) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'pending':
        return {
          color: '#FFFFFF',
          icon: 'time-outline',
          backgroundColor: '#FFB800'
        };
      case 'success':
        return {
          color: '#FFFFFF',
          icon: 'checkmark-circle',
          backgroundColor: '#1FC595'
        };
      case 'error':
        return {
          color: '#FFFFFF',
          icon: 'close-circle',
          backgroundColor: '#FF3B30'
        };
      default:
        return {
          color: '#FFFFFF',
          icon: 'information-circle',
          backgroundColor: '#2196F3'
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: config.backgroundColor
        }
      ]}
    >
      {type === 'pending' ? (
        <ActivityIndicator size="small" color={config.color} style={styles.icon} />
      ) : (
        <Ionicons name={config.icon} size={16} color={config.color} style={styles.icon} />
      )}
      <Text style={[styles.text, { color: config.color }]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  }
});

export default Toast; 