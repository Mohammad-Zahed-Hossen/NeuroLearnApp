import { supabase } from './storage/SupabaseService';
import { NeuroIDGenerator } from '../utils/NeuroIDGenerator';

export interface DistractionEvent {
  id: string;
  original_id?: string;
  client_generated_id?: string;
  user_id: string;
  session_id: string;
  distraction_type: 'notification' | 'app_switch' | 'environment' | 'internal';
  duration_ms: number;
  severity: 'low' | 'medium' | 'high';
  app_name?: string;
  metadata: {
    source?: string;
    context?: string;
    recovery_time?: number;
    impact_score?: number;
    sanitized_at?: string;
    original_id?: string;
    trigger_type?: string;
    timestamp?: string;
  };
  created_at: string;
}

export class DistractionService2025 {
  private static instance: DistractionService2025;
  private retryQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  static getInstance(): DistractionService2025 {
    if (!this.instance) {
      this.instance = new DistractionService2025();
    }
    return this.instance;
  }

  async saveDistractionEvent(event: Omit<DistractionEvent, 'id' | 'created_at'> & { id?: string }): Promise<DistractionEvent> {
    try {
      // Phase 1: ID Sanitization
      const sanitizedEvent = this.sanitizeEvent(event);

      // Phase 2: Validation
      await this.validateEvent(sanitizedEvent);

      // Phase 3: Save with retry logic
      return await this.saveWithRetry(sanitizedEvent);
    } catch (error) {
      console.error('Failed to save distraction event:', error);

      // Phase 4: Fallback strategy
      return await this.fallbackSave(event);
    }
  }

  async saveDistractionEvents(events: Array<Omit<DistractionEvent, 'id' | 'created_at'> & { id?: string }>): Promise<DistractionEvent[]> {
    try {
      // Batch sanitization
      const sanitizedEvents = events.map(event => this.sanitizeEvent(event));

      // Try upsert using id only. Some database schemas may not have
      // 'client_generated_id' column — avoid including it in onConflict
      // which would cause PostgREST (PGRST204) errors.
      let data: any = null;
      let error: any = null;

      try {
        const res = await supabase
          .from('distraction_events')
          .upsert(sanitizedEvents, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select();

        data = res.data;
        error = res.error;
      } catch (err) {
        // Older PostgREST / Supabase setups may throw when the column isn't found
        // Fall back to inserting individually below
        const e: any = err;
        console.warn('Upsert failed, falling back to individual inserts:', e?.message || e);
        throw e;
      }

      if (error) {
        throw new Error(`Batch save failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Batch save failed, falling back to individual saves:', error);

      // Fallback to individual saves
      const results: DistractionEvent[] = [];
      for (const event of events) {
        try {
          const result = await this.saveDistractionEvent(event);
          results.push(result);
        } catch (individualError) {
          console.error('Individual save failed:', individualError);
          // Continue with other events
        }
      }

      return results;
    }
  }

  private sanitizeEvent(event: Omit<DistractionEvent, 'id' | 'created_at'> & { id?: string }): Omit<DistractionEvent, 'created_at'> {
    const sanitizedId = event.id ?
      NeuroIDGenerator.sanitizeDistractionID(event.id) :
      NeuroIDGenerator.generateUUIDv7();

    return {
      ...event,
      id: sanitizedId,
      client_generated_id: event.id || NeuroIDGenerator.generateDistractionID(),
      metadata: {
        ...event.metadata,
        sanitized_at: new Date().toISOString(),
        original_id: event.id !== sanitizedId ? event.id : undefined
      }
    };
  }

  private async validateEvent(event: Omit<DistractionEvent, 'created_at'>): Promise<void> {
    const errors: string[] = [];

    // Required field validation
    if (!event.user_id) errors.push('user_id is required');
    if (!event.session_id) errors.push('session_id is required');
    if (!event.distraction_type) errors.push('distraction_type is required');
    if (event.duration_ms !== undefined && event.duration_ms < 0) errors.push('duration_ms must be non-negative');

    // Type validation
    const validTypes = ['notification', 'app_switch', 'environment', 'internal'];
    if (!validTypes.includes(event.distraction_type)) {
      errors.push(`distraction_type must be one of: ${validTypes.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    }
  }

  private async saveWithRetry(event: Omit<DistractionEvent, 'created_at'>, maxRetries = 3): Promise<DistractionEvent> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('distraction_events')
          .insert([{
            ...event,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) {
          if (error.code === '22P02' && attempt < maxRetries) {
            // UUID error - regenerate ID and retry
            event.id = NeuroIDGenerator.generateUUIDv7();
            continue;
          }
          throw error;
        }

        if (!data) {
          throw new Error('No data returned from insert');
        }

        return data;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async fallbackSave(event: Omit<DistractionEvent, 'id' | 'created_at'> & { id?: string }): Promise<DistractionEvent> {
    console.warn('Using fallback save for distraction event');

    // Emergency fallback: Save to localStorage or temporary table
    const fallbackId = NeuroIDGenerator.generateUUIDv7();
    const fallbackEvent: DistractionEvent = {
      ...event,
      id: fallbackId,
      client_generated_id: event.id || fallbackId,
      created_at: new Date().toISOString()
    };

    // Save to localStorage as backup
    if (typeof window !== 'undefined') {
      const pendingEvents = JSON.parse(localStorage.getItem('pending_distraction_events') || '[]');
      pendingEvents.push(fallbackEvent);
      localStorage.setItem('pending_distraction_events', JSON.stringify(pendingEvents));
    }

    // Queue for background sync
    this.queueForRetry(fallbackEvent);

    return fallbackEvent;
  }

  private queueForRetry(event: DistractionEvent): void {
    this.retryQueue.push(async () => {
      try {
        await this.retrySave(event);
      } catch (error) {
        console.error('Retry failed for event:', event.id, error);
      }
    });

    if (!this.isProcessingQueue) {
      this.processRetryQueue();
    }
  }

  private async processRetryQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.retryQueue.length > 0) {
      const operation = this.retryQueue.shift();
      if (operation) {
        await operation();
        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessingQueue = false;
  }

  private async retrySave(event: DistractionEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('distraction_events')
        .upsert([event]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Retry save error:', error);
      throw error;
    }
  }
}
