import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Button } from '../GlassComponents';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { ThemeType } from '../../theme/colors';

interface OAuthButtonProps {
  service: 'todoist' | 'notion';
  theme: ThemeType;
  onSuccess: (token: any) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export const OAuthButton: React.FC<OAuthButtonProps> = ({
  service,
  theme,
  onSuccess,
  onError,
  disabled = false
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const themeColors = colors[theme];

  const handleOAuthFlow = async () => {
    setIsConnecting(true);
    
    try {
      if (service === 'todoist') {
        const { TodoistOAuthService } = await import('../../services/integrations/TodoistOAuthService');
        const oauthService = TodoistOAuthService.getInstance();
        
        const result = await oauthService.initiateOAuth();
        if (!result.success) {
          throw new Error(result.error || 'Failed to initiate OAuth');
        }
        
        // OAuth flow will continue in deep link handler
        Alert.alert(
          'Authorization Required',
          'You will be redirected to Todoist to authorize the connection. Please complete the authorization and return to the app.',
          [{ text: 'OK' }]
        );
      } else if (service === 'notion') {
        const { NotionOAuthService } = await import('../../services/integrations/NotionOAuthService');
        const oauthService = NotionOAuthService.getInstance();
        
        const result = await oauthService.initiateOAuth();
        if (!result.success) {
          throw new Error(result.error || 'Failed to initiate OAuth');
        }
        
        Alert.alert(
          'Authorization Required',
          'You will be redirected to Notion to authorize the connection. Please complete the authorization and return to the app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'OAuth failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const getServiceInfo = () => {
    switch (service) {
      case 'todoist':
        return {
          icon: '📋',
          name: 'Todoist',
          description: 'Connect your Todoist account for task synchronization'
        };
      case 'notion':
        return {
          icon: '📝',
          name: 'Notion',
          description: 'Connect your Notion workspace for note synchronization'
        };
      default:
        return { icon: '🔗', name: 'Service', description: 'Connect service' };
    }
  };

  const serviceInfo = getServiceInfo();

  return (
    <View style={[styles.container, { borderColor: themeColors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.icon, { color: themeColors.primary }]}>
          {serviceInfo.icon}
        </Text>
        <Text style={[styles.serviceName, { color: themeColors.text }]}>
          {serviceInfo.name}
        </Text>
      </View>
      
      <Text style={[styles.description, { color: themeColors.textSecondary }]}>
        {serviceInfo.description}
      </Text>
      
      <Button
        title={isConnecting ? 'Connecting...' : `Connect ${serviceInfo.name}`}
        onPress={handleOAuthFlow}
        variant="primary"
        size="medium"
        theme={theme}
        disabled={disabled || isConnecting}
        style={styles.connectButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  serviceName: {
    ...typography.h4,
    fontWeight: '600',
  },
  description: {
    ...typography.bodySmall,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  connectButton: {
    width: '100%',
  },
});