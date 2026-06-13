// Test script to verify egg-client loading
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
  const ec = require('@niceguy/egg-client');
  console.log('egg-client loaded OK');
  console.log('exports:', Object.keys(ec));
  console.log('has startCluster:', typeof ec.startCluster);
  console.log('Application name:', ec.Application.name);
  const appProto = Object.getPrototypeOf(ec.Application.prototype);
  const eggPath = Symbol.for('egg#eggPath');
  console.log('FrameworkApplication has eggPath:', eggPath in ec.Application.prototype);
  console.log('eggPath value:', ec.Application.prototype[eggPath]);
} catch (e) {
  console.log('FAILED:', e.message || e);
}