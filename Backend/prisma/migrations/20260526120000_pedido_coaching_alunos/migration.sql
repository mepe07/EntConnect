CREATE TABLE [dbo].[Pedido_Coaching_Aluno] (
    [ID_Pedido] INT NOT NULL,
    [ID_Aluno] INT NOT NULL,
    CONSTRAINT [PK_Pedido_Coaching_Aluno] PRIMARY KEY CLUSTERED ([ID_Pedido], [ID_Aluno]),
    CONSTRAINT [FK_PedidoCoachingAluno_Pedido] FOREIGN KEY ([ID_Pedido]) REFERENCES [dbo].[Pedido_Coaching]([ID_Pedido]) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT [FK_PedidoCoachingAluno_Aluno] FOREIGN KEY ([ID_Aluno]) REFERENCES [dbo].[Aluno]([ID_aluno]) ON DELETE CASCADE ON UPDATE NO ACTION
);
