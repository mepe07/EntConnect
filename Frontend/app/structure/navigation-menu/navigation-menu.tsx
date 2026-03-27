import './navigation-menu.scss';
import { useLocation, Link } from 'react-router';

export function NavigationMenu() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  const isActive = (route: string) => {
    const normalized = route === '/' ? '/' : `/${route}`;
    return path === normalized;
  };

  return (
    <div className="navigation-menu">
      <ul>
        <Link to="">
          <li className={isActive('dashboard') || isActive('/') ? 'active' : ''}>
            Dashboard
          </li>
        </Link>
        <Link to="/marketplace">
        <li className={isActive('marketplace') ? 'active' : ''}>
          Marketplace
        </li>
        </Link>
        <Link to="/faturacao">
        <li className={isActive('faturacao') ? 'active' : ''}>
          Faturação
        </li>
        </Link>
        <Link to="/configuracoes">
          <li className={isActive('configuracoes') ? 'active' : ''}>
            Configurações
          </li>
        </Link>
      </ul>
    </div>
  );
}