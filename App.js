import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { WalletProvider } from './src/contexts/WalletContext';
import * as NavigationBar from 'expo-navigation-bar';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      Alert.alert(
        "New Version Available",
        "Would you like to update now?",
        [
          {
            text: "Later",
            style: "cancel"
          },
          {
            text: "Update",
            onPress: async () => {
              Alert.alert("Updating", "Please wait...");
              try {
                await Updates.fetchUpdateAsync();
                Alert.alert(
                  "Update Complete",
                  "The app needs to restart to apply the update",
                  [
                    {
                      text: "Restart Now",
                      onPress: () => Updates.reloadAsync()
                    }
                  ]
                );
              } catch (error) {
                Alert.alert("Update Failed", "Please check your network connection and try again");
              }
            }
          }
        ]
      );
    }
  } catch (error) {
    console.log('Error checking for updates:', error);
  }
}

export default function App() {
  useEffect(() => {
    // Set navigation bar color and style
    async function setNavigationBarColor() {
      await NavigationBar.setBackgroundColorAsync('#171C32');
      await NavigationBar.setButtonStyleAsync('light');
      await NavigationBar.setBorderColorAsync('#171C32');
    }
    
    setNavigationBarColor();

    // Check for updates
    if (!__DEV__) {
      checkForUpdates();
    }
  }, []);

  return (
    <WalletProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </WalletProvider>
  );
}