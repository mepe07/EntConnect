import type { CardComponentProps } from './card-props.interface';
import './card.component.scss';

/**
 * Card partilhado para apresentar conteúdo compacto com configuração visual.
 *
 * @param options - Propriedades do card.
 * @returns Elemento de card configurado.
 */
export function CardComponent(options: CardComponentProps) {
  return (
    <>
      <div className={`card ${options.type ? `card-${options.type}` : ''} ${options.onClick ? 'has-action' : ''}`} onClick={options.onClick}>
        <div className="card-header">
          <h3>{options.title}</h3>
        </div>
        <div className="card-body">
          <p>{options.description}</p>
        </div>
      </div>
    </>
  );
}
