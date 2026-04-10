export class EEService {
  private _apiUrl = 'http://localhost:3000';

  async getAlunosByEE(idEncEducacao: number) {
    const response = await fetch(`${this._apiUrl}/utilizador/enc-educacao/${idEncEducacao}/alunos`);
    return await response.json();
  }

  async inscreverAlunoCoaching(idCoaching: number, idAluno: number) {
    const response = await fetch(`${this._apiUrl}/coaching/${idCoaching}/inscrever-aluno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idAluno })
    });
    return await response.json();
  }
}