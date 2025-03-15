import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/common/Header';

export default function ShowMnemonic({ navigation, route }) {
  const { mnemonic, chain, deviceId } = route.params || {};
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mnemonic || !chain || !deviceId) {
      console.error('Missing required params:', { mnemonic, chain, deviceId });
      navigation.goBack();
      return;
    }
  }, [mnemonic, chain, deviceId]);

  const handleContinue = () => {
    if (!isConfirmed) {
      setShowConfirmModal(true);
      modalOpacity.setValue(0);
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      setLoading(true);
      navigation.navigate('VerifyMnemonic', {
        mnemonic,
        chain,
        deviceId
      });
    }
  };

  const handleConfirm = () => {
    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowConfirmModal(false);
      navigation.navigate('VerifyMnemonic', {
        mnemonic,
        chain,
        deviceId
      });
    });
  };

  const handleCancel = () => {
    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowConfirmModal(false);
    });
  };

  const renderMnemonicWords = () => {
    if (!mnemonic) return null;
    
    return mnemonic.split(' ').map((word, index) => (
      <View key={index} style={styles.wordContainer}>
        <Text style={styles.wordIndex}>{index + 1}</Text>
        <Text style={styles.word}>{word}</Text>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Backup Phrase"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Backup Your Phrase</Text>
        <Text style={styles.subtitle}>
          Write down or copy these 12 words in the correct order and keep them in a safe place.
        </Text>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={24} color="#FFB800" />
          <Text style={styles.warningText}>
            Never share your backup phrase. Anyone with these words can access your wallet.
          </Text>
        </View>

        <View style={styles.mnemonicContainer}>
          {renderMnemonicWords()}
        </View>

        <TouchableOpacity 
          style={[styles.button, isConfirmed && styles.buttonConfirmed]}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>
            {isConfirmed ? 'Verify Backup Phrase' : 'I have saved these words'}
          </Text>
        </TouchableOpacity>
      </View>

      {showConfirmModal && (
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: modalOpacity }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={handleCancel}
          />
          <Animated.View 
            style={[
              styles.modalContent,
              {
                opacity: modalOpacity,
                transform: [{
                  translateY: modalOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0]
                  })
                }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={40} color="#1FC595" />
              <Text style={styles.modalTitle}>Important</Text>
            </View>
            <Text style={styles.modalText}>
              Please make sure you have saved your backup phrase in a safe place. 
              You will need to verify it in the next step.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={handleCancel}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonConfirm}
                onPress={handleConfirm}
              >
                <Text style={styles.modalButtonConfirmText}>I have saved it</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
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
    padding: 20,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'center',
  },
  warningText: {
    color: '#FFB800',
    marginLeft: 10,
    flex: 1,
  },
  mnemonicContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  wordContainer: {
    width: '30%',
    backgroundColor: '#272C52',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordIndex: {
    color: '#1FC595',
    marginRight: 8,
    fontSize: 12,
  },
  word: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#272C52',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonConfirmed: {
    backgroundColor: '#1FC595',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#272C52',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: '#1FC595',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 