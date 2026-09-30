/**
 * Virtual Try-On prompt builder
 * Creates structured, consistent prompts for the AI model
 */

/**
 * Build the virtual try-on prompt
 * @param {Object} input - Prompt input data
 * @param {string} input.baseGarmentSize - Base garment size (e.g., 'S')
 * @param {string} input.targetSize - Target size (e.g., 'L')
 * @param {Object} input.baseDimensions - Base garment dimensions
 * @param {Object} input.targetDimensions - Target garment dimensions
 * @param {Object} input.bodyDimensions - Person's body dimensions
 * @param {Object} input.fit - Fit analysis result
 * @param {string} input.garmentFitCharacteristics - How the garment fits on mannequin
 * @returns {string} Complete prompt
 */
function buildVtonPrompt(input) {
  const {
    baseGarmentSize,
    targetSize,
    baseDimensions,
    targetDimensions,
    bodyDimensions,
    fit,
    garmentFitCharacteristics
  } = input;

  // Determine fit intensity based on category
  const isExtremelyTight = fit.category === 'extremely_tight' || fit.category === 'very_tight';
  const isTight = fit.category === 'tight';
  const isLoose = fit.category === 'loose' || fit.category === 'oversized';
  const isSlightlyLoose = fit.category === 'slightly_loose';
  const isWellFitted = fit.category === 'well_fitted';

  // Calculate regional fit differences
  const chestFit = fit.chestDeltaPercent;
  const waistFit = fit.waistDeltaPercent;
  const hipsFit = fit.hipsDeltaPercent;
  
  // Determine if garment is longer/shorter based on size scaling
  const sizeScale = targetDimensions.chest / baseDimensions.chest;
  const lengthAdjustment = sizeScale > 1 ? 'LONGER' : sizeScale < 1 ? 'SHORTER' : 'SAME LENGTH';

  return `Generate a photorealistic virtual try-on image in TWO STEPS:

STEP 1 - PREPARE THE COMPLETE PERSON:
- Extract the ENTIRE person from the first image (head to toe, full body visible)
- Place them on a PURE WHITE background (no shadows, no gradients, just solid white)
- Position them in a standard A-pose: arms slightly away from body forming an "A" shape, legs slightly apart, standing straight
- Ensure the COMPLETE person is visible - head, torso, arms, legs, everything
- Keep their exact appearance, facial features, body proportions, and pose
- The person must be shown in FULL, not cropped or partially visible

STEP 2 - ADD THE GARMENT WITH PRECISE FIT:
- Take the garment from the second image (Size ${baseGarmentSize.toUpperCase()} on mannequin)
- Base dimensions: Chest ${baseDimensions.chest}cm, Waist ${baseDimensions.waist}cm, Hips ${baseDimensions.hips}cm, Shoulder ${baseDimensions.shoulder}cm, Sleeve ${baseDimensions.sleeve}cm
- Scale it to Size ${targetSize.toUpperCase()} with target dimensions: Chest ${targetDimensions.chest}cm, Waist ${targetDimensions.waist}cm, Hips ${targetDimensions.hips}cm, Shoulder ${targetDimensions.shoulder}cm, Sleeve ${targetDimensions.sleeve}cm
- The person's body dimensions: Chest ${bodyDimensions.chest}cm, Waist ${bodyDimensions.waist}cm, Hips ${bodyDimensions.hips}cm, Shoulder ${bodyDimensions.shoulder}cm, Sleeve ${bodyDimensions.sleeve}cm

CRITICAL - DIMENSIONAL SCALING (ALL ASPECTS MUST CHANGE):
- CHEST REGION: Scale chest width from ${baseDimensions.chest}cm to ${targetDimensions.chest}cm (${chestFit > 0 ? '+' : ''}${chestFit.toFixed(1)}% vs person's body)
- WAIST REGION: Scale waist width from ${baseDimensions.waist}cm to ${targetDimensions.waist}cm (${waistFit > 0 ? '+' : ''}${waistFit.toFixed(1)}% vs person's body)
- HIPS REGION: Scale hips width from ${baseDimensions.hips}cm to ${targetDimensions.hips}cm (${hipsFit > 0 ? '+' : ''}${hipsFit.toFixed(1)}% vs person's body)
- SHOULDER WIDTH: Scale from ${baseDimensions.shoulder}cm to ${targetDimensions.shoulder}cm
- SLEEVE LENGTH: Scale from ${baseDimensions.sleeve}cm to ${targetDimensions.sleeve}cm
- GARMENT LENGTH: The garment should be ${lengthAdjustment.toLowerCase()} - scale the overall length proportionally (if size is larger, garment is longer; if smaller, garment is shorter)
- ALL DIMENSIONS must scale proportionally - width, length, and depth

CRITICAL - GARMENT PRESERVATION:
- You MUST preserve the EXACT design, shape, style, fabric texture, color, patterns, details, and visual appearance
- DO NOT change design elements (collar, cuffs, seams, pockets, buttons, zippers, patterns, etc.)
- ONLY scale dimensions - the garment should look identical but properly resized in ALL dimensions
${garmentFitCharacteristics ? `- Original garment fit on mannequin: ${garmentFitCharacteristics} - maintain this fit style but adjust for the new size` : ''}

REGIONAL FIT VISUALIZATION - SHOW DIFFERENT FIT IN DIFFERENT BODY REGIONS:

${isExtremelyTight ? `EXTREMELY TIGHT FIT (${fit.summary}):
CHEST REGION (${chestFit.toFixed(1)}% too small):
- Fabric stretched extremely tight across the chest area
- Visible tension lines and stress points around the chest
- Fabric pulled taut, struggling to contain the chest

WAIST REGION (${waistFit.toFixed(1)}% too small):
- Waist area is constricted and tight
- Fabric pulled tight around the waist, creating visible compression
- The waist area appears clearly too small

LENGTH & SLEEVES:
- Sleeves are MUCH TOO SHORT - expose wrists significantly (target: ${targetDimensions.sleeve}cm vs person needs: ${bodyDimensions.sleeve}cm)
- Overall garment length is TOO SHORT for the person's body
- Shoulder seams pulled way up, sitting well above natural shoulder line
- The garment appears clearly too small in all dimensions` : ''}

${isTight ? `TIGHT FIT (${fit.summary}):
CHEST REGION (${chestFit.toFixed(1)}% too small):
- Fabric stretched tight across the chest
- Some tension visible, fabric pulled taut

WAIST REGION (${waistFit.toFixed(1)}% too small):
- Waist area is tight with visible compression
- Fabric fits snugly around the waist

LENGTH & SLEEVES:
- Sleeves are SHORT - expose wrists (target: ${targetDimensions.sleeve}cm vs person needs: ${bodyDimensions.sleeve}cm)
- Overall garment length is SHORT for the person's body
- Shoulder seams raised above natural shoulder line` : ''}

${isWellFitted ? `WELL-FITTED (${fit.summary}):
CHEST REGION (${chestFit.toFixed(1)}% difference):
- Natural fit around chest with appropriate ease
- No excessive tightness or looseness

WAIST REGION (${waistFit.toFixed(1)}% difference):
- Waist fits comfortably with proper ease
- Natural draping around the waist

LENGTH & SLEEVES:
- Sleeves are PROPER LENGTH - reach wrists correctly (target: ${targetDimensions.sleeve}cm)
- Overall garment length is APPROPRIATE for the person's body
- Shoulder seams align with natural shoulder line` : ''}

${isSlightlyLoose ? `SLIGHTLY LOOSE (${fit.summary}):
CHEST REGION (${chestFit.toFixed(1)}% larger):
- Gentle extra room around the chest
- Soft fabric draping

WAIST REGION (${waistFit.toFixed(1)}% larger):
- Some extra room at the waist
- Gentle fabric folds and draping

LENGTH & SLEEVES:
- Sleeves are SLIGHTLY LONG - minor stacking at wrists (target: ${targetDimensions.sleeve}cm vs person needs: ${bodyDimensions.sleeve}cm)
- Overall garment length is SLIGHTLY LONG for the person's body
- Shoulder seams drop slightly below natural shoulder line` : ''}

${isLoose ? `LOOSE/OVERSIZED FIT (${fit.summary}):
CHEST REGION (${chestFit.toFixed(1)}% larger):
- Excessive room around the chest area
- Visible fabric draping and pooling
- The chest area appears clearly too large

WAIST REGION (${waistFit.toFixed(1)}% larger):
- Waist area is very loose with significant extra fabric
- Visible fabric pooling and gathering at the waist
- The waist area appears clearly oversized

LENGTH & SLEEVES:
- Sleeves are MUCH TOO LONG - heavy stacking and bunching at wrists (target: ${targetDimensions.sleeve}cm vs person needs: ${bodyDimensions.sleeve}cm)
- Overall garment length is MUCH TOO LONG for the person's body - garment hangs lower than it should
- Shoulder seams drop significantly below natural shoulder line (dropped shoulder look)
- The garment appears clearly oversized in ALL dimensions - width, length, and depth` : ''}

FINAL REQUIREMENTS:
- White background (pure white, no shadows)
- COMPLETE person visible from head to toe in A-pose (arms slightly away from body, legs slightly apart)
- Show the FULL person with the garment - do not crop or hide any part of the person
- High quality, 8k, professional retail lighting
- The garment must look like the exact same item from the second image, properly scaled in ALL dimensions
- Show realistic regional fit: chest area shows chest fit, waist area shows waist fit, length shows length fit
- Length must be proportional to size: larger size = longer garment, smaller size = shorter garment
- The garment should fit precisely according to the calculated dimensions and fit category
- Display the complete person wearing the complete garment - full body visible`;
}

module.exports = {
  buildVtonPrompt
};

