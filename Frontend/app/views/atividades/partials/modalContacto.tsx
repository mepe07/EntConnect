

import React from 'react';

interface ModalContactoProps {
    isOpen: boolean;
    onClose: () => void;
    vendedor: {
        nome: string;
        contacto: string;
        email: string;
    } | null;
    nomeArtigo: string;
}

export function ModalContacto({ isOpen, onClose, vendedor, nomeArtigo }: ModalContactoProps) {
    if (!isOpen || !vendedor) return null;

    return (
        <>
            <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
                onClick={onClose}
            ></div>

            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', width: '90%', maxWidth: '400px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', zIndex: 1001, padding: '2rem', textAlign: 'center' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🤝</div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem' }}>Pedido Aprovado!</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Combina a entrega do artigo <strong>{nomeArtigo}</strong>.</p>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <p style={{ margin: '0 0 1rem 0', color: '#1e293b', fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                        👤 {vendedor.nome}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem', color: '#475569' }}>
                        <span style={{ fontSize: '1.2rem' }}>📞</span>
                        <a href={`tel:${vendedor.contacto}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>
                            {vendedor.contacto || 'Sem contacto associado'}
                        </a>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#475569' }}>
                        <span style={{ fontSize: '1.2rem' }}>✉️</span>
                        <a href={`mailto:${vendedor.email}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>
                            {vendedor.email || 'Sem e-mail associado'}
                        </a>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    style={{ marginTop: '1.5rem', width: '100%', background: '#f1f5f9', color: '#475569', border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    Fechar
                </button>
            </div>
        </>
    );
}