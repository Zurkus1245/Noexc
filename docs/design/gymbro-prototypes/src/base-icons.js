const I={
 today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
 food:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3v8a2 2 0 002 2v8M11 3v8M3 3v8a2 2 0 002 2M17 3c-2 0-3 3-3 6s1 4 3 4v8"/></svg>',
 chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h18M6 16l4-5 4 3 5-7"/></svg>',
 user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
 users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c.8-3.5 3.5-5 7-5s6.2 1.5 7 5M16 4.5a3.5 3.5 0 010 7M18 15c2 .6 3.4 2.2 4 5"/></svg>',
 tpl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
 bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4"/></svg>',
 money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>'
};
/* ---------- GymBro icon set · one family: 24px grid, 1.75 stroke, round caps/joins, no fills except active ---------- */
const sv=(d,extra='')=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
Object.assign(I,{
 today:sv('<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>'),
 cal:sv('<rect x="3.5" y="5" width="17" height="15" rx="3.5"/><path d="M3.5 10h17M8 3v3.5M16 3v3.5"/>'),
 food:sv('<path d="M7 3v7.5M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 10.5V21M17.5 21V3c-2.2 1-3.5 3.6-3.5 7 0 2 1 3.5 3.5 3.5"/>'),
 chart:sv('<path d="M4 20V4M4 20h16"/><path d="m7.5 15 3.5-4 3 2.5 5-6"/>'),
 user:sv('<circle cx="12" cy="8.5" r="3.75"/><path d="M5 20c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5"/>'),
 users:sv('<circle cx="9" cy="8.5" r="3.25"/><path d="M3 19.5c.7-3.2 3-4.9 6-4.9s5.3 1.7 6 4.9M15.5 5.6a3.2 3.2 0 0 1 0 6M17.5 14.8c1.8.5 3 1.9 3.5 4.7"/>'),
 tpl:sv('<rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>'),
 bell:sv('<path d="M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 1.5H5zM10 20.5h4"/>'),
 money:sv('<rect x="3" y="6.5" width="18" height="12" rx="3"/><circle cx="12" cy="12.5" r="2.75"/><path d="M6.5 9.5v.01M17.5 15.5v.01"/>'),
 back:sv('<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>'),
 fwd:sv('<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>'),
 chev:sv('<path d="m10 7 5 5-5 5"/>','style="width:16px;height:16px;opacity:.45"'),
 close:sv('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
 check:sv('<path d="m5.5 12.5 4.2 4.2 8.8-9.4"/>'),
 plus:sv('<path d="M12 5.5v13M5.5 12h13"/>'),
 minus:sv('<path d="M5.5 12h13"/>'),
 play:sv('<path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l10-6.2a.8.8 0 0 0 0-1.4l-10-6.2A.8.8 0 0 0 8 5.8z" fill="currentColor" stroke="none"/>'),
 search:sv('<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.5 4.5"/>'),
 scan:sv('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 8.5v7M11 8.5v7M14 8.5v7M16.5 8.5v7"/>'),
 history:sv('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9M12 8v4.2l2.8 1.8"/>'),
 copy:sv('<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>'),
 bolt:sv('<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z"/>'),
 home:sv('<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M10 20v-5h4v5"/>'),
 tree:sv('<path d="M12 21v-5M7 16h10l-2.5-3.5H16L12 4 8 12.5h1.5z"/>'),
 dumbbell:sv('<path d="M3.5 9.5v5M6.5 7.5v9M17.5 7.5v9M20.5 9.5v5M6.5 12h11"/>'),
 figure:sv('<circle cx="12" cy="4.8" r="1.8"/><path d="M5 9.5h14M12 9.5V15M12 15l-3.5 5.5M12 15l3.5 5.5"/>'),
 mail:sv('<rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>'),
 apple:'<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.8-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.5-1-2.4-3.9zM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>',
 google:'<svg class="ic" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z"/></svg>',
 star:sv('<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" fill="currentColor" stroke="none"/>'),
 flame:sv('<path d="M12 21c3.6 0 6-2.4 6-5.8 0-3.8-3-5.6-3.6-9.2-2.4 1.4-3.6 3.6-3.4 6-1-.6-1.7-1.6-1.9-2.8C7.4 10.8 6 12.9 6 15.2 6 18.6 8.4 21 12 21z"/>'),
 up:sv('<path d="m7 14 5-5 5 5"/>'),
 down:sv('<path d="m7 10 5 5 5-5"/>'),
 more:sv('<circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/>'),
 pin:sv('<path d="M12 21s6-5.3 6-10.5a6 6 0 0 0-12 0C6 15.7 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>'),
 theme:sv('<circle cx="12" cy="12" r="7.5"/><path d="M12 4.5v15a7.5 7.5 0 0 0 0-15z" fill="currentColor" stroke="none"/>'),
 signal:'<svg viewBox="0 0 18 12" width="18" height="12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx=".8"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3" width="3" height="9" rx=".8"/><rect x="15" y="0" width="3" height="12" rx=".8"/></svg>',
 battery:'<svg viewBox="0 0 27 13" width="27" height="13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2.5" y="2.5" width="17" height="8" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg>'
});
Object.assign(I,{female:sv('<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>'),male:sv('<circle cx="10" cy="14" r="5"/><path d="M13.5 10.5 19 5M14.5 5H19v4.5"/>')});
const ILLO={
 scale:`<svg viewBox="0 0 240 200" class="illo-svg"><defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></linearGradient></defs>
  <rect x="50" y="20" width="140" height="150" rx="30" fill="url(#gl)" stroke="rgba(255,255,255,.35)"/><rect x="80" y="40" width="80" height="36" rx="10" fill="var(--phone)" stroke="var(--A)" stroke-width="2"/>
  <text x="120" y="65" text-anchor="middle" font-family="Oswald,sans-serif" font-size="20" font-weight="600" fill="var(--A-text)">63,5</text>
  <path d="M30 104 Q120 132 210 104 L210 124 Q120 152 30 124 Z" fill="var(--A)"/><path d="M30 104 Q120 132 210 104" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"/>
  ${Array.from({length:13},(_,i)=>{const x=42+i*13.5,y=110+Math.sin((i/12)*Math.PI)*14;return `<line x1="${x}" y1="${y+2}" x2="${x}" y2="${y+(i%2?8:12)}" stroke="#1A0D03" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>`}).join('')}
  <circle cx="68" cy="152" r="4" fill="rgba(255,255,255,.35)"/><circle cx="172" cy="152" r="4" fill="rgba(255,255,255,.35)"/></svg>`,
 plan:`<svg viewBox="0 0 260 210" class="illo-svg">
  <rect x="20" y="30" width="100" height="62" rx="14" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)"/><path d="M32 72 L52 58 L70 66 L90 48 L106 54" fill="none" stroke="var(--A)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="106" cy="54" r="5" fill="var(--A)"/>
  <rect x="44" y="110" width="118" height="70" rx="14" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.28)"/><rect x="58" y="126" width="8" height="8" rx="2" fill="var(--A)"/><rect x="58" y="140" width="8" height="8" rx="2" fill="var(--B)"/><rect x="58" y="154" width="8" height="8" rx="2" fill="#E8C547"/>
  <rect x="72" y="127" width="34" height="6" rx="3" fill="rgba(255,255,255,.4)"/><rect x="72" y="141" width="44" height="6" rx="3" fill="rgba(255,255,255,.4)"/><rect x="72" y="155" width="28" height="6" rx="3" fill="rgba(255,255,255,.4)"/>
  <circle cx="138" cy="145" r="16" fill="none" stroke="var(--B)" stroke-width="8"/><circle cx="138" cy="145" r="16" fill="none" stroke="var(--A)" stroke-width="8" stroke-dasharray="60 101" transform="rotate(-90 138 145)"/>
  <g transform="rotate(8 190 105)"><rect x="140" y="28" width="96" height="140" rx="12" fill="var(--A-d)"/><rect x="150" y="40" width="76" height="118" rx="6" fill="#FBF6EE"/><rect x="170" y="22" width="36" height="16" rx="6" fill="var(--B)"/>
  ${[0,1,2,3].map(i=>`<rect x="158" y="${54+i*24}" width="13" height="13" rx="3" fill="none" stroke="var(--A-d)" stroke-width="2"/>${i<3?`<path d="M160 ${61+i*24} l4 4 l7 -8" fill="none" stroke="var(--A)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`:''}<rect x="178" y="${57+i*24}" width="${36-i*4}" height="6" rx="3" fill="rgba(224,90,0,.35)"/>`).join('')}</g>
  <g transform="rotate(38 222 150)"><rect x="216" y="96" width="10" height="70" rx="3" fill="var(--B)"/><path d="M216 166 l5 12 l5 -12z" fill="#FBF6EE"/></g></svg>`};

