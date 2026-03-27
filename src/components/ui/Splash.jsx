export default function Splash() {
  return (
    <div className="splash">
      <div className="splash-logo">
        <div className="splash-icon">📺</div>
        <div className="splash-name"><em>NK</em>iptv</div>
      </div>
      <div className="splash-loader">
        <span /><span /><span />
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
        10 000+ chaînes du monde entier
      </p>
    </div>
  )
}
