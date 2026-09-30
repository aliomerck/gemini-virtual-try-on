/**
 * Centralized sizing configuration module
 * All body and garment measurements live here
 */

const SIZE_LABELS = ['xs', 's', 'm', 'l'];

// Body dimensions table (standard body measurements for each size)
const BODY_DIM_TABLE = {
  'xs': { chest: 80, waist: 64, hips: 90, shoulder: 36, sleeve: 61 },
  's': { chest: 84, waist: 68, hips: 94, shoulder: 37, sleeve: 62 },
  'm': { chest: 88, waist: 72, hips: 98, shoulder: 38, sleeve: 63 },
  'l': { chest: 92, waist: 76, hips: 102, shoulder: 39, sleeve: 64 }
};

// Garment dimensions table (same as body for now, but can be different)
const GARMENT_DIM_TABLE = {
  'xs': { chest: 80, waist: 64, hips: 90, shoulder: 36, sleeve: 61 },
  's': { chest: 84, waist: 68, hips: 94, shoulder: 37, sleeve: 62 },
  'm': { chest: 88, waist: 72, hips: 98, shoulder: 38, sleeve: 63 },
  'l': { chest: 92, waist: 76, hips: 102, shoulder: 39, sleeve: 64 }
};

/**
 * Get body dimensions for a given size
 * @param {string} size - Size label ('xs', 's', 'm', 'l')
 * @returns {Object} Body dimensions
 */
function getBodyDimensionsForSize(size) {
  const normalizedSize = size.toLowerCase();
  if (!BODY_DIM_TABLE[normalizedSize]) {
    console.warn(`Invalid size: ${size}, defaulting to 'm'`);
    return BODY_DIM_TABLE['m'];
  }
  return { ...BODY_DIM_TABLE[normalizedSize] };
}

/**
 * Get garment dimensions for a given size
 * @param {string} size - Size label ('xs', 's', 'm', 'l')
 * @returns {Object} Garment dimensions
 */
function getGarmentDimensionsForSize(size) {
  const normalizedSize = size.toLowerCase();
  if (!GARMENT_DIM_TABLE[normalizedSize]) {
    console.warn(`Invalid size: ${size}, defaulting to 'm'`);
    return GARMENT_DIM_TABLE['m'];
  }
  return { ...GARMENT_DIM_TABLE[normalizedSize] };
}

/**
 * Validate if a size label is valid
 * @param {string} size - Size label to validate
 * @returns {boolean}
 */
function isValidSize(size) {
  return SIZE_LABELS.includes(size.toLowerCase());
}

module.exports = {
  SIZE_LABELS,
  BODY_DIM_TABLE,
  GARMENT_DIM_TABLE,
  getBodyDimensionsForSize,
  getGarmentDimensionsForSize,
  isValidSize
};


