/**
 * قالب مستوحى من فلاتر مجموعات اللابتوب (RAM، التخزين، GPU، المعالج، إلخ).
 * يمكن لصقه في حقل facetKeys أو استخدام زر "قالب لابتوب" في لوحة الأقسام.
 */
export const LAPTOP_STYLE_FACET_KEYS = [
  "cpu",
  "ram",
  "storage",
  "storageType",
  "screenSize",
  "gpu",
  "vram",
  "resolution",
  "touchscreen",
  "os",
] as const;

export const LAPTOP_STYLE_FACET_KEYS_JSON = JSON.stringify([...LAPTOP_STYLE_FACET_KEYS], null, 2);

/** Tablet / iPad — full spec template (matches `CATEGORY_FACETS.tablets`). */
export const TABLET_STYLE_FACET_KEYS = [
  "model",
  "cpu",
  "gpu",
  "ram",
  "vram",
  "storage",
  "storageType",
  "os",
  "screenSize",
  "resolution",
  "refreshRate",
  "panelType",
  "touchscreen",
  "displayFeatures",
  "biometricAuth",
  "cameraFront",
  "cameraRear",
  "stylusSupport",
  "keyboardAccessory",
  "cellularNetwork",
  "wifiStandard",
  "bluetoothVersion",
  "maxSpeedMbps",
  "connectorType",
  "portCount",
  "usbPortsPower",
  "batteryCapacityMah",
  "batteryLifeHours",
  "chargingPowerW",
  "speakerConfig",
  "voiceAssistantCompat",
  "weightKg",
  "dimensionsMm",
  "ipRating",
  "material",
  "colorVariant",
  "compatibilityList",
] as const;

export const TABLET_STYLE_FACET_KEYS_JSON = JSON.stringify([...TABLET_STYLE_FACET_KEYS], null, 2);
