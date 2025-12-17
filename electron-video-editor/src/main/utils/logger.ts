import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

class Logger {
  private moduleName: string;
  private logDir: string;
  private logFile: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
    
    // Create logs directory in user data
    const userDataPath = app?.getPath('userData') || process.cwd();
    this.logDir = path.join(userDataPath, 'logs');
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Create log file with current date
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(this.logDir, `${date}.log`);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `${timestamp} [${level}] [${this.moduleName}] ${message}${dataStr}\n`;
  }

  private writeToFile(message: string) {
    try {
      fs.appendFileSync(this.logFile, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  public error(message: string, data?: any) {
    const formatted = this.formatMessage('ERROR', message, data);
    console.error(formatted);
    this.writeToFile(formatted);
  }

  public warn(message: string, data?: any) {
    const formatted = this.formatMessage('WARN', message, data);
    console.warn(formatted);
    this.writeToFile(formatted);
  }

  public info(message: string, data?: any) {
    const formatted = this.formatMessage('INFO', message, data);
    console.log(formatted);
    this.writeToFile(formatted);
  }

  public debug(message: string, data?: any) {
    const formatted = this.formatMessage('DEBUG', message, data);
    console.log(formatted);
    this.writeToFile(formatted);
  }
}

// Factory function to create loggers
export function createLogger(moduleName: string): Logger {
  return new Logger(moduleName);
}

// Export default logger for backward compatibility
export const logger = createLogger('Main');

export const logInfo = (message: string, data?: any) => logger.info(message, data);
export const logError = (message: string, data?: any) => logger.error(message, data);
export const logDebug = (message: string, data?: any) => logger.debug(message, data);
export const logWarn = (message: string, data?: any) => logger.warn(message, data);