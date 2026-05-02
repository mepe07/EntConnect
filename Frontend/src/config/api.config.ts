// Ficheiro: Frontend/src/config/api.config.ts

/*
    Configuração central da API.

    A variável VITE_API_URL vem do ficheiro .env do frontend.

    Exemplo:
    VITE_API_URL=http://localhost:3000

    Assim, se a API mudar de endereço, só alteramos o .env.
*/

export const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000';