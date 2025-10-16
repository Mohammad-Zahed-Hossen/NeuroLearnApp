import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from '../GlassComponents';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { ThemeType } from '../../theme/colors';

interface OAuthStatusCardProps {
  service: 'todoist' | 'notion';
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  theme: ThemeType;
  workspaceInfo?: {
    name?: string;
    id?: string;
  };
  onReconnect: () => void;
  onDisconnect: () => void;
  errorMessage?: string;
}

export const OAuthStatusCard: React.FC<OAuthStatusCardProps> = ({
  service,
  status,
  theme,
  workspaceInfo,
  onReconnect,
  onDisconnect,
  errorMessage
}) => {
  const themeColors = colors[theme];

  const getServiceInfo = () => {
    switch (service) {
      case 'todoist':
        return { icon: '📋', name: 'Todoist' };
      case 'notion':
        return { icon: '📝', name: 'Notion' };
      default:
        return { icon: '🔗', name: 'Service' };
    }
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          icon: '✅',
          text: 'Connected',
          color: themeColors.success,
          bgColor: themeColors.success + '20'
        };
      case 'connecting':
        return {
          icon: '⏳',
          text: 'Connecting...',
          color: themeColors.warning,
          bgColor: themeColors.warning + '20'
        };
      case 'error':
        return {
          icon: '❌',
          text: 'Error',
          color: themeColors.error,
          bgColor: themeColors.error + '20'
        };
      default:
        return {
          icon: '⚪',
          text: 'Disconnected',
          color: themeColors.textSecondary,
          bgColor: themeColors.border + '20'
        };
    }
  };

  const serviceInfo = getServiceInfo();
  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.container, { borderColor: themeColors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.icon, { color: themeColors.primary }]}>
            {serviceInfo.icon}
          </Text>
          <Text style={[styles.serviceName, { color: themeColors.text }]}>
            {serviceInfo.name}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
          <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
      </View>

      {workspaceInfo?.name && status === 'connected' && (
        <View style={styles.workspaceInfo}>
          <Text style={[styles.workspaceLabel, { color: themeColors.textSecondary }]}>
            Workspace:
          </Text>
          <Text style={[styles.workspaceName, { color: themeColors.text }]}>
            {workspaceInfo.name}
          </Text>
        </View>
      )}

      {status === 'error' && errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorMessage, { color: themeColors.error }]}>
            {errorMessage}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {status === 'connected' ? (
          <Button
            title="Disconnect"
            onPress={onDisconnect}
            variant="outline"
            size="small"
            theme={theme}
            style={[styles.actionButton, { borderColor: themeColors.error }]}
          />
        ) : (
          <Button
            title={status === 'connecting' ? 'Connecting...' : 'Connect'}
            onPress={onReconnect}
            variant="primary"
            size="small"
            theme={theme}
            disabled={status === 'connecting'}
            style={styles.actionButton}
          />
        )}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  serviceName: {
    ...typography.h4,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  workspaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  workspaceLabel: {
    ...typography.bodySmall,
    marginRight: spacing.sm,
  },
  workspaceName: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  errorContainer: {
    marginBottom: spacing.md,
  },
  errorMessage: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    minWidth: 100,
  },
});