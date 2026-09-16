(() => {
  'use strict';
  const paths = {
    home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
    arrow:'M5 12h14m-6-6 6 6-6 6',
    up:'M7 17 17 7M7 7h10v10',
    down:'M12 4v12m-5-5 5 5 5-5M5 16v4h14v-4',
    chevron:'m9 6 6 6-6 6',
    left:'m15 6-6 6 6 6',
    chart:'M4 3v17h17M7 13l4-4 4 3 6-7',
    grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    table:'M3 4h18v16H3zM3 10h18M10 4v16',
    target:'M21 12a9 9 0 1 1-9-9m5 9a5 5 0 1 1-5-5M12 12l9-9M16 3h5v5',
    search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    star:'m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.5l-5.7 3.1 1.1-6.4-4.6-4.5 6.4-.9Z',
    clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',
    news:'M5 3h16v17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8h2M5 3v18M9 7h8M9 11h8M9 15h4M9 18h8',
    fund:'M4 8c0-3 16-3 16 0S4 11 4 8M4 8v5c0 3 16 3 16 0V8M4 13v5c0 3 16 3 16 0v-5',
    sliders:'M4 7h5m4 0h7M4 17h9m4 0h3M9 4v6M13 14v6',
    live:'M8 8v8l7-4ZM19 5a10 10 0 0 1 0 14M5 5a10 10 0 0 0 0 14',
    book:'M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16',
    message:'M21 11a8 8 0 0 1-8 8H7l-4 3V7a5 5 0 0 1 5-5h5a8 8 0 0 1 8 9ZM7 8h9M7 12h6',
    shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6',
    check:'m5 12 4 4L19 6',
    info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 11v6M12 7v.1',
    calendar:'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
    crown:'m3 7 4 3 5-7 5 7 4-3-2 12H5Zm2 9h14',
    menu:'M4 6h16M4 12h16M4 18h16',
    close:'m6 6 12 12M6 18 18 6',
    copy:'M9 8h11v13H9zM15 8V3H4v13h5',
    sort:'M8 5v14m-3-3 3 3 3-3M16 19V5m-3 3 3-3 3 3',
    file:'M5 3h9l5 5v13H5ZM14 3v5h5M9 13h6M9 17h4',
    bolt:'m13 2-9 12h7l-1 8 10-13h-7Z'
  };
  function icon(name, cls='') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.chart}"/></svg>`; }
  function brand() { return `<a class="brand" href="index.html" aria-label="TaktikSaham beranda"><span class="brand-mark"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 36V25h7v11H8Zm12 0V18h7v18h-7Zm12 0V10h7v26h-7Z"/><path d="M7 18 18 9l8 6L40 3l2 5-16 15-8-6-8 7Z"/></svg></span><span><strong>taktik<span>saham.</span></strong><small>Strategi. Disiplin. Tujuan.</small></span></a>`; }
  const navItem=(label,href,name,active=false)=>`<a class="nav-item ${active?'active':''}" ${active?'aria-current="page"':''} href="${href}">${icon(name)}<span>${label}</span></a>`;
  const page=document.body.dataset.page;
  const shell=document.getElementById('appNavigation');
  if(shell){
    shell.innerHTML=`<aside class="sidebar" id="sideNavigation" aria-label="Navigasi utama">${brand()}<button class="icon-button sidebar-close" aria-label="Tutup menu">${icon('close')}</button><div class="nav-label first">WORKSPACE</div><nav class="side-nav">${navItem('Ringkasan saham','saham.html','grid',page==='hub')}${navItem('Rekomendasi','rekomendasi.html','chart',page==='recommendations')}${navItem('Screening saham','screening.html','sliders')}${navItem('Analisis fundamental','analisis.html','file')}${navItem('Reksa dana','reksadana.html','fund')}${navItem('Wealth Management','wealth-management.html','shield',page==='wealth')}</nav><div class="nav-label">AKTIVITAS</div><nav class="side-nav">${navItem('Watchlist saya','rekomendasi.html#watchlist','star')}${navItem('Riwayat rekomendasi','rekomendasi.html#history-rekomendasi','clock')}${navItem('Berita pasar','rekomendasi.html#berita','news')}${navItem('Live Notes','live.html','live')}</nav><div class="sidebar-bottom"><div class="vip-box">${icon('crown')}<b>Belajar lebih terarah.</b><p>Diskusi, edukasi, dan follow up bersama komunitas TaktikSaham.</p><a class="button primary" href="index.html#cara-gabung">Jelajahi VIP Group ${icon('arrow')}</a></div><div class="sidebar-foot"><span>TaktikSaham © 2026</span><span>v.2</span></div></div></aside><button class="sidebar-shade" aria-label="Tutup navigasi"></button>`;
  }
  const top=document.getElementById('appTopbar');
  if(top){ top.innerHTML=`<button class="icon-button mobile-menu" aria-label="Buka menu" aria-expanded="false" aria-controls="sideNavigation">${icon('menu')}</button><div class="breadcrumb"><a href="saham.html">Workspace saham</a>${icon('chevron')}<b>${page==='hub'?'Ringkasan':'Rekomendasi'}</b></div><div class="top-actions"><span class="top-date" id="todayLabel"></span><a class="button small ghost" href="index.html#cara-gabung">${icon('crown')} VIP Group</a><div class="top-divider"></div><a class="profile-link" href="member.html"><span class="profile-dot">TS</span><span>Member</span></a></div>`; }
  document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
  const today=document.getElementById('todayLabel');
  if(today) today.textContent=new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date());
  function setMenu(open){document.body.classList.toggle('sidebar-open',open);document.querySelector('.mobile-menu')?.setAttribute('aria-expanded',String(open)); if(open) document.querySelector('.sidebar-close')?.focus();else document.querySelector('.mobile-menu')?.focus();}
  document.querySelector('.mobile-menu')?.addEventListener('click',()=>setMenu(!document.body.classList.contains('sidebar-open')));
  document.querySelector('.sidebar-close')?.addEventListener('click',()=>setMenu(false));
  document.querySelector('.sidebar-shade')?.addEventListener('click',()=>setMenu(false));
  document.querySelectorAll('.sidebar a').forEach(a=>a.addEventListener('click',()=>{document.body.classList.remove('sidebar-open');document.querySelector('.mobile-menu')?.setAttribute('aria-expanded','false');}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('sidebar-open'))setMenu(false);});
  const publicMenu=document.getElementById('publicMenu');
  publicMenu?.addEventListener('click',()=>{const open=document.getElementById('publicLinks').classList.toggle('open');publicMenu.setAttribute('aria-expanded',String(open));});
  window.TSUi={icon,brand};
})();
