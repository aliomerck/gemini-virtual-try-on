/**
 * Fit analysis module - percentage-based fit categorization
 */

/**
 * Calculate percentage delta between garment and body dimensions
 * @param {number} garment - Garment dimension
 * @param {number} body - Body dimension
 * @returns {number} Percentage difference
 */
function percentDelta(garment, body) {
  if (!body || body === 0) return 0;
  return ((garment - body) / body) * 100;
}

/**
 * Analyze fit between garment and body dimensions
 * @param {Object} garment - Garment dimensions
 * @param {Object} body - Body dimensions
 * @returns {Object} Fit analysis result
 */
function analyzeFit(garment, body) {
  const chestDeltaPercent = percentDelta(garment.chest, body.chest);
  const waistDeltaPercent = percentDelta(garment.waist, body.waist);
  const hipsDeltaPercent = percentDelta(garment.hips, body.hips);

  // Use chest as primary indicator, but consider average for edge cases
  const primaryDelta = chestDeltaPercent;
  const averageDelta = (chestDeltaPercent + waistDeltaPercent + hipsDeltaPercent) / 3;

  let category;
  let fitBehavior;

  // Categorize based on percentage differences - more extreme thresholds for better visualization
  if (primaryDelta < -15) {
    category = 'extremely_tight';
    fitBehavior = 'EXTREMELY TIGHT - garment is way too small, fabric severely stretched, very uncomfortable';
  } else if (primaryDelta < -8) {
    category = 'very_tight';
    fitBehavior = 'VERY TIGHT - garment is too small, fabric stretched taut, clearly too small';
  } else if (primaryDelta < -4) {
    category = 'tight';
    fitBehavior = 'tight and form-fitting - garment is slightly too small';
  } else if (primaryDelta <= 4) {
    category = 'well_fitted';
    fitBehavior = 'well-fitted and appropriate - garment fits nicely';
  } else if (primaryDelta <= 10) {
    category = 'slightly_loose';
    fitBehavior = 'slightly loose and relaxed - garment has some extra room';
  } else if (primaryDelta <= 18) {
    category = 'loose';
    fitBehavior = 'LOOSE - garment is noticeably oversized with visible extra fabric';
  } else {
    category = 'oversized';
    fitBehavior = 'VERY OVERSIZED - garment is way too large, very loose and baggy with excessive fabric';
  }

  const summary = `Chest: ${chestDeltaPercent.toFixed(1)}%, Waist: ${waistDeltaPercent.toFixed(1)}%, Hips: ${hipsDeltaPercent.toFixed(1)}%`;

  // Create detailed fit description
  let fitDetails;
  if (category === 'extremely_tight' || category === 'very_tight' || category === 'tight') {
    fitDetails = `The garment is ${Math.abs(chestDeltaPercent).toFixed(1)}% smaller in chest, ${Math.abs(waistDeltaPercent).toFixed(1)}% smaller in waist, and ${Math.abs(hipsDeltaPercent).toFixed(1)}% smaller in hips than the person's body.`;
  } else if (category === 'well_fitted') {
    fitDetails = `The garment dimensions match the person's body size closely (chest: ${chestDeltaPercent.toFixed(1)}%, waist: ${waistDeltaPercent.toFixed(1)}%, hips: ${hipsDeltaPercent.toFixed(1)}% difference).`;
  } else {
    fitDetails = `The garment is ${chestDeltaPercent.toFixed(1)}% larger in chest, ${waistDeltaPercent.toFixed(1)}% larger in waist, and ${hipsDeltaPercent.toFixed(1)}% larger in hips than the person's body.`;
  }

  return {
    category,
    fitBehavior,
    chestDeltaPercent,
    waistDeltaPercent,
    hipsDeltaPercent,
    summary,
    fitDetails
  };
}

module.exports = {
  analyzeFit,
  percentDelta
};

