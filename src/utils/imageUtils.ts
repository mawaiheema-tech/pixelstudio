
export const imageToDataURL = (image: HTMLImageElement): string => {
  const canvas = document.createElement("canvas");

  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to process image.");
  }

  ctx.drawImage(image, 0, 0);

  return canvas.toDataURL("image/png");
};

export const dataURLToImage = (
  dataURL: string
): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to restore image."));

    image.src = dataURL;
  });
};
