/**
 * Creates an image blob from the selected crop area.
 *
 * @param imageSrc Original image source.
 * @param pixelCrop Crop area returned by the cropper.
 * @returns Cropped image as a JPEG blob.
 */
export const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Nao foi possivel obter o contexto do Canvas');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('O Canvas esta vazio'));
                return;
            }

            resolve(blob);
        }, 'image/jpeg', 0.9);
    });
};
