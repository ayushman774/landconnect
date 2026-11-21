import { app } from './app.js';
import { config } from './config.js';

const server = app.listen(config.PORT, '0.0.0.0', () => {
  console.info(`LandConnect API listening on port ${config.PORT}`);
});

function shutdown(signal: string) {
  console.info(`Received ${signal}; shutting down`);
  server.close(error => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
