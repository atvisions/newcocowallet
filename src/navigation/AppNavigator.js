import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// 导入页面组件
import Onboarding from '../screens/onboarding/Onboarding';
import MainTabs from './MainTabs';
import WalletSelector from '../screens/wallet/WalletSelector';
import SelectChain from '../screens/wallet/SelectChain';
import ShowMnemonic from '../screens/wallet/ShowMnemonic';
import VerifyMnemonic from '../screens/wallet/VerifyMnemonic';
import ImportWallet from '../screens/wallet/ImportWallet';
import SetPaymentPassword from '../screens/auth/SetPaymentPassword';
import ChangePaymentPassword from '../screens/auth/ChangePaymentPassword';
import RenameWallet from '../screens/wallet/RenameWallet';
import ShowPrivateKey from '../screens/wallet/ShowPrivateKey';
import LoadingWallet from '../screens/wallet/LoadingWallet';
import DeleteWallet from '../screens/wallet/DeleteWallet';
import PaymentPasswordScreen from '../screens/wallet/PaymentPasswordScreen';
import CreateWallet from '../screens/wallet/CreateWallet';
import TokenListScreen from '../screens/wallet/TokenListScreen';
import CustomSplash from '../screens/CustomSplash';
import PrivateKeyDisplay from '../screens/wallet/PrivateKeyDisplay';
import TokenDetailScreen from '../screens/TokenDetailScreen';
import TokenSelectScreen from '../screens/swap/TokenSelectScreen';


const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#171C32' },
        cardStyleInterpolator: ({ current: { progress }, layouts }) => ({
          cardStyle: {
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                  extrapolate: 'clamp',
                }),
              },
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.height * 0.05, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
            opacity: progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.5, 1],
              extrapolate: 'clamp',
            }),
          },
        }),
        presentation: 'modal',
      }}
    >
      <Stack.Screen name="CustomSplash" component={CustomSplash} />
      <Stack.Screen name="Onboarding" component={Onboarding} />
      <Stack.Screen name="MainStack" component={MainTabs} />
      <Stack.Screen name="WalletSelector" component={WalletSelector} />
      <Stack.Screen name="SelectChain" component={SelectChain} />
      <Stack.Screen name="ShowMnemonic" component={ShowMnemonic} />
      <Stack.Screen name="VerifyMnemonic" component={VerifyMnemonic} />
      <Stack.Screen name="ImportWallet" component={ImportWallet} />
      <Stack.Screen name="SetPaymentPassword" component={SetPaymentPassword} />
      <Stack.Screen name="ChangePaymentPassword" component={ChangePaymentPassword} />
      <Stack.Screen name="RenameWallet" component={RenameWallet} />
      <Stack.Screen name="ShowPrivateKey" component={ShowPrivateKey} />
      <Stack.Screen name="PrivateKeyDisplay" component={PrivateKeyDisplay} />
      <Stack.Screen name="LoadingWallet" component={LoadingWallet} />
      <Stack.Screen name="DeleteWallet" component={DeleteWallet} />
      <Stack.Screen name="PaymentPassword" component={PaymentPasswordScreen} />
      <Stack.Screen name="CreateWallet" component={CreateWallet} />
      <Stack.Screen name="TokenListScreen" component={TokenListScreen} />
      <Stack.Screen name="TokenDetail" component={TokenDetailScreen} />
      <Stack.Screen name="TokenSelect" component={TokenSelectScreen} />

    </Stack.Navigator>
  );
};

export default AppNavigator;