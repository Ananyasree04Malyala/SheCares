/**
 * Specific Wearable Providers Implementation
 * - AndroidHealthConnectProvider (Google Health Connect API)
 * - AppleHealthKitProvider (Apple HealthKit on iOS)
 * - SamsungHealthProvider (Samsung Health SDK)
 * - FitbitProvider (Fitbit Web API)
 * - GarminProvider (Garmin Health API)
 * - WearOsProvider (Wear OS Health Services)
 * - DemoSimulatorProvider (Clearly labeled DEMO DATA mode)
 */

'use strict';

const BaseWearableProvider = require('./baseWearableProvider');
const { WEARABLE_PROVIDERS } = require('./wearableConstants');

class AndroidHealthConnectProvider extends BaseWearableProvider {
  constructor() {
    super('ANDROID_HEALTH_CONNECT', 'Android Health Connect');
  }

  getSupportedMetrics() {
    return WEARABLE_PROVIDERS.ANDROID_HEALTH_CONNECT.supportedMetrics;
  }
}

class AppleHealthKitProvider extends BaseWearableProvider {
  constructor() {
    super('APPLE_HEALTH_KIT', 'Apple HealthKit');
  }

  getSupportedMetrics() {
    return WEARABLE_PROVIDERS.APPLE_HEALTH_KIT.supportedMetrics;
  }
}

class SamsungHealthProvider extends BaseWearableProvider {
  constructor() {
    super('SAMSUNG_HEALTH', 'Samsung Health');
  }

  getSupportedMetrics() {
    return WEARABLE_PROVIDERS.SAMSUNG_HEALTH.supportedMetrics;
  }
}

class FitbitProvider extends BaseWearableProvider {
  constructor() {
    super('FITBIT', 'Fitbit');
  }

  getSupportedMetrics() {
    return WEARABLE_PROVIDERS.FITBIT.supportedMetrics;
  }
}

class GarminProvider extends BaseWearableProvider {
  constructor() {
    super('GARMIN', 'Garmin Health');
  }

  getSupportedMetrics() {
    return WEARABLE_PROVIDERS.GARMIN.supportedMetrics;
  }
}

class WearOsProvider extends BaseWearableProvider {
  constructor() {
    super('WEAR_OS', 'Wear OS');
  }

  getSupportedMetrics() {
    return WEARABLE_PROVIDERS.WEAR_OS.supportedMetrics;
  }
}

class DemoSimulatorProvider extends BaseWearableProvider {
  constructor() {
    super('DEMO_SIMULATOR', 'Demo / Test Data Simulator');
  }

  getSupportedMetrics() {
    return WEARABLE_PROVIDERS.DEMO_SIMULATOR.supportedMetrics;
  }

  /**
   * Generates clearly labeled demo / simulated readings for testing
   * Every record generated is marked with isDemo = true so it NEVER mixes with real data.
   * @param {string[]} metrics
   * @param {number} daysBack
   * @returns {object[]}
   */
  generateDemoReadings(metrics = ['HEART_RATE', 'STEPS', 'SLEEP_DURATION', 'SPO2'], daysBack = 1) {
    const samples = [];
    const now = new Date();

    for (let d = daysBack - 1; d >= 0; d--) {
      const baseDay = new Date(now.getTime() - d * 86400000);

      // Hourly heart rate samples
      if (metrics.includes('HEART_RATE')) {
        for (let h = 8; h <= 22; h += 2) {
          const sampleTime = new Date(baseDay);
          sampleTime.setHours(h, Math.floor(Math.random() * 59), 0, 0);
          samples.push({
            metricType: 'HEART_RATE',
            value: Math.floor(68 + Math.random() * 22),
            unit: 'bpm',
            timestamp: sampleTime.toISOString(),
            source: 'demo_simulator',
            deviceName: 'Simulated Wearable (DEMO)',
            metadata: { simulated: true, note: 'DEMO DATA — NOT REAL HEALTH DATA' }
          });
        }
      }

      // Resting heart rate
      if (metrics.includes('RESTING_HEART_RATE')) {
        const morning = new Date(baseDay);
        morning.setHours(6, 30, 0, 0);
        samples.push({
          metricType: 'RESTING_HEART_RATE',
          value: Math.floor(62 + Math.random() * 6),
          unit: 'bpm',
          timestamp: morning.toISOString(),
          source: 'demo_simulator',
          deviceName: 'Simulated Wearable (DEMO)',
          metadata: { simulated: true }
        });
      }

      // Daily Steps
      if (metrics.includes('STEPS')) {
        const stepTime = new Date(baseDay);
        stepTime.setHours(21, 0, 0, 0);
        samples.push({
          metricType: 'STEPS',
          value: Math.floor(4500 + Math.random() * 5000),
          unit: 'steps',
          timestamp: stepTime.toISOString(),
          source: 'demo_simulator',
          deviceName: 'Simulated Wearable (DEMO)',
          metadata: { simulated: true }
        });
      }

      // SpO2
      if (metrics.includes('SPO2')) {
        const spo2Time = new Date(baseDay);
        spo2Time.setHours(14, 0, 0, 0);
        samples.push({
          metricType: 'SPO2',
          value: Math.floor(97 + Math.random() * 3),
          unit: '%',
          timestamp: spo2Time.toISOString(),
          source: 'demo_simulator',
          deviceName: 'Simulated Wearable (DEMO)',
          metadata: { simulated: true }
        });
      }

      // Sleep
      if (metrics.includes('SLEEP_DURATION')) {
        const sleepTime = new Date(baseDay);
        sleepTime.setHours(7, 0, 0, 0);
        samples.push({
          metricType: 'SLEEP_DURATION',
          value: Number((6.8 + Math.random() * 1.6).toFixed(1)),
          unit: 'hours',
          timestamp: sleepTime.toISOString(),
          source: 'demo_simulator',
          deviceName: 'Simulated Wearable (DEMO)',
          metadata: { simulated: true, deepSleepHours: 1.8 }
        });
      }

      // Skin Temp
      if (metrics.includes('SKIN_TEMPERATURE')) {
        const tempTime = new Date(baseDay);
        tempTime.setHours(6, 0, 0, 0);
        samples.push({
          metricType: 'SKIN_TEMPERATURE',
          value: Number((36.4 + Math.random() * 0.4).toFixed(1)),
          unit: 'celsius',
          timestamp: tempTime.toISOString(),
          source: 'demo_simulator',
          deviceName: 'Simulated Wearable (DEMO)',
          metadata: { simulated: true }
        });
      }
    }

    return samples;
  }
}

class NoiseFitProvider extends BaseWearableProvider {
  constructor() {
    super('NOISE_FIT', 'NoiseFit Smartwatch');
  }

  getSupportedMetrics() {
    return WEARABLE_PROVIDERS.NOISE_FIT.supportedMetrics;
  }
}

// Registry map of all active provider instances
const PROVIDER_REGISTRY = {
  ANDROID_HEALTH_CONNECT: new AndroidHealthConnectProvider(),
  APPLE_HEALTH_KIT: new AppleHealthKitProvider(),
  SAMSUNG_HEALTH: new SamsungHealthProvider(),
  FITBIT: new FitbitProvider(),
  GARMIN: new GarminProvider(),
  NOISE_FIT: new NoiseFitProvider(),
  WEAR_OS: new WearOsProvider(),
  DEMO_SIMULATOR: new DemoSimulatorProvider()
};

function getProvider(providerId) {
  const p = PROVIDER_REGISTRY[providerId];
  if (!p) {
    throw new Error(`Unsupported wearable provider: ${providerId}`);
  }
  return p;
}

module.exports = {
  PROVIDER_REGISTRY,
  getProvider,
  AndroidHealthConnectProvider,
  AppleHealthKitProvider,
  SamsungHealthProvider,
  FitbitProvider,
  GarminProvider,
  WearOsProvider,
  DemoSimulatorProvider
};
