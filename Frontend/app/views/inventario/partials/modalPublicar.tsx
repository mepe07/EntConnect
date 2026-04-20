import React, { useState, useEffect } from 'react';
import { TipoAnuncio } from '../../../types/marketplace.types';

interface ModalPublicarProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (dados: {
        tipoAnuncio: TipoAnuncio;
        quantidadeVenda: number;
        quantidadeAluguer: number;
        descricao: string;
    }) => void;
    loteInfo: {
        idStock: number;
        nome: string;
        descricaoOriginal: string;
        maximoTotal: number;
        atualVenda: number;
        atualAluguer: number;
    } | null;
}

export function ModalPublicar({ isOpen, onClose, onConfirm, loteInfo }: ModalPublicarProps) {
    const [venda, setVenda] = useState(0);
    const [aluguer, setAluguer] = useState(0);
    const [descricao, setDescricao] = useState('');

    useEffect(() => {
        if (loteInfo) {
            setVenda(loteInfo.atualVenda);
            setAluguer(loteInfo.atualAluguer);
            setDescricao(loteInfo.descricaoOriginal || 'Artigo institucional da escola disponível na montra.');
        }
    }, [loteInfo]);

    if (!isOpen || !loteInfo) return null;

    const maximoPermitido = loteInfo.maximoTotal;
    const totalAlocado = venda + aluguer;
    const ultrapassouLimite = totalAlocado > maximoPermitido;

    const handleSalvar = () => {
        if (ultrapassouLimite || totalAlocado === 0) return;

        let tipoFinal = TipoAnuncio.VENDA;

        if (venda > 0 && aluguer > 0) {
            tipoFinal = TipoAnuncio.AMBOS;
        } else if (aluguer > 0 && venda === 0) {
            tipoFinal = TipoAnuncio.ALUGUER;
        }

        onConfirm({
            tipoAnuncio: tipoFinal,
            quantidadeVenda: venda,
            quantidadeAluguer: aluguer,
            descricao,
        });
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}></div>
            <div className="modal-card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001, width: '90%', maxWidth: '450px' }}>
                <h2 style={{ marginTop: 0 }}>🏪 Publicar na Montra</h2>
                <p className="texto-ajuda" style={{ marginBottom: '1.5rem' }}>
                    Como queres distribuir o artigo <strong>{loteInfo.nome}</strong>?
                </p>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>📦 Em Armazém: <strong>{maximoPermitido} un.</strong></p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: ultrapassouLimite ? '#ef4444' : '#10b981' }}>📊 A alocar para a Montra: <strong>{totalAlocado} un.</strong></p>
                </div>

                <div className="form-grid">
                    <div className="form-grupo" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label>Para Venda</label>
                            <input type="number" min="0" value={venda} onChange={(e) => setVenda(parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                            <label>Para Aluguer</label>
                            <input type="number" min="0" value={aluguer} onChange={(e) => setAluguer(parseInt(e.target.value) || 0)} />
                        </div>
                    </div>
                    <div className="form-grupo">
                        <label>Descrição para o Público</label>
                        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
                    </div>
                </div>

                {ultrapassouLimite && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '1rem', fontWeight: 'bold' }}>⚠️ A soma não pode ser maior que o stock total.</div>}
                {totalAlocado === 0 && <div style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: '1rem' }}>ℹ️ Aloca pelo menos 1 unidade para publicar.</div>}

                <div className="modal-acoes" style={{ marginTop: '1.5rem' }}>
                    <button className="btn-secundario" onClick={onClose}>Cancelar</button>
                    <button className="btn-principal" onClick={handleSalvar} disabled={ultrapassouLimite || totalAlocado === 0} style={{ opacity: (ultrapassouLimite || totalAlocado === 0) ? 0.5 : 1 }}>
                        Publicar Item
                    </button>
                </div>
            </div>
        </>
    );
} 