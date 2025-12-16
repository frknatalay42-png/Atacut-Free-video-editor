import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { app } from 'electron';
import { RecoveryData, Operation, Project } from '../../shared/types';
import { RECOVERY_SAVE_INTERVAL_MS } from '../../shared/constants';
import { createLogger } from '../utils/logger';

const logger = createLogger('RecoveryManager');

export class RecoveryManager {
  private recoveryDir: string;
  private recoveryFilePath: string;
  private operationHistoryPath: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private operations: Operation[] = [];
  private maxOperationHistory = 100;

  constructor() {
    this.recoveryDir = path.join(app.getPath('userData'), 'recovery');
    this.recoveryFilePath = path.join(this.recoveryDir, 'recovery.json');
    this.operationHistoryPath = path.join(this.recoveryDir, 'operations.json');
    this.initialize();
  }

  private async initialize() {
    try {
      await fs.mkdir(this.recoveryDir, { recursive: true });
      logger.info('Recovery directory initialized', { dir: this.recoveryDir });
    } catch (error) {
      logger.error('Failed to initialize recovery directory', error);
    }
  }

  /**
   * Start auto-save timer
   */
  startAutoSave(callback: () => Project | null) {
    this.stopAutoSave();
    
    this.autoSaveInterval = setInterval(async () => {
      try {
        const project = callback();
        if (project) {
          await this.saveRecoveryData(project);
          logger.info('Auto-save recovery data completed');
        }
      } catch (error) {
        logger.error('Auto-save recovery data failed', error);
      }
    }, RECOVERY_SAVE_INTERVAL_MS);

    logger.info('Auto-save started', { intervalMs: RECOVERY_SAVE_INTERVAL_MS });
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      logger.info('Auto-save stopped');
    }
  }

  /**
   * Save recovery data
   */
  async saveRecoveryData(project: Project): Promise<void> {
    try {
      const recoveryData: RecoveryData = {
        project,
        timestamp: Date.now(),
        operations: this.operations.slice(-50), // Save last 50 operations
      };

      await fs.writeFile(
        this.recoveryFilePath,
        JSON.stringify(recoveryData, null, 2),
        'utf-8'
      );
      
      logger.info('Recovery data saved');
    } catch (error) {
      logger.error('Failed to save recovery data', error);
      throw error;
    }
  }

  /**
   * Load recovery data
   */
  async loadRecoveryData(): Promise<RecoveryData | null> {
    try {
      if (!existsSync(this.recoveryFilePath)) {
        return null;
      }

      const data = await fs.readFile(this.recoveryFilePath, 'utf-8');
      const recoveryData: RecoveryData = JSON.parse(data);
      
      logger.info('Recovery data loaded', { timestamp: recoveryData.timestamp });
      return recoveryData;
    } catch (error) {
      logger.error('Failed to load recovery data', error);
      return null;
    }
  }

  /**
   * Check if recovery data exists
   */
  hasRecoveryData(): boolean {
    return existsSync(this.recoveryFilePath);
  }

  /**
   * Delete recovery data
   */
  async deleteRecoveryData(): Promise<void> {
    try {
      if (existsSync(this.recoveryFilePath)) {
        await fs.unlink(this.recoveryFilePath);
        logger.info('Recovery data deleted');
      }
    } catch (error) {
      logger.error('Failed to delete recovery data', error);
      throw error;
    }
  }

  /**
   * Add operation to history
   */
  addOperation(operation: Omit<Operation, 'id' | 'timestamp'>): void {
    const op: Operation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
    };

    this.operations.push(op);

    // Limit operation history size
    if (this.operations.length > this.maxOperationHistory) {
      this.operations = this.operations.slice(-this.maxOperationHistory);
    }

    // Save operations to disk periodically
    if (this.operations.length % 10 === 0) {
      this.saveOperationHistory();
    }
  }

  /**
   * Get operation history
   */
  getOperationHistory(): Operation[] {
    return [...this.operations];
  }

  /**
   * Clear operation history
   */
  clearOperationHistory(): void {
    this.operations = [];
    logger.info('Operation history cleared');
  }

  /**
   * Save operation history to disk
   */
  private async saveOperationHistory(): Promise<void> {
    try {
      await fs.writeFile(
        this.operationHistoryPath,
        JSON.stringify(this.operations, null, 2),
        'utf-8'
      );
    } catch (error) {
      logger.error('Failed to save operation history', error);
    }
  }

  /**
   * Load operation history from disk
   */
  async loadOperationHistory(): Promise<void> {
    try {
      if (existsSync(this.operationHistoryPath)) {
        const data = await fs.readFile(this.operationHistoryPath, 'utf-8');
        this.operations = JSON.parse(data);
        logger.info('Operation history loaded', { count: this.operations.length });
      }
    } catch (error) {
      logger.error('Failed to load operation history', error);
      this.operations = [];
    }
  }

  /**
   * Get undo/redo stack status
   */
  getUndoRedoStatus(): { canUndo: boolean; canRedo: boolean } {
    const undoableOps = this.operations.filter(op => op.canUndo);
    const redoableOps = this.operations.filter(op => op.canRedo);
    
    return {
      canUndo: undoableOps.length > 0,
      canRedo: redoableOps.length > 0,
    };
  }

  /**
   * Create backup of recovery data
   */
  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.recoveryDir, `recovery_backup_${timestamp}.json`);
      
      if (existsSync(this.recoveryFilePath)) {
        await fs.copyFile(this.recoveryFilePath, backupPath);
        logger.info('Recovery backup created', { path: backupPath });
        return backupPath;
      }
      
      throw new Error('No recovery data to backup');
    } catch (error) {
      logger.error('Failed to create recovery backup', error);
      throw error;
    }
  }
}

// Singleton instance
let recoveryManagerInstance: RecoveryManager | null = null;

export function getRecoveryManager(): RecoveryManager {
  if (!recoveryManagerInstance) {
    recoveryManagerInstance = new RecoveryManager();
  }
  return recoveryManagerInstance;
}

export default RecoveryManager;