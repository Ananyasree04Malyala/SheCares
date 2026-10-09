/**
 * Base Provider Interface for Wearable Integrations
 * 
 * Every mobile health provider (Health Connect, HealthKit, Fitbit, Garmin)
 * inherits from this base class, providing a standardized interface for:
 * - Permission definition
 * - Connection negotiation
 * - Payload normalization
 * - Deduplication hash generation
 */

'use strict';

const crypto = require('crypto');
const { METRIC_SPECS } = require('./wearableConstants');

class BaseWearableProvider {
  /**
   * @param {string} providerId
   * @param {string} name
   */
  constructor(providerId, name) {
    this.providerId = providerId;
    this.name = name;
  }

  /**
   * Return array of all metrics supported by this provider
   * @returns {string[]}
   */
  getSupportedMetrics() {
    throw new Error('getSupportedMetrics must be implemented by subclass');
  }

  /**
   * Filter and validate permitted metrics requested by user
   * @param {string[]} requested
   * @returns {string[]}
   */
  validatePermissions(requested = []) {
    const supported = this.getSupportedMetrics();
    return requested.filter(m => supported.includes(m));
  }

  /**
   * Normalize incoming provider-specific sample into standard SheCare format
   * @param {object} sample
   * @returns {object|null}
   */
  normalizeSample(sample) {
    if (!sample || !sample.metricType) return null;
    const spec = METRIC_SPECS[sample.metricType];
    if (!spec) return null;

    let val = Number(sample.value);
    if (isNaN(val)) return null;

    // Unit conversion if needed
    let unit = sample.unit || spec.unit;
    if (sample.metricType === 'SKIN_TEMPERATURE' && unit === 'fahrenheit') {
      val = (val - 32) * (5 / 9);
      unit = 'celsius';
    } else if (sample.metricType === 'DISTANCE' && unit === 'km') {
      val = val * 1000;
      unit = 'meters';
    } else if (sample.metricType === 'DISTANCE' && unit === 'miles') {
      val = val * 1609.34;
      unit = 'meters';
    } else if (sample.metricType === 'SLEEP_DURATION' && unit === 'minutes') {
      val = Number((val / 60).toFixed(2));
      unit = 'hours';
    } else if (sample.metricType === 'BODY_WEIGHT' && unit === 'lbs') {
      val = Number((val * 0.453592).toFixed(1));
      unit = 'kg';
    }

    // Physiological bounds validation
    if (val < spec.min || val > spec.max) {
      return null; // Discard unphysiological / garbage reading
    }

    const timestamp = sample.timestamp ? new Date(sample.timestamp) : new Date();
    if (isNaN(timestamp.getTime())) return null;

    const resolvedDevice = sample.device || sample.deviceName || this.name;
    return {
      metricType: sample.metricType,
      value: Number(val.toFixed(spec.displayDecimals)),
      unit: spec.unit,
      timestamp,
      source: sample.source || this.providerId.toLowerCase(),
      deviceName: resolvedDevice,
      metadata: sample.metadata || null
    };
  }

  /**
   * Generate deterministic SHA-256 hash for deduplication
   * Prevents duplicate samples even if synced repeatedly
   * @param {string} userId
   * @param {string} metricType
   * @param {Date|string} timestamp
   * @param {number} value
   * @returns {string}
   */
  static generateRecordHash(userId, metricType, timestamp, value) {
    const isoTime = new Date(timestamp).toISOString();
    const str = `${userId}:${metricType}:${isoTime}:${Number(value).toFixed(2)}`;
    return crypto.createHash('sha256').update(str).digest('hex');
  }
}

module.exports = BaseWearableProvider;
