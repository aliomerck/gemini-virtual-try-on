/**
 * Scaling utilities with safety clamps
 */

/**
 * Safely calculate scaling factor with min/max clamps
 * @param {number} base - Base dimension value
 * @param {number} target - Target dimension value
 * @param {number} min - Minimum scale factor (default: 0.9)
 * @param {number} max - Maximum scale factor (default: 1.2)
 * @returns {number} Clamped scaling factor
 */
function safeScale(base, target, min = 0.9, max = 1.2) {
  if (!base || !target || base === 0) {
    console.warn(`Invalid scaling values: base=${base}, target=${target}. Returning 1.0`);
    return 1.0;
  }

  let scale = target / base;

  if (scale < min) {
    console.warn(`Scale factor ${scale.toFixed(3)} clamped to minimum ${min}`);
    scale = min;
  } else if (scale > max) {
    console.warn(`Scale factor ${scale.toFixed(3)} clamped to maximum ${max}`);
    scale = max;
  }

  return scale;
}

/**
 * Calculate scaling factors for all dimensions
 * @param {Object} baseDimensions - Base dimensions
 * @param {Object} targetDimensions - Target dimensions
 * @param {Object} options - Options with min/max
 * @returns {Object} Scaling factors for each dimension
 */
function calculateScalingFactors(baseDimensions, targetDimensions, options = {}) {
  const { min = 0.9, max = 1.2 } = options;

  return {
    chest: safeScale(baseDimensions.chest, targetDimensions.chest, min, max),
    waist: safeScale(baseDimensions.waist, targetDimensions.waist, min, max),
    hips: safeScale(baseDimensions.hips, targetDimensions.hips, min, max),
    shoulder: safeScale(baseDimensions.shoulder, targetDimensions.shoulder, min, max),
    sleeve: safeScale(baseDimensions.sleeve, targetDimensions.sleeve, min, max)
  };
}

module.exports = {
  safeScale,
  calculateScalingFactors
};


