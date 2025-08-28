import React from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore, type QualityLevel } from "../../stores/settingsStore";

export const QualitySelector: React.FC = () => {
  const { t } = useTranslation("common");
  const quality = useSettingsStore((state) => state.quality);
  const setQuality = useSettingsStore((state) => state.setQuality);

  const qualityOptions: { value: QualityLevel; label: string }[] = [
    { value: "medium", label: t("settings.qualityMedium") },
    { value: "hd", label: t("settings.qualityHD") },
  ];

  return (
    <div className="setting-item">
      <label>{t("settings.quality")}</label>
      <div className="quality-selector">
        {qualityOptions.map((option) => (
          <button
            key={option.value}
            className={`quality-option ${quality === option.value ? "active" : ""}`}
            data-quality={option.value}
            onClick={() => setQuality(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
