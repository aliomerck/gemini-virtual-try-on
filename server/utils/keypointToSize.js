/**
 * Keypoint to Size Conversion Module
 * Converts MediaPipe body keypoints to clothing size (XS/S/M/L)
 * using geometric ratio models and dimension tables
 */

const { BODY_DIM_TABLE } = require('../config/sizing');

/**
 * Convert body keypoints to clothing size using geometric ratios
 * @param {Object} keypoints - Keypoints from MediaPipe
 * @returns {Object} { size: 'xs'|'s'|'m'|'l', confidence: number, measurements: Object }
 */
function keypointsToSize(keypoints) {
  const { shoulderWidth, chestWidth, hipWidth, heightPixels } = keypoints;

  // Average human proportions (based on anthropometric data)
  // These ratios help convert normalized measurements to actual cm
  const AVERAGE_HUMAN_HEIGHT_CM = 170; // Average adult height
  const PIXEL_TO_CM_RATIO = AVERAGE_HUMAN_HEIGHT_CM / heightPixels;

  // Estimate actual body measurements in cm using geometric ratios
  // These are estimates based on normalized proportions
  const estimatedChest = chestWidth * heightPixels * PIXEL_TO_CM_RATIO * 0.8; // Factor based on body proportions
  const estimatedWaist = estimatedChest * 0.75; // Waist is typically 75% of chest
  const estimatedHips = estimatedChest * 1.05; // Hips are typically 5% larger than chest
  const estimatedShoulder = shoulderWidth * heightPixels * PIXEL_TO_CM_RATIO * 0.9;

  // Calculate distances to each size in the dimension table
  const sizeDistances = {};
  
  for (const [size, dimensions] of Object.entries(BODY_DIM_TABLE)) {
    // Calculate Euclidean distance in measurement space
    const chestDiff = Math.abs(estimatedChest - dimensions.chest);
    const waistDiff = Math.abs(estimatedWaist - dimensions.waist);
    const hipsDiff = Math.abs(estimatedHips - dimensions.hips);
    const shoulderDiff = Math.abs(estimatedShoulder - (dimensions.shoulder || estimatedShoulder));

    // Weighted distance (chest and waist are most important)
    const distance = Math.sqrt(
      (chestDiff * 2) ** 2 +  // Chest weighted 2x
      (waistDiff * 2) ** 2 +  // Waist weighted 2x
      (hipsDiff * 1.5) ** 2 + // Hips weighted 1.5x
      (shoulderDiff * 1) ** 2 // Shoulder weighted 1x
    );

    sizeDistances[size] = distance;
  }

  // Find the size with minimum distance
  let bestSize = 'm'; // Default
  let minDistance = Infinity;

  for (const [size, distance] of Object.entries(sizeDistances)) {
    if (distance < minDistance) {
      minDistance = distance;
      bestSize = size;
    }
  }

  // Calculate confidence (inverse of normalized distance)
  // Normalize distance to 0-1 scale (assuming max reasonable distance is 20cm)
  const maxDistance = 20;
  const normalizedDistance = Math.min(minDistance / maxDistance, 1);
  const confidence = 1 - normalizedDistance;

  return {
    size: bestSize,
    confidence: Math.max(confidence, 0.1), // Minimum 10% confidence
    estimatedMeasurements: {
      chest: Math.round(estimatedChest),
      waist: Math.round(estimatedWaist),
      hips: Math.round(estimatedHips),
      shoulder: Math.round(estimatedShoulder)
    },
    sizeDistances: sizeDistances
  };
}

/**
 * Posture correction - adjust measurements based on pose
 * @param {Object} keypoints - Raw keypoints
 * @param {Object} measurements - Initial measurements
 * @returns {Object} Corrected measurements
 */
function applyPostureCorrection(keypoints, measurements) {
  // If person is not standing straight, adjust measurements
  // This is a simplified correction - can be enhanced with more pose analysis
  
  // Check if shoulders are level (simple posture check)
  const leftShoulderY = keypoints.landmarks?.[11]?.y || 0;
  const rightShoulderY = keypoints.landmarks?.[12]?.y || 0;
  const shoulderTilt = Math.abs(leftShoulderY - rightShoulderY);

  // If shoulders are significantly tilted, measurements might be skewed
  // For now, we'll use the measurements as-is, but this can be enhanced
  
  return measurements;
}

module.exports = {
  keypointsToSize,
  applyPostureCorrection
};


