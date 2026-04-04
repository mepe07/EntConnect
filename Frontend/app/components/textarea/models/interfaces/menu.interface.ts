export interface MenuItem {
    titulo: string;       
    path?: string;        
    icone?: string;       
    submenu?: MenuItem[]; 
}

export interface MenuConfig {
    [role: string]: MenuItem[]; 
}