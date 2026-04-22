export const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = 'anonymous'; // Evita problemas de CORS se a imagem vier de outro domínio

    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Não foi possível obter o contexto do Canvas');
    }

    // Definimos o tamanho do canvas para o tamanho do corte desejado
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Desenhamos apenas a parte selecionada da imagem original no canvas
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

    // Convertemos o Canvas num Blob (ficheiro) para enviar para o servidor
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('O Canvas está vazio'));
                return;
            }
            resolve(blob);
        }, 'image/jpeg', 0.9); // 0.9 é a qualidade da imagem
    });
};