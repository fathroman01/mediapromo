export const logger = {
  log: (msg, data = '') => {
    console.log(
      `%c[INFO]%c ${msg}`, 
      'color: #0ea5e9; font-weight: bold;', 
      'color: inherit;', 
      data
    );
  },
  success: (msg, data = '') => {
    console.log(
      `%c[SUCCESS]%c ${msg}`, 
      'color: #10b981; font-weight: bold;', 
      'color: inherit;', 
      data
    );
  },
  warn: (msg, data = '') => {
    console.warn(
      `%c[WARN]%c ${msg}`, 
      'color: #f59e0b; font-weight: bold;', 
      'color: inherit;', 
      data
    );
  },
  error: (msg, error = '') => {
    console.error(
      `%c[ERROR]%c ${msg}`, 
      'color: #ef4444; font-weight: bold;', 
      'color: inherit;', 
      error
    );
  }
};
