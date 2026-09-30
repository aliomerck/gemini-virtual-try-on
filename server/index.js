const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import modular components
const { getBodyDimensionsForSize, getGarmentDimensionsForSize, isValidSize, SIZE_LABELS } = require('./config/sizing');
const { validateGarmentDimensions } = require('./utils/validation');
const { calculateScalingFactors } = require('./utils/scaling');
const { analyzeFit } = require('./domain/fit');
const { buildVtonPrompt } = require('./prompts/vtonPrompt');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
    }
  }
});

// Initialize Gemini AI
let genAI;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey && apiKey.trim() !== '') {
  genAI = new GoogleGenerativeAI(apiKey.trim());
  console.log('✓ Gemini API initialized successfully');
} else {
  console.warn('⚠ Warning: GEMINI_API_KEY not set or empty. API will not work until key is provided.');
  console.warn('   Make sure server/.env exists with: GEMINI_API_KEY=your_key_here');
}

// Helper function to convert image to base64
function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

// Helper function to get mime type from file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

// Virtual Try-On endpoint
app.post('/api/virtual-try-on', upload.fields([
  { name: 'personImage', maxCount: 1 },
  { name: 'garmentImage', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured. Please set GEMINI_API_KEY in your .env file.' 
      });
    }

    if (!req.files || !req.files.personImage || !req.files.garmentImage) {
      return res.status(400).json({ 
        error: 'Both person image and garment image are required' 
      });
    }

    const personImagePath = req.files.personImage[0].path;
    const garmentImagePath = req.files.garmentImage[0].path;
    const requestedSize = req.body.size || 'm';

    // Convert images to base64
    const personImageBase64 = imageToBase64(personImagePath);
    const personMimeType = getMimeType(personImagePath);
    
    const garmentImageBase64 = imageToBase64(garmentImagePath);
    const garmentMimeType = getMimeType(garmentImagePath);

    // Size validation and normalization

    // STEP 1: Gemini → Body Size Detection
    console.log('🔍 Step 1: Analyzing FULL person body size with Gemini...');
    let detectedSize = requestedSize.toLowerCase();
    let detectionConfidence = 0.7;
    let detectionMethod = 'gemini';

    try {
      const detectionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const sizeDetectionPrompt = `You are a professional body measurement analyzer. Analyze the COMPLETE person in this image (head to toe) and determine their precise clothing size.

IMPORTANT: Analyze the FULL person from head to toe:
- Look at the chest/chest width relative to the overall body frame
- Look at the waist width relative to the chest
- Look at the hip width relative to the waist
- Consider the overall body frame size (small, medium, or large build)
- Analyze the person's complete body proportions, not just one part

Size guidelines (body measurements in cm):
- XS: Chest 80cm, Waist 64cm, Hips 90cm - Very petite, narrow frame
- S: Chest 84cm, Waist 68cm, Hips 94cm - Small frame, slim build
- M: Chest 88cm, Waist 72cm, Hips 98cm - Medium frame, average build
- L: Chest 92cm, Waist 76cm, Hips 102cm - Large frame, broader build

Respond with ONLY one word: xs, s, m, or l (use lowercase). Be precise and base your answer on careful visual analysis of the person's FULL body proportions.`;

      const sizeDetectionResult = await detectionModel.generateContent([
        sizeDetectionPrompt,
        {
          inlineData: {
            data: personImageBase64,
            mimeType: personMimeType
          }
        }
      ]);
      
      const detectedSizeText = sizeDetectionResult.response.text().toLowerCase().trim();
      if (isValidSize(detectedSizeText)) {
        detectedSize = detectedSizeText;
        console.log(`✓ Detected person size: ${detectedSize.toUpperCase()}`);
      } else {
        console.warn(`⚠ Invalid detected size: ${detectedSizeText}, using requested size: ${requestedSize}`);
        detectedSize = requestedSize.toLowerCase();
      }
    } catch (error) {
      console.warn('⚠ Body size detection failed, using requested size:', error.message);
      detectedSize = requestedSize.toLowerCase();
    }

    // Use detected size, but ensure it's valid
    if (!isValidSize(detectedSize)) {
      detectedSize = 'm'; // Default to medium
    }

    // Use user-selected size for the garment fit (not the detected size)
    let selectedSize = requestedSize.toLowerCase();
    if (!isValidSize(selectedSize)) {
      selectedSize = 'm'; // Default to medium
    }

    // STEP 2: Gemini → Garment Analysis (Dimensions + Fit Characteristics)
    console.log('👕 Step 2: Analyzing garment dimensions and fit characteristics with Gemini...');
    let garmentBaseDimensions = null;
    let garmentFitCharacteristics = null;
    let garmentValidation = { usedFallback: true }; // Track validation result for observability
    
    try {
      const analysisModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const dimensionAnalysisPrompt = `Analyze the garment on the mannequin in this image comprehensively. The garment is Size S on a standard mannequin.

Provide TWO analyses:

1. DIMENSIONS: Estimate key measurements in centimeters:
- Chest (circumference at the widest part of the chest)
- Waist (circumference at the narrowest part of the waist)
- Hips (circumference at the widest part of the hips)
- Shoulder (shoulder to shoulder width)
- Sleeve (sleeve length from shoulder to cuff, if applicable)
- Length (overall garment length from top to bottom)

2. FIT CHARACTERISTICS: Describe how this garment fits on the mannequin:
- Fit style (slim fit, regular fit, loose fit, oversized)
- How it drapes on the body
- Where it's tight or loose
- Overall silhouette and shape

Respond in JSON format only, like this:
{
  "dimensions": {"chest": 84, "waist": 68, "hips": 94, "shoulder": 37, "sleeve": 62, "length": 65},
  "fitCharacteristics": "slim fit, form-fitting around waist, slightly loose at chest, drapes naturally"
}

If a measurement is not applicable, use null. Be precise and base your estimates on the visible proportions in the image.`;

      const dimensionResult = await analysisModel.generateContent([
        dimensionAnalysisPrompt,
        {
          inlineData: {
            data: garmentImageBase64,
            mimeType: garmentMimeType
          }
        }
      ]);
      
      const dimensionText = dimensionResult.response.text().trim();
      // Try to extract JSON from the response
      const jsonMatch = dimensionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const analysisResult = JSON.parse(jsonMatch[0]);
          
          // Extract dimensions
          const rawDimensions = analysisResult.dimensions || analysisResult;
          garmentValidation = validateGarmentDimensions(rawDimensions, { referenceSize: 's' });
          garmentBaseDimensions = garmentValidation.dims;
          
          // Extract fit characteristics
          garmentFitCharacteristics = analysisResult.fitCharacteristics || null;
          
          console.log(`✓ Analyzed garment dimensions from image:`, garmentBaseDimensions);
          if (garmentFitCharacteristics) {
            console.log(`✓ Garment fit characteristics: ${garmentFitCharacteristics}`);
          }
          if (garmentValidation.usedFallback) {
            console.warn('⚠ Some AI dimensions were invalid, used fallback values');
          }
        } catch (parseError) {
          console.warn('Could not parse garment analysis:', parseError.message);
        }
      }
    } catch (error) {
      console.warn('Could not analyze garment dimensions:', error.message);
    }

    // Use analyzed dimensions if available, otherwise use table defaults for S size
    if (!garmentBaseDimensions || !garmentBaseDimensions.chest) {
      garmentBaseDimensions = getGarmentDimensionsForSize('s');
      garmentValidation = { usedFallback: true };
      console.log('Using default S size dimensions from table:', garmentBaseDimensions);
    }

    // Use analyzed garment dimensions as base (S size on mannequin)
    const baseDimensions = garmentBaseDimensions;

    // Get person's body dimensions (based on detected size) - using centralized sizing module
    const personBodyDimensions = getBodyDimensionsForSize(detectedSize);
    
    // Get selected garment dimensions - using centralized sizing module
    const targetDimensions = getGarmentDimensionsForSize(selectedSize);
    
    // Analyze fit using percentage-based analysis (replaces index-based logic)
    const fitAnalysis = analyzeFit(targetDimensions, personBodyDimensions);
    
    // STEP 3: Backend → Compute Scaling Factors
    console.log('⚖️ Step 3: Computing scaling factors...');
    const scaleFactors = calculateScalingFactors(baseDimensions, targetDimensions);

    // STEP 4: Gemini → Final VTON Generation
    console.log('🎨 Step 4: Generating virtual try-on with Gemini...');
    // Get the model - using gemini-3-pro-image-preview for image generation
    const modelName = 'gemini-3-pro-image-preview';
    const model = genAI.getGenerativeModel({ 
      model: modelName
    });

    // Logging and observability
    console.log(`\n=== VIRTUAL TRY-ON ANALYSIS ===`);
    console.log(`Model: ${modelName}`);
    console.log(`Person Body (${detectedSize.toUpperCase()}): Chest ${personBodyDimensions.chest}cm, Waist ${personBodyDimensions.waist}cm, Hips ${personBodyDimensions.hips}cm`);
    console.log(`Base Garment (S on mannequin): Chest ${baseDimensions.chest}cm, Waist ${baseDimensions.waist}cm, Hips ${baseDimensions.hips}cm`);
    console.log(`Target Garment (${selectedSize.toUpperCase()}): Chest ${targetDimensions.chest}cm, Waist ${targetDimensions.waist}cm, Hips ${targetDimensions.hips}cm`);
    console.log(`Fit Category: ${fitAnalysis.category}`);
    console.log(`Fit Summary: ${fitAnalysis.summary}`);
    console.log(`Scaling Factors: Chest ${scaleFactors.chest.toFixed(3)}, Waist ${scaleFactors.waist.toFixed(3)}, Hips ${scaleFactors.hips.toFixed(3)}`);
    console.log(`==============================\n`);
    
    // Build prompt using the prompt builder module
    const prompt = buildVtonPrompt({
      baseGarmentSize: 's',
      targetSize: selectedSize,
      baseDimensions,
      targetDimensions,
      bodyDimensions: personBodyDimensions,
      fit: fitAnalysis,
      garmentFitCharacteristics: garmentFitCharacteristics
    });

    // Prepare image parts for Gemini
    const imageParts = [
      {
        inlineData: {
          data: personImageBase64,
          mimeType: personMimeType
        }
      },
      {
        inlineData: {
          data: garmentImageBase64,
          mimeType: garmentMimeType
        }
      }
    ];

    // Generate content with image generation request
    console.log('Generating virtual try-on image...');
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;

    console.log('Response received, checking for image data...');

    // Check if response contains images
    let imageData = null;
    if (response.candidates && response.candidates[0] && response.candidates[0].content) {
      const content = response.candidates[0].content;
      
      console.log('Content parts:', content.parts ? content.parts.length : 0);
      
      // Try to extract image from response
      if (content.parts && content.parts.length > 0) {
        for (let i = 0; i < content.parts.length; i++) {
          const part = content.parts[i];
          console.log(`Part ${i} type:`, part.text ? 'text' : part.inlineData ? 'image' : 'other');
          
          if (part.inlineData) {
            imageData = part.inlineData.data;
            console.log('✓ Image data found in response');
            break;
          }
        }
      }
    }

    // Clean up uploaded files
    fs.unlinkSync(personImagePath);
    fs.unlinkSync(garmentImagePath);

    if (imageData) {
      // Return base64 image with observability data
      res.json({ 
        success: true,
        image: `data:image/png;base64,${imageData}`,
        size: selectedSize,
        detectedSize: detectedSize,
        selectedSize: selectedSize,
        fitCategory: fitAnalysis.category,
        fitSummary: fitAnalysis.summary,
        fitBehavior: fitAnalysis.fitBehavior,
        detectionConfidence: detectionConfidence,
        detectionMethod: detectionMethod,
        garmentFitCharacteristics: garmentFitCharacteristics,
        analysisQuality: {
          body: detectionMethod === 'gemini' ? 'good' : 'fallback',
          garment: garmentValidation.usedFallback ? 'fallback' : 'good'
        }
      });
    } else {
      // If no image in response, return text response (fallback)
      const text = response.text();
      console.warn('⚠ No image data in response, received text instead');
      console.warn('Response text:', text.substring(0, 200));
      
      res.json({ 
        success: false,
        message: text,
        note: `Model ${modelName} may not support image generation, or the API returned text instead of an image. Please verify your API key has access to image generation models.`,
        size: selectedSize,
        detectedSize: detectedSize,
        selectedSize: selectedSize,
        modelUsed: modelName
      });
    }

  } catch (error) {
    console.error('Error in virtual try-on:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Clean up files on error
    if (req.files) {
      if (req.files.personImage) {
        req.files.personImage.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
      }
      if (req.files.garmentImage) {
        req.files.garmentImage.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
      }
    }

    // Check if it's a model availability error
    let errorMessage = error.message;
    if (error.message && error.message.includes('model') || error.message.includes('not found')) {
      errorMessage = `Model may not be available or accessible. Error: ${error.message}. Please verify that 'gemini-3-pro-image-preview' is available for your API key.`;
    }

    res.status(500).json({ 
      error: 'Failed to generate virtual try-on',
      details: errorMessage,
      modelAttempted: 'gemini-3-pro-image-preview'
    });
  }
});

// Get list of available model images
app.get('/api/model-images/list', (req, res) => {
  try {
    const modelTryDir = path.join(__dirname, '../model_try');
    const garmentDir = path.join(__dirname, '../YAPAY ZEKA');
    
    const avatars = [];
    const garments = [];

    // Get avatar images from model_try folder
    if (fs.existsSync(modelTryDir)) {
    const files = fs.readdirSync(modelTryDir);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );

      avatars.push(...imageFiles
      .filter(file => /^avatar_/i.test(file))
      .map(file => ({
        filename: file,
        url: `/api/model-images/${file}`
        })));
    }

    // Get garment images from YAPAY ZEKA folder
    if (fs.existsSync(garmentDir)) {
      const files = fs.readdirSync(garmentDir);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|webp)$/i.test(file)
      );

      garments.push(...imageFiles.map(file => ({
        filename: file,
        url: `/api/garment-images/${file}`
      })));
    }

    res.json({ avatars, garments });
  } catch (error) {
    console.error('Error reading model images:', error);
    res.json({ avatars: [], garments: [] });
  }
});

// Serve static images from model_try folder (for avatars)
app.use('/api/model-images', express.static(path.join(__dirname, '../model_try')));
// Serve static images from YAPAY ZEKA folder (for garments)
app.use('/api/garment-images', express.static(path.join(__dirname, '../YAPAY ZEKA')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY 
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🔑 Gemini API configured: ${!!genAI}`);
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    console.log(`   API Key present: ${!!key}`);
    console.log(`   API Key value: ${key ? key.substring(0, 10) + '...' : 'NOT SET'}`);
  }
  console.log('');
});

