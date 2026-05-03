import React from 'react';
import type { CriarItemInventarioPayload } from '../../../types/marketplace.types';

interface Props {
    form: CriarItemInventarioPayload;
    setForm: (f: CriarItemInventarioPayload) => void;
    onClose: () => void;
    onGuardar: () => void;
}

export function ModalCriarItem({ form, setForm, onClose, onGuardar }: Props) {
    return (
        <>
            <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}></div>
            <div className="modal-card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001, width: '90%', maxWidth: '450px' }}>
                <h2 style={{ marginTop: 0 }}>Adicionar ao Inventário</h2>
                <p className="texto-ajuda" style={{ marginBottom: '1.5rem' }}>Cria um novo item institucional no armazém da escola.</p>

                <div className="form-grid">
                    <div className="form-grupo">
                        <label>Título do Item *</label>
                        <input
                            type="text"
                            value={form.titulo}
                            onChange={e => setForm({ ...form, titulo: e.target.value })}
                        />
                    </div>

                    <div className="form-grupo">
                        <label>Fotografia (Upload)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) setForm({ ...form, ficheiroFoto: file });
                            }}
                        />
                        {form.ficheiroFoto && (
                            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                                📎 {form.ficheiroFoto.name}
                            </span>
                        )}
                    </div>

                    <div className="form-grupo">
                        <label>Quantidade Total Inicial *</label>
                        <input
                            type="number" min="0"
                            value={form.quantidade}
                            onChange={e => setForm({ ...form, quantidade: +e.target.value })}
                        />
                    </div>

                    <div className="form-grupo">
                        <label>Descrição (Opcional)</label>
                        <textarea
                            value={form.descricao || ''}
                            onChange={e => setForm({ ...form, descricao: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>

                <div className="modal-acoes" style={{ marginTop: '1.5rem' }}>
                    <button className="btn-secundario" onClick={onClose}>Cancelar</button>
                    <button className="btn-principal" onClick={onGuardar}>Guardar Item</button>
                </div>
            </div>
        </>
    );
}