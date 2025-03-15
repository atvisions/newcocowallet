import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { WalletProvider } from './src/contexts/WalletContext';
import * as NavigationBar from 'expo-navigation-bar';

export default function App() {
  useEffect(() => {
    // 设置底部导航栏颜色和样式
    async function setNavigationBarColor() {
      await NavigationBar.setBackgroundColorAsync('#171C32');
      await NavigationBar.setButtonStyleAsync('light');
      await NavigationBar.setBorderColorAsync('#171C32');
    }
    
    setNavigationBarColor();
  }, []);

  return (
    <WalletProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </WalletProvider>
  );
}