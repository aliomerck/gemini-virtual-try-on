import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VirtualTryOn.css';

const VirtualTryOn = () => {
  const [personImage, setPersonImage] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);
  const [personPreview, setPersonPreview] = useState(null);
  const [garmentPreview, setGarmentPreview] = useState(null);
  const [size, setSize] = useState('m');
  const [detectedSize, setDetectedSize] = useState(null);
  const [dimensions, setDimensions] = useState({
    chest: '',
    waist: '',
    hips: '',
    shoulder: '',
    sleeve: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [avatarImages, setAvatarImages] = useState([]);
  const [garmentImages, setGarmentImages] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Size measurements based on the dimensions table (all garments are S on mannequin)
  const sizeMeasurements = {
    'xs': { chest: '80', waist: '64', hips: '90', shoulder: '36', sleeve: '61' },
    's': { chest: '84', waist: '68', hips: '94', shoulder: '37', sleeve: '62' },
    'm': { chest: '88', waist: '72', hips: '98', shoulder: '38', sleeve: '63' },
    'l': { chest: '92', waist: '76', hips: '102', shoulder: '39', sleeve: '64' }
  };

  // Initialize dimensions for medium size on mount
  useEffect(() => {
    const measurements = sizeMeasurements['m'];
    if (measurements) {
      setDimensions(measurements);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch available model images
  useEffect(() => {
    const fetchModelImages = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/model-images/list`);
        setAvatarImages(response.data.avatars || []);
        setGarmentImages(response.data.garments || []);
      } catch (err) {
        console.error('Error fetching model images:', err);
      }
    };
    fetchModelImages();
  }, [API_URL]);


  const handlePersonImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPersonImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPersonPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGarmentImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGarmentImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGarmentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = async (imageUrl) => {
    try {
      const response = await fetch(`${API_URL}${imageUrl}`);
      const blob = await response.blob();
      const file = new File([blob], 'avatar.jpg', { type: blob.type });
      setPersonImage(file);
      setPersonPreview(imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`);
    } catch (err) {
      console.error('Error loading avatar:', err);
    }
  };

  const handleGarmentClick = async (imageUrl) => {
    try {
      const response = await fetch(`${API_URL}${imageUrl}`);
      const blob = await response.blob();
      const file = new File([blob], 'garment.jpg', { type: blob.type });
      setGarmentImage(file);
      setGarmentPreview(imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`);
    } catch (err) {
      console.error('Error loading garment:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!personImage || !garmentImage) {
      setError('Please upload both person and garment images');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('personImage', personImage);
      formData.append('garmentImage', garmentImage);
      formData.append('size', size);
      formData.append('dimensions', JSON.stringify(dimensions));

      const response = await axios.post(
        `${API_URL}/api/virtual-try-on`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setResult(response.data);
        // Update detected size if provided by server (but keep user's selected size)
        if (response.data.detectedSize) {
          setDetectedSize(response.data.detectedSize);
          // Don't change the selected size - user chose it intentionally
        }
      } else {
        setError(response.data.error || 'Failed to generate virtual try-on');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        'Failed to connect to server. Make sure the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPersonImage(null);
    setGarmentImage(null);
    setPersonPreview(null);
    setGarmentPreview(null);
    setResult(null);
    setError(null);
    setDetectedSize(null);
    setSize('m');
    setDimensions({
      chest: '',
      waist: '',
      hips: '',
      shoulder: '',
      sleeve: ''
    });
  };

  const handleSizeChange = (newSize) => {
    setSize(newSize);
    const measurements = sizeMeasurements[newSize.toLowerCase()];
    if (measurements) {
      setDimensions(measurements);
    }
  };

  const handleDimensionChange = (field, value) => {
    setDimensions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const sizes = [
    { value: 'xs', label: 'XS' },
    { value: 's', label: 'S' },
    { value: 'm', label: 'M' },
    { value: 'l', label: 'L' },
  ];

  return (
    <div className="virtual-try-on">
      <div className="main-layout">
        <div className="left-section">
          <form onSubmit={handleSubmit} className="try-on-form">
            <div className="uploads-column">
              <div className="upload-section">
                <label htmlFor="person-image" className="upload-box">
                  <div className="upload-content">
                    {personPreview ? (
                      <img src={personPreview} alt="Person preview" className="preview-image" />
                    ) : (
                      <div className="upload-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Upload Person</span>
                      </div>
                    )}
                  </div>
                  <input
                    id="person-image"
                    type="file"
                    accept="image/*"
                    onChange={handlePersonImageChange}
                    className="file-input"
                  />
                </label>
              </div>

              <div className="upload-section">
                <label htmlFor="garment-image" className="upload-box">
                  <div className="upload-content">
                    {garmentPreview ? (
                      <img src={garmentPreview} alt="Garment preview" className="preview-image" />
                    ) : (
                      <div className="upload-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Upload Garment</span>
                      </div>
                    )}
                  </div>
                  <input
                    id="garment-image"
                    type="file"
                    accept="image/*"
                    onChange={handleGarmentImageChange}
                    className="file-input"
                  />
                </label>
              </div>
            </div>

            <div className="middle-section">
              <div className="thumbs-with-size">
                <div className="thumbs-section">
                  {avatarImages.length > 0 && (
                    <div className="model-images-grid">
                      {avatarImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="model-image-thumb"
                          onClick={() => handleAvatarClick(img.url)}
                          title={img.filename}
                        >
                          <img src={`${API_URL}${img.url}`} alt={img.filename} />
                        </div>
                      ))}
                    </div>
                  )}
                  {garmentImages.length > 0 && (
                    <div className="model-images-grid">
                      {garmentImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="model-image-thumb"
                          onClick={() => handleGarmentClick(img.url)}
                          title={img.filename}
                        >
                          <img src={`${API_URL}${img.url}`} alt={img.filename} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="size-and-buttons">
                  <div className="size-selector-wrapper">
                    <label className="size-label">
                      Size:
                      {detectedSize && (
                        <span className="detected-size-badge">
                          (Body: {detectedSize.toUpperCase()}, Selected: {size.toUpperCase()})
                        </span>
                      )}
                    </label>
                    <div className="size-selector">
                      {sizes.map((sizeOption) => (
                        <button
                          key={sizeOption.value}
                          type="button"
                          className={`size-button ${size === sizeOption.value ? 'active' : ''}`}
                          onClick={() => handleSizeChange(sizeOption.value)}
                        >
                          {sizeOption.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="dimensions-input">
                    <label className="dimensions-label">Dimensions (cm) - Auto-filled based on size:</label>
                    <div className="dimensions-grid">
                      <div className="dimension-item">
                        <label>Chest:</label>
                        <input
                          type="number"
                          step="0.1"
                          value={dimensions.chest}
                          onChange={(e) => handleDimensionChange('chest', e.target.value)}
                          placeholder="84.0"
                          readOnly
                        />
                      </div>
                      <div className="dimension-item">
                        <label>Waist:</label>
                        <input
                          type="number"
                          step="0.1"
                          value={dimensions.waist}
                          onChange={(e) => handleDimensionChange('waist', e.target.value)}
                          placeholder="68.0"
                          readOnly
                        />
                      </div>
                      <div className="dimension-item">
                        <label>Hips:</label>
                        <input
                          type="number"
                          step="0.1"
                          value={dimensions.hips}
                          onChange={(e) => handleDimensionChange('hips', e.target.value)}
                          placeholder="94.0"
                          readOnly
                        />
                      </div>
                      <div className="dimension-item">
                        <label>Shoulder:</label>
                        <input
                          type="number"
                          step="0.1"
                          value={dimensions.shoulder}
                          onChange={(e) => handleDimensionChange('shoulder', e.target.value)}
                          placeholder="37.0"
                          readOnly
                        />
                      </div>
                      <div className="dimension-item">
                        <label>Sleeve:</label>
                        <input
                          type="number"
                          step="0.1"
                          value={dimensions.sleeve}
                          onChange={(e) => handleDimensionChange('sleeve', e.target.value)}
                          placeholder="62.0"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="submit-button"
                      disabled={loading || !personImage || !garmentImage}
                    >
                      {loading ? 'Generating...' : 'Generate'}
                    </button>
                    {(personImage || garmentImage || result) && (
                      <button
                        type="button"
                        className="reset-button"
                        onClick={handleReset}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="right-panel">
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {result && result.image ? (
            <div className="result-section">
              <button
                className="download-button"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = result.image;
                  link.download = `virtual-try-on-${Date.now()}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                title="Download image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
              <img 
                src={result.image} 
                alt="Virtual try-on result" 
                className="result-image"
              />
            </div>
          ) : result && result.message ? (
            <div className="result-text">
              <p>{result.message}</p>
              {result.note && <p className="note">{result.note}</p>}
            </div>
          ) : (
            <div className="result-placeholder">
              <p>Generated image will appear here</p>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Generating your virtual try-on...</p>
        </div>
      )}
    </div>
  );
};

export default VirtualTryOn;

