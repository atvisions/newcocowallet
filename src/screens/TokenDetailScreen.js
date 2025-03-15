import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { api } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';

const TokenDetailScreen = ({ route, navigation }) => {
  const { walletId, deviceId, tokenAddress, symbol, chain } = route.params;
  const [tokenDetail, setTokenDetail] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartError, setChartError] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [selectedTimeframePriceChange, setSelectedTimeframePriceChange] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    console.log('时间范围变更:', selectedTimeframe);
    loadTokenDetail();
    loadChartData(selectedTimeframe);
  }, [selectedTimeframe]);

  const loadTokenDetail = async () => {
    try {
      const response = await api.getTokenDetail(deviceId, walletId, symbol, tokenAddress);
      console.log('Token Detail API Response:', response);
      
      if (response?.status === 'success') {
        console.log('Token Logo URL:', response.data?.logo);
        setTokenDetail(response.data);
        setError(null);
      } else {
        setError(response?.message || '无法加载代币详情');
      }
    } catch (error) {
      console.error('加载代币详情失败:', error);
      setError(error?.message || '无法加载代币详情');
    } finally {
      setIsLoading(false);
    }
  };

  const loadChartData = async (timeframe) => {
    try {
      setIsChartLoading(true);
      setChartError(false);
      
      // 计算时间范围
      const now = new Date();
      let fromDate;
      let interval;
      let toDate = now.toISOString();  // 使用完整的ISO时间格式

      switch (timeframe) {
        case '24h':
          interval = '1h';  // 1小时间隔
          fromDate = new Date(now - 25 * 60 * 60 * 1000).toISOString();  // 多获取1小时的数据以确保有足够的点
          break;
        case '7d':
          interval = '4h';  // 4小时间隔
          fromDate = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          interval = '1d';  // 1天间隔
          fromDate = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '1y':
          interval = '1w';  // 1周间隔
          fromDate = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }

      const response = await api.getTokenOHLCV(
        deviceId, 
        walletId, 
        tokenAddress, 
        {
          timeframe: interval,
          from_date: fromDate,
          to_date: toDate
        }
      );
      
      if (response?.status === 'success' && response.data?.ohlcv) {
        const ohlcvData = response.data.ohlcv;
        
        if (ohlcvData.length === 0) {
          setChartData(null);
          setChartError(true);
          return;
        }

        // 确保数据按时间排序（从早到晚）
        ohlcvData.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

        // 过滤并格式化价格数据
        const validPrices = ohlcvData
          .map(item => {
            try {
              const price = parseFloat(item.close);
              if (isNaN(price) || price === 0) {
                return null;
              }
              return price;
            } catch (e) {
              return null;
            }
          })
          .filter(price => price !== null);

        if (validPrices.length === 0) {
          setChartData(null);
          setChartError(true);
          return;
        }

        // 生成时间标签
        const labels = ohlcvData.map((item, index) => {
          const date = new Date(parseInt(item.timestamp));
          let label = '';
          switch (timeframe) {
            case '24h':
              // 每6小时显示一次
              return index % 6 === 0 ? `${date.getHours()}:00` : '';
            case '7d':
              // 每天显示一次
              return `${date.getMonth() + 1}/${date.getDate()}`;
            case '30d':
              // 每5天显示一次
              return index % 5 === 0 ? `${date.getMonth() + 1}/${date.getDate()}` : '';
            case '1y':
              // 每月显示一次
              return index % 4 === 0 ? `${date.getFullYear()}/${date.getMonth() + 1}` : '';
            default:
              return '';
          }
        });

        // 计算价格变化
        const firstPrice = validPrices[0];
        const lastPrice = validPrices[validPrices.length - 1];
        const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

        const chartDataObj = {
          labels: labels,
          datasets: [{
            data: validPrices,
            color: (opacity = 1) => priceChange >= 0 ? `rgba(46, 255, 193, 1)` : `rgba(255, 91, 103, 1)`,
            strokeWidth: 2
          }]
        };

        setChartData(chartDataObj);
        setSelectedTimeframePriceChange(priceChange);
      } else {
        setChartError(true);
        setChartData(null);
      }
    } catch (error) {
      setChartError(true);
      setChartData(null);
    } finally {
      setIsChartLoading(false);
    }
  };

  const formatNumber = (num, decimals = 2) => {
    if (!num) return '0';
    const number = parseFloat(num);
    if (isNaN(number)) return '0';
    
    if (number >= 1e9) return (number / 1e9).toFixed(decimals) + 'B';
    if (number >= 1e6) return (number / 1e6).toFixed(decimals) + 'M';
    if (number >= 1e3) return (number / 1e3).toFixed(decimals) + 'K';
    return number.toFixed(decimals);
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    const number = parseFloat(price);
    if (isNaN(number)) return '$0.00';
    
    if (number < 0.000001) return '<$0.000001';
    if (number < 0.01) return '$' + number.toFixed(6);
    return '$' + number.toFixed(2);
  };

  const formatPriceChange = (change) => {
    if (!change) return '+0.00%';
    const number = parseFloat(change);
    if (isNaN(number)) return '+0.00%';
    const prefix = number >= 0 ? '+' : '';
    return `${prefix}${number.toFixed(2)}%`;
  };

  const openUrl = async (url) => {
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('打开链接失败:', error);
    }
  };

  const handleCopyAddress = async () => {
    try {
      await Clipboard.setString(tokenAddress);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // 2秒后恢复原始图标
    } catch (error) {
      console.error('复制地址失败:', error);
    }
  };

  const getExplorerUrl = () => {
    // 根据不同链返回对应的区块链浏览器地址
    switch (chain?.toLowerCase()) {
      case 'ethereum':
        return `https://etherscan.io/address/${tokenAddress}`;
      case 'bsc':
        return `https://bscscan.com/address/${tokenAddress}`;
      case 'polygon':
        return `https://polygonscan.com/address/${tokenAddress}`;
      default:
        return `https://etherscan.io/address/${tokenAddress}`;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1FC595" />
      </View>
    );
  }

  const priceChange24h = formatPriceChange(tokenDetail?.price_change_24h);
  const isPositiveChange = !priceChange24h.startsWith('-');

  if (!tokenDetail) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1FC595" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[selectedTimeframePriceChange >= 0 ? 'rgba(31, 197, 149, 0.1)' : 'rgba(255, 75, 85, 0.1)', '#171C32']}
        style={styles.backgroundGradient}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.tokenInfo}>
          <Image 
            source={tokenDetail?.logo ? { uri: tokenDetail.logo } : require('../../assets/default-token.png')}
            style={styles.tokenLogo}
            onError={(error) => {
              console.log('Token Logo Load Error:', error.nativeEvent);
              console.log('Failed Logo URL:', tokenDetail?.logo);
            }}
          />
          <Text style={styles.tokenName}>{tokenDetail?.name}</Text>
          <Text style={styles.tokenSymbol}>{tokenDetail?.symbol}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.priceSection}>
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>{formatPrice(tokenDetail?.price)}</Text>
            <Text style={[
              styles.priceChange,
              { color: selectedTimeframePriceChange >= 0 ? '#1FC595' : '#FF4B55' }
            ]}>
              {formatPriceChange(selectedTimeframePriceChange)}
            </Text>
          </View>
        </View>

        {isChartLoading ? (
          <View style={styles.chartLoadingContainer}>
            <ActivityIndicator size="large" color="#1FC595" />
          </View>
        ) : chartError ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>暂无价格走势数据</Text>
          </View>
        ) : chartData && chartData.datasets[0].data.length > 0 ? (
          <View style={styles.chartWrapper}>
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  ...chartData,
                  datasets: [{
                    ...chartData.datasets[0],
                    color: (opacity = 1) => selectedTimeframePriceChange >= 0 ? `rgba(46, 255, 193, 1)` : `rgba(255, 91, 103, 1)`,
                    strokeWidth: 4,
                    withDots: false
                  }]
                }}
                width={Dimensions.get('window').width}
                height={180}
                withShadow={false}
                withDots={false}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLines={false}
                withHorizontalLines={false}
                withVerticalLabels={false}
                withHorizontalLabels={false}
                fromZero={false}
                segments={4}
                transparent={true}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: 'transparent',
                  backgroundGradientTo: 'transparent',
                  fillShadowGradientFrom: 'transparent',
                  fillShadowGradientTo: 'transparent',
                  fillShadowGradientOpacity: 0,
                  strokeWidth: 4,
                  decimalPlaces: 8,
                  color: (opacity = 1) => selectedTimeframePriceChange >= 0 ? `rgba(46, 255, 193, 1)` : `rgba(255, 91, 103, 1)`,
                  labelColor: () => 'transparent',
                  style: {
                    backgroundColor: 'transparent'
                  },
                  propsForBackgroundLines: {
                    stroke: 'transparent'
                  },
                  useShadowColorFromDataset: true
                }}
                bezier
                style={{
                  marginVertical: 0,
                  padding: 0,
                  backgroundColor: 'transparent'
                }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>暂无价格数据</Text>
          </View>
        )}

        <View style={styles.timeframeButtons}>
          <TouchableOpacity 
            style={[
              styles.timeframeButton, 
              selectedTimeframe === '24h' && styles.selectedTimeframe
            ]}
            onPress={() => setSelectedTimeframe('24h')}
          >
            <Text style={[
              styles.timeframeText,
              selectedTimeframe === '24h' && styles.selectedTimeframeText
            ]}>24H</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.timeframeButton, 
              selectedTimeframe === '7d' && styles.selectedTimeframe
            ]}
            onPress={() => setSelectedTimeframe('7d')}
          >
            <Text style={[
              styles.timeframeText,
              selectedTimeframe === '7d' && styles.selectedTimeframeText
            ]}>7D</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.timeframeButton, 
              selectedTimeframe === '30d' && styles.selectedTimeframe
            ]}
            onPress={() => setSelectedTimeframe('30d')}
          >
            <Text style={[
              styles.timeframeText,
              selectedTimeframe === '30d' && styles.selectedTimeframeText
            ]}>30D</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.timeframeButton, 
              selectedTimeframe === '1y' && styles.selectedTimeframe
            ]}
            onPress={() => setSelectedTimeframe('1y')}
          >
            <Text style={[
              styles.timeframeText,
              selectedTimeframe === '1y' && styles.selectedTimeframeText
            ]}>1Y</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Market Cap</Text>
            <Text style={styles.statValue}>${formatNumber(tokenDetail?.market_cap)}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>24h Volume</Text>
            <Text style={styles.statValue}>${formatNumber(tokenDetail?.volume_24h)}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Circulating Supply</Text>
            <Text style={styles.statValue}>{formatNumber(tokenDetail?.circulating_supply)} {tokenDetail?.symbol}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Supply</Text>
            <Text style={styles.statValue}>{formatNumber(tokenDetail?.total_supply)} {tokenDetail?.symbol}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>All Time High</Text>
            <Text style={styles.statValue}>{formatPrice(tokenDetail?.ath)}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>All Time Low</Text>
            <Text style={styles.statValue}>{formatPrice(tokenDetail?.atl)}</Text>
          </View>
        </View>

        <View style={styles.contractContainer}>
          <Text style={styles.sectionTitle}>Contract Address</Text>
          <View style={styles.contractActions}>
            <TouchableOpacity 
              style={styles.contractAddressRow}
              onPress={handleCopyAddress}
            >
              <Text style={styles.contractAddress} numberOfLines={1} ellipsizeMode="middle">
                {tokenAddress}
              </Text>
              <Ionicons 
                name={isCopied ? "checkmark-circle" : "copy-outline"} 
                size={20} 
                color={isCopied ? "#1FC595" : "#8E8E8E"} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.explorerButton}
              onPress={() => openUrl(getExplorerUrl())}
            >
              <Ionicons name="open-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {tokenDetail?.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{tokenDetail.description}</Text>
          </View>
        )}

        {(tokenDetail?.website || tokenDetail?.twitter || tokenDetail?.telegram || tokenDetail?.discord) && (
          <View style={styles.linksContainer}>
            <Text style={styles.sectionTitle}>Social Links</Text>
            <View style={styles.linkButtons}>
              {tokenDetail?.website && (
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={() => openUrl(tokenDetail.website)}
                >
                  <Ionicons name="globe-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {tokenDetail?.twitter && (
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={() => openUrl(tokenDetail.twitter)}
                >
                  <Ionicons name="logo-twitter" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {tokenDetail?.telegram && (
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={() => openUrl(tokenDetail.telegram)}
                >
                  <Ionicons name="paper-plane-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {tokenDetail?.discord && (
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={() => openUrl(tokenDetail.discord)}
                >
                  <Ionicons name="logo-discord" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171C32',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#171C32',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  tokenInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tokenName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  tokenSymbol: {
    color: '#8E8E8E',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  priceSection: {
    marginVertical: 24,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  priceContainer: {
    alignItems: 'center',
  },
  currentPrice: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  priceChange: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  timeframeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  selectedTimeframe: {
    backgroundColor: '#1FC595',
  },
  timeframeText: {
    color: '#8E8E8E',
    fontSize: 15,
    fontWeight: '700',
  },
  selectedTimeframeText: {
    color: '#FFFFFF',
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    marginTop: 16,
    marginBottom: 24,
    marginHorizontal: 20,
    paddingVertical: 8,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 20,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '500',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  contractContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    marginHorizontal: 20,
  },
  contractActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contractAddressRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
  },
  contractAddress: {
    color: '#8E8E8E',
    fontSize: 15,
    flex: 1,
    marginRight: 12,
    fontWeight: '500',
  },
  explorerButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    marginHorizontal: 20,
  },
  descriptionText: {
    color: '#8E8E8E',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  linksContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    marginHorizontal: 20,
  },
  linkButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  linkButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 16,
  },
  chartWrapper: {
    marginVertical: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginLeft: -32,
    marginTop: -15,
  },
  chartContainer: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
    fontWeight: '600',
  },
  retryButton: {
    padding: 16,
    backgroundColor: '#1FC595',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  noDataContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chartLoadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

export default TokenDetailScreen; 