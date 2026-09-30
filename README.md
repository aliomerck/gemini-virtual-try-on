# Virtual Try-On System with Gemini 3 Pro Image Preview

A web-based virtual try-on system that uses Google's Gemini 3 Pro Image Preview API to generate realistic virtual try-on images. Users can upload a person's image and a garment image, select the desired size, and get an AI-generated result showing how the garment would look on the person.

## Features

- 📸 Upload person and garment images
- 👕 Select garment size (XS, S, M, L, XL, XXL)
- 🤖 AI-powered virtual try-on generation using Gemini 3 Pro
- 🎨 Modern, responsive UI
- ⚡ Real-time image preview
- 🔄 Easy reset and retry functionality

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Gemini API key (you'll add this later)

## Installation

1. **Clone or navigate to the project directory**

2. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

   This will install dependencies for:
   - Root project (concurrently for running both servers)
   - Backend server
   - Frontend client

## Configuration

1. **Set up the backend environment:**
   - Copy `server/.env.example` to `server/.env`
   - Open `server/.env` and add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     PORT=5000
     ```

2. **Configure the frontend API URL (optional):**
   - If your backend runs on a different port or URL, create `client/.env`:
     ```
     REACT_APP_API_URL=http://localhost:5000
     ```

## Running the Application

### Development Mode (Both Frontend and Backend)

Run both servers simultaneously:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

### Run Servers Separately

**Backend only:**
```bash
npm run server
```

**Frontend only:**
```bash
npm run client
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Upload a person's image (click on the first upload box)
3. Upload a garment image (click on the second upload box)
4. Select the desired garment size using the size buttons
5. Click "Generate Virtual Try-On"
6. Wait for the AI to process and generate the result
7. View the generated virtual try-on image

## Project Structure

```
gemini-virtual-try-on/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── VirtualTryOn.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                 # Express backend
│   ├── index.js            # Main server file
│   ├── uploads/            # Temporary image storage (auto-created)
│   ├── .env.example
│   └── package.json
├── package.json            # Root package.json
└── README.md
```

## API Endpoints

### POST `/api/virtual-try-on`
Generates a virtual try-on image.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `personImage`: Image file (required)
  - `garmentImage`: Image file (required)
  - `size`: String - one of: 'xs', 'small', 'medium', 'large', 'xl', 'xxl' (optional, defaults to 'medium')

**Response:**
```json
{
  "success": true,
  "image": "data:image/png;base64,...",
  "size": "medium"
}
```

### GET `/api/health`
Health check endpoint to verify server status and API key configuration.

## Technical Details

- **Frontend:** React 18 with modern CSS
- **Backend:** Express.js with Multer for file uploads
- **AI Model:** Google Gemini (configured for gemini-2.0-flash-exp, ready for gemini-3-pro-image-preview when available)
- **Image Processing:** Base64 encoding for API transmission

## Notes

- The system currently uses `gemini-2.0-flash-exp` model. When `gemini-3-pro-image-preview` becomes available, update the model name in `server/index.js` (line ~70).
- Uploaded images are temporarily stored and automatically deleted after processing.
- Maximum file size: 10MB per image
- Supported formats: JPEG, JPG, PNG, WEBP

## Troubleshooting

**Backend won't start:**
- Make sure port 5000 is not in use
- Check that `server/.env` exists and contains `GEMINI_API_KEY`

**Frontend can't connect to backend:**
- Verify backend is running on port 5000
- Check `REACT_APP_API_URL` in `client/.env` if you changed the backend port

**API errors:**
- Verify your Gemini API key is correct
- Check that you have access to the Gemini API
- Ensure the model name is correct for your API access level

## License

MIT

