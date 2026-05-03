

import React, { useState, useEffect } from 'react';
import { marketplaceService } from '../../../services/artigo.service';

interface ModalPropostasProps {
    isOpen: boolean;
    onClose: () => void;
    idStock: number;
    nomeArtigo: string;
    onAtualizacao: () => void;
}

export function ModalPropostas({ isOpen, onClose, idStock, nomeArtigo, onAtualizacao }: ModalPropostasProps) {
    const [propostas, setPropostas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && idStock) {
            carregarPropostas();
        }
    }, [isOpen, idStock]);

    const carregarPropostas = async () => {
        setLoading(true);
        try {
            const dados = await marketplaceService.listarPropostas(idStock);
            setPropostas(dados);
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDecisao = async (idInteresse: number, decisao: 'Aprovado' | 'Rejeitado') => {
        const mensagem = decisao === 'Aprovado'
            ? 'Tens a certeza que queres aprovar esta requisição? O stock será atualizado automaticamente.'
            : 'Queres rejeitar este pedido?';

        if (!window.confirm(mensagem)) return;

        try {
            await marketplaceService.responderProposta(idInteresse, decisao);
            alert(`Pedido ${decisao.toLowerCase()} com sucesso!`);


            setPropostas(prev => prev.filter(p => p.ID_Interesse !== idInteresse));


            if (decisao === 'Aprovado') {
                onAtualizacao();
            }
        } catch (error: any) {
            alert('Erro: ' + error.message);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
                onClick={onClose}
            ></div>

            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', width: '90%', maxWidth: '700px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', zIndex: 1001, padding: '2rem', maxHeight: '85vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
                    <h2 style={{ margin: 0, color: '#0f172a' }}>📋 Gestão de Propostas</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                </div>

                <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Artigo: <strong>{nomeArtigo}</strong>
                </p>

                {loading ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>A procurar pedidos pendentes...</p>
                ) : propostas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
                        <p style={{ fontSize: '1.1rem', color: '#64748b', margin: 0 }}>Ainda não há interessados nesta peça.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {propostas.map(prop => (
                            <div key={prop.ID_Interesse} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc', transition: 'box-shadow 0.2s' }}>

                                <div style={{ flex: 1 }}>
                                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#1e293b' }}>
                                        {prop.Utilizador?.Pessoa?.Nome || 'Utilizador Desconhecido'}
                                    </strong>

                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#475569', marginTop: '0.3rem', marginBottom: '0.6rem' }}>
                                        {prop.Utilizador?.Pessoa?.Contacto && <span>📞 {prop.Utilizador.Pessoa.Contacto}</span>}
                                        {prop.Utilizador?.Pessoa?.Email && <span>✉️ {prop.Utilizador.Pessoa.Email}</span>}
                                    </div>


                                    <div style={{ marginBottom: '1rem' }}>
                                        {prop.Tipo === 'Aluguer' ? (
                                            <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.35rem 0.7rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                📅 Empréstimo (Devolver a: {prop.Data_Recolha_Prevista ? new Date(prop.Data_Recolha_Prevista).toLocaleDateString('pt-PT') : 'N/A'})
                                            </span>
                                        ) : (
                                            <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '0.35rem 0.7rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                🛒 Compra Definitiva
                                            </span>
                                        )}
                                    </div>

                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>
                                        Pedido feito a {new Date(prop.Data_Registo).toLocaleDateString('pt-PT')}
                                    </span>

                                    {prop.Mensagem && (
                                        <p style={{ margin: '0.8rem 0 0 0', fontSize: '0.9rem', color: '#334155', fontStyle: 'italic', borderLeft: '3px solid #cbd5e1', paddingLeft: '0.8rem', background: 'white', padding: '0.5rem', borderRadius: '0 6px 6px 0' }}>
                                            "{prop.Mensagem}"
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '120px' }}>
                                    <button
                                        onClick={() => handleDecisao(prop.ID_Interesse, 'Aprovado')}
                                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.7rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}
                                    >
                                        ✅ Aprovar
                                    </button>
                                    <button
                                        onClick={() => handleDecisao(prop.ID_Interesse, 'Rejeitado')}
                                        style={{ background: 'white', color: '#ef4444', border: '1px solid #fca5a5', padding: '0.7rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                                    >
                                        ❌ Rejeitar
                                    </button>
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}