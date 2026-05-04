import { Test, TestingModule } from '@nestjs/testing';

import { BlobsService } from '../../Infraestrutura/Blobs/blobs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UtilizadorImportService } from './utilizador-import.service';

describe('UtilizadorImportService', () => {
  let service: UtilizadorImportService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const prismaMock = {
    pessoa: { create: jest.fn() },
    utilizador: { create: jest.fn() },
  };

  const blobsServiceMock = {
    lerFicheiroTexto: jest.fn(),
  };

  beforeEach(async () => {
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UtilizadorImportService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BlobsService, useValue: blobsServiceMock },
      ],
    }).compile();

    service = module.get<UtilizadorImportService>(UtilizadorImportService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('deve importar utilizadores a partir de CSV no blob', async () => {
    blobsServiceMock.lerFicheiroTexto.mockResolvedValue(
      [
        'Nome;Email;NIF;Contacto;Data_Nascimento',
        'Ana;ana@email.test;123456789;910000000;1990-01-01',
      ].join('\n'),
    );
    prismaMock.pessoa.create.mockResolvedValue({ ID_Pessoa: 1, Nome: 'Ana' });
    prismaMock.utilizador.create.mockResolvedValue({
      ID_Utilizador: 2,
      Utilizador: 'ana@email.test',
    });

    await expect(service.importarDeBlob('alunos.csv')).resolves.toEqual({
      mensagem: 'Importação do Azure concluída. 1 registos criados.',
      dados: [
        {
          pessoa: { ID_Pessoa: 1, Nome: 'Ana' },
          utilizador: { ID_Utilizador: 2, Utilizador: 'ana@email.test' },
        },
      ],
    });
    expect(blobsServiceMock.lerFicheiroTexto).toHaveBeenCalledWith(
      'importar-csv',
      'alunos.csv',
    );
    expect(prismaMock.utilizador.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ID_Pessoa: 1,
        Utilizador: 'ana@email.test',
        Ativo: true,
      }),
    });
  });

  it('deve continuar a importação quando uma linha falha', async () => {
    blobsServiceMock.lerFicheiroTexto.mockResolvedValue(
      [
        'Nome,Email,NIF,Contacto,Data_Nascimento',
        'Falha,falha@email.test,111,910,1990-01-01',
        'Boa,boa@email.test,222,920,1991-01-01',
      ].join('\n'),
    );
    prismaMock.pessoa.create
      .mockRejectedValueOnce(new Error('duplicado'))
      .mockResolvedValueOnce({ ID_Pessoa: 2, Nome: 'Boa' });
    prismaMock.utilizador.create.mockResolvedValue({ ID_Utilizador: 3 });

    const resultado = await service.importarDeBlob('users.csv');

    expect(resultado.mensagem).toBe(
      'Importação do Azure concluída. 1 registos criados.',
    );
    expect(resultado.dados).toHaveLength(1);
  });
});
