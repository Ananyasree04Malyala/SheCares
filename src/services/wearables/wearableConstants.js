/**
 * SheCare Wearables Integration Constants & Standard Metric Specifications
 * 
 * Defines standard metrics, physiological bounds, conversion units,
 * and supported mobile health providers.
 */

'use strict';

const WEARABLE_PROVIDERS = {
  ANDROID_HEALTH_CONNECT: {
    id: 'ANDROID_HEALTH_CONNECT',
    name: 'Android Health Connect',
    platform: 'Android',
    description: 'Official Android health platform by Google connecting Wear OS, Pixel Watch, and Wearable apps',
    icon: 'fa-brands fa-android',
    supportedMetrics: [
      'HEART_RATE', 'RESTING_HEART_RATE', 'STEPS', 'DISTANCE',
      'CALORIES_ACTIVE', 'CALORIES_TOTAL', 'SLEEP_DURATION', 'SLEEP_SESSION',
      'SPO2', 'RESPIRATORY_RATE', 'SKIN_TEMPERATURE', 'BODY_WEIGHT',
      'EXERCISE_SESSION', 'HRV', 'MENSTRUAL_EVENT'
    ]
  },
  APPLE_HEALTH_KIT: {
    id: 'APPLE_HEALTH_KIT',
    name: 'Apple HealthKit',
    platform: 'iOS',
    description: 'Official Apple Health platform connecting Apple Watch Series and HealthKit sync',
    icon: 'fa-brands fa-apple',
    supportedMetrics: [
      'HEART_RATE', 'RESTING_HEART_RATE', 'HRV', 'STEPS', 'DISTANCE',
      'CALORIES_ACTIVE', 'SLEEP_DURATION', 'SLEEP_SESSION', 'SPO2',
      'RESPIRATORY_RATE', 'SKIN_TEMPERATURE', 'BODY_WEIGHT', 'EXERCISE_SESSION',
      'MENSTRUAL_EVENT'
    ]
  },
  SAMSUNG_HEALTH: {
    id: 'SAMSUNG_HEALTH',
    name: 'Samsung Health / Galaxy Watch',
    platform: 'Android / Wear OS',
    description: 'Samsung Health data platform for Galaxy Watch 4, 5, 6 and Active series',
    icon: 'fa-solid fa-mobile-screen-button',
    supportedMetrics: [
      'HEART_RATE', 'RESTING_HEART_RATE', 'HRV', 'STEPS', 'DISTANCE',
      'CALORIES_ACTIVE', 'SLEEP_DURATION', 'SPO2', 'SKIN_TEMPERATURE',
      'BODY_WEIGHT', 'EXERCISE_SESSION', 'BLOOD_PRESSURE_SYSTOLIC', 'BLOOD_PRESSURE_DIASTOLIC'
    ]
  },
  FITBIT: {
    id: 'FITBIT',
    name: 'Fitbit Web API',
    platform: 'Cloud OAuth2 / Mobile',
    description: 'Official Fitbit Web API & Google Fit companion ecosystem',
    icon: 'fa-solid fa-heart-pulse',
    supportedMetrics: [
      'HEART_RATE', 'RESTING_HEART_RATE', 'HRV', 'STEPS', 'DISTANCE',
      'CALORIES_ACTIVE', 'SLEEP_DURATION', 'SPO2', 'RESPIRATORY_RATE',
      'SKIN_TEMPERATURE', 'BODY_WEIGHT'
    ]
  },
  GARMIN: {
    id: 'GARMIN',
    name: 'Garmin Health Connect',
    platform: 'Garmin Connect IQ',
    description: 'Garmin Health companion ecosystem for Forerunner, Venu, and Fenix series',
    icon: 'fa-solid fa-person-running',
    supportedMetrics: [
      'HEART_RATE', 'RESTING_HEART_RATE', 'HRV', 'STEPS', 'DISTANCE',
      'CALORIES_ACTIVE', 'SLEEP_DURATION', 'SPO2', 'RESPIRATORY_RATE',
      'BODY_WEIGHT'
    ]
  },
  NOISE_FIT: {
    id: 'NOISE_FIT',
    name: 'NoiseFit Smartwatch',
    platform: 'NoiseFit Cloud & Bluetooth Sync',
    description: 'Direct health sync for Noise ColorFit, Pulse, Ultra, and Halo smartwatches without requiring any companion APK.',
    icon: 'fa-solid fa-stopwatch-20',
    supportedMetrics: [
      'HEART_RATE', 'RESTING_HEART_RATE', 'STEPS', 'DISTANCE',
      'CALORIES_ACTIVE', 'SLEEP_DURATION', 'SPO2', 'HRV', 'SKIN_TEMPERATURE'
    ]
  },
  WEAR_OS: {
    id: 'WEAR_OS',
    name: 'Wear OS Companion Bridge',
    platform: 'Wear OS Direct',
    description: 'Direct Wear OS Health Services provider for Fire-Boltt, Noise, boAt, and Amazfit',
    icon: 'fa-solid fa-stopwatch',
    supportedMetrics: [
      'HEART_RATE', 'RESTING_HEART_RATE', 'STEPS', 'DISTANCE',
      'CALORIES_ACTIVE', 'SLEEP_DURATION', 'SPO2', 'BODY_WEIGHT'
    ]
  },
  DEMO_SIMULATOR: {
    id: 'DEMO_SIMULATOR',
    name: 'Demo / Test Data Simulator',
    platform: 'Sandbox Mode',
    description: 'Generates clearly labeled simulated readings for testing when hardware is unavailable',
    icon: 'fa-solid fa-flask-vial',
    supportedMetrics: [
      'HEART_RATE', 'RESTING_HEART_RATE', 'HRV', 'SPO2', 'STEPS',
      'DISTANCE', 'CALORIES_ACTIVE', 'SLEEP_DURATION', 'SKIN_TEMPERATURE'
    ]
  }
};

const METRIC_SPECS = {
  HEART_RATE: {
    unit: 'bpm',
    label: 'Heart Rate',
    min: 30,
    max: 240,
    category: 'vital',
    displayDecimals: 0
  },
  RESTING_HEART_RATE: {
    unit: 'bpm',
    label: 'Resting Heart Rate',
    min: 35,
    max: 130,
    category: 'vital',
    displayDecimals: 0
  },
  HRV: {
    unit: 'ms',
    label: 'Heart Rate Variability (rMSSD)',
    min: 5,
    max: 250,
    category: 'vital',
    displayDecimals: 0
  },
  SPO2: {
    unit: '%',
    label: 'Blood Oxygen (SpO2)',
    min: 65,
    max: 100,
    category: 'vital',
    displayDecimals: 0
  },
  RESPIRATORY_RATE: {
    unit: 'breaths/min',
    label: 'Respiratory Rate',
    min: 6,
    max: 45,
    category: 'vital',
    displayDecimals: 0
  },
  SKIN_TEMPERATURE: {
    unit: 'celsius',
    label: 'Skin / Basal Body Temperature',
    min: 32.0,
    max: 42.0,
    category: 'vital',
    displayDecimals: 1
  },
  BLOOD_PRESSURE_SYSTOLIC: {
    unit: 'mmHg',
    label: 'Blood Pressure Systolic',
    min: 70,
    max: 260,
    category: 'vital',
    displayDecimals: 0
  },
  BLOOD_PRESSURE_DIASTOLIC: {
    unit: 'mmHg',
    label: 'Blood Pressure Diastolic',
    min: 40,
    max: 160,
    category: 'vital',
    displayDecimals: 0
  },
  STEPS: {
    unit: 'steps',
    label: 'Steps',
    min: 0,
    max: 150000,
    category: 'activity',
    displayDecimals: 0
  },
  DISTANCE: {
    unit: 'meters',
    label: 'Distance',
    min: 0,
    max: 100000,
    category: 'activity',
    displayDecimals: 1
  },
  CALORIES_ACTIVE: {
    unit: 'kcal',
    label: 'Active Calories',
    min: 0,
    max: 15000,
    category: 'activity',
    displayDecimals: 0
  },
  CALORIES_TOTAL: {
    unit: 'kcal',
    label: 'Total Calories',
    min: 0,
    max: 20000,
    category: 'activity',
    displayDecimals: 0
  },
  ACTIVE_MINUTES: {
    unit: 'minutes',
    label: 'Active Minutes',
    min: 0,
    max: 1440,
    category: 'activity',
    displayDecimals: 0
  },
  SLEEP_DURATION: {
    unit: 'hours',
    label: 'Sleep Duration',
    min: 0.1,
    max: 24.0,
    category: 'sleep',
    displayDecimals: 1
  },
  BODY_WEIGHT: {
    unit: 'kg',
    label: 'Body Weight',
    min: 25.0,
    max: 300.0,
    category: 'body',
    displayDecimals: 1
  }
};

module.exports = {
  WEARABLE_PROVIDERS,
  METRIC_SPECS
};
