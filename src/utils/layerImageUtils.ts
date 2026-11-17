export function loadLayerImage(
  file: File,
  maxDimension = 400
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.width, image.height)
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Unable to process image layer."));
        return;
      }

      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const resizedImage = new Image();

      resizedImage.onload = () => {
        URL.revokeObjectURL(url);
        resolve(resizedImage);
      };

      resizedImage.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Unable to load this image layer."));
      };

      resizedImage.src = canvas.toDataURL("image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load this image layer."));
    };

    image.src = url;
  });
}