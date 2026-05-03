// Ficheiro: src/marketplace/helpers/marketplace-fotos.helpers.ts

import { BadRequestException } from '@nestjs/common';

/*
    Marketplace Fotos Helper

    Este helper centraliza a validação de imagens enviadas para o Marketplace.

    A função fica fora do MarketplaceService porque é uma regra pura:
    - não precisa de aceder à base de dados;
    - não precisa de serviços externos;
    - não depende de estado interno do service;
    - apenas valida o ficheiro recebido.

    O upload em si continua no MarketplaceService, porque depende do BlobsService,
    que é injetado pelo NestJS.
*/

/*
    Valida uma fotografia enviada para o Marketplace.

    Regras aplicadas:
    - o ficheiro tem de ser uma imagem com formato permitido;
    - o ficheiro não pode ultrapassar o limite máximo de tamanho.

    Esta validação acontece antes do upload para a cloud.
    Assim evitamos gastar recursos a enviar ficheiros inválidos para o Azure.
*/
export function validarFotoMarketplace(file: Express.Multer.File): void {
    /*
        Validação do tipo MIME.

        Aceitamos apenas formatos de imagem usados no Marketplace:
        - jpeg/jpg;
        - png;
        - webp;
        - jfif.
    */
    const extensoesPermitidas = /image\/(jpeg|png|webp|jfif)/i;

    if (!extensoesPermitidas.test(file.mimetype)) {
        throw new BadRequestException(
            `Formato inválido. Extensões permitidas: .png, .jpg, .jpeg, .webp, .jfif. O teu ficheiro: ${file.mimetype}`,
        );
    }

    /*
        Validação do tamanho máximo.

        O limite de 10MB protege a aplicação contra uploads demasiado pesados
        e ajuda a controlar armazenamento, tráfego e performance.
    */
    const limiteMB = 10;
    const limiteBytes = limiteMB * 1024 * 1024;

    if (file.size > limiteBytes) {
        const tamanhoAtualMB = (file.size / (1024 * 1024)).toFixed(2);

        throw new BadRequestException(
            `A foto é demasiado pesada. Tamanho máximo: ${limiteMB}MB. Tamanho enviado: ${tamanhoAtualMB}MB.`,
        );
    }
} 