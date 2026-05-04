import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import { BlobsService } from './blobs.service';

describe('BlobsService', () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  const criarServiceComCliente = (blobServiceClient: any) => {
    const service = new BlobsService();
    (service as any).blobServiceClient = blobServiceClient;
    return service;
  };

  const criarFicheiro = () =>
    ({
      originalname: 'foto.png',
      mimetype: 'image/png',
      buffer: Buffer.from('conteudo'),
    }) as Express.Multer.File;

  it('deve rejeitar upload quando Azure não está configurado', async () => {
    const service = new BlobsService();
    (service as any).blobServiceClient = undefined;

    await expect(
      service.uploadFicheiro('eventos', criarFicheiro(), 'foto'),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('deve fazer upload de ficheiro e devolver URL', async () => {
    const uploadData = jest.fn().mockResolvedValue(undefined);
    const blockBlobClient = {
      uploadData,
      url: 'https://blob.test/eventos/foto.png',
    };
    const containerClient = {
      getBlockBlobClient: jest.fn().mockReturnValue(blockBlobClient),
    };
    const service = criarServiceComCliente({
      getContainerClient: jest.fn().mockReturnValue(containerClient),
    });

    await expect(
      service.uploadFicheiro('eventos', criarFicheiro(), 'foto'),
    ).resolves.toBe('https://blob.test/eventos/foto.png');
    expect(containerClient.getBlockBlobClient).toHaveBeenCalledWith('foto.png');
    expect(uploadData).toHaveBeenCalledWith(Buffer.from('conteudo'), {
      blobHTTPHeaders: { blobContentType: 'image/png' },
    });
  });

  it('deve listar ficheiros de um contentor', async () => {
    async function* listBlobsFlat() {
      yield { name: 'a.csv' };
      yield { name: 'b.csv' };
    }
    const service = criarServiceComCliente({
      getContainerClient: jest.fn().mockReturnValue({ listBlobsFlat }),
    });

    await expect(service.listarFicheiros('templates')).resolves.toEqual([
      'a.csv',
      'b.csv',
    ]);
  });

  it('deve ler ficheiro como texto latin1', async () => {
    const blockBlobClient = {
      downloadToBuffer: jest
        .fn()
        .mockResolvedValue(Buffer.from('olá', 'latin1')),
    };
    const service = criarServiceComCliente({
      getContainerClient: jest.fn().mockReturnValue({
        getBlockBlobClient: jest.fn().mockReturnValue(blockBlobClient),
      }),
    });

    await expect(service.lerFicheiroTexto('templates', 'a.csv')).resolves.toBe(
      'olá',
    );
  });

  it('deve apagar ficheiro sem propagar erro de Azure', async () => {
    const deleteIfExists = jest.fn().mockRejectedValue(new Error('azure'));
    const service = criarServiceComCliente({
      getContainerClient: jest.fn().mockReturnValue({
        getBlockBlobClient: jest.fn().mockReturnValue({ deleteIfExists }),
      }),
    });

    await expect(
      service.apagarFicheiro('eventos', 'foto.png'),
    ).resolves.toBeUndefined();
  });

  it('deve guardar foto de marketplace e rejeitar erro de upload', async () => {
    const blockBlobClient = {
      exists: jest.fn().mockResolvedValue(false),
      uploadData: jest.fn().mockRejectedValue(new Error('azure')),
      url: 'https://blob.test/market/foto',
    };
    const service = criarServiceComCliente({
      getContainerClient: jest.fn().mockReturnValue({
        getBlockBlobClient: jest.fn().mockReturnValue(blockBlobClient),
      }),
    });

    await expect(
      service.guardarFotosMarketplace('market', 'foto', criarFicheiro()),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve devolver stream quando o ficheiro existe', async () => {
    const stream = {} as NodeJS.ReadableStream;
    const blockBlobClient = {
      exists: jest.fn().mockResolvedValue(true),
      download: jest.fn().mockResolvedValue({ readableStreamBody: stream }),
    };
    const service = criarServiceComCliente({
      getContainerClient: jest.fn().mockReturnValue({
        getBlockBlobClient: jest.fn().mockReturnValue(blockBlobClient),
      }),
    });

    await expect(service.getFicheiroStream('templates', 'a.csv')).resolves.toBe(
      stream,
    );
  });
});
