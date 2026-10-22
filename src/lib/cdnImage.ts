/**
 * CDN 图片版本号：R2 覆盖上传同名对象后，CDN 边缘缓存仍会回旧图。
 * 统一追加 ?v=N 作为缓存键的一部分（Cloudflare 默认缓存键含查询串），
 * 换图后只需递增此常量即可全站刷新。
 */
const CDN_IMAGE_VERSION = "2";

export function cdnImage(src: string | undefined | null): string {
  if (!src) return "";
  if (!src.includes("cdn.switchlivo.com")) return src;
  return src.includes("?") ? `${src}&v=${CDN_IMAGE_VERSION}` : `${src}?v=${CDN_IMAGE_VERSION}`;
}
