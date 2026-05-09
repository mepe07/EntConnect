import { ButtonComponent } from '~/components/button/button.component';
import { useTheme } from '~/utils/theme';
import './theme-toggle.scss';

type ThemeToggleProps = {
    className?: string;
};

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
    const { isDarkTheme, toggleTheme } = useTheme();
    const iconClassName = isDarkTheme ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    const title = isDarkTheme ? 'Mudar para modo claro' : 'Mudar para modo escuro';

    return (
        <ButtonComponent
            type="button"
            className={`theme-toggle-button ${className}`.trim()}
            onClick={toggleTheme}
            title={title}
            aria-label={title}
        >
            <i className={iconClassName} aria-hidden="true"></i>
        </ButtonComponent>
    );
}
