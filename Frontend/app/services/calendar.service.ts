import { authService } from './auth.service';
import { API_BASE_URL } from '~/config/api.config';

const API_URL = `${API_BASE_URL}/calendario`;

async function parseError(response: Response, fallback: string): Promise<never> {
  let message = fallback;

  try {
    const data = await response.json();

    if (Array.isArray(data.message)) {
      message = data.message.join(', ');
    } else if (data?.message) {
      message = data.message;
    }
  } catch {

  }

  throw new Error(message);
}

export const calendarService = {
  async getRange(startDate: string, endDate: string) {
    const token = authService.getToken();

    if (!token) {
      throw new Error('Não autorizado. Faça login novamente.');
    }

    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
    });

    const response = await fetch(`${API_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return parseError(response, 'Erro ao carregar os dados do calendário.');
    }

    return response.json();
  },
};
