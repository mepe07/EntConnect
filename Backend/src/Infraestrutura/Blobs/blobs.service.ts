import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import 'multer';
import { Express } from 'express';
/**
 * Servico responsavel pela logica de Blobs.
 */

@Injectable()
export class BlobsService {
  private readonly logger = new Logger(BlobsService.name);
  private blobServiceClient?: BlobServiceClient;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      this.logger.warn('Azure Storage Connection String nao encontrada.');
    } else {
      this.blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
    }
  }

  /**
   * Executa a operacao upload ficheiro.
   * @param containerName Dados recebidos para a operacao.
   * @param file Dados recebidos para a operacao.
   * @param nomePersonalizado Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async uploadFicheiro(
    containerName: string,
    file: Express.Multer.File,
    nomePersonalizado: string,
  ): Promise<string> {
    if (!this.blobServiceClient) {
      this.logger.error(`Upload rejeitado: Azure nao configurado container=${containerName}`);
    }

    if (!this.blobServiceClient)
      throw new InternalServerErrorException('Azure não configurado.');

    try {
      this.logger.log(
        `A carregar ficheiro para Azure container=${containerName} nome=${nomePersonalizado} mimetype=${file.mimetype} tamanho=${file.size}`,
      );
      const containerClient =
        this.blobServiceClient.getContainerClient(containerName);

      const extensao = file.originalname.split('.').pop();
      const caminhoNoBlob = `${nomePersonalizado}.${extensao}`;

      const blockBlobClient = containerClient.getBlockBlobClient(caminhoNoBlob);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });

      this.logger.log(
        `Ficheiro carregado para Azure container=${containerName} blob=${caminhoNoBlob}`,
      );
      return blockBlobClient.url;
    } catch (error) {
      this.logger.error(
        `Erro ao carregar ficheiro para Azure container=${containerName} nome=${nomePersonalizado}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        `Erro ao carregar para o contentor ${containerName}`,
      );
    }
  }

  /**
   * Executa a operacao listar ficheiros.
   * @param containerName Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async listarFicheiros(containerName: string): Promise<string[]> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException(
        'A ligação ao Azure não está configurada no servidor.',
      );
    }

    const containerClient =
      this.blobServiceClient.getContainerClient(containerName);
    const ficheiros: string[] = [];

    for await (const blob of containerClient.listBlobsFlat()) {
      ficheiros.push(blob.name);
    }
    return ficheiros;
  }

  /**
   * Executa a operacao ler ficheiro texto.
   * @param containerName Dados recebidos para a operacao.
   * @param nomeFicheiro Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async lerFicheiroTexto(
    containerName: string,
    nomeFicheiro: string,
  ): Promise<string> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException(
        'A ligação ao Azure não está configurada no servidor.',
      );
    }

    try {
      const containerClient =
        this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(nomeFicheiro);

      const buffer = await blockBlobClient.downloadToBuffer();
      return buffer.toString('latin1');
    } catch (error) {
      this.logger.error(
        `Erro ao ler ficheiro do Azure container=${containerName} nome=${nomeFicheiro}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        `Não foi possível ler o ficheiro "${nomeFicheiro}" no contentor "${containerName}". Confirma se os nomes estão corretos no Azure.`,
      );
    }
  }

  /**
   * Executa a operacao apagar ficheiro.
   * @param containerName Dados recebidos para a operacao.
   * @param nomeFicheiro Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async apagarFicheiro(
    containerName: string,
    nomeFicheiro: string,
  ): Promise<void> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException(
        'A ligação ao Azure não está configurada no servidor.',
      );
    }

    try {
      const containerClient =
        this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(nomeFicheiro);

      await blockBlobClient.deleteIfExists();
      this.logger.log(
        `Ficheiro apagado do Azure container=${containerName} nome=${nomeFicheiro}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao apagar ficheiro no Azure container=${containerName} nome=${nomeFicheiro}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Executa a operacao guardar fotos marketplace.
   * @param containerName Dados recebidos para a operacao.
   * @param nomePersonalizado Dados recebidos para a operacao.
   * @param file Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async guardarFotosMarketplace(
    containerName: string,
    nomePersonalizado: string,
    file: Express.Multer.File,
  ) {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('Azure não configurado.');
    }

    try {
      const containerClient =
        this.blobServiceClient.getContainerClient(containerName);
      const blobName = `${nomePersonalizado}`;

      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const exists = await blockBlobClient.exists();

      if (exists) {
        this.logger.warn(
          `Blob ja existe e sera substituido container=${containerName} blob=${blobName}`,
        );
      }

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
      });

      this.logger.log(
        `Foto marketplace guardada container=${containerName} blob=${blobName} mimetype=${file.mimetype} tamanho=${file.size}`,
      );
      return blockBlobClient.url;
    } catch (error) {
      this.logger.error(
        `Erro ao guardar foto marketplace container=${containerName} nome=${nomePersonalizado}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        `Erro ao guardar fotos do marketplace no contentor "${containerName}".`,
      );
    }
  }

  /**
   * Executa a operacao get ficheiro stream.
   * @param containerName Dados recebidos para a operacao.
   * @param nomeFicheiro Dados recebidos para a operacao.
   * @returns Resultado da operacao.
   */

  async getFicheiroStream(
    containerName: string,
    nomeFicheiro: string,
  ): Promise<NodeJS.ReadableStream> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException(
        'A ligação ao Azure não está configurada no servidor.',
      );
    }

    try {
      const containerClient =
        this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(nomeFicheiro);

      const exists = await blockBlobClient.exists();
      if (!exists) {
        throw new BadRequestException(
          `O ficheiro "${nomeFicheiro}" não foi encontrado no contentor "${containerName}".`,
        );
      }

      const downloadResponse = await blockBlobClient.download(0);

      if (!downloadResponse.readableStreamBody) {
        throw new InternalServerErrorException(
          'Erro a processar o stream do ficheiro no Azure.',
        );
      }

      return downloadResponse.readableStreamBody;
    } catch (error) {
      this.logger.error(
        `Erro ao obter stream do Azure container=${containerName} nome=${nomeFicheiro}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Não foi possível fazer download do ficheiro "${nomeFicheiro}".`,
      );
    }
  }
}
