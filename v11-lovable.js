(()=>{
  const C=window.__GFM,V=window.GFMV4,G=window.G;
  if(!C||!V||!G)return;
  const {S,esc,brl,today,dateBR,by,pname,status}=C,H=V.helpers;

  S.cardDetailId=S.cardDetailId||null;
  S.lovableSectionTitle=S.lovableSectionTitle||null;

  const svg=(body)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const I={
    home:svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>'),
    list:svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>'),
    wallet:svg('<path d="M4 7.5h14a2 2 0 0 1 2 2v8.5H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 11h4v4h-4a2 2 0 1 1 0-4Z"/>'),
    card:svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>'),
    layers:svg('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'),
    undo:svg('<path d="M9 7 4 12l5 5"/><path d="M4 12h9a6 6 0 0 1 6 6"/>'),
    transfer:svg('<path d="M7 7h13l-3-3"/><path d="m17 17-13 0 3 3"/>'),
    repeat:svg('<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
    goal:svg('<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7a5 5 0 1 0 5 5"/><path d="m14 10 7-7"/><path d="M16 3h5v5"/>'),
    trend:svg('<path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/>'),
    scale:svg('<path d="M12 3v18"/><path d="M5 6h14"/><path d="m5 6-3 6h6L5 6Z"/><path d="m19 6-3 6h6l-3-6Z"/><path d="M8 21h8"/>'),
    book:svg('<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v18H6.5A2.5 2.5 0 0 0 4 22V4.5Z"/><path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v18h4.5A2.5 2.5 0 0 1 20 22V4.5Z"/>'),
    history:svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'),
    download:svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
    settings:svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.4v-4h.1A1.7 1.7 0 0 0 4.2 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.66 3.8l.06.06A1.7 1.7 0 0 0 8.6 4.2a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 10 2.5V2.4h4v.1a1.7 1.7 0 0 0 1 1.7 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.6a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7 1Z"/>'),
    moon:svg('<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/>'),
    logout:svg('<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="m14 8 4 4-4 4"/><path d="M8 12h10"/>'),
    plus:svg('<path d="M12 5v14M5 12h14"/>')
  };
  const icon=n=>I[n]||I.home;

  const labels={
    dashboard:'Início',transactions:'Lançamentos',accounts:'Contas e saldos',cards:'Cartões de crédito',
    transfers:'Transferências',goals:'Metas',categories:'Categorias',more:S.lovableSectionTitle||'Mais'
  };
  const pageTitle=()=>labels[S.page]||'Nosso Caixa';

  const navItem=(page,label,ic,extra='')=>{
    const active=S.page===page && (!extra || S.lovableSectionTitle===extra);
    const click=extra?`G.goLovableSection('${extra.replaceAll("'","\\'")}')`:`G.go('${page}')`;
    return `<button class="lov-nav-item ${active?'active':''}" onclick="${click}"><span class="lov-nav-icon">${icon(ic)}</span><span>${label}</span></button>`;
  };

  V.layout=body=>{
    const cards=S.page==='cards';
    const topAction=cards
      ? `<button class="lov-outline-action" onclick="G.modal('purchase')">${icon('plus')}<span>Despesa no cartão</span></button>`
      : `<button class="lov-outline-action" onclick="G.modal('txchoice')">${icon('plus')}<span>Novo lançamento</span></button>`;
    return `<div class="shell lov-shell">
      <aside class="side lov-side">
        <div class="lov-brand"><strong>Nosso Caixa</strong><span>Danilo &amp; Thayna</span></div>
        <button class="lov-new" onclick="G.modal('txchoice')">${icon('plus')}<span>Novo lançamento</span></button>
        <nav class="lov-nav">
          ${navItem('dashboard','Início','home')}
          ${navItem('transactions','Lançamentos','list')}
          ${navItem('accounts','Contas e saldos','wallet')}
          ${navItem('cards','Cartões e faturas','card')}
          ${navItem('cards','Parcelas','layers','Parcelas')}
          ${navItem('more','Reembolsos','undo','Reembolsos')}
          ${navItem('transfers','Transferências','transfer')}
          ${navItem('more','Recorrências','repeat','Recorrências')}
          ${navItem('goals','Metas','goal')}
          ${navItem('dashboard','Projeções','trend','Projeções')}
          ${navItem('more','Renegociações','scale','Renegociações')}
          ${navItem('more','Guia financeiro','book','Guia financeiro')}
          ${navItem('more','Histórico','history','Histórico')}
          <button class="lov-nav-item" onclick="G.csv()"><span class="lov-nav-icon">${icon('download')}</span><span>Exportar dados</span></button>
          ${navItem('more','Família e ajustes','settings','Família e ajustes')}
        </nav>
        <div class="lov-side-foot">
          <button onclick="G.theme()">${icon('moon')}<span>${S.dark?'Tema claro':'Escuro'}</span></button>
          <button onclick="G.logout()">${icon('logout')}<span>Sair</span></button>
        </div>
      </aside>

      <div class="lov-mobile-head"><div><strong>Nosso Caixa</strong><span>Danilo &amp; Thayna</span></div><button onclick="G.theme()">${icon('moon')}</button></div>

      <main class="main lov-main">
        <header class="top lov-top"><div><h1>${pageTitle()}</h1></div><div class="actions">${topAction}</div></header>
        <div class="lov-content">${body}</div>
      </main>

      <nav class="lov-mobile-nav">
        <button class="${S.page==='dashboard'?'active':''}" onclick="G.go('dashboard')">${icon('home')}<span>Início</span></button>
        <button class="${S.page==='transactions'?'active':''}" onclick="G.go('transactions')">${icon('list')}<span>Lançamentos</span></button>
        <button class="lov-mobile-plus" onclick="G.modal('txchoice')">${icon('plus')}</button>
        <button class="${S.page==='cards'?'active':''}" onclick="G.go('cards')">${icon('card')}<span>Cartões</span></button>
        <button class="${S.page==='more'?'active':''}" onclick="G.goLovableSection('Mais')">${icon('settings')}<span>Mais</span></button>
      </nav>
    </div>${V.modal()}`;
  };

  const defColor=c=>{
    const s=String((c?.institution||'')+' '+(c?.name||'')).toLowerCase();
    if(s.includes('nubank'))return'#7c3aed';
    if(s.includes('mercado'))return'#0e7490';
    if(s.includes('bradesco'))return'#333333';
    return'#222222';
  };
  const cfg=c=>H.cardSettings(c)||{};
  const monthKey=()=>H.monthKey(S.cardMonth||today().slice(0,7));
  const cardItems=(c,m)=>S.cardSchedule.filter(i=>i.credit_card_id===c.id&&H.monthKey(i.competency_date)===m);
  const gross=(c,m)=>cardItems(c,m).reduce((s,i)=>s+Number(i.amount||0),0);
  const reimb=(c,m)=>cardItems(c,m).reduce((s,i)=>s+Number(i.reimbursement_expected||0),0);
  const paid=(c,m)=>S.tx.filter(t=>t.type==='card_payment'&&t.status==='paid'&&H.monthKey(H.txdate(t))===m&&(t.credit_card_id===c.id||String(t.description||'').toLowerCase().includes(String(c.name||'').toLowerCase()))).reduce((s,t)=>s+H.amount(t),0);
  const open=(c,m)=>Math.max(0,gross(c,m)-paid(c,m));
  const monthShift=(m,n)=>{const d=new Date(m+'-01T12:00:00');d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,7)};
  const dateFor=(m,day)=>{const d=Math.max(1,Math.min(28,Number(day||1)));return `${m}-${String(d).padStart(2,'0')}`;};
  const cardMonthList=()=>{
    const set=new Set([today().slice(0,7),S.cardMonth||today().slice(0,7)]);
    S.cardSchedule.forEach(i=>{const m=H.monthKey(i.competency_date);if(m)set.add(m)});
    const raw=[...set].sort(),start=monthShift(raw[0]||today().slice(0,7),-12),end=monthShift(raw.at(-1)||today().slice(0,7),12),out=[];
    let x=start;while(x<=end){out.push(x);x=monthShift(x,1)}return out;
  };
  const cycle=(c,m)=>{
    const cgf=cfg(c),closing=Number(cgf.closing_day||c.closing_day||1),due=Number(cgf.due_day||c.due_day||10);
    const now=today().slice(0,7),dnow=Number(today().slice(8,10));
    let statusText='Aberta';
    if(m<now || (m===now&&dnow>=closing))statusText='Fechada';
    return {closing,due,statusText,closingDate:dateFor(m,closing),dueDate:dateFor(m,due)};
  };

  V.cards=()=>{
    const months=cardMonthList();
    if(!S.cardMonth)S.cardMonth=today().slice(0,7);
    const m=monthKey(),detail=by(S.cards,S.cardDetailId);
    const monthbar=`<div class="lov-monthbar"><button class="lov-month-arrow" onclick="G.shiftCardMonthV11(-1)">‹</button><select onchange="G.cardMonthV11(this.value)">${months.map(x=>`<option value="${x}" ${x===m?'selected':''}>${H.monthLabel(x)}</option>`).join('')}</select><button class="lov-month-arrow" onclick="G.shiftCardMonthV11(1)">›</button></div>`;

    if(detail){
      const items=cardItems(detail,m),g=gross(detail,m),r=reimb(detail,m),p=paid(detail,m),o=open(detail,m),cy=cycle(detail,m);
      return `<button class="lov-back" onclick="G.closeCardDetailV11()">← Voltar aos cartões</button>
        ${monthbar}
        <section class="lov-invoice-head">
          <div><span>${pname(H.cardOwner(detail))} · Fatura ${cy.statusText.toLowerCase()}</span><h2>${esc(detail.name)}</h2></div>
          <button class="lov-small-btn" onclick="G.modal('cardsettings',null,'${detail.id}')">${icon('settings')} Editar cartão</button>
        </section>
        <section class="lov-invoice-stats">
          <div><span>Total da fatura</span><b>${brl(g)}</b></div>
          <div><span>Reembolsos</span><b>${brl(r)}</b></div>
          <div><span>Líquido (custo real)</span><b>${brl(g-r)}</b></div>
          <div><span>Em aberto</span><b>${brl(o)}</b></div>
        </section>
        <div class="lov-invoice-actions"><button class="btn primary" onclick="G.modal('purchase')">＋ Compra</button><button class="btn" onclick="G.modal('cardpay',null,'${detail.id}')">✓ Registrar pagamento</button><button class="btn" onclick="G.modal('cardplan',null,'${detail.id}')">Parcelar fatura</button></div>
        <section class="lov-items"><h2>Itens da fatura</h2>${items.length?items.map(i=>`<div class="lov-item-row"><div><b>${esc(i.item)}</b><span>${esc(i.installment_label||i.item_type||'Compra no cartão')}</span></div><strong>${brl(i.amount)}</strong></div>`).join(''):'<div class="lov-empty-line">Nenhuma compra nesta fatura.</div>'}</section>`;
    }

    return `${monthbar}<div class="lov-card-grid">${S.cards.map(c=>{
      const m=monthKey(),g=gross(c,m),o=open(c,m),cy=cycle(c,m),cgf=cfg(c),limit=Number(cgf.limit||c.credit_limit||0),avail=limit?limit-o:null,col=cgf.color||defColor(c);
      return `<article class="lov-credit-card" style="--brand:${esc(col)}">
        <button class="lov-card-main" onclick="G.openCardDetailV11('${c.id}')">
          <div class="lov-card-heading"><div><span class="lov-card-status"><i></i>${cy.statusText}</span><h2>${esc(c.name)}</h2><small><i class="person-dot"></i>${esc(pname(H.cardOwner(c)))}</small></div><span class="lov-card-link">↗</span></div>
          <div class="lov-card-open"><span>Em aberto · ${H.monthLabel(m)}</span><b>${brl(o)}</b></div>
          <div class="lov-card-meta">
            <div><span>Limite total</span><b>${limit?brl(limit):'Limite não informado'}</b></div>
            <div><span>Limite disponível</span><b>${avail===null?'—':brl(avail)}</b></div>
            <div><span>Fechamento · dia ${cy.closing}</span><b>${dateBR(cy.closingDate)}</b></div>
            <div><span>Vencimento · dia ${cy.due}</span><b>${dateBR(cy.dueDate)}</b></div>
          </div>
        </button>
        <div class="lov-card-footer"><button onclick="G.modal('cardpay',null,'${c.id}')">✓ Registrar pagamento</button><button class="lov-card-settings" onclick="G.modal('cardsettings',null,'${c.id}')">${icon('settings')}</button></div>
      </article>`;
    }).join('')}</div>`;
  };

  const oldGo=G.go;
  G.go=p=>{S.lovableSectionTitle=null;if(p!=='cards')S.cardDetailId=null;oldGo(p)};
  Object.assign(G,{
    goLovableSection(title){S.lovableSectionTitle=title;S.page='more';S.modal=null;C.render()},
    openCardDetailV11(id){S.cardDetailId=id;C.render()},
    closeCardDetailV11(){S.cardDetailId=null;C.render()},
    cardMonthV11(v){S.cardMonth=v;C.render()},
    shiftCardMonthV11(n){S.cardMonth=monthShift(monthKey(),n);C.render()}
  });

  C.render();
})();