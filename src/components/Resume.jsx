import './resume.css';

export default function Resume() {
  return <div className="resume-stage"><article className="resume-sheet" aria-labelledby="resume-name">
    <header>
      <h1 id="resume-name">Anshul Dhanker</h1>
      <p><a href="tel:+16475468223">647-546-8223</a> | <a href="mailto:ardhanker@uwaterloo.ca">ardhanker@uwaterloo.ca</a> | <a href="https://linkedin.com/in/anshul-dhanker">linkedin.com/in/anshul-dhanker</a></p>
    </header>
    <section>
      <h2>Professional Experience</h2>
      <h3>Varick Agents | Forward Deployed Engineer Intern</h3>
      <p className="resume-meta">San Francisco, CA | May 2026 - August 2026</p>
      <ul>
        <li><strong>Owned marketing</strong> and technical writing. Generated 4.5M views on X in 3.5 months, driving inbound from 2 Fortune 10 companies, a PE megafund, and several Fortune 500s. <a href="https://docs.google.com/document/d/1A6OpYpbFIJ51VspKeIK9B2eq23Jtda262aq_snp8OTM/edit?tab=t.0">Writing</a>.</li>
        <li><strong>Owned RevOps</strong>. Built an autonomous agent using durable execution infrastructure to enrich leads, maintain CRM records, and identify stale opportunities.</li>
        <li>Built customer-facing agent harnesses integrated with systems of record and internal tooling to automate operations.</li>
      </ul>
      <h3>Mashgin (YC W15) | GTM/Product Intern</h3>
      <p className="resume-meta">Palo Alto, CA | September 2024 - December 2024</p>
      <ul>
        <li>Identified data monetization as a <strong>new revenue stream</strong> for a computer vision self-checkout company.</li>
        <li>Took that new revenue stream to market and led customer discovery and negotiations with senior operators at large analytics firms.</li>
        <li>Ran a full sales cycle that resulted in a <strong>$300K+ deal offer</strong> and uncovered additional opportunities with multi-million-dollar ARR potential</li>
      </ul>
      <h3>Algorithmic Trading — Prediction Markets &amp; Crypto Options Statistical Arbitrage</h3>
      <p className="resume-meta">August 2025 – Present</p>
      <ul>
        <li>Quant trading algorithm to exploit mispricing between institutional crypto options markets (Deribit) and retail prediction markets (Polymarket).</li>
        <li>Designed a mid-frequency algorithm in Python<strong>,</strong> translating option-implied probability distributions to event probabilities, creating direct comparison across exchanges with different payoff structures (vanilla options and digital options).</li>
        <li>Deployed with live capital trading &gt;2.3 sharpe.</li>
      </ul>
      <h3>Scotiabank | Wealth Management Intern</h3>
      <p className="resume-meta">Toronto, ON | January 2024 - April 2024</p>
      <ul>
        <li>Implemented tax optimization strategies, resulting in a 10% improvement in financial outcomes for high net worth clients.</li>
        <li>Earned an “Excellent” performance rating for self sufficiency</li>
      </ul>
      <h3>Windsurf | Growth</h3>
      <p className="resume-meta">September 2025 - December 2025</p>
      <ul><li>Designed and ran college GTM to drive adoption of the Windsurf agentic IDE across the Toronto region.</li></ul>
    </section>
    <section>
      <h2>Education</h2>
      <h3>University of Waterloo</h3>
      <p><em>Bachelor’s Degree, Accounting and Financial Management (</em>September 2022 - 2027<em>) | </em><strong>President’s Scholarship</strong> | Pivoted into tech (my passion).</p>
    </section>
    <section className="resume-project">
      <h2>Select Project</h2>
      <h3>AI Email Composer</h3>
      <ul><li>Implemented a <strong>TypeScript</strong> backend integrating the OpenAI API and People Data Labs, creating an AI native Gmail that knows who you want to reach and sends personalized emails at scale.</li></ul>
    </section>
    <section>
      <h2>Skills &amp; Interests</h2>
      <p><strong>Technical:</strong> Python (API integration, data pipelines), SQL, financial modeling, Typescript (JavaScript), Claude Code</p>
      <p><strong>Soft:</strong> Sales, Game Theory, Humility, Fast Learner, Passionate about areas of interest, Empathy, Integrity</p>
      <p><strong>Interests:</strong> Podcasts (Founders, Invest like the Best, etc), Markets (Fav. investor is Stan Druckenmiller), Sports (Football, Hockey), Exercising, Food (Chipotle)</p>
    </section>
  </article></div>;
}
