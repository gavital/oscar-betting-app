// src/lib/logger.ts
type Level = 'debug' | 'info' | 'warn' | 'error';

const DEBUG_ENABLED =
  process.env.SCRAPE_DEBUG === '1' ||
  process.env.SCRAPE_DEBUG === 'true' ||
  process.env.NODE_ENV === 'development';

function prefix(level: Level) {
  const base = '[scrape]';
  switch (level) {
    case 'debug': return `${base}[debug]`;
    case 'info': return `${base}[info]`;
    case 'warn': return `${base}[warn]`;
    case 'error': return `${base}[error]`;
  }
}

export const logger = {
  debug: (...args: any[]) => { if (DEBUG_ENABLED) console.debug(prefix('debug'), ...args); },
  info:  (...args: any[]) => { console.info(prefix('info'), ...args); },
  warn:  (...args: any[]) => { console.warn(prefix('warn'), ...args); },
  error: (...args: any[]) => { console.error(prefix('error'), ...args); },
};