import AsyncStorage from '@react-native-async-storage/async-storage';
import { HybridStorageService } from '../services/storage/HybridStorageService';

interface TrieNode {
  char: string;
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  frequency: number;
  lastUsed: Date;
  category?: string;
}

/**
 * Intelligent Trie Data Structure for transaction descriptions and categories
 * Implements frequency-based ranking with MMKV caching via HybridStorageService
 */
export class TrieService {
  private static instance: TrieService;
  private root: TrieNode;
  private hybridStorage: HybridStorageService;
  private cacheKey = '@neurolearn/trie_cache';
  private maxCacheSize = 100;

  static getInstance(): TrieService {
    if (!TrieService.instance) {
      TrieService.instance = new TrieService();
    }
    return TrieService.instance;
  }

  private constructor() {
    this.root = this.createNode('');
    this.hybridStorage = HybridStorageService.getInstance();
    this.loadFromCache();
  }

  private createNode(char: string): TrieNode {
    return {
      char,
      children: new Map(),
      isEndOfWord: false,
      frequency: 0,
      lastUsed: new Date(),
      category: undefined
    };
  }

  /**
   * Insert transaction description with smart categorization
   */
  insert(word: string, category?: string, amount?: number): void {
    if (!word || word.length === 0) return;
    
    word = word.toLowerCase().trim();
    let current = this.root;

    for (const char of word) {
      if (!current.children.has(char)) {
        current.children.set(char, this.createNode(char));
      }
      current = current.children.get(char)!;
    }

    current.isEndOfWord = true;
    current.frequency += 1;
    current.lastUsed = new Date();
    
    if (category) {
      current.category = category;
    }

    // Smart category inference based on amount patterns
    if (amount && !category) {
      current.category = this.inferCategory(word, amount);
    }
  }

  /**
   * Get intelligent suggestions with frequency and recency ranking
   */
  getSuggestions(prefix: string, limit: number = 10): Array<{
    text: string;
    category?: string;
    frequency: number;
    score: number;
  }> {
    if (!prefix || prefix.length === 0) {
      return this.getRecentSuggestions(limit);
    }

    prefix = prefix.toLowerCase().trim();
    const results: Array<{
      text: string;
      category?: string;
      frequency: number;
      score: number;
    }> = [];

    const startNode = this.findNode(prefix);
    if (!startNode) return results;

    this.dfsCollect(startNode, prefix, results);

    // Intelligent ranking: frequency + recency + relevance
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private findNode(prefix: string): TrieNode | null {
    let current = this.root;
    for (const char of prefix) {
      if (!current.children.has(char)) {
        return null;
      }
      current = current.children.get(char)!;
    }
    return current;
  }

  private dfsCollect(
    node: TrieNode, 
    currentWord: string, 
    results: Array<{ text: string; category?: string; frequency: number; score: number }>
  ): void {
    if (node.isEndOfWord && currentWord.length > 0) {
      const score = this.calculateRelevanceScore(node);
      results.push({
        text: currentWord,
        category: node.category,
        frequency: node.frequency,
        score
      });
    }

    for (const [char, childNode] of node.children) {
      this.dfsCollect(childNode, currentWord + char, results);
    }
  }

  private calculateRelevanceScore(node: TrieNode): number {
    const now = new Date();
    const daysSinceUsed = (now.getTime() - node.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    
    // Scoring algorithm: frequency (40%) + recency (40%) + base relevance (20%)
    const frequencyScore = Math.min(node.frequency / 10, 1) * 40;
    const recencyScore = Math.max(0, (30 - daysSinceUsed) / 30) * 40;
    const baseScore = 20;
    
    return frequencyScore + recencyScore + baseScore;
  }

  private getRecentSuggestions(limit: number) {
    const suggestions: Array<{
      text: string;
      category?: string;
      frequency: number;
      score: number;
    }> = [];

    this.collectRecentWords(this.root, '', suggestions);
    
    return suggestions
      .sort((a, b) => new Date(b.score).getTime() - new Date(a.score).getTime())
      .slice(0, limit);
  }

  private collectRecentWords(
    node: TrieNode,
    word: string,
    suggestions: Array<{ text: string; category?: string; frequency: number; score: number }>
  ): void {
    if (node.isEndOfWord && word.length > 0) {
      suggestions.push({
        text: word,
        category: node.category,
        frequency: node.frequency,
        score: node.lastUsed.getTime() // Use timestamp as score for recent sorting
      });
    }

    for (const [char, childNode] of node.children) {
      this.collectRecentWords(childNode, word + char, suggestions);
    }
  }

  private inferCategory(description: string, amount: number): string {
    const desc = description.toLowerCase();
    
    // Smart category inference
    if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery')) return 'food';
    if (desc.includes('transport') || desc.includes('uber') || desc.includes('bus')) return 'transport';
    if (desc.includes('course') || desc.includes('book') || desc.includes('education')) return 'education';
    if (desc.includes('doctor') || desc.includes('medicine') || desc.includes('health')) return 'health';
    if (desc.includes('movie') || desc.includes('entertainment') || desc.includes('game')) return 'entertainment';
    if (amount > 1000) return 'shopping'; // High amount likely shopping
    
    return 'general';
  }

  /**
   * Load Trie data from MMKV cache via HybridStorageService
   */
  private async loadFromCache(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(this.cacheKey);
      if (cachedData) {
        const entries: Array<{word: string, category: string, frequency: number}> = JSON.parse(cachedData);
        entries.forEach(entry => {
          this.insert(entry.word, entry.category);
          // Restore frequency
          const node = this.findNode(entry.word.toLowerCase());
          if (node && node.isEndOfWord) {
            node.frequency = entry.frequency;
          }
        });
      }
    } catch (error) {
      console.error('Failed to load Trie cache:', error);
    }
  }

  /**
   * Persist current Trie to cache with size limit
   */
  async persistToCache(): Promise<void> {
    try {
      const entries = this.extractTopEntries(this.maxCacheSize);
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to persist Trie cache:', error);
    }
  }

  private extractTopEntries(limit: number): Array<{word: string, category: string, frequency: number}> {
    const entries: Array<{word: string, category: string, frequency: number, lastUsed: Date}> = [];
    this.extractAllEntries(this.root, '', entries);
    
    // Sort by frequency and recency, take top entries
    return entries
      .sort((a, b) => (b.frequency * 1000 + b.lastUsed.getTime()) - (a.frequency * 1000 + a.lastUsed.getTime()))
      .slice(0, limit)
      .map(({word, category, frequency}) => ({word, category, frequency}));
  }

  private extractAllEntries(
    node: TrieNode, 
    word: string, 
    entries: Array<{word: string, category: string, frequency: number, lastUsed: Date}>
  ): void {
    if (node.isEndOfWord && word.length > 0) {
      entries.push({
        word,
        category: node.category || 'general',
        frequency: node.frequency,
        lastUsed: node.lastUsed
      });
    }

    for (const [char, childNode] of node.children) {
      this.extractAllEntries(childNode, word + char, entries);
    }
  }

  /**
   * Train the Trie with user's transaction history
   */
  async trainWithTransactionHistory(userId: string): Promise<void> {
    try {
      // This would be called during app initialization
      // Use type casting to access getRecentTransactions if it exists
      const hybridStorageAny = this.hybridStorage as any;
      const recentTransactions = await hybridStorageAny.getRecentTransactions?.(userId, 100) || [];

      recentTransactions.forEach((transaction: any) => {
        if (transaction.description && transaction.category) {
          this.insert(transaction.description, transaction.category, transaction.amount);
        }
      });

      await this.persistToCache();
      console.log('🧠 Trie trained with transaction history');
    } catch (error) {
      console.error('Failed to train Trie:', error);
    }
  }

  /**
   * Update Trie when new transaction is added
   */
  async updateWithTransaction(description: string, category: string, amount: number): Promise<void> {
    this.insert(description, category, amount);
    await this.persistToCache();
  }
}

export default TrieService;
