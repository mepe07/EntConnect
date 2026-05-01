import './educandos-ee.scss';
import { useEffect, useState } from 'react';
import { EEService } from '~/services/EE.service';

interface Educando {
    ID_aluno: number;
    Nome: string;
    Data_Nascimento: string;
    NIF: string;
    Mail?: string | null;
    Contato?: string | null;
    Menor_Idade: boolean;
}

interface EducandoForm {
    idAluno?: number;
    nome: string;
    dataNascimento: string;
    nif: string;
    mail: string;
    contato: string;
}

const eeService = new EEService();

const FORM_VAZIO: EducandoForm = {
    nome: '',
    dataNascimento: '',
    nif: '',
    mail: '',
    contato: '',
};

function formatarDataInput(data?: string | null) {
    if (!data) return '';
    return data.includes('T') ? data.split('T')[0] : data;
}

function calcularIdade(data?: string | null) {
    if (!data) return null;

    const nascimento = new Date(data);
    if (Number.isNaN(nascimento.getTime())) return null;

    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade -= 1;
    }

    return idade;
}

export function EducandosEE() {
    const [educandos, setEducandos] = useState<Educando[]>([]);
    const [form, setForm] = useState<EducandoForm>(FORM_VAZIO);
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);

    useEffect(() => {
        carregarEducandos();
    }, []);

    async function carregarEducandos() {
        setLoading(true);
        setErro('');

        try {
            const dados = await eeService.getMeusEducandos();
            setEducandos(dados);
        } catch (error: any) {
            setErro(error?.message || 'Erro ao carregar os educandos.');
        } finally {
            setLoading(false);
        }
    }

    function atualizarForm(campo: keyof EducandoForm, valor: string) {
        setForm((atual) => ({ ...atual, [campo]: valor }));
        setErro('');
        setSucesso('');
    }

    function editarEducando(educando: Educando) {
        setForm({
            idAluno: educando.ID_aluno,
            nome: educando.Nome || '',
            dataNascimento: formatarDataInput(educando.Data_Nascimento),
            nif: educando.NIF || '',
            mail: educando.Mail || '',
            contato: educando.Contato || '',
        });
        setErro('');
        setSucesso('');
    }

    function limparForm() {
        setForm(FORM_VAZIO);
        setErro('');
        setSucesso('');
    }

    function validarForm() {
        if (form.nome.trim().length < 3) {
            return 'O nome deve ter pelo menos 3 caracteres.';
        }

        if (!form.dataNascimento) {
            return 'A data de nascimento e obrigatoria.';
        }

        if (!/^\d{9}$/.test(form.nif.trim())) {
            return 'O NIF deve ter exatamente 9 digitos.';
        }

        if (form.contato.trim() && !/^\d{9}$/.test(form.contato.trim())) {
            return 'O contacto deve ter exatamente 9 digitos.';
        }

        if (form.mail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.mail.trim())) {
            return 'Introduz um email valido.';
        }

        return '';
    }

    async function guardarEducando() {
        const erroValidacao = validarForm();
        if (erroValidacao) {
            setErro(erroValidacao);
            return;
        }

        setSaving(true);
        setErro('');
        setSucesso('');

        const payload = {
            nome: form.nome.trim(),
            dataNascimento: form.dataNascimento,
            nif: form.nif.trim(),
            mail: form.mail.trim() || undefined,
            contato: form.contato.trim() || undefined,
        };

        try {
            if (form.idAluno) {
                await eeService.atualizarMeuEducando(form.idAluno, payload);
                setSucesso('Educando atualizado com sucesso.');
            } else {
                await eeService.criarMeuEducando(payload);
                setSucesso('Educando adicionado com sucesso.');
            }

            setForm(FORM_VAZIO);
            await carregarEducandos();
        } catch (error: any) {
            setErro(error?.message || 'Erro ao guardar o educando.');
        } finally {
            setSaving(false);
        }
    }

    async function removerEducando(educando: Educando) {
        const confirmar = window.confirm(`Remover "${educando.Nome}" dos teus educandos?`);
        if (!confirmar) return;

        setRemovingId(educando.ID_aluno);
        setErro('');
        setSucesso('');

        try {
            await eeService.removerMeuEducando(educando.ID_aluno);
            if (form.idAluno === educando.ID_aluno) {
                setForm(FORM_VAZIO);
            }
            setSucesso('Educando removido com sucesso.');
            await carregarEducandos();
        } catch (error: any) {
            setErro(error?.message || 'Erro ao remover o educando.');
        } finally {
            setRemovingId(null);
        }
    }

    return (
        <main className="pagina-educandos-ee">
            <div className="cabecalho-educandos">
                <div>
                    <h1>Os Meus Educandos</h1>
                    <span>{educandos.length} associado(s)</span>
                </div>
            </div>

            <section className="conteudo-educandos">
                <div className="lista-educandos">
                    {loading ? (
                        <div className="estado-lista">
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            <span>A carregar...</span>
                        </div>
                    ) : educandos.length === 0 ? (
                        <div className="estado-lista">
                            <i className="fa-solid fa-user-graduate"></i>
                            <span>Sem educandos associados.</span>
                        </div>
                    ) : (
                        educandos.map((educando) => {
                            const idade = calcularIdade(educando.Data_Nascimento);

                            return (
                                <article className="educando-item" key={educando.ID_aluno}>
                                    <div className="educando-principal">
                                        <strong>{educando.Nome}</strong>
                                        <span>NIF {educando.NIF}</span>
                                    </div>

                                    <div className="educando-detalhes">
                                        <span>{idade === null ? 'Idade por calcular' : `${idade} anos`}</span>
                                        {educando.Mail && <span>{educando.Mail}</span>}
                                        {educando.Contato && <span>{educando.Contato}</span>}
                                    </div>

                                    <div className="educando-acoes">
                                        <button type="button" title="Editar" onClick={() => editarEducando(educando)}>
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                        <button
                                            type="button"
                                            title="Remover"
                                            className="remover"
                                            onClick={() => removerEducando(educando)}
                                            disabled={removingId === educando.ID_aluno}
                                        >
                                            <i className={removingId === educando.ID_aluno ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-trash'}></i>
                                        </button>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>

                <aside className="form-educando">
                    <div className="form-header">
                        <h2>{form.idAluno ? 'Editar Educando' : 'Adicionar Educando'}</h2>
                        {form.idAluno && (
                            <button type="button" onClick={limparForm}>
                                Cancelar
                            </button>
                        )}
                    </div>

                    <label>
                        Nome
                        <input
                            type="text"
                            value={form.nome}
                            onChange={(event) => atualizarForm('nome', event.target.value)}
                        />
                    </label>

                    <label>
                        Data de nascimento
                        <input
                            type="date"
                            value={form.dataNascimento}
                            onChange={(event) => atualizarForm('dataNascimento', event.target.value)}
                        />
                    </label>

                    <label>
                        NIF
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={9}
                            value={form.nif}
                            onChange={(event) => atualizarForm('nif', event.target.value)}
                        />
                    </label>

                    <label>
                        Contacto
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={9}
                            value={form.contato}
                            onChange={(event) => atualizarForm('contato', event.target.value)}
                        />
                    </label>

                    <label>
                        Email
                        <input
                            type="email"
                            value={form.mail}
                            onChange={(event) => atualizarForm('mail', event.target.value)}
                        />
                    </label>

                    {erro && <div className="mensagem erro">{erro}</div>}
                    {sucesso && <div className="mensagem sucesso">{sucesso}</div>}

                    <button type="button" className="guardar" onClick={guardarEducando} disabled={saving}>
                        {saving ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                A guardar...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-floppy-disk"></i>
                                Guardar
                            </>
                        )}
                    </button>
                </aside>
            </section>
        </main>
    );
}
