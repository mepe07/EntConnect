


/**
 * URL base usada pelos serviços HTTP da aplicação.
 *
 * @remarks
 * Pode ser configurada através da variável de ambiente `VITE_API_URL`.
 */
export const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
