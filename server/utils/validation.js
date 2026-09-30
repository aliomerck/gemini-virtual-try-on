/**
 * Validation utilities for AI-generated dimensions
 */

const { GARMENT_DIM_TABLE, BODY_DIM_TABLE } = require('../config/sizing');

/**
 * Validate garment dimensions from AI analysis
 * @param {Object|null|undefined} aiDims - AI-generated dimensions
 * @param {Object} options - Validation options
 * @param {string} options.referenceSize - Reference size (typically 's')
 * @param {number} options.maxDeviationCm - Max deviation in cm (default: 10)
 * @param {number} options.maxDeviationPercent - Max deviation percentage (default: 0.2 = 20%)
 * @returns {Object} { dims: validated dimensions, usedFallback: boolean }
 */
function validateGarmentDimensions(aiDims, options = {}) {
  const { referenceSize = 's', maxDeviationCm = 10, maxDeviationPercent = 0.2 } = options;
  
  const ref = GARMENT_DIM_TABLE[referenceSize];
  if (!ref) {
    console.warn(`Invalid reference size: ${referenceSize}, using 's'`);
    return { dims: { ...GARMENT_DIM_TABLE['s'] }, usedFallback: true };
  }

  const safe = { ...ref };
  let usedFallback = false;

  // If no AI dimensions provided, use fallback
  if (!aiDims || typeof aiDims !== 'object') {
    return { dims: safe, usedFallback: true };
  }

  const keys = ['chest', 'waist', 'hips', 'shoulder', 'sleeve'];

  for (const key of keys) {
    const aiValue = aiDims[key];
    const refValue = ref[key];

    if (typeof aiValue === 'number' && typeof refValue === 'number') {
      const deviation = Math.abs(aiValue - refValue);
      const deviationPercent = deviation / refValue;

      // Check if deviation is within acceptable range
      if (deviation <= maxDeviationCm && deviationPercent <= maxDeviationPercent) {
        // Accept AI value
        safe[key] = aiValue;
      } else {
        // Deviation too large, use reference value
        usedFallback = true;
        console.warn(`AI dimension for ${key} (${aiValue}cm) deviates too much from reference (${refValue}cm). Using reference.`);
      }
    } else if (aiValue === null || aiValue === undefined) {
      // Missing value, keep reference (this is OK for optional fields like sleeve)
      if (key === 'shoulder' || key === 'sleeve') {
        // Optional fields, keep reference
      } else {
        // Required fields missing, use fallback
        usedFallback = true;
      }
    }
  }

  return { dims: safe, usedFallback };
}

/**
 * Validate body dimensions from AI analysis
 * @param {Object|null|undefined} aiDims - AI-generated dimensions
 * @param {string} estimatedSize - Estimated size from AI
 * @param {Object} options - Validation options
 * @returns {Object} { dims: validated dimensions, usedFallback: boolean }
 */
function validateBodyDimensions(aiDims, estimatedSize, options = {}) {
  const { maxDeviationCm = 10, maxDeviationPercent = 0.2 } = options;
  
  const ref = BODY_DIM_TABLE[estimatedSize] || BODY_DIM_TABLE['m'];
  const safe = { ...ref };
  let usedFallback = false;

  if (!aiDims || typeof aiDims !== 'object') {
    return { dims: safe, usedFallback: true };
  }

  const keys = ['chest', 'waist', 'hips', 'shoulder', 'sleeve'];

  for (const key of keys) {
    const aiValue = aiDims[key];
    const refValue = ref[key];

    if (typeof aiValue === 'number' && typeof refValue === 'number') {
      const deviation = Math.abs(aiValue - refValue);
      const deviationPercent = deviation / refValue;

      if (deviation <= maxDeviationCm && deviationPercent <= maxDeviationPercent) {
        safe[key] = aiValue;
      } else {
        usedFallback = true;
        console.warn(`AI body dimension for ${key} (${aiValue}cm) deviates too much from reference (${refValue}cm). Using reference.`);
      }
    }
  }

  return { dims: safe, usedFallback };
}

module.exports = {
  validateGarmentDimensions,
  validateBodyDimensions
};


