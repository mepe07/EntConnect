import { ButtonComponent } from '~/components/button/button.component';
import React, { useEffect, useState } from 'react';
import { TipoAnuncio } from '../../../types/marketplace.types';

interface ModalPublicarProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (dados: {
        tipoAnuncio: TipoAnuncio;
        quantidadeDisponivel: number;
        aluguerContinuo: boolean;
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
    const [tipoAnuncio, setTipoAnuncio] = useState<TipoAnuncio>(TipoAnuncio.VENDA);
    const [quantidadeDisponivel, setQuantidadeDisponivel] = useState(0);
    const [aluguerContinuo, setAluguerContinuo] = useState(false);
    const [descricao, setDescricao] = useState('');

    useEffect(() => {
        if (!loteInfo) return;

        const tipoAtual =
            loteInfo.atualAluguer > 0 ? TipoAnuncio.ALUGUER : TipoAnuncio.VENDA;
        const quantidadeAtual =
            loteInfo.atualAluguer > 0 ? loteInfo.atualAluguer : loteInfo.atualVenda;

        setTipoAnuncio(tipoAtual);
        setQuantidadeDisponivel(
            quantidadeAtual > 0 ? quantidadeAtual : loteInfo.maximoTotal,
        );
        setAluguerContinuo(false);
        setDescricao(
            loteInfo.descricaoOriginal ||
                'Artigo institucional da escola disponível na montra.',
        );
    }, [loteInfo]);

    if (!isOpen || !loteInfo) return null;

    const maximoPermitido = loteInfo.maximoTotal;
    const ultrapassouLimite = quantidadeDisponivel > maximoPermitido;

    const handleSalvar = () => {
        if (ultrapassouLimite || quantidadeDisponivel === 0) return;

        onConfirm({
            tipoAnuncio,
            quantidadeDisponivel,
            aluguerContinuo:
                tipoAnuncio === TipoAnuncio.ALUGUER ? aluguerContinuo : false,
            descricao,
        });
    };

    return (
        <>
            <div
                className="modal-overlay"
                onClick={onClose}
                style={{ zIndex: 1000 }}
            ></div>
            <div
                className="modal-card inventory-modal publish-inventory-modal"
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1001,
                    width: '90%',
                    maxWidth: '450px',
                }}
            >
                <h2 style={{ marginTop: 0 }}>Publicar na Montra</h2>
                <p className="texto-ajuda" style={{ marginBottom: '1.5rem' }}>
                    Como queres publicar o artigo <strong>{loteInfo.nome}</strong>?
                </p>

                <div
                    className="stock-summary"
                    style={{
                        background: '#f8fafc',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        border: '1px solid #e2e8f0',
                    }}
                >
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                        Em armazém: <strong>{maximoPermitido} un.</strong>
                    </p>
                    <p
                        style={{
                            margin: '0.5rem 0 0 0',
                            fontSize: '0.9rem',
                            color: ultrapassouLimite ? '#ef4444' : '#10b981',
                        }}
                    >
                        A publicar na montra: <strong>{quantidadeDisponivel} un.</strong>
                    </p>
                </div>

                <div className="form-grid modal-form-grid">
                    <div
                        className="form-grupo modal-form-row"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                        }}
                    >
                        <div>
                            <label>Tipo de anúncio</label>
                            <select
                                value={tipoAnuncio}
                                onChange={(e) => {
                                    const novoTipo = e.target.value as TipoAnuncio;
                                    setTipoAnuncio(novoTipo);

                                    if (novoTipo === TipoAnuncio.VENDA) {
                                        setAluguerContinuo(false);
                                    }
                                }}
                            >
                                <option value={TipoAnuncio.VENDA}>Venda</option>
                                <option value={TipoAnuncio.ALUGUER}>Aluguer</option>
                            </select>
                        </div>
                        <div>
                            <label>Quantidade a publicar</label>
                            <input
                                type="number"
                                min="0"
                                value={quantidadeDisponivel}
                                onChange={(e) =>
                                    setQuantidadeDisponivel(parseInt(e.target.value) || 0)
                                }
                            />
                        </div>
                    </div>

                    {tipoAnuncio === TipoAnuncio.ALUGUER && (
                        <div className="form-grupo form-field-full">
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={aluguerContinuo}
                                    onChange={(e) =>
                                        setAluguerContinuo(e.target.checked)
                                    }
                                    style={{ width: 'auto', marginTop: '3px' }}
                                />
                                <span>
                                    <strong>Aluguer contínuo</strong>
                                    <span
                                        style={{
                                            display: 'block',
                                            marginTop: '4px',
                                            fontSize: '13px',
                                            color: '#64748b',
                                        }}
                                    >
                                        Quando o artigo for devolvido, o anúncio volta
                                        automaticamente a disponível.
                                    </span>
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="form-grupo form-field-full">
                        <label>Descrição para o Público</label>
                        <textarea
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                {ultrapassouLimite && (
                    <div
                        style={{
                            color: '#ef4444',
                            fontSize: '0.85rem',
                            marginTop: '1rem',
                            fontWeight: 'bold',
                        }}
                    >
                        A quantidade não pode ser maior que o stock total.
                    </div>
                )}
                {quantidadeDisponivel === 0 && (
                    <div
                        style={{
                            color: '#f59e0b',
                            fontSize: '0.85rem',
                            marginTop: '1rem',
                        }}
                    >
                        Indica pelo menos 1 unidade para publicar.
                    </div>
                )}

                <div className="modal-acoes" style={{ marginTop: '1.5rem' }}>
                    <ButtonComponent className="btn-secundario" onClick={onClose}>
                        Cancelar
                    </ButtonComponent>
                    <ButtonComponent
                        className="btn-principal"
                        onClick={handleSalvar}
                        disabled={ultrapassouLimite || quantidadeDisponivel === 0}
                        style={{
                            opacity:
                                ultrapassouLimite || quantidadeDisponivel === 0 ? 0.5 : 1,
                        }}
                    >
                        Publicar Item
                    </ButtonComponent>
                </div>
            </div>
        </>
    );
}
