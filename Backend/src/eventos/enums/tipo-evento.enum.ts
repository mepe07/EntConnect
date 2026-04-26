// Ficheiro: Backend/src/eventos/enums/tipo-evento.enum.ts

// Tipos de evento permitidos.
// Estes valores têm de bater certo com a constraint CK_Evento_Tipo da base de dados.
export enum TipoEvento {
    EVENTO = 'evento',
    WORKSHOP = 'workshop',
    CONCERTO = 'concerto',
    AUDICAO = 'audicao',
    AVISO = 'aviso',
    OUTRO = 'outro',
} 