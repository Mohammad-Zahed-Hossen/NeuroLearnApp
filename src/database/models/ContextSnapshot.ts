// Minimal ContextSnapshot type used by fallback DB and other services
export interface ContextSnapshot {
  id?: string;
  timestamp: number;
  focusLevel?: number;
  energyLevel?: number;
  moodState?: string;
  activityPattern?: string;
  contextHash?: string;
  synced?: boolean;
  syncedAt?: number;
  createdAt?: Date;
}
