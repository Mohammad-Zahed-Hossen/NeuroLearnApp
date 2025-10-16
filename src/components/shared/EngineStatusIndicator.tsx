/**
 * EngineStatusIndicator - Shows NeuroLearn Engine status
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import EngineService from '../../services/EngineService';
import { EngineHealthCheck } from '../../utils/EngineHealthCheck';

interface Props {
  theme: 'light' | 'dark';
}

export const EngineStatusIndicator: React.FC<Props> = ({ theme }) => {
  const [status, setStatus] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [healthCheck, setHealthCheck] = useState<any>(null);

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async () => {
    try {
      const engineService = EngineService.getInstance();
      const currentStatus = engineService.getStatus();
      setStatus(currentStatus);

      // Perform health check if expanded
      if (isExpanded) {
        const health = await EngineHealthCheck.performHealthCheck('current_user');
        setHealthCheck(health);
      }
    } catch (error) {
      console.warn('Failed to get engine status:', error);
    }
  };

  const getStatusColor = () => {
    if (!status) return '#666';
    switch (status.overallHealth) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'warning': return '#FF9800';
      case 'critical': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    if (!status) return 'Unknown';
    return status.isInitialized ? status.overallHealth : 'Not Initialized';
  };

  const handlePress = async () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      const health = await EngineHealthCheck.performHealthCheck('current_user');
      setHealthCheck(health);
    }
  };

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 50,
      right: 10,
      backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
      borderRadius: 8,
      padding: 8,
      minWidth: 120,
      zIndex: 1000,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    statusText: {
      fontSize: 12,
      color: theme === 'dark' ? '#fff' : '#000',
      fontWeight: '500',
    },
    expandedContent: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme === 'dark' ? '#333' : '#ddd',
    },
    detailText: {
      fontSize: 10,
      color: theme === 'dark' ? '#ccc' : '#666',
      marginBottom: 2,
    },
    moduleStatus: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 4,
    },
    moduleChip: {
      backgroundColor: theme === 'dark' ? '#333' : '#f0f0f0',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 4,
      marginBottom: 2,
    },
    moduleText: {
      fontSize: 8,
      color: theme === 'dark' ? '#fff' : '#000',
    },
  });

  if (!__DEV__) {
    return null; // Only show in development
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
      
      {isExpanded && status && (
        <View style={styles.expandedContent}>
          <Text style={styles.detailText}>
            Operations: {status.activeOperations || 0}
          </Text>
          <Text style={styles.detailText}>
            Online: {status.isOnline ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.detailText}>
            Last Sync: {status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleTimeString() : 'Never'}
          </Text>
          
          {status.moduleStatus && (
            <View style={styles.moduleStatus}>
              {Object.entries(status.moduleStatus).map(([module, moduleStatus]) => (
                <View key={module} style={styles.moduleChip}>
                  <Text style={styles.moduleText}>
                    {module}: {String(moduleStatus)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {healthCheck && (
            <>
              {healthCheck.issues.length > 0 && (
                <Text style={[styles.detailText, { color: '#F44336' }]}>
                  Issues: {healthCheck.issues.length}
                </Text>
              )}
              {healthCheck.warnings.length > 0 && (
                <Text style={[styles.detailText, { color: '#FF9800' }]}>
                  Warnings: {healthCheck.warnings.length}
                </Text>
              )}
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default EngineStatusIndicator;