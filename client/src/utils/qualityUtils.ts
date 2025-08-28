import type { QualityLevel } from "../stores/settingsStore";

export interface QualityConfig {
  imageSmoothing: boolean;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  lineWidth: number;
  detailLevel: number; // 1-3 scale for detail complexity
  antiAliasing: boolean;
}

export const getQualityConfig = (quality: QualityLevel): QualityConfig => {
  switch (quality) {
    case "low":
      return {
        imageSmoothing: false,
        shadowEnabled: false,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        lineWidth: 1,
        detailLevel: 1,
        antiAliasing: false,
      };
    case "medium":
      return {
        imageSmoothing: true,
        shadowEnabled: true,
        shadowBlur: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1,
        lineWidth: 2,
        detailLevel: 2,
        antiAliasing: true,
      };
    case "hd":
    default:
      return {
        imageSmoothing: true,
        shadowEnabled: true,
        shadowBlur: 7,
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        lineWidth: 4,
        detailLevel: 3,
        antiAliasing: true,
      };
  }
};

export const applyQualityToContext = (
  ctx: CanvasRenderingContext2D,
  quality: QualityLevel
): void => {
  const config = getQualityConfig(quality);
  
  // Enhanced image smoothing for HD quality
  ctx.imageSmoothingEnabled = config.imageSmoothing;
  
  if (config.antiAliasing) {
    ctx.imageSmoothingQuality = 'high';
  } else {
    ctx.imageSmoothingQuality = 'low';
  }
  
  // Set line properties for crisp rendering
  ctx.lineWidth = config.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Additional HD quality settings for crisp rendering
  if (quality === 'hd') {
    // Force high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Enhanced line rendering for HD
    ctx.miterLimit = 10;
    
    // @ts-ignore - Browser-specific optimizations
    if ('textRenderingOptimization' in ctx) {
      ctx.textRenderingOptimization = 'optimizeQuality';
    }
    
    // @ts-ignore - Webkit-specific optimizations
    if ('webkitImageSmoothingEnabled' in ctx) {
      ctx.webkitImageSmoothingEnabled = true;
    }
    
    // @ts-ignore - Mozilla-specific optimizations
    if ('mozImageSmoothingEnabled' in ctx) {
      ctx.mozImageSmoothingEnabled = true;
    }
  }
  
  // Reset shadow settings
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
};

export const shouldDrawShadow = (quality: QualityLevel): boolean => {
  return getQualityConfig(quality).shadowEnabled;
};

export const getShadowConfig = (quality: QualityLevel) => {
  const config = getQualityConfig(quality);
  return {
    shadowColor: "rgba(0, 0, 0, 0.7)",
    shadowBlur: config.shadowBlur,
    shadowOffsetX: config.shadowOffsetX,
    shadowOffsetY: config.shadowOffsetY,
  };
};
