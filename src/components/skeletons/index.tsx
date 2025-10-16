import React from 'react';
import DashboardSkeleton from './DashboardSkeleton';
import TaskSkeleton from './TaskSkeleton';

export const FinanceSkeleton: React.FC<{ theme?: 'dark' | 'light' }> = ({
  theme = 'dark',
}) => <DashboardSkeleton variant="finance" theme={theme} />;

export const WellnessSkeleton: React.FC<{ theme?: 'dark' | 'light' }> = ({
  theme = 'dark',
}) => <DashboardSkeleton variant="wellness" theme={theme} />;

export const AnalyticsSkeleton: React.FC<{ theme?: 'dark' | 'light' }> = ({
  theme = 'dark',
}) => <DashboardSkeleton variant="analytics" theme={theme} />;

export const HolisticSkeleton: React.FC<{ theme?: 'dark' | 'light' }> = ({
  theme = 'dark',
}) => <DashboardSkeleton variant="holistic" theme={theme} />;

export const TaskListSkeleton: React.FC<{ theme?: 'dark' | 'light'; count?: number }> = ({
  theme = 'dark',
  count = 5,
}) => <TaskSkeleton variant="list" theme={theme} count={count} />;

export const TaskCardSkeleton: React.FC<{ theme?: 'dark' | 'light'; count?: number }> = ({
  theme = 'dark',
  count = 3,
}) => <TaskSkeleton variant="card" theme={theme} count={count} />;

export const TaskCompactSkeleton: React.FC<{ theme?: 'dark' | 'light'; count?: number }> = ({
  theme = 'dark',
  count = 8,
}) => <TaskSkeleton variant="compact" theme={theme} count={count} />;

export default DashboardSkeleton;
