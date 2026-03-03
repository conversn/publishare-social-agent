import React from 'react';

interface PhotoGalleryProps {
  photos?: any[];
  onPhotoSelect?: (photo: any) => void;
  className?: string;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  photos = [], 
  onPhotoSelect, 
  className = '' 
}) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {photos.map((photo, index) => (
        <div 
          key={index} 
          className="aspect-square bg-gray-100 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onPhotoSelect?.(photo)}
        >
          {/* Photo placeholder */}
        </div>
      ))}
    </div>
  );
};

export default PhotoGallery;

