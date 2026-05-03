import { authService } from './auth.service';
import { API_BASE_URL } from '../../src/config/api.config';

const API_URL = `${API_BASE_URL}/horarios`;

async function parseError(response: Response, fallback: string): Promise<never> {
  let errorMessage = fallback;
  try {
    const data = await response.json();
    if (data?.message) {
      errorMessage = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
  } catch (e) {
  }

  throw new Error(errorMessage);
}

class HorariosService {
  private getHeaders() {
    const token = authService.getToken();

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async getHorarios() {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      return parseError(response, 'Falha ao carregar horários fixos.');
    }

    return response.json();
  }

  async getDiasSemana() {
    const response = await fetch(`${API_URL}/dias-semana`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      return parseError(response, 'Falha ao carregar os dias da semana.');
    }

    return response.json();
  }

  async createHorario(payload: any) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return parseError(response, 'Falha ao criar o horário fixo.');
    }

    return response.json();
  }

  async updateHorario(id: number, payload: any) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return parseError(response, 'Falha ao atualizar o horário fixo.');
    }

    return response.json();
  }

  async createExcecao(id: number, payload: any) {
    const response = await fetch(`${API_URL}/${id}/excecoes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return parseError(response, 'Falha ao criar exceção para o horário.');
    }

    return response.json();
  }

  async deleteHorario(id: number) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      return parseError(response, 'Falha ao eliminar o horário fixo.');
    }

    return response.json();
  }

  async deleteExcecao(idExcecao: number) {
    const response = await fetch(`${API_URL}/excecoes/${idExcecao}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      return parseError(response, 'Falha ao eliminar a exceção.');
    }

    return response.json();
  }
}

export const horariosService = new HorariosService();
