import React, { useState, useEffect } from 'react';
import '../inventario.scss';

interface ModalPublicarProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (qtdVenda: number, qtdAluguer: number) => void;
    loteInfo: {
        idStock: number;
        nome: string;
        maximoTotal: number;
        atualVenda: number;
        atualAluguer: number;
    } | null;
}

export function ModalPublicar({ isOpen, onClose, onConfirm, loteInfo }: ModalPublicarProps) {
    const [venda, setVenda] = useState(0);
    const [aluguer, setAluguer] = useState(0);

    // Quando o modal abre, preenche as caixas com os valores atuais da base de dados
    useEffect(() => {
        if (loteInfo) {
            setVenda(loteInfo.atualVenda);
            setAluguer(loteInfo.atualAluguer);
        }
    }, [loteInfo]);

    if (!isOpen || !loteInfo) return null;

    const maximoPermitido = loteInfo.maximoTotal;
    const totalAlocado = venda + aluguer;
    const ultrapassouLimite = totalAlocado > maximoPermitido;

    const handleSalvar = () => {
        if (ultrapassouLimite) return;
        onConfirm(venda, aluguer);
    };

    return (
        <>
            <div className="gaveta-overlay" onClick={onClose}></div>
            <div className="modal-aluguer" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '2rem', borderRadius: '16px', zIndex: 1001, width: '90%', maxWidth: '450px' }}>
                <h2 style={{ marginTop: 0 }}>🏪 Atualizar Montra</h2>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                    Como queres distribuir o artigo <strong>{loteInfo.nome}</strong>?
                </p>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                        📦 Físico no Armazém: <strong>{maximoPermitido}</strong>
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: ultrapassouLimite ? '#ef4444' : '#10b981' }}>
                        📊 Total Alocado para a Montra: <strong>{totalAlocado}</strong>
                    </p>
                </div>

                <div className="form-grupo" style={{ marginBottom: '1rem' }}>
                    <label>Para Vender (Unidades)</label>
                    <input 
                        type="number" 
                        min="0" 
                        value={venda} 
                        onChange={(e) => setVenda(parseInt(e.target.value) || 0)}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                </div>

                <div className="form-grupo" style={{ marginBottom: '1.5rem' }}>
                    <label>Para Alugar/Emprestar (Unidades)</label>
                    <input 
                        type="number" 
                        min="0" 
                        value={aluguer} 
                        onChange={(e) => setAluguer(parseInt(e.target.value) || 0)}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                </div>

                {ultrapassouLimite && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                        ⚠️ A soma ({totalAlocado}) não pode ser maior que o stock físico ({maximoPermitido}).
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                    <button 
                        onClick={handleSalvar} 
                        disabled={ultrapassouLimite}
                        style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: 'none', background: ultrapassouLimite ? '#cbd5e1' : '#10b981', color: 'white', cursor: ultrapassouLimite ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </>
    );
} 