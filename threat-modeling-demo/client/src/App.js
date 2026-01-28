import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';

// API Client - Use environment variable or default to localhost:7001
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:7001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Context
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

// Sidebar Component
function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">🛡️ Threat Modeling</div>
      <div className="sidebar-subtitle">STRIDE • PASTA • DREAD</div>

      <nav>
        <div className="nav-section">
          <div className="nav-section-title">Overview</div>
          <Link to="/" className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
            <span className="nav-icon">📊</span> Dashboard
          </Link>
          <Link to="/demo" className={`nav-link ${isActive('/demo') ? 'active' : ''}`}>
            <span className="nav-icon">🎮</span> Interactive Demo
          </Link>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Frameworks</div>
          <Link to="/stride" className={`nav-link ${isActive('/stride') ? 'active' : ''}`}>
            <span className="nav-icon">🎯</span> STRIDE
          </Link>
          <Link to="/pasta" className={`nav-link ${isActive('/pasta') ? 'active' : ''}`}>
            <span className="nav-icon">🍝</span> PASTA
          </Link>
          <Link to="/dread" className={`nav-link ${isActive('/dread') ? 'active' : ''}`}>
            <span className="nav-icon">📈</span> DREAD
          </Link>
        </div>

        {user && (
          <div className="nav-section">
            <div className="nav-section-title">Manage</div>
            <Link to="/threats" className={`nav-link ${isActive('/threats') ? 'active' : ''}`}>
              <span className="nav-icon">⚠️</span> Threats
            </Link>
            <Link to="/assets" className={`nav-link ${isActive('/assets') ? 'active' : ''}`}>
              <span className="nav-icon">📦</span> Assets
            </Link>
            <Link to="/analysis" className={`nav-link ${isActive('/analysis') ? 'active' : ''}`}>
              <span className="nav-icon">🔍</span> Analysis
            </Link>
          </div>
        )}

        <div className="nav-section" style={{ marginTop: 'auto' }}>
          <div className="nav-section-title">Account</div>
          {user ? (
            <>
              <div className="nav-link" style={{ cursor: 'default' }}>
                <span className="nav-icon">👤</span> {user.username}
              </div>
              <button onClick={logout} className="nav-link" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="nav-icon">🚪</span> Logout
              </button>
            </>
          ) : (
            <Link to="/login" className={`nav-link ${isActive('/login') ? 'active' : ''}`}>
              <span className="nav-icon">🔑</span> Login
            </Link>
          )}
        </div>
      </nav>
    </aside>
  );
}

// Dashboard Page
function Dashboard() {
  const [stats, setStats] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      api.get('/threats/summary').then(res => setStats(res.data)).catch(() => {});
    }
  }, [user]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Threat Modeling Dashboard</h1>
        <p className="page-description">
          Learn and apply STRIDE, PASTA, and DREAD threat modeling methodologies
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">3</div>
          <div className="stat-label">Frameworks Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">6</div>
          <div className="stat-label">STRIDE Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">7</div>
          <div className="stat-label">PASTA Stages</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">5</div>
          <div className="stat-label">DREAD Factors</div>
        </div>
      </div>

      {stats && (
        <div className="card">
          <h2 className="card-title">Your Threat Summary</h2>
          <div className="stats-grid" style={{ marginTop: '1rem' }}>
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Threats</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.averageScore}</div>
              <div className="stat-label">Avg DREAD Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.byRiskLevel?.CRITICAL || 0}</div>
              <div className="stat-label">Critical Risks</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.byRiskLevel?.HIGH || 0}</div>
              <div className="stat-label">High Risks</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">Quick Start</h2>
        <p className="card-description" style={{ marginBottom: '1rem' }}>
          Choose a framework to get started with threat modeling
        </p>
        <div className="stride-grid">
          <Link to="/stride" style={{ textDecoration: 'none' }}>
            <div className="stride-card">
              <div className="stride-card-header">
                <div className="stride-icon spoofing">🎯</div>
                <div>
                  <h3>STRIDE</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Threat Identification</p>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Identify threats by category: Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege
              </p>
            </div>
          </Link>
          <Link to="/pasta" style={{ textDecoration: 'none' }}>
            <div className="stride-card">
              <div className="stride-card-header">
                <div className="stride-icon tampering">🍝</div>
                <div>
                  <h3>PASTA</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Risk-Centric Analysis</p>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                7-stage process with attack simulation for comprehensive threat analysis
              </p>
            </div>
          </Link>
          <Link to="/dread" style={{ textDecoration: 'none' }}>
            <div className="stride-card">
              <div className="stride-card-header">
                <div className="stride-icon denial">📈</div>
                <div>
                  <h3>DREAD</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Risk Scoring</p>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Quantitative risk scoring (0-10) to prioritize threat remediation
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// STRIDE Page
function StridePage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/demo/stride/example').then(res => setData(res.data)).catch(console.error);
  }, []);

  if (!data) return <div className="spinner" />;

  const categoryIcons = {
    S: { icon: '🎭', class: 'spoofing' },
    T: { icon: '✏️', class: 'tampering' },
    R: { icon: '🙈', class: 'repudiation' },
    I: { icon: '👁️', class: 'information' },
    D: { icon: '💥', class: 'denial' },
    E: { icon: '⬆️', class: 'elevation' },
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">STRIDE Threat Model</h1>
        <p className="page-description">{data.framework.description}</p>
      </div>

      <div className="alert alert-info">
        <strong>What is STRIDE?</strong> {data.explanation.whatIsSTRIDE}
      </div>

      <div className="card">
        <h2 className="card-title">The Six Categories</h2>
        <div className="stride-grid" style={{ marginTop: '1rem' }}>
          {data.explanation.categories.map(cat => (
            <div key={cat.code} className="stride-card">
              <div className="stride-card-header">
                <div className={`stride-icon ${categoryIcons[cat.code].class}`}>
                  {categoryIcons[cat.code].icon}
                </div>
                <div>
                  <h3>{cat.name}</h3>
                  <span className="badge badge-info">{cat.protects}</span>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {cat.question}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Example Analysis: {data.asset.name}</h2>
        <p className="card-description">Asset Type: {data.asset.type}</p>
        
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Properties</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {data.asset.isPublicFacing && <span className="badge badge-high">Public Facing</span>}
            {data.asset.handlesUserInput && <span className="badge badge-high">Handles User Input</span>}
            {data.asset.containsSensitiveData && <span className="badge badge-critical">Contains Sensitive Data</span>}
            {data.asset.hasAuditLog && <span className="badge badge-low">Has Audit Log</span>}
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Identified Threats</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Threats</th>
                  <th>Recommendations</th>
                </tr>
              </thead>
              <tbody>
                {data.analysis.threats.filter(t => t.applicable).map(threat => (
                  <tr key={threat.category}>
                    <td>
                      <strong>{threat.categoryName}</strong>
                      <br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {threat.securityProperty}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${threat.severity.toLowerCase()}`}>
                        {threat.severity}
                      </span>
                    </td>
                    <td>
                      <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                        {threat.specificThreats.map((t, i) => (
                          <li key={i} style={{ fontSize: '0.875rem' }}>{t}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                        {threat.recommendations.map((r, i) => (
                          <li key={i} style={{ fontSize: '0.875rem' }}>{r}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">How to Use STRIDE</h2>
        <ol style={{ paddingLeft: '1.5rem' }}>
          {data.explanation.howToUse.map((step, i) => (
            <li key={i} style={{ marginBottom: '0.5rem' }}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// DREAD Page with Calculator
function DreadPage() {
  const [data, setData] = useState(null);
  const [ratings, setRatings] = useState({
    damage: 5,
    reproducibility: 5,
    exploitability: 5,
    affectedUsers: 5,
    discoverability: 5,
  });
  const [score, setScore] = useState(null);

  useEffect(() => {
    api.get('/demo/dread/example').then(res => setData(res.data)).catch(console.error);
  }, []);

  const calculateScore = () => {
    api.post('/demo/interactive/dread', { ratings })
      .then(res => setScore(res.data.score))
      .catch(console.error);
  };

  const factorInfo = {
    damage: { label: 'Damage Potential', desc: 'How bad would the impact be?' },
    reproducibility: { label: 'Reproducibility', desc: 'How easy to reproduce?' },
    exploitability: { label: 'Exploitability', desc: 'How easy to attack?' },
    affectedUsers: { label: 'Affected Users', desc: 'How many impacted?' },
    discoverability: { label: 'Discoverability', desc: 'How easy to find?' },
  };

  if (!data) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">DREAD Risk Scoring</h1>
        <p className="page-description">{data.framework.description}</p>
      </div>

      <div className="alert alert-info">
        <strong>What is DREAD?</strong> {data.explanation.whatIsDREAD}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
        <div className="card">
          <h2 className="card-title">Calculate Your Risk Score</h2>
          <p className="card-description" style={{ marginBottom: '1.5rem' }}>
            Adjust the sliders to rate each factor (0-10)
          </p>

          {Object.entries(ratings).map(([key, value]) => (
            <div key={key} className="dread-slider">
              <div className="dread-slider-header">
                <span className="dread-slider-label">{factorInfo[key].label}</span>
                <span className="dread-slider-value">{value}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={value}
                onChange={(e) => setRatings({ ...ratings, [key]: parseInt(e.target.value) })}
              />
              <div className="dread-slider-description">{factorInfo[key].desc}</div>
            </div>
          ))}

          <button className="btn btn-primary" onClick={calculateScore} style={{ marginTop: '1rem' }}>
            Calculate Score
          </button>
        </div>

        <div className="card">
          <h2 className="card-title">Risk Score</h2>
          {score ? (
            <>
              <div className="score-display">
                <div className={`score-value score-${score.riskLevel.level.toLowerCase()}`}>
                  {score.total}
                </div>
                <div className="score-label">out of 10</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className={`badge badge-${score.riskLevel.level.toLowerCase()}`}>
                  {score.riskLevel.level}
                </span>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                  {score.riskLevel.action}
                </p>
              </div>
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem' }}>
                <strong style={{ fontSize: '0.875rem' }}>Timeline:</strong>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{score.recommendation.timeline}</p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Adjust sliders and click Calculate
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Common Vulnerability Scores</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vulnerability</th>
                <th>D</th>
                <th>R</th>
                <th>E</th>
                <th>A</th>
                <th>D</th>
                <th>Score</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.commonVulnerabilities).map(([name, vuln]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{vuln.damage}</td>
                  <td>{vuln.reproducibility}</td>
                  <td>{vuln.exploitability}</td>
                  <td>{vuln.affectedUsers}</td>
                  <td>{vuln.discoverability}</td>
                  <td><strong>{vuln.total}</strong></td>
                  <td>
                    <span className={`badge badge-${vuln.riskLevel.toLowerCase()}`}>
                      {vuln.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// PASTA Page
// Helper function to render PASTA findings as formatted tables
function renderFindings(findings) {
  if (!findings) return null;
  
  // Helper to format a value for display
  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      if (value.length === 0) return '-';
      if (typeof value[0] === 'string') return value.join(', ');
      // Array of objects - render as mini list
      return (
        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
          {value.map((item, i) => (
            <li key={i} style={{ fontSize: '0.8rem' }}>
              {typeof item === 'object' ? Object.values(item).filter(v => typeof v === 'string').join(' - ') || JSON.stringify(item) : String(item)}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof value === 'object') {
      // Object - render key-value pairs inline or as sub-list
      const entries = Object.entries(value);
      if (entries.length <= 3 && entries.every(([k, v]) => typeof v === 'string' || typeof v === 'number')) {
        return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
      }
      return (
        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
          {entries.map(([k, v]) => (
            <li key={k} style={{ fontSize: '0.8rem' }}>
              <strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </li>
          ))}
        </ul>
      );
    }
    return String(value);
  };
  
  // Handle array of simple strings
  if (Array.isArray(findings) && typeof findings[0] === 'string') {
    return (
      <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
        {findings.map((item, i) => (
          <li key={i} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>{item}</li>
        ))}
      </ul>
    );
  }
  
  // Handle array of objects
  if (Array.isArray(findings) && typeof findings[0] === 'object') {
    const keys = Object.keys(findings[0]);
    return (
      <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
        <table style={{ fontSize: '0.8rem' }}>
          <thead>
            <tr>
              {keys.map(key => (
                <th key={key} style={{ textTransform: 'capitalize', padding: '0.5rem' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {findings.map((row, i) => (
              <tr key={i}>
                {keys.map(key => (
                  <td key={key} style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                    {formatValue(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  // Handle single object with key-value pairs
  if (typeof findings === 'object' && !Array.isArray(findings)) {
    return (
      <div className="table-container">
        <table style={{ fontSize: '0.8rem' }}>
          <tbody>
            {Object.entries(findings).map(([key, value]) => (
              <tr key={key}>
                <td style={{ padding: '0.5rem', fontWeight: '500', textTransform: 'capitalize', verticalAlign: 'top', width: '150px' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </td>
                <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                  {formatValue(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  // Fallback to JSON
  return (
    <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '200px' }}>
      {JSON.stringify(findings, null, 2)}
    </pre>
  );
}

function PastaPage() {
  const [data, setData] = useState(null);
  const [activeStage, setActiveStage] = useState(1);

  useEffect(() => {
    api.get('/demo/pasta/example').then(res => setData(res.data)).catch(console.error);
  }, []);

  if (!data) return <div className="spinner" />;

  const currentStage = data.analysis.stages.find(s => s.number === activeStage);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">PASTA Threat Model</h1>
        <p className="page-description">{data.framework.description}</p>
      </div>

      <div className="alert alert-info">
        <strong>What is PASTA?</strong> {data.explanation.whatIsPASTA}
      </div>

      <div className="card">
        <h2 className="card-title">The 7 Stages</h2>
        <div className="tabs">
          {data.analysis.stages.map(stage => (
            <button
              key={stage.number}
              className={`tab ${activeStage === stage.number ? 'active' : ''}`}
              onClick={() => setActiveStage(stage.number)}
            >
              {stage.number}. {stage.name.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>

        {currentStage && (
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>Stage {currentStage.number}: {currentStage.name}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{currentStage.description}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Activities</h4>
                <ul style={{ paddingLeft: '1.25rem' }}>
                  {currentStage.activities.map((a, i) => (
                    <li key={i} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Outputs</h4>
                <ul style={{ paddingLeft: '1.25rem' }}>
                  {currentStage.outputs.map((o, i) => (
                    <li key={i} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>

            {currentStage.findings && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Example Findings</h4>
                {renderFindings(currentStage.findings)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">When to Use PASTA</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          {data.explanation.whenToUse.map((item, i) => (
            <li key={i} style={{ marginBottom: '0.5rem' }}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Demo Page
function DemoPage() {
  const [example, setExample] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [customAsset, setCustomAsset] = useState({ name: '', type: 'api' });
  const [strideResult, setStrideResult] = useState(null);
  const [customThreat, setCustomThreat] = useState('');
  const [dreadRatings, setDreadRatings] = useState({
    damage: 5, reproducibility: 5, exploitability: 5, affectedUsers: 5, discoverability: 5
  });
  const [dreadResult, setDreadResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/demo/full-example').then(res => setExample(res.data)).catch(console.error);
  }, []);

  const runStrideAnalysis = async () => {
    if (!customAsset.name) return;
    setLoading(true);
    try {
      const res = await api.post('/demo/interactive/stride', { asset: customAsset });
      setStrideResult(res.data);
      setActiveStep(2);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const runDreadScoring = async () => {
    if (!customThreat) return;
    setLoading(true);
    try {
      const res = await api.post('/demo/interactive/dread', { 
        threat: customThreat,
        ratings: dreadRatings 
      });
      setDreadResult(res.data);
      setActiveStep(3);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const assetTypes = [
    { value: 'api', label: 'API Endpoint' },
    { value: 'database', label: 'Database' },
    { value: 'authentication', label: 'Authentication System' },
    { value: 'storage', label: 'File Storage' },
    { value: 'network', label: 'Network Component' },
  ];

  if (!example) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Interactive Threat Modeling Workshop</h1>
        <p className="page-description">Walk through the threat modeling process step by step</p>
      </div>

      {/* Step Indicators */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { num: 1, title: 'Identify Assets' },
          { num: 2, title: 'STRIDE Analysis' },
          { num: 3, title: 'DREAD Scoring' },
        ].map(step => (
          <div 
            key={step.num}
            onClick={() => setActiveStep(step.num)}
            style={{ 
              flex: 1, 
              padding: '1rem', 
              background: activeStep === step.num ? 'var(--primary)' : 'var(--bg-card)',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              textAlign: 'center',
              border: activeStep >= step.num ? '2px solid var(--primary)' : '2px solid transparent'
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Step {step.num}</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{step.title}</div>
          </div>
        ))}
      </div>

      {/* Step 1: Asset Identification */}
      {activeStep === 1 && (
        <div className="card">
          <h2 className="card-title">Step 1: Identify Your Asset</h2>
          <p className="card-description" style={{ marginBottom: '1.5rem' }}>
            Enter the name and type of the component you want to analyze for security threats.
          </p>
          
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Asset Name</label>
              <input
                type="text"
                value={customAsset.name}
                onChange={(e) => setCustomAsset({ ...customAsset, name: e.target.value })}
                placeholder="e.g., User Login API, Payment Database"
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-dark)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Asset Type</label>
              <select
                value={customAsset.type}
                onChange={(e) => setCustomAsset({ ...customAsset, type: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-dark)',
                  color: 'var(--text-primary)'
                }}
              >
                {assetTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={runStrideAnalysis}
              disabled={!customAsset.name || loading}
            >
              {loading ? 'Analyzing...' : 'Run STRIDE Analysis →'}
            </button>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem' }}>
            <strong>💡 Example Assets:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>User Authentication Service</li>
              <li>Customer Database</li>
              <li>File Upload API</li>
              <li>Admin Dashboard</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: STRIDE Results */}
      {activeStep === 2 && strideResult && (
        <div className="card">
          <h2 className="card-title">Step 2: STRIDE Analysis Results</h2>
          <p className="card-description" style={{ marginBottom: '1.5rem' }}>
            Here are the potential threats identified for <strong>{customAsset.name}</strong>
          </p>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {strideResult.analysis?.threats?.map((threat, idx) => (
              <div 
                key={idx} 
                style={{ 
                  padding: '1rem', 
                  background: 'var(--bg-dark)', 
                  borderRadius: '0.5rem',
                  borderLeft: `4px solid ${
                    threat.severity === 'CRITICAL' ? 'var(--critical)' :
                    threat.severity === 'HIGH' ? '#ea580c' : 'var(--primary)'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{threat.categoryName}</strong>
                  <span className={`badge badge-${threat.severity?.toLowerCase() || 'medium'}`}>
                    {threat.severity}
                  </span>
                </div>
                <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                  Protects: {threat.securityProperty}
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <strong>Specific Threats:</strong>
                  <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                    {threat.specificThreats?.slice(0, 3).map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Select a threat to score with DREAD:
            </label>
            <select
              value={customThreat}
              onChange={(e) => setCustomThreat(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: 'var(--bg-dark)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">-- Select a threat --</option>
              {strideResult.analysis?.threats?.flatMap(t => 
                t.specificThreats?.map(st => (
                  <option key={st} value={st}>{t.categoryName}: {st}</option>
                ))
              )}
            </select>
            <button 
              className="btn btn-primary" 
              onClick={() => customThreat && setActiveStep(3)}
              disabled={!customThreat}
              style={{ marginTop: '1rem' }}
            >
              Score with DREAD →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: DREAD Scoring */}
      {activeStep === 3 && (
        <div className="card">
          <h2 className="card-title">Step 3: DREAD Risk Scoring</h2>
          <p className="card-description" style={{ marginBottom: '1.5rem' }}>
            Rate the threat: <strong>{customThreat}</strong>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
            <div>
              {Object.entries(dreadRatings).map(([key, value]) => {
                const labels = {
                  damage: { name: 'Damage Potential', desc: 'How severe would the impact be?' },
                  reproducibility: { name: 'Reproducibility', desc: 'How easy to reproduce the attack?' },
                  exploitability: { name: 'Exploitability', desc: 'How easy to perform the attack?' },
                  affectedUsers: { name: 'Affected Users', desc: 'How many users would be impacted?' },
                  discoverability: { name: 'Discoverability', desc: 'How easy to discover the vulnerability?' },
                };
                return (
                  <div key={key} className="dread-slider">
                    <div className="dread-slider-header">
                      <span className="dread-slider-label">{labels[key].name}</span>
                      <span className="dread-slider-value">{value}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={value}
                      onChange={(e) => setDreadRatings({ ...dreadRatings, [key]: parseInt(e.target.value) })}
                    />
                    <div className="dread-slider-description">{labels[key].desc}</div>
                  </div>
                );
              })}
              <button 
                className="btn btn-primary" 
                onClick={runDreadScoring}
                disabled={loading}
                style={{ marginTop: '1rem' }}
              >
                {loading ? 'Calculating...' : 'Calculate Risk Score'}
              </button>
            </div>

            <div style={{ background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '0.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Risk Score</h3>
              {dreadResult?.score ? (
                <>
                  <div className="score-display">
                    <div className={`score-value score-${dreadResult.score.riskLevel?.level?.toLowerCase()}`}>
                      {dreadResult.score.total}
                    </div>
                    <div className="score-label">out of 10</div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <span className={`badge badge-${dreadResult.score.riskLevel?.level?.toLowerCase()}`}>
                      {dreadResult.score.riskLevel?.level}
                    </span>
                    <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                      {dreadResult.score.riskLevel?.action}
                    </p>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Timeline: {dreadResult.score.recommendation?.timeline}
                    </p>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Adjust ratings and click Calculate
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setActiveStep(1)}>
              ← Start Over
            </button>
            <button className="btn btn-secondary" onClick={() => setActiveStep(2)}>
              ← Back to STRIDE
            </button>
          </div>
        </div>
      )}

      {/* Reference: Example from API */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 className="card-title">📚 Reference Example</h2>
        <p className="card-description">See how a complete threat model looks</p>
        
        <div className="stats-grid" style={{ marginTop: '1rem' }}>
          <div className="stat-card">
            <div className="stat-value">{example.summary.totalAssetsAnalyzed}</div>
            <div className="stat-label">Assets Analyzed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{example.summary.totalThreatsIdentified}</div>
            <div className="stat-label">Threats Found</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--critical)' }}>{example.summary.criticalThreats}</div>
            <div className="stat-label">Critical</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#ea580c' }}>{example.summary.highThreats}</div>
            <div className="stat-label">High</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Login Page
function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, register, user } = useAuth();

  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, email, password);
        setSuccess('Registration successful! Please login.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <div className="card">
        <h2 className="card-title">{isLogin ? 'Login' : 'Register'}</h2>
        <p className="card-description" style={{ marginBottom: '1.5rem' }}>
          {isLogin ? 'Sign in to manage threats and assets' : 'Create an account to get started'}
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

// Threats Page
function ThreatsPage() {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'SPOOFING',
    dreadRatings: { damage: 5, reproducibility: 5, exploitability: 5, affectedUsers: 5, discoverability: 5 }
  });
  const [error, setError] = useState('');
  const { user } = useAuth();

  const loadThreats = () => {
    api.get('/threats').then(res => {
      setThreats(res.data.threats);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    if (user) loadThreats();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/threats', formData);
      setShowForm(false);
      setFormData({ name: '', description: '', category: 'SPOOFING', dreadRatings: { damage: 5, reproducibility: 5, exploitability: 5, affectedUsers: 5, discoverability: 5 } });
      loadThreats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add threat');
    }
  };

  const categories = ['SPOOFING', 'TAMPERING', 'REPUDIATION', 'INFORMATION_DISCLOSURE', 'DENIAL_OF_SERVICE', 'ELEVATION_OF_PRIVILEGE'];

  if (!user) return <Navigate to="/login" />;
  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Threat Registry</h1>
          <p className="page-description">Manage identified threats and their risk scores</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Threat'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Add New Threat</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '1rem', maxWidth: '600px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Threat Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., SQL Injection in Login Form"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the threat..."
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>STRIDE Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}
                >
                  {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Quick DREAD Score (Damage)</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.dreadRatings.damage}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    dreadRatings: { ...formData.dreadRatings, damage: parseInt(e.target.value) }
                  })}
                />
                <span style={{ marginLeft: '1rem' }}>{formData.dreadRatings.damage}</span>
              </div>
              <button type="submit" className="btn btn-primary">Add Threat</button>
            </div>
          </form>
        </div>
      )}

      {threats.length === 0 && !showForm ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            No threats registered yet. Click "+ Add Threat" to add one.
          </p>
        </div>
      ) : threats.length > 0 && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>DREAD Score</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {threats.map(threat => (
                  <tr key={threat._id}>
                    <td>
                      <strong>{threat.name}</strong>
                      <br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {threat.description?.substring(0, 50)}...
                      </span>
                    </td>
                    <td>{threat.strideDetails?.name || threat.category}</td>
                    <td>
                      {threat.dreadScore ? (
                        <span className={`badge badge-${threat.dreadScore.riskLevel?.level?.toLowerCase() || 'info'}`}>
                          {threat.dreadScore.total}
                        </span>
                      ) : (
                        <span className="badge badge-info">Not scored</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${threat.status === 'mitigated' ? 'low' : 'medium'}`}>
                        {threat.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>
                      {new Date(threat.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Assets Page
function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'api',
    description: '',
    isPublicFacing: true,
    containsSensitiveData: false
  });
  const [error, setError] = useState('');
  const { user } = useAuth();

  const assetTypes = [
    { value: 'api', label: 'API Endpoint' },
    { value: 'database', label: 'Database' },
    { value: 'authentication', label: 'Authentication System' },
    { value: 'storage', label: 'File Storage' },
    { value: 'network', label: 'Network Component' },
    { value: 'frontend', label: 'Frontend Application' },
    { value: 'service', label: 'Backend Service' },
  ];

  const loadAssets = () => {
    api.get('/assets').then(res => {
      setAssets(res.data.assets);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    if (user) loadAssets();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/assets', formData);
      setShowForm(false);
      setFormData({ name: '', type: 'api', description: '', isPublicFacing: true, containsSensitiveData: false });
      loadAssets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add asset');
    }
  };

  const runStrideAnalysis = async (assetId) => {
    try {
      await api.post(`/assets/${assetId}/analyze`);
      loadAssets();
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  if (!user) return <Navigate to="/login" />;
  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Asset Inventory</h1>
          <p className="page-description">Manage assets and run STRIDE analysis</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Asset'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Add New Asset</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '1rem', maxWidth: '600px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Asset Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., User Authentication API"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}
                >
                  {assetTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the asset..."
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.isPublicFacing}
                    onChange={(e) => setFormData({ ...formData, isPublicFacing: e.target.checked })}
                  />
                  Public Facing
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.containsSensitiveData}
                    onChange={(e) => setFormData({ ...formData, containsSensitiveData: e.target.checked })}
                  />
                  Contains Sensitive Data
                </label>
              </div>
              <button type="submit" className="btn btn-primary">Add Asset</button>
            </div>
          </form>
        </div>
      )}

      {assets.length === 0 && !showForm ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            No assets registered yet. Click "+ Add Asset" to add one.
          </p>
        </div>
      ) : assets.length > 0 && (
        <div className="stride-grid">
          {assets.map(asset => (
            <div key={asset._id} className="stride-card">
              <h3>{asset.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{asset.type}</p>
              {asset.description && (
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{asset.description.substring(0, 100)}</p>
              )}
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {asset.isPublicFacing && <span className="badge badge-info">Public</span>}
                {asset.containsSensitiveData && <span className="badge badge-high">Sensitive Data</span>}
                {asset.strideAnalysis && (
                  <span className="badge badge-medium">
                    {asset.strideAnalysis.summary?.totalThreats || 0} threats
                  </span>
                )}
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => runStrideAnalysis(asset._id)}
                style={{ marginTop: '1rem', width: '100%' }}
              >
                Run STRIDE Analysis
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Analysis Page
function AnalysisPage() {
  const { user } = useAuth();
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('api');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  if (!user) return <Navigate to="/login" />;

  const assetTypes = [
    { value: 'api', label: 'API Endpoint' },
    { value: 'database', label: 'Database' },
    { value: 'authentication', label: 'Authentication System' },
    { value: 'storage', label: 'File Storage' },
    { value: 'network', label: 'Network Component' },
  ];

  const runAnalysis = async (type) => {
    if (!assetName) {
      setError('Please enter an asset name');
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);
    
    try {
      let endpoint = '';
      switch(type) {
        case 'stride':
          endpoint = '/demo/interactive/stride';
          break;
        case 'pasta':
          endpoint = '/demo/pasta/example';
          break;
        case 'all':
          endpoint = '/demo/full-example';
          break;
        default:
          endpoint = '/demo/interactive/stride';
      }
      
      const res = type === 'stride' 
        ? await api.post(endpoint, { asset: { name: assetName, type: assetType } })
        : await api.get(endpoint);
      
      setResults({ type, data: res.data });
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Run Analysis</h1>
        <p className="page-description">Execute comprehensive threat modeling on your assets</p>
      </div>

      {/* Asset Input Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Target Asset</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', maxWidth: '600px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Asset Name</label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g., User Login API, Payment Service"
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: 'var(--bg-dark)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Type</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: 'var(--bg-dark)',
                color: 'var(--text-primary)'
              }}
            >
              {assetTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>

      {/* Analysis Options */}
      <div className="stride-grid">
        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>STRIDE Analysis</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Analyze an asset for the six STRIDE threat categories
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => runAnalysis('stride')}
            disabled={loading}
          >
            {loading && selectedAnalysis === 'stride' ? 'Analyzing...' : 'Run STRIDE'}
          </button>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>PASTA Analysis</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Run full 7-stage risk-centric analysis
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => runAnalysis('pasta')}
            disabled={loading}
          >
            {loading && selectedAnalysis === 'pasta' ? 'Analyzing...' : 'Run PASTA'}
          </button>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>Comprehensive Analysis</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Combined STRIDE, PASTA, and DREAD analysis
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => runAnalysis('all')}
            disabled={loading}
          >
            {loading && selectedAnalysis === 'all' ? 'Analyzing...' : 'Run All'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {loading && (
        <div className="card" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '2rem auto' }} />
          <p>Running analysis...</p>
        </div>
      )}

      {results && !loading && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            {results.type === 'stride' && 'STRIDE Analysis Results'}
            {results.type === 'pasta' && 'PASTA Analysis Results'}
            {results.type === 'all' && 'Comprehensive Analysis Results'}
          </h3>

          {results.type === 'stride' && results.data.analysis?.threats && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {results.data.analysis.threats.map((threat, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    padding: '1rem', 
                    background: 'var(--bg-dark)', 
                    borderRadius: '0.5rem',
                    borderLeft: `4px solid ${
                      threat.severity === 'CRITICAL' ? 'var(--critical)' :
                      threat.severity === 'HIGH' ? '#ea580c' : 'var(--primary)'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{threat.category} - {threat.categoryName}</strong>
                    <span className={`badge badge-${threat.severity?.toLowerCase() || 'medium'}`}>
                      {threat.severity}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>Threats:</strong> {threat.specificThreats?.join(', ')}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <strong>Mitigations:</strong> {threat.recommendations?.slice(0, 2).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.type === 'pasta' && results.data.framework?.stages && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {results.data.framework.stages.map((stage, idx) => (
                <div key={idx} style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem' }}>
                  <strong>Stage {stage.stage}: {stage.name}</strong>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {stage.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {results.type === 'all' && results.data.summary && (
            <div>
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                  <div className="stat-value">{results.data.summary.totalAssetsAnalyzed}</div>
                  <div className="stat-label">Assets</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{results.data.summary.totalThreatsIdentified}</div>
                  <div className="stat-label">Threats</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--critical)' }}>{results.data.summary.criticalThreats}</div>
                  <div className="stat-label">Critical</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: '#ea580c' }}>{results.data.summary.highThreats}</div>
                  <div className="stat-label">High</div>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>
                Analysis complete. Review threats in the Threats page for detailed remediation steps.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main App
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/stride" element={<StridePage />} />
              <Route path="/pasta" element={<PastaPage />} />
              <Route path="/dread" element={<DreadPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/threats" element={<ThreatsPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
