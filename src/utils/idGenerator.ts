/**
 * NeuroIDGenerator - Modern ID Generation and Validation Utilities
 *
 * Provides UUID generation and legacy ID handling for the NeuroLearn app.
 * Ensures backward compatibility while migrating to modern UUID standards.
 */

export class NeuroIDGenerator {
  /**
   * Generate a new UUID v4 for logic nodes and other entities
   */
  static generateLogicNodeID(): string {
    // Use crypto.randomUUID if available (modern browsers/React Native)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate a legacy-style custom ID (for client-side temporary use only)
   */
  static generateCustomID(prefix: string = 'logic'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Check if an ID is a valid UUID format
   */
  static isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Check if an ID is a legacy format (starts with 'logic_')
   */
  static isLegacyID(id: string): boolean {
    return id.startsWith('logic_');
  }

  /**
   * Transform a node for database storage
   * Converts legacy IDs to UUIDs and preserves legacy ID in custom_id
   */
  static transformNodeForDatabase(node: any): any {
    const transformed = { ...node };

    // Ensure ID is proper UUID
    if (transformed.id && this.isLegacyID(transformed.id)) {
      transformed.custom_id = transformed.id; // Store legacy ID
      transformed.id = this.generateLogicNodeID(); // Generate new UUID
    }

    return transformed;
  }

  /**
   * Resolve a legacy ID to its corresponding UUID
   * This would typically query the database, but for now returns null
   * In practice, this should be implemented in the storage service
   */
  static resolveLegacyParentID(legacyId: string): string | null {
    // This is a placeholder - actual implementation should query database
    // to find the UUID for a given legacy custom_id
    return null;
  }
}

export default NeuroIDGenerator;
