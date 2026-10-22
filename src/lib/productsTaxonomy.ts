// 产品三维分类法（功能 / 地区 / 协议）—— 与 产品上线方案_v1.md §1 对齐
export const PRODUCT_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "light-switch", label: "Light Switch" },
  { slug: "curtain", label: "Curtain" },
  { slug: "dimming", label: "Dimming" },
  { slug: "fan", label: "Fan" },
  { slug: "power", label: "Power" },
  { slug: "scene", label: "Scene" },
  { slug: "modular", label: "Modular 4·6·8" },
  { slug: "all-in-one", label: "All-In-One Panel" },
];

export const PRODUCT_REGIONS: string[] = [
  "India Type",
  "UK-GCC Type",
  "EU Type",
  "US-AU Type",
];

export const PRODUCT_PROTOCOLS: string[] = [
  "Tuya",
  "Zigbee",
  "Matter",
  "WiFi",
  "BLE Mesh",
  "KNX",
  "RS485",
  "DALI",
];

// 各功能类目 SEO 导语（Switchlivo OEM/ODM 工厂口径）
export const PRODUCT_CATEGORY_INTRO: Record<string, string> = {
  "light-switch":
    "Switchlivo light switches cover 1–4 gang, scene and smart dimmer variants with India / UK-GCC / EU / US-AU wall boxes. Fully customizable for OEM & ODM branding, UI and protocols.",
  curtain:
    "Tubular and chain curtain motors with quiet operation and scene linkage, built for smart-hotel and residential automation. OEM logo, housing and protocol options available.",
  dimming:
    "Leading-edge and trailing-edge dimmers and LED dimming modules with smooth, flicker-free control across Tuya, Zigbee and Matter ecosystems.",
  fan:
    "Fan speed controllers and fan-dim combo modules with adaptive airflow and silent drive, engineered for global voltage ranges.",
  power:
    "Smart sockets, power strips and energy-monitoring modules with surge protection, ideal for OEM/ODM white-label programs.",
  scene:
    "Scene controllers and scenario panels that orchestrate lighting, curtain and climate into one-tap routines for smart home and hotel.",
  modular:
    "Modular 4/6/8 way systems that snap together into custom switch arrays — a flexible OEM/ODM platform for regional wall standards.",
  "all-in-one":
    "All-In-One touch panels unify control, scene and scheduling behind tempered glass, with deep OEM/ODM customization of UI, logo and protocol stack.",
};
