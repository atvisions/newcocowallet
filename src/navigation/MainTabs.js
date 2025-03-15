import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, Platform, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native/Libraries/Animated/Animated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/common/Header';

import WalletScreen from '../screens/tabs/WalletScreen';
import SwapScreen from '../screens/tabs/SwapScreen';
import SettingsScreen from '../screens/tabs/SettingsScreen';
import WalletSelector from '../screens/wallet/WalletSelector';
import EditWallet from '../screens/wallet/EditWallet';
import ShowPrivateKey from '../screens/wallet/ShowPrivateKey';
import TokenManagement from '../screens/TokenManagement';
import RenameWallet from '../screens/wallet/RenameWallet';
import DeleteWallet from '../screens/wallet/DeleteWallet';
import PaymentPasswordScreen from '../screens/wallet/PaymentPasswordScreen';
import SelectChain from '../screens/wallet/SelectChain';
import ShowMnemonic from '../screens/wallet/ShowMnemonic';
import ImportWallet from '../screens/wallet/ImportWallet';
import VerifyMnemonic from '../screens/wallet/VerifyMnemonic';
import LoadingWallet from '../screens/wallet/LoadingWallet';
import TokenListScreen from '../screens/wallet/TokenListScreen';
import SendScreen from '../screens/wallet/SendScreen';
import SendConfirmationScreen from '../screens/wallet/SendConfirmationScreen';
import TransactionLoadingScreen from '../screens/wallet/TransactionLoadingScreen';
import TransactionSuccessScreen from '../screens/wallet/TransactionSuccessScreen';
import TransactionFailedScreen from '../screens/wallet/TransactionFailedScreen';
import HistoryScreen from '../screens/wallet/HistoryScreen';
import ReceiveScreen from '../screens/wallet/ReceiveScreen';
import TransactionDetailScreen from '../screens/wallet/TransactionDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

console.log('WalletScreen type:', typeof WalletScreen);
console.log('WalletScreen:', WalletScreen);

const FallbackScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Loading...</Text>
  </View>
);

function CustomTabBar({ state, descriptors, navigation }) {
  const animatedValues = React.useRef(
    state.routes.map(() => new Animated.Value(1))
  ).current;

  const handlePress = (index, onPress) => {
    Animated.sequence([
      Animated.timing(animatedValues[index], {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValues[index], {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }),
    ]).start();

    onPress();
  };

  return (
    <SafeAreaView style={{ backgroundColor: '#171C32' }} edges={['bottom']}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName;
          switch (route.name) {
            case 'Wallet':
              iconName = isFocused ? 'wallet' : 'wallet-outline';
              break;

            case 'Swap':
              iconName = isFocused ? 'swap-horizontal' : 'swap-horizontal-outline';
              break;

            case 'Settings':
              iconName = isFocused ? 'settings' : 'settings-outline';
              break;
          }

          return (
            <Animated.View
              key={route.key}
              style={[
                styles.tabItem,
                {
                  transform: [{ scale: animatedValues[index] }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => handlePress(index, onPress)}
              >
                <Ionicons
                  name={iconName}
                  size={28}
                  color={isFocused ? '#1FC595' : '#8E8E8E'}
                />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const TabScreens = () => {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#171C32',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen || FallbackScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name={focused ? "wallet" : "wallet-outline"} 
              size={24} 
              color={focused ? "#1FC595" : "#8E8E8E"} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Swap" 
        component={SwapScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name={focused ? "swap-horizontal" : "swap-horizontal-outline"} 
              size={24} 
              color={focused ? "#1FC595" : "#8E8E8E"} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name={focused ? "settings" : "settings-outline"} 
              size={24} 
              color={focused ? "#1FC595" : "#8E8E8E"} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const MainStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#171C32' },
      }}
    >
      <Stack.Screen name="Tabs" component={TabScreens} />
      <Stack.Screen name="WalletSelector" component={WalletSelector} />
      <Stack.Screen name="EditWallet" component={EditWallet} />
      <Stack.Screen name="ShowPrivateKey" component={ShowPrivateKey} />
      <Stack.Screen name="TokenManagement" component={TokenManagement} />
      <Stack.Screen name="RenameWallet" component={RenameWallet} />
      <Stack.Screen name="DeleteWallet" component={DeleteWallet} />
      <Stack.Screen name="PaymentPassword" component={PaymentPasswordScreen} />
      <Stack.Screen name="SelectChain" component={SelectChain} />
      <Stack.Screen name="ShowMnemonic" component={ShowMnemonic} />
      <Stack.Screen name="ImportWallet" component={ImportWallet} />
      <Stack.Screen name="VerifyMnemonic" component={VerifyMnemonic} />
      <Stack.Screen name="LoadingWallet" component={LoadingWallet} />
      <Stack.Screen name="TokenListScreen" component={TokenListScreen} />
      <Stack.Screen name="Send" component={SendScreen} />
      <Stack.Screen name="SendConfirmation" component={SendConfirmationScreen} />
      <Stack.Screen name="TransactionLoading" component={TransactionLoadingScreen} />
      <Stack.Screen name="TransactionSuccess" component={TransactionSuccessScreen} />
      <Stack.Screen name="TransactionFailed" component={TransactionFailedScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Receive" component={ReceiveScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
    </Stack.Navigator>
  );
};

export default MainStack;

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#171C32',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    height: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});