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
        shadowBlur: 4,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        lineWidth: 2,
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
  
  ctx.imageSmoothingEnabled = config.imageSmoothing;
  ctx.lineWidth = config.lineWidth;
  
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
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowBlur: config.shadowBlur,
    shadowOffsetX: config.shadowOffsetX,
    shadowOffsetY: config.shadowOffsetY,
  };
};
