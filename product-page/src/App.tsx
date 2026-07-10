import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Upload from './Upload';

// --- Inline SVGs for Premium Icons (No Emojis) ---
const CheckIcon = () => (
  <svg className="tier-feature-icon" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const CameraIcon = () => (
  <svg className="pipeline-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="pipeline-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3.096 15 8 14.187 9.813 9l.813 5.187L15.904 15l-5.096.813zM19.07 4.93l-.26 1.63-.26-1.63L16.92 4.67l1.63-.26.26-1.63.26 1.63 1.63.26-1.63.26zM19.07 15.93l-.26 1.63-.26-1.63-1.63-.26 1.63-.26.26-1.63.26 1.63 1.63.26-1.63.26z" />
  </svg>
);

const TableEditIcon = () => (
  <svg className="pipeline-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.88 3.549a1.125 1.125 0 011.591 0l1.98 1.98a1.125 1.125 0 010 1.591l-9.5 9.5a1.125 1.125 0 01-.462.293l-3.5 1 1-3.5a1.125 1.125 0 01.293-.462l9.5-9.5z" />
  </svg>
);

const ShieldLockIcon = () => (
  <svg className="pipeline-icon" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a9.008 9.008 0 01-1.17 1.325 9.008 9.008 0 01-4.833 2.531A9.001 9.001 0 013 12c0-3.04 1.516-5.723 3.842-7.377a9.001 9.001 0 0110.316 0c2.326 1.654 3.842 4.337 3.842 7.377z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="security-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m0-3.75v3.75m0 0v3.75m16.5 0v3.75M12 20.25c4.556 0 8.25-1.847 8.25-4.125" />
  </svg>
);

const KeyIcon = () => (
  <svg className="security-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);

const ServerIcon = () => (
  <svg className="security-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 3h13.5m-13.5-6h13.5m-13.5-3h13.5m-13.5-3h13.5M3 19.5h18a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0021 1.5H3A1.5 1.5 0 001.5 3v15A1.5 1.5 0 003 19.5z" />
  </svg>
);

function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  // Pricing calculations
  const tier1Price = isAnnual ? 6.40 : 8.00;
  const tier2Price = isAnnual ? 18.40 : 23.00;

  return (
    <>
      {/* Navigation */}
      <nav className="navbar" role="navigation" aria-label="Main Navigation">
        <div className="container">
          <div className="logo-container">
            <span className="logo-text">VISIOLOG</span>
          </div>
          <div className="nav-links">
            <a href="#how-it-works" className="nav-link">Workflow</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#security" className="nav-link">Security</a>
            <a href="/upload" className="btn btn-primary">Launch App</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero-section">
        <div className="container">
          <span className="hero-tag">records vault & intelligence engine</span>
          <h1 className="hero-title">
            Transform physical structured records into <em>encrypted</em>, action-ready data.
          </h1>
          <p className="hero-subtitle">
            VISIOLOG is the intelligent records platform. Photograph any paper sheet, review the structural AI suggestion, and store your business records in an isolated, regulatory-grade encrypted archive.
          </p>
          <div className="hero-actions">
            <a href="/upload" className="btn btn-primary" id="hero-cta-launch">Launch Free Scan</a>
            <a href="#how-it-works" className="btn btn-secondary" id="hero-cta-learn">See How It Works</a>
          </div>
        </div>
      </header>

      {/* Ingestion Pipeline (The 4-Step Workflow) */}
      <section id="how-it-works" className="pipeline-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">The Tabular Ingestion Pipeline</h2>
            <p className="section-desc">
              A highly optimized, human-in-the-loop workflow designed to eliminate manual data entry errors.
            </p>
          </div>

          <div className="pipeline-grid">
            <div className="pipeline-card" id="step-scan">
              <span className="pipeline-step-num">01</span>
              <div className="pipeline-icon-wrapper">
                <CameraIcon />
              </div>
              <h3 className="pipeline-card-title">Mobile Capture</h3>
              <p className="pipeline-card-desc">
                Photograph any structured sheet using your phone camera or upload a scan. The platform natively processes high-resolution images.
              </p>
            </div>

            <div className="pipeline-card" id="step-suggest">
              <span className="pipeline-step-num">02</span>
              <div className="pipeline-icon-wrapper">
                <SparklesIcon />
              </div>
              <h3 className="pipeline-card-title">AI Schema Suggestion</h3>
              <p className="pipeline-card-desc">
                Gemini Vision AI inspects the physical layout, maps the cells, and suggests a structured tabular representation aligned to previous scans.
              </p>
            </div>

            <div className="pipeline-card" id="step-edit">
              <span className="pipeline-step-num">03</span>
              <div className="pipeline-icon-wrapper">
                <TableEditIcon />
              </div>
              <h3 className="pipeline-card-title">Interactive Alignment</h3>
              <p className="pipeline-card-desc">
                Review the extraction live. Add or delete rows, insert columns, rename headers, and refine cell details before committing.
              </p>
            </div>

            <div className="pipeline-card" id="step-create">
              <span className="pipeline-step-num">04</span>
              <div className="pipeline-icon-wrapper">
                <ShieldLockIcon />
              </div>
              <h3 className="pipeline-card-title">Encrypted Storage</h3>
              <p className="pipeline-card-desc">
                Confirm your layout and write the records. Data is immediately encrypted at rest using AES-256 and isolated in your private archive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Tiers */}
      <section id="pricing" className="tiers-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Calibrated Subscriptions</h2>
            <p className="section-desc">
              Two transparent tiers to fit your organization's compliance and analytical needs.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="pricing-toggle-wrapper">
            <span className={`pricing-toggle-label ${!isAnnual ? 'active' : ''}`}>Monthly</span>
            <label className="switch" htmlFor="billing-toggle" aria-label="Toggle billing cycle">
              <input 
                type="checkbox" 
                id="billing-toggle"
                checked={isAnnual} 
                onChange={() => setIsAnnual(!isAnnual)} 
              />
              <span className="slider"></span>
            </label>
            <span className={`pricing-toggle-label ${isAnnual ? 'active' : ''}`}>Annually (Save 20%)</span>
          </div>

          <div className="tiers-grid">
            {/* Tier 1 */}
            <div className="tier-card" id="tier-records-vault">
              <div className="tier-header">
                <h3 className="tier-name">Records Vault</h3>
                <p className="tier-desc">Secure digitization, indexing, and compliance storage for all paper records.</p>
                <div className="tier-price-wrapper">
                  <span className="tier-price">${tier1Price.toFixed(2)}</span>
                  <span className="tier-period">/ user / month</span>
                </div>
              </div>
              
              <hr className="tier-divider" />
              
              <div className="tier-features-title">Core capabilities</div>
              <ul className="tier-features-list">
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>AI-powered scan & table extraction</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>AI schema suggestion review step</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>Row and column cell-level editor</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>AES-256 at-rest and TLS 1.3 in-transit encryption</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>Records retrieval with sort, search, and filters</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>Export as clean CSV or structured JSON</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>Isolated session management & support traceability</span>
                </li>
              </ul>
              
              <a href="/upload" className="btn btn-secondary" id="tier1-cta">Get Started</a>
            </div>

            {/* Tier 2 */}
            <div className="tier-card popular" id="tier-intelligence-engine">
              <div className="tier-header">
                <h3 className="tier-name">Intelligence Engine</h3>
                <p className="tier-desc">Adds a powerful AI assistant and statistical analytics workspace over all your data.</p>
                <div className="tier-price-wrapper">
                  <span className="tier-price">${tier2Price.toFixed(2)}</span>
                  <span className="tier-period">/ user / month</span>
                </div>
              </div>
              
              <hr className="tier-divider" />
              
              <div className="tier-features-title">Everything in Records Vault, plus:</div>
              <ul className="tier-features-list">
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span><strong>AI Analytics Assistant</strong> chat panel</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span><strong>Tag & Reference System</strong> (reference sets with @tagname)</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span><strong>External Data Upload</strong> (CSV, Excel, JSON support)</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>AI-generated charts, graphs, and visualizations</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>Manual analytics panel with pivot tables and custom builder</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>Automated trend, anomaly, and pattern detection</span>
                </li>
                <li className="tier-feature-item">
                  <CheckIcon />
                  <span>Advanced MCP-embedded AI data operations</span>
                </li>
              </ul>
              
              <a href="/upload" className="btn btn-primary" id="tier2-cta">Deploy Engine</a>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Isolation */}
      <section id="security" className="security-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Cryptographic Security By Default</h2>
            <p className="section-desc">
              Data privacy is not a feature tier—it is the foundational premise of VISIOLOG.
            </p>
          </div>

          <div className="security-grid">
            <div className="security-card" id="security-aes">
              <div className="security-icon">
                <KeyIcon />
              </div>
              <h3 className="security-card-title">AES-256 Encryption</h3>
              <p className="security-card-desc">
                Every record is encrypted at rest using Advanced Encryption Standard (AES-256) with unique per-user keys. Data cannot be accessed without proper authorization.
              </p>
            </div>

            <div className="security-card" id="security-sessions">
              <div className="security-icon">
                <DatabaseIcon />
              </div>
              <h3 className="security-card-title">Session Isolation</h3>
              <p className="security-card-desc">
                Sessions are strictly isolated and containerized. VISIOLOG enforces session IDs on all database and AI queries to guarantee absolute tenant boundary protection.
              </p>
            </div>

            <div className="security-card" id="security-transport">
              <div className="security-icon">
                <ServerIcon />
              </div>
              <h3 className="security-card-title">Secure Ingestion</h3>
              <p className="security-card-desc">
                All communications between client devices, the extraction engine, and database clusters are encrypted in transit using forced TLS 1.3 protocol standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" role="contentinfo">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <span className="logo-text">VISIOLOG</span>
              <p className="footer-desc">
                The Intelligent Records Platform for modern operational alignment. Replacing manual paper entries with immediate structured intelligence.
              </p>
            </div>
            
            <div className="footer-links-column">
              <span className="footer-link-header">Platform</span>
              <a href="/upload" className="footer-link">Ingestion</a>
              <a href="/data" className="footer-link">Records Viewer</a>
            </div>

            <div className="footer-links-column">
              <span className="footer-link-header">Information</span>
              <a href="#how-it-works" className="footer-link">Workflow</a>
              <a href="#pricing" className="footer-link">Pricing Plans</a>
              <a href="#security" className="footer-link">Cryptographic Model</a>
            </div>
          </div>

          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} VISIOLOG. All rights reserved.</span>
            <span>Security Statement &middot; Privacy Policy &middot; Terms of Service</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/upload" element={<Upload />} />
    </Routes>
  );
}

export default App;
