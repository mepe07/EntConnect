// Ficheiro: src/marketplace/marketplace-fotos.helpers.ts

import { BadRequestException } from '@nestjs/common';

/*
    Valida uma foto enviada para o Marketplace.

    Esta função fica fora do MarketplaceService porque é uma regra auxiliar:
    - valida o tipo do ficheiro;
    - valida o tamanho máximo;
    - não precisa de BD;
    - não precisa de serviços externos.

    Assim, o service principal fica mais focado na lógica do marketplace.
*/
export function validarFotoMarketplace(file: Express.Multer.File): void {
    // Tipos de imagem permitidos no Marketplace.
    const extensoesPermitidas = /image\/(jpeg|png|webp|jfif)/i;

    if (!extensoesPermitidas.test(file.mimetype)) {
        throw new BadRequestException(
            `Formato inválido. Extensões permitidas: .png, .jpg, .jpeg, .webp, .jfif. O teu ficheiro: ${file.mimetype}`,
        );
    }

    // Limite máximo de tamanho para evitar uploads demasiado pesados.
    const limiteMB = 10;
    const limiteBytes = limiteMB * 1024 * 1024;

    if (file.size > limiteBytes) {
        const tamanhoAtualMB = (file.size / (1024 * 1024)).toFixed(2);

        throw new BadRequestException(
            `A foto é demasiado pesada. Tamanho máximo: ${limiteMB}MB. Tamanho enviado: ${tamanhoAtualMB}MB.`,
        );
    }
} 