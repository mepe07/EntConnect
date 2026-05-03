// Ficheiro: src/marketplace/enums/origem-registo.enum.ts

/*
    OrigemRegisto

    Identifica de onde veio o artigo registado no Marketplace.

    Esta distinção é importante porque existem dois fluxos diferentes:
    - artigos criados diretamente por utilizadores;
    - artigos criados inicialmente no inventário da escola.

    Com esta origem conseguimos aplicar regras diferentes de gestão,
    permissões e publicação.
*/
export enum OrigemRegisto {
    // Artigo criado diretamente por um utilizador através do Marketplace.
    UTILIZADOR = 'utilizador',

    // Artigo registado internamente no inventário da escola.
    INVENTARIO_ESCOLA = 'inventario_escola',
} 