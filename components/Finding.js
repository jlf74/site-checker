import Icon from './Icon';

export const SEV_LABEL = { critical: 'критично', warning: 'замечание', ok: 'в порядке' };

export default function Finding({ finding, expanded, onToggle, locked }) {
  const hasBody = !!(finding.quote || finding.fix);
  return (
    <div className={`finding ${finding.severity}`}>
      <button className="finding-head" onClick={onToggle} style={!onToggle ? { cursor: 'default' } : undefined}>
        <span className={`sev-badge ${finding.severity}`}>{SEV_LABEL[finding.severity]}</span>
        <span className="finding-title">{finding.title}</span>
        <span className="finding-meta">
          {/* Штраф и статья стоят колонкой: сумма — крупно, статья под ней мелко.
              Цена вопроса должна считываться без чтения заголовка. */}
          {(finding.fine || finding.law) && (
            <span className="finding-numbers">
              {finding.fine && <span className="finding-fine">{finding.fine}</span>}
              {finding.law && <span className="finding-law">{finding.law}</span>}
            </span>
          )}
          {locked ? (
            <Icon name="lock" size={16} style={{ color: 'var(--c-faint)' }} />
          ) : hasBody ? (
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} style={{ color: 'var(--c-faint)' }} />
          ) : (
            <Icon name="check" size={16} style={{ color: 'var(--c-ring)' }} />
          )}
        </span>
      </button>
      {expanded && !locked && hasBody && (
        <div className="finding-body">
          {finding.quote && <div className="finding-quote">{finding.quote}</div>}
          {finding.fix && (
            <>
              <div className="finding-label">Как исправить</div>
              <div>{finding.fix}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
