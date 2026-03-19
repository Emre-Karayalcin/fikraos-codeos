import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ── Constants ────────────────────────────────────────────────────────────────
const BLUE = '#4588f5';
const ORANGE = '#f97316';
const GRAY_50 = '#f9fafb';
const GRAY_100 = '#f3f4f6';
const GRAY_200 = '#e5e7eb';
const GRAY_600 = '#4b5563';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';

const KIND_LABELS: Record<string, string> = {
  SWOT: 'SWOT Analysis',
  LEAN_CANVAS: 'Lean Canvas',
  PERSONA: 'User Persona',
  USER_STORIES: 'User Stories',
  INTERVIEW_QUESTIONS: 'Interview Questions',
  JOURNEY_MAP: 'User Journey Map',
  MARKETING_PLAN: 'Marketing Plan',
  BRAND_WHEEL: 'Brand Wheel',
  BRAND_IDENTITY: 'Brand Identity',
  TAM_SAM_SOM: 'Market Size (TAM / SAM / SOM)',
  COMPETITOR_MAP: 'Competitor Map',
  TEAM_ROLES: 'Team Roles',
  PITCH_OUTLINE: 'Pitch Outline',
  ICP: 'Ideal Customer Profile',
  OKR: 'OKRs',
  VALUE_PROP: 'Value Proposition Canvas',
  JTBD: 'Jobs to be Done',
  EXPERIMENT_PLAN: 'Experiment Plan',
  BRAND_GUIDELINES: 'Brand Guidelines',
  LAUNCH_ROADMAP: 'Launch Roadmap',
  FINANCIAL_PROJECTIONS: 'Financial Projections',
  RISK_ASSESSMENT: 'Risk Assessment',
  GTM_STRATEGY: 'Go-to-Market Strategy',
  PRODUCT_ROADMAP: 'Product Roadmap',
  TEAM_STRUCTURE: 'Team Structure',
  FUNDING_STRATEGY: 'Funding Strategy',
  OPERATIONS_PLAN: 'Operations Plan',
  TECHNOLOGY_STACK: 'Technology Stack',
};

const ASSET_ORDER = [
  'SWOT', 'LEAN_CANVAS', 'INTERVIEW_QUESTIONS', 'PERSONA', 'USER_STORIES',
  'JOURNEY_MAP', 'MARKETING_PLAN', 'BRAND_WHEEL', 'BRAND_IDENTITY',
  'TAM_SAM_SOM', 'COMPETITOR_MAP', 'TEAM_ROLES', 'PITCH_OUTLINE',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function h(str: unknown): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toTitle(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()).trim();
}

function arr(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') return v.split('\n').filter(Boolean);
  return [String(v)];
}


function card(content: string, borderColor = BLUE, extra = ''): string {
  return `<div style="background:#fff;border:2px solid ${borderColor};border-radius:8px;padding:16px;${extra}">${content}</div>`;
}

function blueLabel(text: string): string {
  return `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${BLUE};margin-bottom:6px">${h(text)}</div>`;
}

function bulletList(items: string[], dotColor = BLUE): string {
  if (!items.length) return '';
  return `<ul style="margin:0;padding:0;list-style:none">${
    items.map(i => `<li style="display:flex;align-items:flex-start;margin-bottom:6px;font-size:12px;color:${GRAY_700}">
      <span style="display:inline-block;width:6px;height:6px;min-width:6px;border-radius:50%;background:${dotColor};margin-top:5px;margin-right:8px"></span>
      <span>${h(i)}</span>
    </li>`).join('')
  }</ul>`;
}

// ── SWOT ─────────────────────────────────────────────────────────────────────
function renderSwot(data: any): string {
  const quadrants = [
    { key: 'strengths',    label: 'Strengths',    color: '#22c55e' },
    { key: 'weaknesses',   label: 'Weaknesses',   color: '#ef4444' },
    { key: 'opportunities',label: 'Opportunities',color: BLUE },
    { key: 'threats',      label: 'Threats',      color: ORANGE },
  ];
  const cells = quadrants.map(q => {
    const items = arr(data[q.key] || data[q.key.toLowerCase()]);
    return `<td style="width:50%;padding:6px;vertical-align:top">
      <div style="background:#fff;border:2px solid ${q.color};border-radius:8px;padding:14px;height:100%">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${q.color};margin-bottom:10px">${q.label}</div>
        ${bulletList(items, q.color)}
      </div>
    </td>`;
  });
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed">
    <tr>${cells[0]}${cells[1]}</tr>
    <tr>${cells[2]}${cells[3]}</tr>
  </table>`;
}

// ── Lean Canvas ───────────────────────────────────────────────────────────────
function renderLeanCanvas(data: any): string {
  const rows = [
    ['problem', 'solution', 'uniqueValueProposition', 'unfairAdvantage', 'customerSegments'],
    ['existingAlternatives', 'keyMetrics', 'channels'],
    ['costStructure', 'revenueStreams'],
  ];
  const allKeys = rows.flat();
  const extra: string[] = Object.keys(data).filter(k => !allKeys.includes(k));
  const renderCell = (key: string) => {
    const val = data[key];
    if (val == null) return '';
    const items = arr(val);
    return `<td style="vertical-align:top;padding:5px">
      <div style="background:#fff;border:2px solid ${BLUE};border-radius:6px;padding:10px;min-height:80px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${BLUE};margin-bottom:6px">${h(toTitle(key))}</div>
        ${items.length > 1 ? bulletList(items) : `<p style="font-size:11px;color:${GRAY_700};margin:0">${h(items[0] || '')}</p>`}
      </div>
    </td>`;
  };
  return rows.map(row => {
    const cells = row.map(renderCell).filter(Boolean);
    if (!cells.length) return '';
    return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px"><tr>${cells.join('')}</tr></table>`;
  }).join('') + (extra.length ? `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px"><tr>${extra.map(renderCell).filter(Boolean).join('')}</tr></table>` : '');
}

// ── Persona ───────────────────────────────────────────────────────────────────
function renderPersona(data: any): string {
  const personas = Array.isArray(data) ? data : (data.personas || [data]);
  return personas.map((p: any) => {
    const name = p.name || p.personaName || 'Persona';
    const age = p.age ? `Age ${p.age}` : '';
    const occupation = p.occupation || p.role || '';
    const quote = p.quote || p.tagline || '';
    const sections: [string, string][] = [
      ['Goals', arr(p.goals || p.objectives).join('\n')],
      ['Pain Points', arr(p.painPoints || p.challenges || p.frustrations).join('\n')],
      ['Behaviors', arr(p.behaviors || p.habits).join('\n')],
      ['Tech Usage', arr(p.techUsage || p.technology || p.tools).join('\n')],
    ].filter(([, v]) => v) as [string, string][];

    const sectionCells = sections.map(([label, val]) => `
      <td style="width:50%;padding:6px;vertical-align:top">
        <div style="background:${GRAY_50};border-radius:6px;padding:10px">
          ${blueLabel(label)}
          ${bulletList(arr(val))}
        </div>
      </td>`);

    const rows = [];
    for (let i = 0; i < sectionCells.length; i += 2) {
      rows.push(`<tr>${sectionCells[i]}${sectionCells[i + 1] || '<td></td>'}</tr>`);
    }

    return card(`
      <div style="margin-bottom:12px">
        <div style="font-size:16px;font-weight:700;color:${GRAY_900}">${h(name)}</div>
        <div style="font-size:12px;color:${GRAY_600};margin-top:2px">${h([age, occupation].filter(Boolean).join(' · '))}</div>
        ${quote ? `<div style="font-style:italic;font-size:12px;color:${GRAY_700};margin-top:8px;padding:8px 12px;background:${GRAY_50};border-left:4px solid ${BLUE};border-radius:0 4px 4px 0">"${h(quote)}"</div>` : ''}
      </div>
      ${rows.length ? `<table style="width:100%;border-collapse:collapse;table-layout:fixed">${rows.join('')}</table>` : ''}
    `);
  }).join('<br>');
}

// ── User Stories ──────────────────────────────────────────────────────────────
function renderUserStories(data: any): string {
  const stories = Array.isArray(data) ? data : (data.stories || data.userStories || []);
  if (!stories.length) return renderGeneric(data);
  return stories.map((s: any, i: number) => {
    const role = s.role || s.asA || '';
    const want = s.want || s.iWant || s.action || s.story || '';
    const outcome = s.soThat || s.outcome || s.benefit || '';
    const criteria = arr(s.acceptanceCriteria || s.criteria || []);
    return card(`
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <tr>
          <td style="width:48%;padding-right:12px;vertical-align:top">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${BLUE};margin-bottom:6px">Story ${i + 1}</div>
            ${role ? `<p style="font-size:12px;color:${GRAY_600};margin:0 0 4px 0"><strong>As a</strong> ${h(role)}</p>` : ''}
            ${want ? `<p style="font-size:12px;color:${GRAY_700};margin:0 0 4px 0"><strong>I want to</strong> ${h(want)}</p>` : ''}
            ${outcome ? `<p style="font-size:12px;color:${GRAY_700};margin:0"><strong>So that</strong> ${h(outcome)}</p>` : ''}
          </td>
          ${criteria.length ? `<td style="width:4px;background:${GRAY_200};padding:0"></td>
          <td style="width:48%;padding-left:12px;vertical-align:top">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${GRAY_600};margin-bottom:6px">Acceptance Criteria</div>
            ${bulletList(criteria)}
          </td>` : ''}
        </tr>
      </table>
    `, BLUE, 'margin-bottom:10px');
  }).join('');
}

// ── Interview Questions ───────────────────────────────────────────────────────
function renderInterviewQuestions(data: any): string {
  const sections: Record<string, any> = typeof data === 'object' && !Array.isArray(data) ? data : {};
  const sectionKeys = Object.keys(sections).filter(k => sections[k]);
  if (!sectionKeys.length) return renderGeneric(data);
  return sectionKeys.map(key => {
    const questions = arr(sections[key]);
    return `
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${BLUE};margin-bottom:8px;padding:6px 10px;background:${GRAY_50};border-left:3px solid ${BLUE}">${h(toTitle(key))}</div>
        <ol style="margin:0;padding:0;list-style:none">
          ${questions.map((q, i) => `
            <li style="display:flex;align-items:flex-start;margin-bottom:8px;background:${GRAY_50};border-radius:6px;padding:10px">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;min-width:22px;border-radius:50%;background:#fff;border:2px solid ${GRAY_200};font-size:10px;font-weight:700;color:${GRAY_600};margin-right:10px;margin-top:1px">${i + 1}</span>
              <span style="font-size:12px;color:${GRAY_700};line-height:1.6">${h(q)}</span>
            </li>`).join('')}
        </ol>
      </div>`;
  }).join('');
}

// ── Marketing Plan ────────────────────────────────────────────────────────────
function renderMarketingPlan(data: any): string {
  const sections: string[] = [];

  // Funnel stages
  const funnelKeys = ['awareness', 'interest', 'consideration', 'decision', 'retention'];
  const funnelData = funnelKeys.filter(k => data[k]);
  if (funnelData.length) {
    const colWidth = Math.floor(100 / funnelData.length);
    const orangeShades = ['#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'];
    sections.push(`
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:${ORANGE};text-transform:uppercase;margin-bottom:8px">Marketing Funnel</div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <tr>
            ${funnelData.map((k, i) => `
              <td style="width:${colWidth}%;padding:4px;vertical-align:top">
                <div style="background:${orangeShades[i]};color:#fff;border-radius:6px 6px 0 0;padding:8px;font-size:10px;font-weight:700;text-transform:uppercase;text-align:center">${h(k)}</div>
                <div style="background:${GRAY_50};border:1px solid ${GRAY_200};border-radius:0 0 6px 6px;padding:8px">
                  ${bulletList(arr(data[k]), ORANGE)}
                </div>
              </td>`).join('')}
          </tr>
        </table>
      </div>`);
  }

  // Other sections as 2-column cards
  const otherKeys = Object.keys(data).filter(k => !funnelKeys.includes(k) && !['budget', 'timeline'].includes(k));
  if (otherKeys.length) {
    const cells = otherKeys.map(k => {
      const val = data[k];
      const items = arr(val);
      return `<td style="width:50%;padding:6px;vertical-align:top">
        ${card(`${blueLabel(toTitle(k))}${bulletList(items)}`, GRAY_200)}
      </td>`;
    });
    const rows = [];
    for (let i = 0; i < cells.length; i += 2) rows.push(`<tr>${cells[i]}${cells[i + 1] || '<td></td>'}</tr>`);
    sections.push(`<table style="width:100%;border-collapse:collapse;table-layout:fixed">${rows.join('')}</table>`);
  }

  // Budget
  if (data.budget) {
    const b = data.budget;
    sections.push(`
      <div style="margin-top:12px">
        ${blueLabel('Budget')}
        ${card(typeof b === 'object'
          ? Object.entries(b).map(([k, v]) => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid ${GRAY_200}"><span style="color:${GRAY_600}">${h(toTitle(k))}</span><span style="font-weight:600;color:${GRAY_900}">${h(String(v))}</span></div>`).join('')
          : `<p style="font-size:12px;color:${GRAY_700};margin:0">${h(String(b))}</p>`, GRAY_200)}
      </div>`);
  }

  // Timeline
  if (data.timeline) {
    const phases = arr(data.timeline);
    sections.push(`
      <div style="margin-top:12px">
        ${blueLabel('Timeline')}
        ${phases.map(p => `<div style="border-left:4px solid ${ORANGE};padding-left:10px;margin-bottom:8px;font-size:12px;color:${GRAY_700}">${h(p)}</div>`).join('')}
      </div>`);
  }

  return sections.join('') || renderGeneric(data);
}

// ── Brand Wheel ───────────────────────────────────────────────────────────────
function renderBrandWheel(data: any): string {
  return Object.entries(data).filter(([, v]) => v).map(([key, val]) => {
    const items = arr(val);
    return card(`
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${BLUE};margin-bottom:8px">${h(toTitle(key))}</div>
      ${items.length > 1 ? bulletList(items) : `<p style="font-size:12px;color:${GRAY_700};margin:0;line-height:1.6">${h(items[0] || '')}</p>`}
    `, BLUE, 'margin-bottom:10px');
  }).join('');
}

// ── Brand Identity ────────────────────────────────────────────────────────────
function renderBrandIdentity(data: any): string {
  const sections: string[] = [];

  // Color palette
  const colors: string[] = arr(data.colorPalette || data.colors || data.brandColors || []);
  if (colors.length) {
    const swatches = colors.map(c => {
      const hex = c.match(/#[0-9a-fA-F]{3,6}/)?.[0] || '#cccccc';
      return `<td style="padding:4px;vertical-align:top;width:${Math.floor(100 / colors.length)}%">
        <div style="background:${hex};height:40px;border-radius:4px;margin-bottom:4px"></div>
        <div style="font-size:9px;color:${GRAY_600};text-align:center">${h(c)}</div>
      </td>`;
    });
    sections.push(`<div style="margin-bottom:12px">
      ${blueLabel('Color Palette')}
      <table style="width:100%;border-collapse:collapse;table-layout:fixed"><tr>${swatches.join('')}</tr></table>
    </div>`);
  }

  // Personality traits as badges
  const traits: string[] = arr(data.personalityTraits || data.brandPersonality || data.traits || []);
  if (traits.length) {
    sections.push(`<div style="margin-bottom:12px">
      ${blueLabel('Brand Personality')}
      <div>${traits.map(t => `<span style="display:inline-block;background:${ORANGE};color:#fff;border-radius:4px;padding:4px 10px;font-size:11px;font-weight:600;margin:3px">${h(t)}</span>`).join('')}</div>
    </div>`);
  }

  // Other text fields
  const skip = new Set(['colorPalette', 'colors', 'brandColors', 'personalityTraits', 'brandPersonality', 'traits']);
  const rest = Object.entries(data).filter(([k, v]) => !skip.has(k) && v);
  if (rest.length) {
    const cells = rest.map(([k, v]) => {
      const items = arr(v);
      return `<td style="width:50%;padding:5px;vertical-align:top">
        ${card(`${blueLabel(toTitle(k))}${items.length > 1 ? bulletList(items) : `<p style="font-size:11px;color:${GRAY_700};margin:0">${h(items[0] || '')}</p>`}`, GRAY_200)}
      </td>`;
    });
    const rows = [];
    for (let i = 0; i < cells.length; i += 2) rows.push(`<tr>${cells[i]}${cells[i + 1] || '<td></td>'}</tr>`);
    sections.push(`<table style="width:100%;border-collapse:collapse;table-layout:fixed">${rows.join('')}</table>`);
  }

  return sections.join('') || renderGeneric(data);
}

// ── TAM/SAM/SOM ───────────────────────────────────────────────────────────────
function renderTamSamSom(data: any): string {
  const segments = [
    { key: 'tam', label: 'TAM', sub: 'Total Addressable Market', color: '#93c5fd' },
    { key: 'sam', label: 'SAM', sub: 'Serviceable Addressable Market', color: '#3b82f6' },
    { key: 'som', label: 'SOM', sub: 'Serviceable Obtainable Market', color: '#1d4ed8' },
  ];

  const cards = segments.map(s => {
    const raw = data[s.key] || data[s.key.toUpperCase()] || {};
    const valStr = typeof raw === 'string' ? raw
      : raw.value || raw.size || raw.estimate || (typeof raw === 'object' ? JSON.stringify(raw) : String(raw));
    const desc = typeof raw === 'object' ? (raw.description || raw.methodology || '') : '';
    return `<td style="width:33%;padding:6px;vertical-align:top">
      <div style="background:#fff;border:2px solid ${s.color};border-radius:8px;padding:12px;text-align:center">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:${s.color};margin-bottom:8px">
          <span style="color:#fff;font-weight:700;font-size:11px">${s.label}</span>
        </div>
        <div style="font-size:15px;font-weight:700;color:${s.color}">${h(valStr)}</div>
        <div style="font-size:10px;color:${GRAY_600};margin-top:4px">${h(s.sub)}</div>
        ${desc ? `<div style="font-size:10px;color:${GRAY_600};margin-top:6px;line-height:1.5">${h(desc)}</div>` : ''}
      </div>
    </td>`;
  });

  const extra = Object.entries(data).filter(([k]) => !segments.some(s => s.key === k.toLowerCase() || s.key.toUpperCase() === k));
  return `
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:12px"><tr>${cards.join('')}</tr></table>
    ${extra.map(([k, v]) => `<div style="margin-bottom:10px">${blueLabel(toTitle(k))}${bulletList(arr(v))}</div>`).join('')}
  `;
}

// ── Competitor Map ────────────────────────────────────────────────────────────
function renderCompetitorMap(data: any): string {
  const sections: string[] = [];
  const competitors: any[] = data.competitors || data.competitorList || (Array.isArray(data) ? data : []);

  const positionColor = (pos: string) => {
    const p = (pos || '').toLowerCase();
    if (p.includes('leader')) return '#fef2f2;color:#991b1b';
    if (p.includes('challenger')) return '#fefce8;color:#854d0e';
    if (p.includes('niche')) return '#f0fdf4;color:#166534';
    return `${GRAY_100};color:${GRAY_700}`;
  };

  if (competitors.length) {
    sections.push(competitors.map(c => {
      const name = c.name || c.company || 'Competitor';
      const pos = c.marketPosition || c.position || '';
      const desc = c.description || c.overview || '';
      const strengths = arr(c.strengths || []);
      const weaknesses = arr(c.weaknesses || []);
      const products = arr(c.keyProducts || c.products || []);
      const bgColor = positionColor(pos).split(';')[0];
      const textColor = positionColor(pos).split(';color:')[1] || GRAY_700;
      return card(`
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="vertical-align:top">
              <div style="font-size:14px;font-weight:700;color:${GRAY_900};margin-bottom:4px">${h(name)}</div>
              ${pos ? `<span style="display:inline-block;background:${bgColor};color:${textColor};font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px">${h(pos)}</span>` : ''}
              ${desc ? `<p style="font-size:12px;color:${GRAY_700};margin:8px 0">${h(desc)}</p>` : ''}
            </td>
          </tr>
        </table>
        ${(strengths.length || weaknesses.length || products.length) ? `
          <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:10px">
            <tr>
              ${strengths.length ? `<td style="width:33%;padding:4px;vertical-align:top"><div style="font-size:10px;font-weight:700;color:#16a34a;margin-bottom:4px">Strengths</div>${bulletList(strengths, '#16a34a')}</td>` : ''}
              ${weaknesses.length ? `<td style="width:33%;padding:4px;vertical-align:top"><div style="font-size:10px;font-weight:700;color:#dc2626;margin-bottom:4px">Weaknesses</div>${bulletList(weaknesses, '#dc2626')}</td>` : ''}
              ${products.length ? `<td style="width:33%;padding:4px;vertical-align:top"><div style="font-size:10px;font-weight:700;color:${BLUE};margin-bottom:4px">Key Products</div>${bulletList(products)}</td>` : ''}
            </tr>
          </table>` : ''}
      `, GRAY_200, 'margin-bottom:10px');
    }).join(''));
  }

  // Analysis summary (market gaps, our advantages, threats, recommendations)
  const analysisSections: [string, string, string][] = [
    ['marketGaps', 'Market Gaps', '#16a34a'],
    ['ourAdvantages', 'Our Competitive Advantages', BLUE],
    ['threats', 'Threats', '#dc2626'],
    ['recommendations', 'Recommendations', '#7c3aed'],
  ];
  const analysisCells = analysisSections
    .filter(([k]) => data[k])
    .map(([k, label, color]) => `<td style="width:50%;padding:5px;vertical-align:top">
      ${card(`<div style="font-size:11px;font-weight:700;color:${color};margin-bottom:6px">${h(label)}</div>${bulletList(arr(data[k]), color)}`, GRAY_200)}
    </td>`);

  if (analysisCells.length) {
    const rows = [];
    for (let i = 0; i < analysisCells.length; i += 2) rows.push(`<tr>${analysisCells[i]}${analysisCells[i + 1] || '<td></td>'}</tr>`);
    sections.push(`<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12px">${rows.join('')}</table>`);
  }

  return sections.join('') || renderGeneric(data);
}

// ── Team Roles ────────────────────────────────────────────────────────────────
function renderTeamRoles(data: any): string {
  const roles: any[] = Array.isArray(data) ? data : (data.roles || data.teamRoles || data.team || []);
  if (!roles.length) return renderGeneric(data);
  return roles.map(r => {
    const title = r.role || r.title || r.name || 'Role';
    const desc = r.description || r.summary || '';
    const cols: [string, string[]][] = [
      ['Responsibilities', arr(r.responsibilities || r.duties || [])],
      ['Key Skills', arr(r.skills || r.attributes || r.personalAttributes || [])],
      ['Motivators', arr(r.motivators || r.drivingMotivators || r.goals || [])],
    ].filter(([, v]) => v.length) as [string, string[]][];

    return `<div style="margin-bottom:20px">
      <div style="font-size:14px;font-weight:700;color:${GRAY_900};margin-bottom:4px">${h(title)}</div>
      ${desc ? `<p style="font-size:12px;color:${GRAY_600};margin:0 0 10px 0">${h(desc)}</p>` : ''}
      ${cols.length ? `<table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <tr>${cols.map(([label, items]) => `<td style="width:${Math.floor(100 / cols.length)}%;padding:5px;vertical-align:top">
          ${card(`${blueLabel(label)}${bulletList(items)}`, GRAY_200)}
        </td>`).join('')}</tr>
      </table>` : ''}
    </div>`;
  }).join('');
}

// ── Pitch Outline ─────────────────────────────────────────────────────────────
function renderPitchOutline(data: any): string {
  const slides: any[] = data.slides || data.outline || (Array.isArray(data) ? data : []);
  if (!slides.length) return renderGeneric(data);
  const iconColors = [BLUE, '#16a34a', '#7c3aed', ORANGE, '#0891b2', '#dc2626', '#d97706'];

  const slideCards = slides.map((s: any, i: number) => {
    const title = s.title || s.name || `Slide ${i + 1}`;
    const bullets = arr(s.content || s.bullets || s.points || s.keyPoints || []);
    const duration = s.duration || s.time || '';
    const color = iconColors[i % iconColors.length];
    return `<div style="background:#fff;border:1px solid ${GRAY_200};border-radius:8px;padding:14px;margin-bottom:10px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="width:36px;vertical-align:top;padding-right:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;text-align:center">
              <span style="color:#fff;font-weight:700;font-size:11px">${i + 1}</span>
            </div>
          </td>
          <td style="vertical-align:top">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div style="font-size:13px;font-weight:600;color:${GRAY_900}">${h(title)}</div>
              ${duration ? `<div style="font-size:10px;color:${GRAY_600};background:${GRAY_100};padding:2px 8px;border-radius:999px">${h(duration)}</div>` : ''}
            </div>
            ${bulletList(bullets)}
          </td>
        </tr>
      </table>
    </div>`;
  });

  const keyMessages = arr(data.keyMessages || data.coreMessages || []);
  const cta = data.callToAction || data.cta || '';

  return [
    ...slideCards,
    keyMessages.length ? card(`<div style="font-size:11px;font-weight:700;color:${ORANGE};margin-bottom:8px">Key Messages</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed"><tr>${
        keyMessages.map(m => `<td style="width:50%;padding:5px;vertical-align:top">
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:8px;font-size:11px;color:${GRAY_700}">${h(m)}</div>
        </td>`).join('')
      }</tr></table>`, ORANGE) : '',
    cta ? `<div style="background:linear-gradient(135deg,#3b82f6,#7c3aed);border-radius:8px;padding:16px;color:#fff;margin-top:10px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;opacity:0.85;margin-bottom:4px">Call to Action</div>
      <div style="font-size:13px;font-weight:600">${h(cta)}</div>
    </div>` : '',
  ].filter(Boolean).join('');
}

// ── Journey Map ───────────────────────────────────────────────────────────────
function renderJourneyMap(data: any): string {
  const stages: any[] = data.stages || data.steps || data.journey || (Array.isArray(data) ? data : []);
  if (!stages.length) return renderGeneric(data);

  const persona = data.persona || data.personaName || '';
  const goal = data.goal || data.objective || '';

  return `
    ${(persona || goal) ? card(`
      <table style="width:100%;border-collapse:collapse"><tr>
        ${persona ? `<td style="padding:4px"><span style="font-size:11px;font-weight:700;color:${GRAY_600}">Persona: </span><span style="font-size:12px;color:${GRAY_900}">${h(persona)}</span></td>` : ''}
        ${goal ? `<td style="padding:4px"><span style="font-size:11px;font-weight:700;color:${GRAY_600}">Goal: </span><span style="font-size:12px;color:${GRAY_900}">${h(goal)}</span></td>` : ''}
      </tr></table>
    `, BLUE, 'margin-bottom:12px') : ''}
    ${stages.map((s: any, i: number) => {
      const name = s.stage || s.name || s.title || `Stage ${i + 1}`;
      const desc = s.description || s.summary || '';
      const touchpoints = arr(s.touchpoints || []);
      const painPoints = arr(s.painPoints || s.frustrations || []);
      const opportunities = arr(s.opportunities || []);
      const emotions = arr(s.emotions || []);
      const cols: [string, string[], string][] = [
        ['Touchpoints', touchpoints, BLUE],
        ['Pain Points', painPoints, '#dc2626'],
        ['Opportunities', opportunities, '#16a34a'],
      ].filter(([, v]) => v.length) as [string, string[], string][];

      return card(`
        <div style="display:flex;align-items:center;margin-bottom:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:${BLUE};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;min-width:36px;text-align:center;margin-right:10px">${i + 1}</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:${GRAY_900}">${h(name)}</div>
            ${desc ? `<div style="font-size:12px;color:${GRAY_600}">${h(desc)}</div>` : ''}
          </div>
        </div>
        ${emotions.length ? `<div style="margin-bottom:10px">${emotions.map(e => `<span style="display:inline-block;font-size:10px;padding:3px 8px;background:${GRAY_100};border-radius:999px;margin:2px;color:${GRAY_700}">${h(e)}</span>`).join('')}</div>` : ''}
        ${cols.length ? `<table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <tr>${cols.map(([label, items, color]) => `<td style="width:${Math.floor(100 / cols.length)}%;padding:5px;vertical-align:top">
            <div style="font-size:10px;font-weight:700;color:${color};margin-bottom:5px">${h(label)}</div>
            ${bulletList(items, color)}
          </td>`).join('')}</tr>
        </table>` : ''}
      `, BLUE, 'margin-bottom:12px');
    }).join('')}
  `;
}

// ── Generic fallback ──────────────────────────────────────────────────────────
function renderGeneric(data: any, depth = 0): string {
  if (!data || typeof data !== 'object') return `<p style="font-size:12px;color:${GRAY_700};margin:0">${h(String(data ?? ''))}</p>`;
  if (Array.isArray(data)) return bulletList(data.map(String));

  return Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([key, val]) => {
      const label = toTitle(key);
      const items = arr(val);
      const content = depth < 2 && typeof val === 'object' && !Array.isArray(val)
        ? renderGeneric(val, depth + 1)
        : items.length > 1
          ? bulletList(items)
          : `<p style="font-size:12px;color:${GRAY_700};margin:0">${h(items[0] || '')}</p>`;
      return `<div style="margin-bottom:10px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${GRAY_600};margin-bottom:4px">${h(label)}</div>
        ${content}
      </div>`;
    }).join('');
}

// ── Asset dispatcher ──────────────────────────────────────────────────────────
function renderAssetBody(asset: { kind: string; data: any }): string {
  const d = asset.data;
  switch (asset.kind) {
    case 'SWOT':               return renderSwot(d);
    case 'LEAN_CANVAS':        return renderLeanCanvas(d);
    case 'PERSONA':            return renderPersona(d);
    case 'USER_STORIES':       return renderUserStories(d);
    case 'INTERVIEW_QUESTIONS':return renderInterviewQuestions(d);
    case 'MARKETING_PLAN':     return renderMarketingPlan(d);
    case 'BRAND_WHEEL':        return renderBrandWheel(d);
    case 'BRAND_IDENTITY':     return renderBrandIdentity(d);
    case 'TAM_SAM_SOM':        return renderTamSamSom(d);
    case 'COMPETITOR_MAP':     return renderCompetitorMap(d);
    case 'TEAM_ROLES':         return renderTeamRoles(d);
    case 'PITCH_OUTLINE':      return renderPitchOutline(d);
    case 'JOURNEY_MAP':        return renderJourneyMap(d);
    default:                   return renderGeneric(d);
  }
}

function renderAssetSection(asset: { kind: string; title: string; data: any }): string {
  const label = KIND_LABELS[asset.kind] || toTitle(asset.kind);
  const body = renderAssetBody(asset);
  if (!body.trim()) return '';
  return `
    <div style="margin-bottom:32px;page-break-inside:avoid">
      <h2 style="font-size:16px;font-weight:700;color:${BLUE};border-left:4px solid ${BLUE};padding-left:10px;margin:0 0 14px 0">${h(label)}</h2>
      <div>${body}</div>
    </div>
    <hr style="border:none;border-top:1px solid ${GRAY_100};margin:0 0 28px 0">`;
}

// ── Full HTML document ────────────────────────────────────────────────────────
export function buildExportHtml(project: { title: string; description?: string | null }, assets: any[]): string {
  const sorted = [...assets].sort((a, b) => {
    const ia = ASSET_ORDER.indexOf(a.kind);
    const ib = ASSET_ORDER.indexOf(b.kind);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const body = sorted.map(renderAssetSection).filter(Boolean).join('\n');
  const exportDate = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${h(project.title)} — Project Export</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      color: ${GRAY_700};
      background: #fff;
      margin: 0;
      padding: 32px 40px;
    }
    @page { margin: 20mm 15mm; }
  </style>
</head>
<body>
  <!-- Cover -->
  <div style="border-bottom:3px solid ${ORANGE};padding-bottom:24px;margin-bottom:36px">
    <div style="display:inline-block;background:#fff7ed;color:${ORANGE};font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 12px;border-radius:999px;border:1px solid #fed7aa;margin-bottom:12px">Project Export</div>
    <h1 style="font-size:26px;font-weight:800;color:${GRAY_900};margin:0 0 12px 0">${h(project.title)}</h1>
    ${project.description ? `<p style="font-size:13px;color:#444;max-width:680px;line-height:1.7;margin:0 0 12px 0">${h(project.description)}</p>` : ''}
    <p style="font-size:11px;color:#999;margin:0">Generated on ${exportDate} · FikraOS</p>
  </div>

  ${body || `<p style="color:#999;font-style:italic">No assets have been generated for this project yet.</p>`}
</body>
</html>`;
}

// ── HTML → PDF via LibreOffice ────────────────────────────────────────────────
export async function convertHtmlToPdf(html: string): Promise<Buffer> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-export-'));
  const htmlPath = path.join(tmpDir, 'export.html');
  // Give LibreOffice a writable HOME so it can create its user profile in containers
  const loHome = path.join(tmpDir, 'lo-home');
  fs.mkdirSync(loHome, { recursive: true });

  // Try 'libreoffice' then fall back to 'soffice' (alternative binary name on some systems)
  const binary = await (async () => {
    for (const bin of ['libreoffice', 'soffice']) {
      try { await execFileAsync(bin, ['--version'], { timeout: 5000 }); return bin; } catch {}
    }
    throw new Error('LibreOffice is not installed on this system. Install it via: brew install --cask libreoffice (macOS) or apt-get install libreoffice (Linux)');
  })();

  try {
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`📄 Converting project HTML → PDF with LibreOffice (${binary})...`);

    const { stdout, stderr } = await execFileAsync(binary, [
      '--headless',
      '--norestore',
      '--nofirststartwizard',
      '--convert-to', 'pdf',
      '--outdir', tmpDir,
      htmlPath,
    ], {
      timeout: 60000,
      env: { ...process.env, HOME: loHome },
    });

    if (stdout) console.log('LibreOffice stdout:', stdout);
    if (stderr) console.warn('LibreOffice stderr:', stderr);

    const pdfPath = path.join(tmpDir, 'export.pdf');
    if (!fs.existsSync(pdfPath)) {
      throw new Error('LibreOffice did not produce a PDF output. Check stderr above for details.');
    }

    const buf = fs.readFileSync(pdfPath);
    console.log(`✅ Project PDF generated (${buf.length} bytes)`);
    return buf;

  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
