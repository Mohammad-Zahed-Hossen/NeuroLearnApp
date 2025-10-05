export class NeuroIDGenerator {
  // Fallback UUID generation for React Native
  private static fallbackUUID(): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${randomPart}-${Math.random().toString(36).substr(2, 4)}`;
  }

  // Generate UUID with fallback for React Native
  static generateUUIDv7(): string {
    try {
      // Lazy-require uuid to avoid runtime errors on environments where
      // crypto.getRandomValues is not available at module load time (React Native).
      // Using require keeps the import from executing during bundling in some setups.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { v4: uuidv4 } = require('uuid');
      return uuidv4();
    } catch (error) {
      // Fallback if crypto.getRandomValues is not available or require fails
      return this.fallbackUUID();
    }
  }

  // Validate and transform existing IDs
  static normalizeID(id: string): { id: string; isLegacy: boolean; originalId?: string } {
    if (this.isValidUUID(id)) {
      return { id, isLegacy: false };
    }

    if (id.startsWith('logic_') || id.startsWith('node_')) {
      const newUUID = this.generateUUIDv7();
      return {
        id: newUUID,
        isLegacy: true,
        originalId: id
      };
    }

    return { id: this.generateUUIDv7(), isLegacy: true, originalId: id };
  }

  // Enhanced distraction ID generator with client_generated_id format
  static generateDistractionID(type: string = 'distraction'): string {
    try {
      const uuid = this.generateUUIDv7();
      const timestamp = Date.now();
      return `${type}_${timestamp}_${uuid}`;
    } catch (error) {
      // Fallback format that matches database schema
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 10);
      return `client_generated_id_${timestamp}_${randomStr}`;
    }
  }

  // Sanitize distraction IDs with updated schema support
  static sanitizeDistractionID(rawId: string): string {
    if (this.isValidUUID(rawId)) {
      return rawId;
    }

    const sanitized = rawId
      .replace(/\|/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 100); // Increased length to accommodate new format

    if (sanitized.startsWith('client_generated_id_')) {
      return sanitized;
    }

    if (sanitized.startsWith('distraction_')) {
      const parts = sanitized.split('_');
      if (parts.length >= 3) {
        return `client_generated_id_${parts[1]}_${parts[2]}`;
      }
    }

    return `client_generated_id_${Date.now()}_${this.generateUUIDv7()}`;
  }

  static isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) || id.startsWith('client_generated_id_');
  }
}
