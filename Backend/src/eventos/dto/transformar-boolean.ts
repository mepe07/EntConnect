// Ficheiro: Backend/src/eventos/dto/transformar-boolean.ts

/**
 * Transforma valores vindos de query string ou FormData em boolean.
 *
 * Exemplos válidos:
 * - true
 * - false
 * - "true"
 * - "false"
 * - 1
 * - 0
 * - "1"
 * - "0"
 *
 * Se vier algo inválido, devolvemos o valor original para o class-validator
 * conseguir acusar erro com @IsBoolean().
 */
export function transformarBoolean(value: unknown): boolean | undefined | unknown {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (value === true || value === 'true' || value === 1 || value === '1') {
        return true;
    }

    if (value === false || value === 'false' || value === 0 || value === '0') {
        return false;
    }

    return value;
} 