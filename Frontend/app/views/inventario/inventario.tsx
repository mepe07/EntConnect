// Ficheiro: src/views/Inventario/Inventario.tsx

import React, { useEffect, useState } from 'react';
import { marketplaceService } from '../../services/artigo.service';
import './inventario.scss';

// O "molde" dos dados que vêm do NestJS
interface Artigo {
    ID_Artigo: number;
    Nome: string;
    Quantidade: number;
    Notas: string | null;
}

export function Inventario() {
    const [artigos, setArtigos] = useState<Artigo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ Nome: '', Quantidade: 0, Notas: '' });

    // Assim que o ecrã abre, chamamos o estafeta!
    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const dados = await marketplaceService.listarInventario();
            setArtigos(dados);
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // A função do nosso Botão Mágico
    const handlePublicar = async (idArtigo: number, nomeArtigo: string, qtdMaxima: number) => {
        // Para ser rápido, usamos o prompt nativo do browser
        const resposta = window.prompt(
            `Quantas unidades de "${nomeArtigo}" queres enviar para a montra? (Máximo: ${qtdMaxima})`
        );

        // Se ela cancelar ou não escrever nada, paramos aqui
        if (!resposta) return;

        const quantidade = parseInt(resposta, 10);

        // Pequena validação de segurança no lado do React
        if (isNaN(quantidade) || quantidade <= 0 || quantidade > qtdMaxima) {
            alert('Quantidade inválida! Verifica o stock disponível.');
            return;
        }

        try {
            // Mandamos o estafeta ir ao NestJS
            await marketplaceService.publicarAnuncio(idArtigo, quantidade, 'Anúncio oficial');
            alert(`Sucesso! ${quantidade} unidades enviadas para o Marketplace!`);
            // Opcional: recarregar a lista para ver se algo mudou
            carregarDados();
        } catch (error: any) {
            alert('Erro ao publicar: ' + error.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await marketplaceService.criarArtigo(formData);
            alert('Artigo adicionado com sucesso!');
            setIsModalOpen(false);
            carregarDados(); // Atualiza a tabela
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="inventario-container">
            <div className="cabecalho">
                <h1>📦 Inventário da Escola</h1>
                <button className="btn-novo" onClick={() => setIsModalOpen(true)}>+ Novo Artigo</button>
            </div>

            <div className="tabela-card">
                {loading ? (
                    <p style={{ padding: '2rem', textAlign: 'center' }}>A carregar o armazém...</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome do Artigo</th>
                                <th>Em Stock</th>
                                <th>Notas</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {artigos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center' }}>
                                        O armazém está vazio.
                                    </td>
                                </tr>
                            ) : (
                                artigos.map((artigo) => (
                                    <tr key={artigo.ID_Artigo}>
                                        <td>#{artigo.ID_Artigo}</td>
                                        <td>{artigo.Nome}</td>
                                        <td>
                                            <strong>{artigo.Quantidade}</strong>
                                        </td>
                                        <td>{artigo.Notas || '-'}</td>
                                        <td>
                                            <button
                                                className="btn-magico"
                                                onClick={() => handlePublicar(artigo.ID_Artigo, artigo.Nome, artigo.Quantidade)}
                                                disabled={artigo.Quantidade === 0}
                                            >
                                                🏪 Publicar na Montra
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Adicionar ao Armazém</h2>
                        <form onSubmit={handleSubmit}>
                            <input 
                                placeholder="Nome do Artigo" 
                                onChange={e => setFormData({ ...formData, Nome: e.target.value })} 
                                required 
                            />
                            <input 
                                type="number" 
                                placeholder="Quantidade" 
                                onChange={e => setFormData({ ...formData, Quantidade: parseInt(e.target.value) })} 
                                required 
                            />
                            <button type="submit" className="btn-novo">Guardar no Inventário</button>
                            <button type="button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
} 