import React, { useEffect } from "react";
import { audioService } from "../services/audioService";

const SplashScreen: React.FC = () => {
  // Initialize audio on splash screen load
  useEffect(() => {
    // Try to start audio as early as possible
    audioService.handleUserInteraction();
  }, []);

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
                src="/snake-splash.jpeg"
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
