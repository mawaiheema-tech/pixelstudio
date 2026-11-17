const supportedImageTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export function isSupportedImage(file: File): boolean {
  return supportedImageTypes.includes(file.type);
}