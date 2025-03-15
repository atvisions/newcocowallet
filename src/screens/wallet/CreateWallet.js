import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Header from '../../components/common/Header';

export default function CreateWallet({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Create Wallet"
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>Create a new wallet or import an existing one</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.option}
            onPress={() => navigation.navigate('SelectChain', { purpose: 'create' })}
          >
            <View style={styles.optionIcon}>
              <MaterialIcons name="add" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Create New Wallet</Text>
              <Text style={styles.optionDescription}>
                Create a new wallet and generate seed phrase
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.option}
            onPress={() => {
              console.log('Navigating to ImportWallet');
              navigation.navigate('ImportWallet');
            }}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="download-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Import Wallet</Text>
              <Text style={styles.optionDescription}>
                Import your wallet using seed phrase
              </Text>
            </View>
          </TouchableOpacity>
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
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 40,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  option: {
    flexDirection: 'row',
    backgroundColor: '#272C52',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1FC595',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  optionDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
});