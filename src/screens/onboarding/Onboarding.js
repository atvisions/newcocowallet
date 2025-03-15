import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeviceManager } from '../../utils/device';
import { LinearGradient } from 'expo-linear-gradient';
import { typography } from '../../styles/typography';
import { api } from '../../services/api';
import SetPaymentPassword from '../../screens/auth/SetPaymentPassword'; // 导入 SetPaymentPassword 组件


const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    image: require('../../../assets/boarding1.jpg'), // 确保路径正确
    title: 'Welcome to COCO Wallet',
    subtitle: 'Your Secure Digital Asset Manager'
  },
  {
    id: '2',
    image: require('../../../assets/boarding2.jpg'),
    title: 'Safe & Reliable',
    subtitle: 'Advanced encryption and security protocols'
  },
  {
    id: '3',
    image: require('../../../assets/boarding3.jpg'),
    title: 'Get Started',
    subtitle: 'Begin your crypto journey today'
  },
  {
    id: '4',
    type: 'create',
  }
];

export default function Onboarding({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleCreateWallet = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      console.log('Device ID for creating wallet:', deviceId);
      const passwordStatus = await api.checkPaymentPasswordStatus(deviceId);
      console.log('Password Status:', passwordStatus);

      if (!passwordStatus) {
        console.log('Navigating to SetPaymentPassword for creating wallet');
        navigation.navigate('SetPaymentPassword', { 
          fromOnboarding: true, 
          previousScreen: 'CreateWallet',
          nextScreen: 'SelectChain',
        });
      } else {
        console.log('Navigating to SelectChain for creating wallet');
        navigation.navigate('SelectChain', {
          purpose: 'create',
          deviceId,
          fromOnboarding: true
        });
      }
    } catch (error) {
      console.error('Failed to get device ID:', error);
    }
  };

  const handleImportWallet = async () => {
    try {
      const deviceId = await DeviceManager.getDeviceId();
      console.log('Device ID for importing wallet:', deviceId);
      const passwordStatus = await api.checkPaymentPasswordStatus(deviceId);
      console.log('Password Status:', passwordStatus);

      if (!passwordStatus) {
        console.log('Navigating to SetPaymentPassword for importing wallet');
        navigation.navigate('SetPaymentPassword', { 
          fromOnboarding: true, 
          previousScreen: 'ImportWallet',
          nextScreen: 'SelectChain',
        });
      } else {
        console.log('Navigating to SelectChain for importing wallet');
        navigation.navigate('SelectChain', {
          purpose: 'import',
          deviceId,
          fromOnboarding: true
        });
      }
    } catch (error) {
      console.error('Failed to get device ID:', error);
    }
  };

  const renderItem = ({ item }) => {
    if (item.type === 'create') {
      return (
        <View style={styles.slide}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/icon.png')} 
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.title}>Welcome to CocoWallet</Text>
            <Text style={styles.subtitle}>
              Your secure gateway to the world of digital assets
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button}
              onPress={handleCreateWallet}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="add-circle-outline" size={24} color="#1FC595" />
                </View>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonTitle}>Create New Wallet</Text>
                  <Text style={styles.buttonDescription}>
                    Start fresh with a new wallet
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#8E8E8E" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.button}
              onPress={handleImportWallet}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="download-outline" size={24} color="#1FC595" />
                </View>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonTitle}>Import Existing Wallet</Text>
                  <Text style={styles.buttonDescription}>
                    Import using seed phrase
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#8E8E8E" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.slide}>
        <Image 
          source={item.image} 
          style={styles.slideImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(23, 28, 50, 0)', '#171C32']}
          style={styles.slideGradient}
        >
          <View style={styles.slideContent}>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={e => {
          const x = e.nativeEvent.contentOffset.x;
          setCurrentIndex(Math.round(x / width));
        }}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentIndex === index && styles.paginationDotActive
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  slide: {
    width,
    flex: 1,
  },
  slideImage: {
    width,
    height: '100%',
    position: 'absolute',
  },
  slideGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  slideContent: {
    alignItems: 'center',
    marginBottom: 100,
  },
  slideTitle: {
    ...typography.h1,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  slideSubtitle: {
    ...typography.subtitle,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    overflow: 'hidden',
    backgroundColor: '#272C52',
    marginBottom: 40,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    ...typography.h2,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.subtitle,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#272C52',
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(31, 197, 149, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    ...typography.button,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  buttonDescription: {
    ...typography.body,
    color: '#8E8E8E',
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#272C52',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#1FC595',
    width: 24,
  },
});