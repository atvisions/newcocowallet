import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { api } from '../../services/api';
import { DeviceManager } from '../../utils/device';
import Header from '../../components/common/Header';
import { useWallet } from '../../contexts/WalletContext';

export default function RenameWallet({ route, navigation }) {
  console.log('RenameWallet - Route params:', route.params);
  const { wallet } = route.params || {};
  console.log('RenameWallet - Wallet data:', wallet);
  
  const { updateSelectedWallet } = useWallet();
  const [newName, setNewName] = useState(wallet?.name || '');

  const handleRename = async () => {
    try {
      console.log('RenameWallet - Starting rename process with name:', newName);
      const deviceId = await DeviceManager.getDeviceId();
      await api.renameWallet(wallet.id, deviceId, newName);
      const updatedWallet = { ...wallet, name: newName };
      updateSelectedWallet(updatedWallet);
      console.log('RenameWallet - Rename successful, navigating back');
      navigation.goBack();
    } catch (error) {
      console.error('RenameWallet - Error during rename:', error);
      Alert.alert('Error', 'Failed to rename wallet');
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Rename Wallet" 
        onBack={() => navigation.goBack()} 
      />
      
      <View style={styles.content}>
        <Text style={styles.label}>Wallet Name</Text>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="Enter new name"
          placeholderTextColor="#8E8E8E"
        />
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleRename}
        >
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  content: {
    padding: 16,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#272C52',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#1FC595',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});