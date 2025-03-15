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
import Header from '../../components/common/Header';
import { useWallet } from '../../contexts/WalletContext';
import { CommonActions } from '@react-navigation/native';

export default function DeleteWallet({ route, navigation }) {
  const { wallet } = route.params;
  const { selectedWallet, updateSelectedWallet, wallets, setWallets } = useWallet();
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = () => {
    console.log('开始删除钱包流程 - 钱包ID:', wallet.id);
    navigation.navigate('PaymentPassword', {
      title: 'Delete Wallet',
      purpose: 'delete_wallet',
      walletId: wallet.id,
      onSuccess: async (password) => {
        try {
          console.log('支付密码验证成功，准备删除钱包');
          const deviceId = await DeviceManager.getDeviceId();
          console.log('获取设备ID:', deviceId);
          
          const response = await api.deleteWallet(wallet.id, deviceId, password);
          console.log('删除钱包API响应:', response);
          
          if (response.status === 'success') {
            const updatedWallets = wallets.filter(w => w.id !== wallet.id);
            console.log('更新后的钱包列表:', updatedWallets);
            console.log('当前选中的钱包:', selectedWallet?.id);
            
            if (updatedWallets.length === 0) {
              console.log('没有剩余钱包，准备跳转到引导页');
              await Promise.all([
                setWallets([]),
                updateSelectedWallet(null)
              ]);
              
              await DeviceManager.setWalletCreated(false);
              
              setTimeout(() => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Onboarding' }]
                  })
                );
              }, 100);
            } else {
              console.log('还有其他钱包，准备更新状态');
              if (selectedWallet?.id === wallet.id) {
                console.log('删除的是当前选中的钱包，将选择新钱包:', updatedWallets[0].id);
              }
              
              await Promise.all([
                setWallets(updatedWallets),
                selectedWallet?.id === wallet.id ? updateSelectedWallet(updatedWallets[0]) : Promise.resolve()
              ]);
              
              setTimeout(() => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [
                      {
                        name: 'MainStack',
                        params: {
                          screen: 'Tabs',
                          params: {
                            screen: 'Wallet'
                          }
                        }
                      }
                    ]
                  })
                );
              }, 100);
            }
            return true;
          } else {
            console.log('删除钱包失败:', response.message);
            return { error: response.message || 'Failed to delete wallet' };
          }
        } catch (error) {
          console.error('删除钱包发生错误:', error);
          return { error: error.message || 'Failed to delete wallet' };
        }
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Delete Wallet"
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.content}>
        <View style={styles.warningSection}>
          <Ionicons name="warning" size={48} color="#FF4B55" />
          <Text style={styles.warningTitle}>Warning</Text>
          <Text style={styles.warningText}>
            Deleting this wallet will permanently remove it from your device. 
            Make sure you have backed up your private key before proceeding.
          </Text>
        </View>

        <View style={styles.confirmSection}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsConfirmed(!isConfirmed)}
          >
            <Ionicons
              name={isConfirmed ? "checkbox" : "square-outline"}
              size={24}
              color={isConfirmed ? "#FF4B55" : "#8E8E8E"}
            />
            <Text style={styles.checkboxText}>
              I understand that this action cannot be undone
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              !isConfirmed && styles.deleteButtonDisabled
            ]}
            onPress={handleConfirm}
            disabled={!isConfirmed}
          >
            <Text style={[
              styles.deleteButtonText,
              !isConfirmed && styles.deleteButtonTextDisabled
            ]}>
              Delete Wallet
            </Text>
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
  warningSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  warningTitle: {
    color: '#FF4B55',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  confirmSection: {
    marginTop: 40,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#FF4B55',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#272C52',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButtonTextDisabled: {
    color: '#8E8E8E',
  },
});