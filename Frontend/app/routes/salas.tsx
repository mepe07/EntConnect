// Ficheiro: app/routes/tabelas/salas.tsx

// LÓGICA: Vamos importar o componente gigante "Salas" que programámos na pasta "views".
// (Atenção: verifica se o caminho abaixo bate certo com as tuas pastas! Assumi que gravaste 
// o ficheiro anterior dentro de "app/views/tabelas/salas.tsx")
import { Salas } from "../views/infraestrutura/salas/salas";

// O React Router v7 exige sempre que o ficheiro da rota tenha um "export default"
export default function SalasRoute() {
    return <Salas />;
} 