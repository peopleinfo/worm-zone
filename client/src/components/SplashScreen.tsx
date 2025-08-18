import React from "react";

const SplashScreen: React.FC = () => {
  return (
    <>
      <div className="splash-screen">
        {/* Dark overlay */}
        <div className="splash-overlay" />
        
        {/* Content */}
        <div className="splash-content">
          {/* Logo with glow effect */}
          <div className="splash-logo-container">
            {/* Glow effect */}
            <div className="splash-glow-effect" />
            
            {/* Logo image */}
            <div className="splash-logo-image-container">
              <img
                src="https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=colorful%20snake%20game%20logo%20with%20neon%20effects%20and%20gaming%20aesthetic%20digital%20art&image_size=square"
                alt="Snake Zone Logo"
                className="splash-logo-image"
              />
            </div>
          </div>
          
          {/* Title */}
          <h1 className="splash-title">
            Snake Zone
          </h1>
          
          {/* Loading section */}
          <div className="splash-loading-section">
            {/* Progress bar */}
            <div className="splash-progress-bar-container">
              <div className="splash-progress-bar" />
            </div>
            
            {/* Loading text */}
            <p className="splash-loading-text">
              Loading...
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export { SplashScreen };
