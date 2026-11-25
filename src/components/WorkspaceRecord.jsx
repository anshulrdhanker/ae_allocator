export function RecordHeader({kicker, title, description, properties}) {
  return <header className="compact-record">
    <div>
      <span className="record-kicker"><span className="record-status-icon" aria-hidden="true">◉</span> {kicker}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    <div className="record-properties">
      <span className="properties-title">Properties</span>
      {properties.map(([label, value]) =>
        <span key={label} className="property-line"><span>{label}</span>{value}</span>
      )}
    </div>
  </header>;
}

export function AgentHeader({task, status, iconStyle}) {
  return <header className="workbench-header">
    <strong><span className="workbench-icon" style={iconStyle} aria-hidden="true">✦</span> Routing Agent{task && <span className="workbench-subtitle"> / {task}</span>}</strong>
    {status && <span>{status}</span>}
  </header>;
}
