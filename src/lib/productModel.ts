/**
 * Derive a quote-ready model code from a product slug.
 * bonke shows a model line under each card title (e.g. "BK8508/8508F"),
 * we mirror that with codes such as "X10-1-GANG" / "NDMP01" / "AI-DESKTOP-HUB-5S".
 */
const STOP = new Set([
  // generic product nouns
  "smart", "light", "switch", "switches", "panel", "module", "modules", "board",
  "socket", "sockets", "curtain", "fan", "dimmer", "control", "home", "hotel",
  "key", "card", "wireless", "multi", "mode", "with", "for", "and", "to",
  "type", "cct", "double", "pole", "din", "rail", "wall", "mount", "motor",
  "driver", "pir", "motion", "smoke", "alarm", "sensor", "sensors", "water",
  "gas", "door", "lock", "number", "plate", "room", "unit", "usb", "global",
  "in", "on", "off", "touch", "screen", "glass", "mechanical", "manual",
  "series", "version", "air", "conditioning", "knob", "intercom", "station",
  "outdoor", "indoor", "video", "doorbell", "signage", "display", "electronic",
  "wearable", "strip", "tube", "lamp", "bulb", "lightstrip",
  // protocol / brand words
  "tuya", "zigbee", "wifi", "wi", "fi", "ble", "mesh", "matter", "thread",
]);

export function modelFromSlug(slug: string): string {
  const parts = slug.split("-").filter(Boolean);
  const kept: string[] = [];
  for (const p of parts) {
    if (STOP.has(p)) break;
    kept.push(p);
  }
  const final = kept.length ? kept : parts.slice(0, 1);
  return final.join("-").toUpperCase();
}
