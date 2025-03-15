import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/common/Header';

export default function PrivateKeyDisplay({ route, navigation }) {
  const { privateKey } = route.params;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Private Key"
        onBack={handleBack}
      />
      
      <View style={styles.content}>
        <View style={styles.warningContainer}>
          <View style={styles.warningIconContainer}>
            <Ionicons name="shield-checkmark" size={48} color="#1FC595" />
          </View>
          <Text style={styles.warningTitle}>Keep Your Private Key Safe</Text>
          <Text style={styles.warningText}>
            This is your wallet's private key. Never share it with anyone.
          </Text>
        </View>

        <View style={styles.keyContainer}>
          <View style={styles.keyBox}>
            <Text style={styles.privateKeyText} selectable>
              {privateKey}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopy}
            >
              <Ionicons 
                name={copied ? "checkmark-circle" : "copy"} 
                size={24} 
                color="#1FC595" 
              />
            </TouchableOpacity>
          </View>
          {copied && (
            <Text style={styles.copiedText}>Copied to clipboard</Text>
          )}
        </View>

        <View style={styles.noteContainer}>
          <View style={styles.noteItem}>
            <Ionicons name="alert-circle" size={20} color="#FF4B55" />
            <Text style={styles.noteText}>
              Anyone with your private key can access your wallet
            </Text>
          </View>
          <View style={styles.noteItem}>
            <Ionicons name="alert-circle" size={20} color="#FF4B55" />
            <Text style={styles.noteText}>
              Store it in a secure location
            </Text>
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
  warningContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(31, 197, 149, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#8E8E8E',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  keyContainer: {
    marginBottom: 32,
  },
  keyBox: {
    backgroundColor: '#272C52',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  privateKeyText: {
    color: '#FFFFFF',
    fontSize: 15,
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  copyButton: {
    padding: 8,
  },
  copiedText: {
    color: '#1FC595',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  noteContainer: {
    backgroundColor: 'rgba(255, 75, 85, 0.08)',
    borderRadius: 12,
    padding: 16,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteText: {
    color: '#FF4B55',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
}); 