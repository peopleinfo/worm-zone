import React from "react";

export const SplashScreen = () => {
  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  };

  const backgroundStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage:
      "url(https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=1200&fit=crop&crop=center)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  };

  const contentContainerStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: "2rem 1.5rem",
  };

  const logoContainerStyle: React.CSSProperties = {
    position: "relative",
    marginBottom: "1.5rem",
    animation: "bounce 1s infinite",
  };

  const logoImageContainerStyle: React.CSSProperties = {
    width: "8rem",
    height: "8rem",
    borderRadius: "1rem",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    border: "4px solid #67e8f9",
  };

  const logoImageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  const glowEffectStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "8rem",
    height: "8rem",
    backgroundColor: "#22d3ee",
    borderRadius: "1rem",
    filter: "blur(3rem)",
    opacity: 0.3,
    animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
  };

  const titleContainerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "3rem",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "2.25rem",
    fontWeight: "bold",
    color: "white",
    marginBottom: "0.5rem",
    letterSpacing: "0.1em",
    filter:
      "drop-shadow(0 4px 3px rgba(0, 0, 0, 0.07)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.06))",
  };

  const loadingSectionStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "5rem",
    left: 0,
    right: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.5rem",
  };

  const progressBarContainerStyle: React.CSSProperties = {
    width: "20rem",
    maxWidth: "90vw",
    height: "0.75rem",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: "9999px",
    overflow: "hidden",
  };

  const progressBarStyle: React.CSSProperties = {
    height: "100%",
    background: "linear-gradient(to right, #a855f7, #22d3ee)",
    borderRadius: "9999px",
    animation: "loading-bar 3s ease-in-out infinite",
  };

  const loadingTextStyle: React.CSSProperties = {
    color: "white",
    fontSize: "1.125rem",
    fontWeight: "500",
    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
    filter:
      "drop-shadow(0 4px 3px rgba(0, 0, 0, 0.07)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.06))",
  };

  return (
    <div style={{ ...containerStyle }}>
      {/* Background Image */}
      <div style={backgroundStyle}>
        {/* Overlay for better text visibility */}
        <div style={overlayStyle}></div>
      </div>

      {/* Content Container - Optimized for Portrait */}
      <div style={contentContainerStyle}>
        {/* Logo Container */}
        <div style={logoContainerStyle}>
          <div style={logoImageContainerStyle}>
            <img
              src="https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=200&h=200&fit=crop&crop=center"
              alt="Worms Zone Logo"
              style={logoImageStyle}
            />
          </div>

          {/* Glow Effect */}
          <div style={glowEffectStyle}></div>
        </div>

        {/* Game Title */}
        <div style={titleContainerStyle}>
          <h1 style={titleStyle}>Snake Zone</h1>
        </div>

        {/* Loading Section - Positioned at bottom */}
        <div style={loadingSectionStyle}>
          {/* Progress Bar */}
          <div style={progressBarContainerStyle}>
            <div style={progressBarStyle}></div>
          </div>

          {/* Loading Text */}
          <div style={loadingTextStyle}>Almost there...</div>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
          }
          50% {
            width: 70%;
          }
          100% {
            width: 95%;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(-25%);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};
