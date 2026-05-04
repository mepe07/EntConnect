import { BadRequestException } from '@nestjs/common';

/**
 * Executa a operacao validar foto marketplace.
 * @param file Dados recebidos para a operacao.
 * @returns Resultado da operacao.
 */

export function validarFotoMarketplace(file: Express.Multer.File): void {
  const extensoesPermitidas = /image\/(jpeg|png|webp|jfif)/i;

  if (!extensoesPermitidas.test(file.mimetype)) {
    throw new BadRequestException(
      `Formato inválido. Extensões permitidas: .png, .jpg, .jpeg, .webp, .jfif. O teu ficheiro: ${file.mimetype}`,
    );
  }

  const limiteMB = 10;
  const limiteBytes = limiteMB * 1024 * 1024;

  if (file.size > limiteBytes) {
    const tamanhoAtualMB = (file.size / (1024 * 1024)).toFixed(2);

    throw new BadRequestException(
      `A foto é demasiado pesada. Tamanho máximo: ${limiteMB}MB. Tamanho enviado: ${tamanhoAtualMB}MB.`,
    );
  }
}
