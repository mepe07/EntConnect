/**
 * Item de navegação usado nos menus da aplicação.
 */
export interface MenuItem {
    titulo: string;       
    path?: string;        
    icone?: string;       
    submenu?: MenuItem[]; 
}

/**
 * Configuração de menu por role.
 */
export interface MenuConfig {
    [role: string]: MenuItem[]; 
}
