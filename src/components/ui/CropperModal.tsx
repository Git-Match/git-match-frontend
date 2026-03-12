import React, { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

interface CropperModalProps {
  imageSrc: string;
  onCancel: () => void;
  onCropComplete: (croppedImageBase64: string) => void;
}

export const CropperModal: React.FC<CropperModalProps> = ({
  imageSrc,
  onCancel,
  onCropComplete,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return '';
    }

    // Set canvas size to the cropped size to ensure 1:1 output
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Return Base64 string
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = async () => {
    if (croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        onCropComplete(croppedImage);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex h-[500px] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1c1b2e] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h3 className="font-bold text-white">Crop Image</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1} // Enforce 1:1 Aspect Ratio
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 bg-[#1c1b2e] p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg bg-white/10 py-2 text-white transition-colors hover:bg-white/20"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-linear-to-r from-purple-600 to-pink-600 py-2 font-bold text-white transition-all hover:shadow-lg"
            >
              Save & Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
