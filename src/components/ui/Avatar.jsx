import React from 'react';

const Avatar = ({ 
  src, 
  alt, 
  initials, 
  size = 'md', 
  className = '',
  showFallback = true,
  status = null, // 'online', 'offline', 'away', 'busy'
  ring = false,
  ringColor = 'primary'
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-20 h-20 text-2xl',
    '2xl': 'w-24 h-24 text-3xl',
    '3xl': 'w-32 h-32 text-4xl'
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500'
  };

  const ringColors = {
    primary: 'ring-2 ring-primary ring-offset-2 ring-offset-background',
    secondary: 'ring-2 ring-secondary ring-offset-2 ring-offset-background',
    success: 'ring-2 ring-green-500 ring-offset-2 ring-offset-background',
    warning: 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-background',
    error: 'ring-2 ring-red-500 ring-offset-2 ring-offset-background'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const ringClass = ring ? ringColors[ringColor] || ringColors.primary : '';

  if (src && showFallback) {
    return (
      <div className={`relative ${sizeClass} rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg ${ringClass} ${className}`}>
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // If image fails to load, hide it to show initials
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="w-full h-full flex items-center justify-center text-white font-bold" style={{ display: 'none' }}>
          {initials}
        </div>
        
        {/* Status indicator */}
        {status && (
          <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[status]} border-2 border-white rounded-full shadow-sm`} />
        )}
      </div>
    );
  }

  if (src) {
    return (
      <div className={`relative ${sizeClass} rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg ${ringClass} ${className}`}>
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-full object-cover"
        />
        
        {/* Status indicator */}
        {status && (
          <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[status]} border-2 border-white rounded-full shadow-sm`} />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClass} rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg ${ringClass} ${className}`}>
      {initials || 'U'}
      
      {/* Status indicator */}
      {status && (
        <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[status]} border-2 border-white rounded-full shadow-sm`} />
      )}
    </div>
  );
};

export default Avatar;
