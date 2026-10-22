// 产品三维分类法（功能 / 地区 / 协议）—— 与 产品上线方案_v1.md §1 对齐
// 2026-10-22 升级为精准 12 类（依据 nalitesmart 323 产品实测分布 + 用户确认）
export const PRODUCT_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "light-switch", label: "Light Switch" },
  { slug: "power-socket", label: "Power & Socket" },
  { slug: "gateway-control", label: "Gateway & Control" },
  { slug: "thermostat", label: "Thermostat" },
  { slug: "curtain", label: "Curtain" },
  { slug: "dimming", label: "Dimming" },
  { slug: "fan", label: "Fan" },
  { slug: "intercom", label: "Intercom" },
  { slug: "smart-lock", label: "Smart Lock" },
  { slug: "modular", label: "Modular" },
  { slug: "sensor", label: "Sensor" },
  { slug: "hotel-signage", label: "Hotel Signage" },
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
    "Switchlivo light switches span 1–4 gang, scene and dimmer-ready variants with India / UK-GCC / EU / US-AU wall boxes. Fully customizable for OEM & ODM branding, UI and protocols.",
  "power-socket":
    "Smart sockets, power strips and energy-monitoring modules with surge protection and global plug standards — ideal for OEM/ODM white-label programs.",
  "gateway-control":
    "Gateways, control panels and scene controllers that orchestrate lighting, curtain and climate into one-tap routines for smart home and hotel. Deep OEM/ODM customization of UI, logo and protocol stack.",
  thermostat:
    "Smart thermostats and knob controllers with adaptive scheduling and multi-protocol linkage, engineered for residential and hotel comfort automation.",
  curtain:
    "Tubular and chain curtain motors with quiet operation and scene linkage, built for smart-hotel and residential automation. OEM logo, housing and protocol options available.",
  dimming:
    "Leading-edge and trailing-edge dimmers and LED dimming modules with smooth, flicker-free control across Tuya, Zigbee and Matter ecosystems.",
  fan:
    "Fan speed controllers and fan-dim combo modules with adaptive airflow and silent drive, engineered for global voltage ranges.",
  intercom:
    "Indoor and outdoor intercom stations with HD video, access linkage and hotel-grade reliability — customizable for OEM/ODM projects.",
  "smart-lock":
    "Tuya / Zigbee / WiFi smart locks with 3D face, fingerprint and card access, built for residential and hotel doors with full OEM/ODM branding.",
  modular:
    "Modular 4/6/8 way systems that snap together into custom switch arrays — a flexible OEM/ODM platform for regional wall standards.",
  sensor:
    "PIR, door and ambient sensors that feed presence and security automation, with low-power RF and wired options for OEM/ODM.",
  "hotel-signage":
    "Hotel door number plates and room-status displays with doorbell, RCU linkage and low-voltage integration — purpose-built for smart-hotel OEM/ODM.",
};
