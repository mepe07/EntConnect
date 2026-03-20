Diagramas, requisitos, manuais, etc



Modelos de Base de Dados: Os scripts SQL ou as imagens do diagrama Entidade-Relacionamento.

ADRs (Architecture Decision Records): Isto é o "nível Deus" para a UC de PDS! Um ADR é um ficheiro de texto simples (Markdown) onde vocês registam porquê tomaram uma decisão.

    Exemplo: Criam um ficheiro docs/ADR-001-Escolha-Backend.md. Lá dentro escrevem: "Decidimos usar NestJS em vez de FastAPI porque a equipa tem mais facilidade com TypeScript e facilita a partilha de modelos com o Front-end em React."

Porquê usar esta abordagem: Se a documentação estiver no Git, sempre que o código muda, a documentação é atualizada no mesmo Commit. O professor consegue ver a evolução histórica do vosso pensamento.