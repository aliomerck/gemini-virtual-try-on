/**
 * MediaPipe Body Keypoint Detection Module
 * Extracts body keypoints for size detection
 */

const { FilesetResolver, PoseLandmarker } = require('@mediapipe/tasks-vision');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

let poseLandmarker = null;
let initialized = false;

/**
 * Initialize MediaPipe Pose Landmarker
 */
async function initializeMediaPipe() {
  if (initialized && poseLandmarker) {
    return poseLandmarker;
  }

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU"
      },
      runningMode: "IMAGE",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    initialized = true;
    console.log('✓ MediaPipe Pose Landmarker initialized');
    return poseLandmarker;
  } catch (error) {
    console.error('Error initializing MediaPipe:', error);
    // Fallback: try CPU mode
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
      );

      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "CPU"
        },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      initialized = true;
      console.log('✓ MediaPipe Pose Landmarker initialized (CPU mode)');
      return poseLandmarker;
    } catch (fallbackError) {
      console.error('Error initializing MediaPipe (CPU fallback):', fallbackError);
      throw new Error('Failed to initialize MediaPipe. Please check your internet connection and try again.');
    }
  }
}

/**
 * Convert image to format suitable for MediaPipe
 * @param {string} imagePath - Path to image file
 * @returns {Object} Image data for MediaPipe
 */
async function prepareImageForMediaPipe(imagePath) {
  try {
    // Read image and convert to buffer
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    // Convert to RGBA format that MediaPipe expects
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height
    };
  } catch (error) {
    console.error('Error preparing image for MediaPipe:', error);
    throw error;
  }
}

/**
 * Extract body keypoints from image using MediaPipe
 * @param {string} imagePath - Path to person image
 * @returns {Object} Keypoints data with measurements
 */
async function extractBodyKeypoints(imagePath) {
  try {
    // Initialize MediaPipe if not already done
    const landmarker = await initializeMediaPipe();
    
    // Prepare image
    const imageData = await prepareImageForMediaPipe(imagePath);
    
    // Create ImageData-like object for MediaPipe
    const image = {
      data: imageData.data,
      width: imageData.width,
      height: imageData.height
    };

    // Detect pose landmarks
    const result = landmarker.detect(image);
    
    if (!result || !result.landmarks || result.landmarks.length === 0) {
      throw new Error('No pose detected in image. Please ensure the person is clearly visible.');
    }

    const landmarks = result.landmarks[0]; // Get first (and only) pose
    
    // Extract key measurements from landmarks
    const keypoints = extractMeasurements(landmarks, imageData.width, imageData.height);
    
    return keypoints;
  } catch (error) {
    console.error('Error extracting body keypoints:', error);
    throw error;
  }
}

/**
 * Extract body measurements from MediaPipe landmarks
 * MediaPipe Pose landmarks indices:
 * - Left shoulder: 11, Right shoulder: 12
 * - Left hip: 23, Right hip: 24
 * - Left wrist: 15, Right wrist: 16
 * - Nose: 0
 * - Left/Right eye: 2, 5
 * - Left/Right ankle: 27, 28
 * 
 * @param {Array} landmarks - MediaPipe pose landmarks
 * @param {number} imageWidth - Image width
 * @param {number} imageHeight - Image height
 * @returns {Object} Extracted measurements
 */
function extractMeasurements(landmarks, imageWidth, imageHeight) {
  // Helper to calculate distance between two landmarks
  const distance = (landmark1, landmark2) => {
    const dx = (landmark1.x - landmark2.x) * imageWidth;
    const dy = (landmark1.y - landmark2.y) * imageHeight;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper to calculate pixel to cm ratio (using average human proportions)
  // Average human height in pixels vs known height (we'll use head-to-ankle as reference)
  const getHeightInPixels = () => {
    const nose = landmarks[0];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    
    // Use average of both ankles
    const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
    const heightPixels = Math.abs(nose.y - avgAnkleY) * imageHeight;
    return heightPixels;
  };

  // Extract key points
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const nose = landmarks[0];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  // Calculate measurements in pixels
  const shoulderWidthPixels = distance(leftShoulder, rightShoulder);
  const hipWidthPixels = distance(leftHip, rightHip);
  
  // Estimate chest width (between shoulders, slightly below)
  // Use shoulder width as base and estimate chest region
  const chestWidthPixels = shoulderWidthPixels * 1.1; // Chest is typically 10% wider than shoulders
  
  // Calculate height for normalization
  const heightPixels = getHeightInPixels();
  
  // Normalize measurements (convert to relative proportions)
  // These will be used with geometric ratios to estimate actual sizes
  const normalizedMeasurements = {
    shoulderWidth: shoulderWidthPixels / heightPixels,
    chestWidth: chestWidthPixels / heightPixels,
    hipWidth: hipWidthPixels / heightPixels,
    heightPixels: heightPixels,
    imageWidth: imageWidth,
    imageHeight: imageHeight,
    // Raw pixel measurements for reference
    rawShoulderWidth: shoulderWidthPixels,
    rawChestWidth: chestWidthPixels,
    rawHipWidth: hipWidthPixels
  };

  return normalizedMeasurements;
}

module.exports = {
  extractBodyKeypoints,
  initializeMediaPipe
};

