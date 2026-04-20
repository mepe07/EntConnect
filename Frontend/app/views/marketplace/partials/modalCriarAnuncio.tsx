import React, { useState } from 'react';
import { TipoAnuncio, type CriarAnuncioPayload } from '../../../types/marketplace.types';
import '../marketplace.scss'; // Usa os mesmos estilos globais

interface ModalCriarAnuncioProps {
    isOpen: boolean;
    onClose: () => void;
    onGuardar: (payload: CriarAnuncioPayload) => Promise<void>;
}

export function ModalCriarAnuncio({ isOpen, onClose, onGuardar }: ModalCriarAnuncioProps) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<CriarAnuncioPayload>({
        titulo: '',
        tipoAnuncio: TipoAnuncio.VENDA,
        quantidadeTotal: 1,
        quantidadeDisponivel: 1,
        quantidadeVenda: 1,
        quantidadeAluguer: 0,
        descricao: '',
        notasInternas: '',
        idEstado: 1,
        idTamanho: 1,
        ficheiroFoto: undefined,
    });

    if (!isOpen) return null;

    const totalDistribuido = (form.quantidadeVenda ?? 0) + (form.quantidadeAluguer ?? 0);
    const usaDistribuicao = form.tipoAnuncio === TipoAnuncio.AMBOS;

    const handleTipoChange = (tipoAnuncio: TipoAnuncio) => {
        if (tipoAnuncio === TipoAnuncio.VENDA) {
            setForm({
                ...form,
                tipoAnuncio,
                quantidadeDisponivel: form.quantidadeTotal,
                quantidadeVenda: form.quantidadeTotal,
                quantidadeAluguer: 0,
            });
            return;
        }

        if (tipoAnuncio === TipoAnuncio.ALUGUER) {
            setForm({
                ...form,
                tipoAnuncio,
                quantidadeDisponivel: form.quantidadeTotal,
                quantidadeVenda: 0,
                quantidadeAluguer: form.quantidadeTotal,
            });
            return;
        }

        setForm({
            ...form,
            tipoAnuncio,
            quantidadeDisponivel: undefined,
            quantidadeVenda: form.quantidadeVenda ?? form.quantidadeTotal,
            quantidadeAluguer: form.quantidadeAluguer ?? 0,
        });
    };

    const handleQuantidadeTotalChange = (quantidadeTotal: number) => {
        const totalFinal = quantidadeTotal > 0 ? quantidadeTotal : 1;

        if (form.tipoAnuncio === TipoAnuncio.VENDA) {
            setForm({
                ...form,
                quantidadeTotal: totalFinal,
                quantidadeDisponivel: totalFinal,
                quantidadeVenda: totalFinal,
                quantidadeAluguer: 0,
            });
            return;
        }

        if (form.tipoAnuncio === TipoAnuncio.ALUGUER) {
            setForm({
                ...form,
                quantidadeTotal: totalFinal,
                quantidadeDisponivel: totalFinal,
                quantidadeVenda: 0,
                quantidadeAluguer: totalFinal,
            });
            return;
        }

        setForm({
            ...form,
            quantidadeTotal: totalFinal,
            quantidadeDisponivel: undefined,
        });
    };

    const handleSubmit = async () => {
        if (!form.titulo || form.quantidadeTotal < 1) {
            alert('Por favor, preenche o título e a quantidade.');
            return;
        }

        if (usaDistribuicao) {
            if (totalDistribuido < 1) {
                alert('Indica pelo menos 1 unidade para venda ou aluguer.');
                return;
            }

            if (totalDistribuido > form.quantidadeTotal) {
                alert('A soma de venda e aluguer não pode ultrapassar a quantidade total.');
                return;
            }
        }

        setLoading(true);
        try {
            await onGuardar({
                ...form,
                quantidadeDisponivel: usaDistribuicao ? undefined : form.quantidadeTotal,
                quantidadeVenda: usaDistribuicao ? form.quantidadeVenda : undefined,
                quantidadeAluguer: usaDistribuicao ? form.quantidadeAluguer : undefined,
            });
        } catch (error) {
            console.error('Erro ao guardar', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}></div>
            <div className="modal-card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001, width: '90%', maxWidth: '500px' }}>
                <h2 style={{ marginTop: 0, marginBottom: '4px' }}>Publicar Anúncio</h2>
                <p className="texto-ajuda" style={{ marginBottom: '1.5rem', color: '#64748b' }}>
                    O que queres vender, alugar ou partilhar com a comunidade?
                </p>

                <div className="form-grid" style={{ display: 'grid', gap: '16px' }}>
                    
                    <div className="form-grupo">
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Título do Anúncio *</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Calculadora Gráfica TI-84"
                            value={form.titulo} 
                            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div className="form-grupo" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Tipo de Negócio *</label>
                            <select 
                                value={form.tipoAnuncio} 
                                onChange={(e) => handleTipoChange(e.target.value as TipoAnuncio)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="venda">Vender</option>
                                <option value="aluguer">Alugar / Emprestar</option>
                                <option value="ambos">Vender ou Alugar</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Quantidade *</label>
                            <input 
                                type="number" min="1" 
                                value={form.quantidadeTotal} 
                                onChange={(e) => handleQuantidadeTotalChange(parseInt(e.target.value) || 1)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>

                    {usaDistribuicao && (
                        <div className="form-grupo" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Qtd. para Venda</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.quantidadeVenda ?? 0}
                                    onChange={(e) => setForm({ ...form, quantidadeVenda: parseInt(e.target.value) || 0, quantidadeDisponivel: undefined })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Qtd. para Aluguer</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.quantidadeAluguer ?? 0}
                                    onChange={(e) => setForm({ ...form, quantidadeAluguer: parseInt(e.target.value) || 0, quantidadeDisponivel: undefined })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                            <div style={{ gridColumn: '1 / -1', fontSize: '13px', color: totalDistribuido > form.quantidadeTotal ? '#dc2626' : '#64748b' }}>
                                Total distribuído: <strong>{totalDistribuido}</strong> / {form.quantidadeTotal}
                            </div>
                        </div>
                    )}

                    <div className="form-grupo">
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Fotografia</label>
                        <div style={{ border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', background: '#f8fafc' }}>
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setForm({ ...form, ficheiroFoto: file });
                                }} 
                                style={{ width: '100%', fontSize: '14px' }}
                            />
                            {form.ficheiroFoto && (
                                <span style={{ display: 'block', marginTop: '8px', fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
                                    ✓ {form.ficheiroFoto.name} anexado.
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="form-grupo">
                        <label>Categoria</label>
                        <input 
                            value={form.notasInternas} 
                            onChange={(e) => setForm({ ...form, notasInternas: e.target.value })} 
                            placeholder="Ex: T-shirt, Calças..."
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label>Estado da Peça</label>
                            <select value={form.idEstado} onChange={(e) => setForm({ ...form, idEstado: +e.target.value })}>
                                <option value="1">Novo</option>
                                <option value="2">Usado - Como novo</option>
                                <option value="3">Usado - Bom estado</option>
                            </select>
                        </div>
                        <div>
                            <label>Tamanho</label>
                            <select value={form.idTamanho} onChange={(e) => setForm({ ...form, idTamanho: +e.target.value })}>
                                <option value="1">S</option>
                                <option value="2">M</option>
                                <option value="3">L</option>
                                <option value="4">XL</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="form-grupo">
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Descrição para o Público</label>
                        <textarea 
                            placeholder="Descreve o estado do item, preço sugerido ou condições..."
                            value={form.descricao} 
                            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                            rows={3}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                        />
                    </div>
                </div>

                <div className="modal-acoes" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button 
                        className="btn-secundario" 
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button 
                        className="btn-principal" 
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'A publicar...' : 'Publicar Anúncio'}
                    </button>
                </div>
            </div>
        </>
    );
} 