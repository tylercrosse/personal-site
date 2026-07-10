import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;
export const SOCIAL_IMAGE_TYPE = "image/jpeg";
export const DEFAULT_SOCIAL_IMAGE = "/social/home.jpg";

export type SocialImageInput = {
  src?: string | ImageMetadata;
  alt: string;
  position?: string;
};

export type ResolvedSocialImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
  type: string;
};

export async function resolveSocialImage(
  input: SocialImageInput,
  site: URL | undefined,
): Promise<ResolvedSocialImage> {
  const src = input.src ?? DEFAULT_SOCIAL_IMAGE;

  // Core-page cards already exist at the final social dimensions. Absolute
  // URLs are also left alone because Astro cannot safely transform an unknown
  // remote asset at build time.
  if (typeof src === "string") {
    return {
      url: new URL(src, site).href,
      alt: input.alt,
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
      type: SOCIAL_IMAGE_TYPE,
    };
  }

  // Keep the image shown in the article optimized for the browser, but emit a
  // separate, crawler-friendly JPEG crop for link previews.
  const transformed = await getImage({
    src,
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    fit: "cover",
    position: input.position ?? "center",
    format: "jpg",
    quality: 88,
  });

  return {
    url: new URL(transformed.src, site).href,
    alt: input.alt,
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
    type: SOCIAL_IMAGE_TYPE,
  };
}
