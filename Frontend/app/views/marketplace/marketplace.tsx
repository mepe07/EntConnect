import React, { useState } from 'react';
import { InputComponent } from "~/components/input/input.component";
import { SelectBoxComponent } from "~/components/selectbox/selectbox.component";
import './marketplace.scss';

export function Marketplace() {
    // ESTADOS PARA OS FILTROS
    const [termoPesquisa, setTermoPesquisa] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("todas");

    // LÓGICA: A nossa base de dados fictícia do OLX Escolar
    const anuncios = [
        {
            id: 1,
            titulo: "Tutu de Ballet Clássico (Branco)",
            categoria: "danca",
            tamanho: "8 Anos",
            estado: "Como Novo",
            publicadoPor: "Sara Matos (EE)",
            contacto: "sara.matos@exemplo.pt",
            icone: "fa-solid fa-person-dress"
        },
        {
            id: 2,
            titulo: "Farda Oficial - Casaco de Inverno",
            categoria: "fardas",
            tamanho: "12 Anos",
            estado: "Usado - Bom",
            publicadoPor: "Rui Ferreira (EE)",
            contacto: "rui.ferreira@exemplo.pt",
            icone: "fa-solid fa-shirt"
        },
        {
            id: 3,
            titulo: "Sapatilhas de Meia Ponta",
            categoria: "calcado",
            tamanho: "Tam. 34",
            estado: "Novo com Etiqueta",
            publicadoPor: "Profª. Sofia (Docente)",
            contacto: "sofia.docente@entartes.pt",
            icone: "fa-solid fa-shoe-prints"
        },
        {
            id: 4,
            titulo: "T-shirt de Educação Física",
            categoria: "fardas",
            tamanho: "10 Anos",
            estado: "Com marcas de uso",
            publicadoPor: "Carlos Silva (EE)",
            contacto: "carlos.silva@exemplo.pt",
            icone: "fa-solid fa-tshirt"
        }
    ];

    // LÓGICA DE FILTRAGEM MULTI-CRITÉRIO
    const anunciosFiltrados = anuncios.filter((anuncio) => {
        const passaPesquisa = anuncio.titulo.toLowerCase().includes(termoPesquisa.toLowerCase());
        const passaCategoria = filtroCategoria === "todas" ? true : anuncio.categoria === filtroCategoria;
        return passaPesquisa && passaCategoria;
    });

    return (
        <div className="marketplace-container">
      
            {/* 1. HERO HEADER: Apresentação e Botão de Ação */}
            <div className="hero-header">
                <div className="hero-content">
                    <div className="icone-gigante"><i className="fa-solid fa-hand-holding-heart"></i></div>
                    <div className="textos-hero">
                        <h1>Mercado de Partilha</h1>
                        <p>Dá uma nova vida às fardas e equipamentos. Entra em contacto direto com quem publicou.</p>
                    </div>
                </div>
                <button className="btn-publicar">
                    <i className="fa-solid fa-plus"></i> Publicar Anúncio
                </button>
            </div>

            {/* 2. TOOLBAR: Os nossos filtros reaproveitados */}
            <div className="toolbar">
                <div className="toolbar-filtros">
                    <div className="filtro-pesquisa">
                        <InputComponent 
                            id="pesquisa-anuncio" 
                            placeholder="🔍 Procurar por peça (ex: Casaco)..." 
                            value={termoPesquisa} 
                            onChange={(e) => setTermoPesquisa(e.target.value)} 
                        />
                    </div>
                    <div className="filtro-categoria">
                        <SelectBoxComponent
                            id="filtro-cat"
                            selectedOption={filtroCategoria}
                            onChange={(e) => setFiltroCategoria(e.target.value)}
                            options={[
                                { value: "todas", label: "Todas as Categorias" },
                                { value: "fardas", label: "👕 Fardas Oficiais" },
                                { value: "danca", label: "🩰 Roupas de Dança" },
                                { value: "calcado", label: "👟 Calçado" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* 3. A MONTRA: Grelha de Classificados */}
            {anunciosFiltrados.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🧥</div>
                    <h3>Guarda-roupa vazio!</h3>
                    <p>Nenhum anúncio encontrado para esta pesquisa.</p>
                </div>
            ) : (
                <div className="produtos-grid">
                    {anunciosFiltrados.map((anuncio) => (
                        <div key={anuncio.id} className="cartao-anuncio">
              
                            {/* Espaço reservado para a fotografia da peça (usamos um ícone gigante por agora) */}
                            <div className="foto-placeholder">
                                <i className={anuncio.icone}></i>
                            </div>

                            <div className="anuncio-corpo">
                                <h2>{anuncio.titulo}</h2>
                
                                {/* Tags de Informação (Tamanho e Estado) */}
                                <div className="tags-info">
                                    <span className="tag tamanho"><i className="fa-solid fa-ruler"></i> {anuncio.tamanho}</span>
                                    <span className="tag estado"><i className="fa-solid fa-tag"></i> {anuncio.estado}</span>
                                </div>

                                {/* Informação do Anunciante */}
                                <div className="info-vendedor">
                                    <div className="avatar-pequeno"><i className="fa-solid fa-user"></i></div>
                                    <div className="textos-vendedor">
                                        <span className="label">Publicado por</span>
                                        <strong>{anuncio.publicadoPor}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="anuncio-rodape">
                                {/* LÓGICA SÉNIOR: Usar o href="mailto:" para abrir o cliente de email do utilizador! */}
                                <a href={`mailto:${anuncio.contacto}?subject=Interesse no anúncio: ${anuncio.titulo}`} className="btn-contactar">
                                    <i className="fa-regular fa-envelope"></i> Contactar
                                </a>
                            </div>

                        </div>
                    ))}
                </div>
            )}

        </div>
    );
} 