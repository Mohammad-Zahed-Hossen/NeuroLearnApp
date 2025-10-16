export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  screen: string;
  description: string;
  cognitiveLoad: number; // 0-1 scale for dynamic assessment
  usageFrequency: number; // Calculated from actual usage data
}

export interface UserPermissions {
  hasFinanceAccess: boolean;
  hasWellnessAccess: boolean;
  hasAdvancedTools: boolean;
  hasIntegrations: boolean;
  hasAnalytics: boolean;
}

export interface UserBehavior {
  frequentlyUsed: string[];
  lastUsed: { [key: string]: Date };
  totalUsage: { [key: string]: number };
  preferences: {
    menuOrder: string[];
    hiddenItems: string[];
  };
}

export interface MenuGenerationConfig {
  permissions: UserPermissions;
  behavior: UserBehavior;
  cognitiveLoad: number;
  uiMode: 'simple' | 'normal' | 'advanced';
}
