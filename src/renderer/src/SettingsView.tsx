interface Props {
  recentFiles: string[]
  onOpenRecent: (path: string) => void
}

export default function SettingsView({ recentFiles, onOpenRecent }: Props): JSX.Element {
  return (
    <div className="view-container">
      <div className="view-header">
        <h3>Settings</h3>
      </div>
      <section className="settings-section">
        <h4>Recent Files</h4>
        {recentFiles.length === 0 ? (
          <p className="placeholder-sub">No recent files.</p>
        ) : (
          <ul className="recent-list">
            {recentFiles.map((f) => (
              <li key={f}>
                <button className="recent-item" onClick={() => onOpenRecent(f)} title={f}>
                  {f.split(/[/\\]/).pop()}
                  <span className="recent-path">{f}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
