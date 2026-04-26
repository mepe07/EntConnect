import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import 'multer'; //evitar download do multer, Finalidade: Utilizar o Express.Multer.File (Carregar filheiros locais)
import { Express } from 'express';

@Injectable()
export class BlobsService {
  private blobServiceClient?: BlobServiceClient;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      console.warn('Azure Connection String não encontrada!');
    } else {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }
  }
  

  /**
   * Faz o upload de um ficheiro para o Azure Blob Storage.
   * @param file O ficheiro vindo do Multer (@UploadedFile)
   * @param pasta O caminho/pasta dentro do container (ex: 'fotos-pessoas')
   * @returns O URL público do ficheiro carregado com o nome do ficheiro adaptado Ex: user{id}
   */
  // Agora pede-se o nome do container como primeiro parâmetro
  async uploadFicheiro(
    containerName: string, 
    file: Express.Multer.File, 
    nomePersonalizado: string
  ): Promise<string> {
    
    if (!this.blobServiceClient) throw new InternalServerErrorException('Azure não configurado.');

    try {
      // Usa o containerName que passamos na função
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      
      const extensao = file.originalname.split('.').pop();
      const caminhoNoBlob = `${nomePersonalizado}.${extensao}`;
      
      const blockBlobClient = containerClient.getBlockBlobClient(caminhoNoBlob);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype }
      });

      return blockBlobClient.url;
    } catch (error) {
      throw new BadRequestException(`Erro ao carregar para o contentor ${containerName}`);
    }
  }

  // Lista os ficheiros de um determinado contentor (para o teu futuro Frontend)
  async listarFicheiros(containerName: string): Promise<string[]> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('A ligação ao Azure não está configurada no servidor.');
    }

    // Agora usa o nome do contentor que passas na chamada da função
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const ficheiros: string[] = [];
    
    for await (const blob of containerClient.listBlobsFlat()) {
      ficheiros.push(blob.name);
    }
    return ficheiros;
  }

  // Descarrega o ficheiro de um contentor e devolve logo como texto (String)
  async lerFicheiroTexto(containerName: string, nomeFicheiro: string): Promise<string> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('A ligação ao Azure não está configurada no servidor.');
    }

    try {
      // Agora usa o nome do contentor que passas na chamada da função
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(nomeFicheiro);

      const buffer = await blockBlobClient.downloadToBuffer();
      return buffer.toString('latin1'); // tratar caracteres especiais
      
    } catch (error) {
      console.error("Erro ao comunicar com o Azure Blob Storage:", error);
      throw new BadRequestException(`Não foi possível ler o ficheiro "${nomeFicheiro}" no contentor "${containerName}". Confirma se os nomes estão corretos no Azure.`);
    }
  }

  // src/Infraestrutura/Blobs/blobs.service.ts

  /**
   * Apaga um ficheiro do Azure Blob Storage
   */
  async apagarFicheiro(containerName: string, nomeFicheiro: string): Promise<void> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('A ligação ao Azure não está configurada no servidor.');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(nomeFicheiro);

      // O Azure tem um método super seguro que só apaga se o ficheiro existir mesmo
      await blockBlobClient.deleteIfExists();
      console.log(`🗑️ Ficheiro ${nomeFicheiro} apagado com sucesso do Azure!`);
      
    } catch (error) {
      console.error("Erro ao apagar ficheiro no Azure:", error);
      // Não fazemos throw aqui para não rebentar com o request, caso o ficheiro já não exista
    }
  }
  
  async guardarFotosMarketplace(containerName: string, nomePersonalizado: string, file: Express.Multer.File) {
        if (!this.blobServiceClient) {
            throw new InternalServerErrorException('Azure não configurado.');
        }

        try {
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            const blobName = `${nomePersonalizado}`;

            // 1. Verificar se o blob já existe
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            const exists = await blockBlobClient.exists();
        
            if (exists) {
                console.warn(`O blob "${blobName}" já existe no contentor "${containerName}". Será substituído.`);
            }

            // 2. O VERDADEIRO UPLOAD: Passamos o ficheiro físico (file.buffer) primeiro!
            await blockBlobClient.uploadData(file.buffer, {
                blobHTTPHeaders: { blobContentType: file.mimetype }
            });

            // 3. Devolver o link público para guardarmos no nosso SQL Server
            return blockBlobClient.url;

        } catch (error) { // <-- Olha aqui a chaveta a fechar o try antes do catch!
            console.error("Erro ao guardar fotos do marketplace:", error);
            throw new BadRequestException(`Erro ao guardar fotos do marketplace no contentor "${containerName}".`);
        }
    }

    /**
   * Obtém um ficheiro do Azure e devolve o Stream legível.
   * Ideal para criar respostas de download (piping para a Response do Express).
   * @param containerName Nome do contentor (ex: 'Templates')
   * @param nomeFicheiro Nome do ficheiro (ex: 'alunos.csv')
   * @returns O stream legível (NodeJS.ReadableStream) do ficheiro.
   */
  async getFicheiroStream(containerName: string, nomeFicheiro: string): Promise<NodeJS.ReadableStream> {
    if (!this.blobServiceClient) {
      throw new InternalServerErrorException('A ligação ao Azure não está configurada no servidor.');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(nomeFicheiro);

      // Verifica se o ficheiro existe antes de tentar fazer download
      const exists = await blockBlobClient.exists();
      if (!exists) {
        throw new BadRequestException(`O ficheiro "${nomeFicheiro}" não foi encontrado no contentor "${containerName}".`);
      }

      const downloadResponse = await blockBlobClient.download(0);
      
      // O Azure SDK devolve um 'readableStreamBody' se estivermos em ambiente Node.js
      if (!downloadResponse.readableStreamBody) {
         throw new InternalServerErrorException('Erro a processar o stream do ficheiro no Azure.');
      }

      return downloadResponse.readableStreamBody;

    } catch (error) {
      console.error("Erro ao obter stream do Azure Blob Storage:", error);
      throw new InternalServerErrorException(`Não foi possível fazer download do ficheiro "${nomeFicheiro}".`);
    }
  }
}