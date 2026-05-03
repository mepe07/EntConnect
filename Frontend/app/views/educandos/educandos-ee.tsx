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

const eeService = new EEService();

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
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(true);

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
                                </article>
                            );
                        })
                    )}

                    {erro && <div className="mensagem erro">{erro}</div>}
                </div>
            </section>
        </main>
    );
}
