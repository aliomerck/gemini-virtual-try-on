# Quick Start Guide - Virtual Try-On System

## Step 1: Set Up Environment Variables

Create a `.env` file in the `server` folder:

1. Navigate to the `server` folder
2. Create a file named `.env` (no extension)
3. Add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

**To get a Gemini API key:**
- Go to https://makersuite.google.com/app/apikey
- Create a new API key
- Copy and paste it into the `.env` file

## Step 2: Install Dependencies (if not already done)

From the project root directory:

```bash
# Install root dependencies
npm install

# Install server dependencies (already done, but verify)
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

## Step 3: Run the System

### Option A: Run Both Servers Together (Recommended)

From the project root directory:

```bash
npm run dev
```

This will start:
- **Backend server** on `http://localhost:5000`
- **Frontend React app** on `http://localhost:3000`

### Option B: Run Servers Separately

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

## Step 4: Use the Application

1. Open your browser and go to: `http://localhost:3000`
2. Upload a person's image (click the first upload box)
3. Upload a garment image from the `YAPAY ZEKA` folder (click the second upload box)
4. Select the desired garment size (XS, S, M, L)
5. Click "Generate Virtual Try-On"
6. Wait for processing (MediaPipe will detect body size, then Gemini will generate the result)
7. View the generated virtual try-on image

## What Happens Behind the Scenes

1. **MediaPipe** extracts body keypoints from the person image
2. **Backend** converts keypoints to size (XS/S/M/L) using geometric ratios
3. **Gemini** analyzes the garment image to extract dimensions
4. **Backend** calculates scaling factors based on selected size
5. **Gemini** generates the final virtual try-on image

## Troubleshooting

### "GEMINI_API_KEY not set"
- Make sure `server/.env` exists and contains your API key
- Restart the server after creating/updating `.env`

### "MediaPipe initialization failed"
- Check your internet connection (MediaPipe downloads models on first use)
- The system will fall back to requested size if MediaPipe fails

### Port already in use
- Change `PORT=5000` to a different port in `server/.env`
- Update `REACT_APP_API_URL` in `client/.env` if needed

### Dependencies not installed
- Run `npm install` in both `server` and `client` folders
- Make sure Node.js version is 16 or higher

## System Architecture

```
User Uploads Images
    ↓
MediaPipe → Body Keypoints (shoulder, chest, hips, height)
    ↓
Backend → Convert to Size (XS/S/M/L) using geometric ratios
    ↓
Gemini → Extract Garment Dimensions (from mannequin image)
    ↓
Backend → Calculate Scaling Factors
    ↓
Gemini → Generate Virtual Try-On Image
    ↓
Display Result
```

## Next Steps

- Test with different person images
- Try different garment sizes to see fit variations
- Check console logs for detection confidence and analysis quality


