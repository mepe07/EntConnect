import { ButtonComponent } from '~/components/button/button.component';
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
            <div
                className="modal-card inventory-modal inventory-create-modal"
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1001,
                    width: '90%',
                    maxWidth: '520px',
                }}
            >
                <h2 style={{ marginTop: 0 }}>Adicionar ao Inventário</h2>
                <p className="texto-ajuda" style={{ marginBottom: '1.5rem' }}>
                    Cria um novo item institucional no armazém da escola.
                </p>

                <div className="form-grid modal-form-grid">
                    <div className="form-grupo form-field-full">
                        <label>Título do Item *</label>
                        <input
                            type="text"
                            value={form.titulo}
                            onChange={e => setForm({ ...form, titulo: e.target.value })}
                        />
                    </div>

                    <div className="form-grupo form-field-full upload-area">
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
                                Ficheiro: {form.ficheiroFoto.name}
                            </span>
                        )}
                    </div>

                    <div className="form-grupo">
                        <label>Quantidade Total Inicial *</label>
                        <input
                            type="number"
                            min="0"
                            value={form.quantidade}
                            onChange={e => setForm({ ...form, quantidade: +e.target.value })}
                        />
                    </div>

                    <div className="form-grupo form-grupo-linha modal-form-row">
                        <div>
                            <label>Estado da peça</label>
                            <select
                                value={form.idEstado ?? 1}
                                onChange={e => setForm({ ...form, idEstado: +e.target.value })}
                            >
                                <option value="1">Novo</option>
                                <option value="2">Usado - Como novo</option>
                                <option value="3">Usado - Bom estado</option>
                            </select>
                        </div>
                        <div>
                            <label>Tamanho</label>
                            <select
                                value={form.idTamanho ?? 2}
                                onChange={e => setForm({ ...form, idTamanho: +e.target.value })}
                            >
                                <option value="1">S</option>
                                <option value="2">M</option>
                                <option value="3">L</option>
                                <option value="4">XL</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-grupo form-field-full">
                        <label>Descrição (Opcional)</label>
                        <textarea
                            value={form.descricao || ''}
                            onChange={e => setForm({ ...form, descricao: e.target.value })}
                            rows={4}
                            maxLength={1000}
                            placeholder="Descreve o estado, contexto ou detalhes úteis deste item."
                        />
                    </div>
                </div>

                <div className="modal-acoes" style={{ marginTop: '1.5rem' }}>
                    <ButtonComponent className="btn-secundario" onClick={onClose}>Cancelar</ButtonComponent>
                    <ButtonComponent className="btn-principal" onClick={onGuardar}>Guardar Item</ButtonComponent>
                </div>
            </div>
        </>
    );
}
