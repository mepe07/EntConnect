import type { CardComponentProps } from './card-props.interface';
import './card.component.scss';

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
