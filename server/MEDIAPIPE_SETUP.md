# MediaPipe Setup Guide

This project uses MediaPipe for precise body keypoint detection. Follow these steps to set it up:

## Installation

1. Install dependencies:
```bash
cd server
npm install
```

The following packages are required:
- `@mediapipe/tasks-vision` - MediaPipe Vision Tasks
- `sharp` - Image processing
- `canvas` - Canvas API for Node.js (if needed)

## How It Works

### Architecture Flow:

1. **MediaPipe → Body Keypoints**
   - Extracts shoulder width, chest region width, hip width, height
   - Detects 33 body landmarks
   - Normalizes measurements

2. **Backend → Convert Keypoints to Size**
   - Uses geometric ratio model
   - Compares against dimension table (XS/S/M/L)
   - Calculates confidence score

3. **Gemini → Garment Measurement Extraction**
   - Analyzes garment image on mannequin
   - Extracts dimensions (assumed Size S)

4. **Backend → Compute Scaling Factors**
   - Calculates scaling from base (S) to target size
   - Applies safety clamps

5. **Gemini → Final VTON Generation**
   - Generates virtual try-on image
   - Uses structured prompt with all dimensions

## Troubleshooting

### MediaPipe Initialization Issues

If you encounter errors initializing MediaPipe:

1. **Check Internet Connection**: MediaPipe downloads models from CDN on first use
2. **Node.js Version**: Ensure you're using Node.js 16+ 
3. **WASM Support**: MediaPipe uses WebAssembly - ensure your environment supports it

### Fallback Behavior

If MediaPipe fails:
- System falls back to requested size
- Logs warning message
- Continues with garment processing

## Testing

Test the MediaPipe integration:
```bash
# The system will automatically use MediaPipe when processing images
# Check console logs for:
# - "🔍 Step 1: Extracting body keypoints with MediaPipe..."
# - "✓ Detected person size: X (confidence: Y%)"
```

## Performance Notes

- First initialization may take a few seconds (model download)
- Subsequent detections are fast (< 1 second)
- CPU mode is used as fallback if GPU unavailable


