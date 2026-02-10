// Simple logger utility
// For production, consider using winston or pino

const logLevel = process.env.LOG_LEVEL || 'info';

const log = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (level === 'error') {
    console.error(logMessage, ...args);
  } else if (level === 'warn') {
    console.warn(logMessage, ...args);
  } else if (level === 'info' && (logLevel === 'info' || logLevel === 'debug')) {
    console.log(logMessage, ...args);
  } else if (level === 'debug' && logLevel === 'debug') {
    console.log(logMessage, ...args);
  }
};

export const logger = {
  error: (message, ...args) => log('error', message, ...args),
  warn: (message, ...args) => log('warn', message, ...args),
  info: (message, ...args) => log('info', message, ...args),
  debug: (message, ...args) => log('debug', message, ...args),
};

export default logger;


