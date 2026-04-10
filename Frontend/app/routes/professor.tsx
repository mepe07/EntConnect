// LÓGICA: Vamos importar o componente gigante "Modalidades" que programámos na pasta "views".
// (Atenção: verifica se o caminho abaixo bate certo com as tuas pastas! Assumi que gravaste 
// o ficheiro anterior dentro de "app/views/tabelas/modalidades.tsx")
import { Professores } from "../views/utilizadores/professores/professor";

// O React Router v7 exige sempre que o ficheiro da rota tenha um "export default"
export default function ProfessoresRoute() {
    return <Professores />;
} 
