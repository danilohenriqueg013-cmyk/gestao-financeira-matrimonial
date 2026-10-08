(()=>{
  const C=window.__GFM,V=window.GFMV4,G=window.G;
  if(!C||!V||!G)return;
  const {S,esc,brl,today,dateBR,by,pname,status}=C,H=V.helpers;
  const PHOTO=window.GFMV5_PHOTO||'';

  const previousLayout=V.layout;
  V.layout=body=>{
    let html=previousLayout(body);
    if(PHOTO){
      html=html.replace(
        '<div class="lov-brand"><strong>Nosso Caixa</strong><span>Danilo &amp; Thayna</span></div>',
        `<div class="lov-brand lov-brand-with-photo"><img class="lov-couple-photo" src="${PHOTO}" alt="Danilo e Thayna"><div><strong>Nosso Caixa</strong><span>Danilo &amp; Thayna</span></div></div>`
      );
    }
    return html;
  };

  const amount=t=>Number(t.actual_amount??t.planned_amount??0);
  const txDate=t=>H.txdate(t);
  const empty=text=>`<div class="lov-section-empty">${esc(text)}</div>`;
  const shiftMonth=(m,n)=>{const d=new Date(m+'-01T12:00:00');d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,7)};
  const monthRange=(start,end)=>{const out=[];let m=start;while(m<=end){out.push(m);m=shiftMonth(m,1)}return out};

  function reimbursementsPage(){
    const txRows=S.tx
      .filter(t=>t.type==='income'&&(t.origin==='reimbursement'||/^reembolso\b/i.test(String(t.description||''))))
      .sort((a,b)=>String(txDate(a)||'').localeCompare(String(txDate(b)||'')));
    const legacy=S.reimbursements||[];
    const pending=txRows.filter(r=>r.status==='pending').reduce((s,r)=>s+amount(r),0);
    const received=txRows.filter(r=>r.status==='received').reduce((s,r)=>s+amount(r),0);
    return `<div class="lov-section-toolbar"><p>Controle dos valores que outras pessoas precisam devolver para vocês.</p><button class="btn primary" onclick="G.modal('reimbursement')">＋ Novo reembolso</button></div>
      <section class="lov-summary-strip">
        <div><span>A receber</span><b>${brl(pending)}</b></div>
        <div><span>Recebido</span><b>${brl(received)}</b></div>
        <div><span>Registros</span><b>${txRows.length||legacy.length}</b></div>
      </section>
      <section class="panel lov-section-panel"><div class="panelhead"><h2>Reembolsos</h2><span class="small muted">${txRows.length} lançamento(s)</span></div>
      ${txRows.length?`<div class="lov-data-list">${txRows.map(r=>`<div class="lov-data-row"><div><b>${esc(r.description)}</b><span>${pname(r.responsible_person_id)} · ${dateBR(txDate(r))}</span></div><strong>${brl(amount(r))}</strong><span class="badge ${r.status}">${status(r.status)}</span>${r.status==='pending'?`<button class="btn sm" onclick="G.settle('${r.id}')">Receber</button>`:'<span></span>'}</div>`).join('')}</div>`:
      legacy.length?`<div class="lov-data-list">${legacy.map(r=>`<div class="lov-data-row"><div><b>${esc(r.description)}</b><span>${pname(r.responsible_person_id)} · ${dateBR(r.expected_date||r.received_date)}</span></div><strong>${brl(r.received_amount??r.expected_amount)}</strong><span class="badge ${r.status}">${status(r.status)}</span>${r.status==='pending'?`<button class="btn sm" onclick="G.receiveReimb('${r.id}')">Receber</button>`:'<span></span>'}</div>`).join('')}</div>`:empty('Nenhum reembolso cadastrado.')}</section>`;
  }

  function recurringPage(){
    const rows=[...(S.recurring||[])].sort((a,b)=>String(a.next_run_date||'').localeCompare(String(b.next_run_date||'')));
    return `<div class="lov-section-toolbar"><p>Regras de receitas e despesas que se repetem ao longo do tempo.</p><button class="btn primary" onclick="G.modal('recurring')">＋ Nova recorrência</button></div>
      <section class="panel lov-section-panel"><div class="panelhead"><h2>Recorrências ativas</h2><span class="small muted">${rows.length} regra(s)</span></div>
      ${rows.length?`<div class="lov-data-list">${rows.map(r=>`<div class="lov-data-row"><div><b>${esc(r.description)}</b><span>${esc(r.frequency||'mensal')} · próxima ${dateBR(r.next_run_date)}</span></div><strong>${brl(r.planned_amount)}</strong><span class="badge pending">Ativa</span><button class="btn sm" onclick="G.generate('${r.id}')">Gerar até 12/27</button></div>`).join('')}</div>`:empty('Nenhuma recorrência cadastrada.')}</section>`;
  }

  function installmentsPage(){
    const rows=[...(S.installments||[])].sort((a,b)=>String(a.due_date||'').localeCompare(String(b.due_date||'')));
    const pending=rows.filter(r=>(r.status||'pending')==='pending').reduce((s,r)=>s+Number(r.amount||0),0);
    return `<section class="lov-summary-strip">
        <div><span>Parcelas cadastradas</span><b>${rows.length}</b></div>
        <div><span>Valor pendente</span><b>${brl(pending)}</b></div>
        <div><span>Último vencimento</span><b>${rows.at(-1)?.due_date?dateBR(rows.at(-1).due_date):'—'}</b></div>
      </section>
      <section class="panel lov-section-panel"><div class="panelhead"><h2>Parcelas</h2><span class="small muted">Compras parceladas registradas no sistema</span></div>
      ${rows.length?`<div class="lov-data-list">${rows.map(r=>`<div class="lov-data-row"><div><b>${esc(by(S.cards,r.credit_card_id)?.name||'Cartão')}</b><span>Parcela ${r.installment_number||'—'}/${r.total_installments||'—'} · ${dateBR(r.due_date)}</span></div><strong>${brl(r.amount)}</strong><span class="badge ${r.status||'pending'}">${status(r.status||'pending')}</span><span></span></div>`).join('')}</div>`:empty('Nenhuma parcela cadastrada.')}</section>`;
  }

  function projectionsPage(){
    const months=monthRange(today().slice(0,7),'2027-12');
    const rows=months.map(m=>{
      const real=S.tx.filter(t=>H.monthKey(txDate(t))===m&&!['cancelled','simulation','renegotiated'].includes(t.status));
      const income=real.filter(t=>t.type==='income').reduce((s,t)=>s+amount(t),0);
      const expense=real.filter(t=>t.type!=='income').reduce((s,t)=>s+amount(t),0);
      const sim=S.tx.filter(t=>H.monthKey(txDate(t))===m&&t.status==='simulation').reduce((s,t)=>s+amount(t),0);
      return{m,income,expense,net:income-expense,sim};
    });
    const inc=rows.reduce((s,x)=>s+x.income,0),exp=rows.reduce((s,x)=>s+x.expense,0);
    return `<section class="lov-summary-strip">
        <div><span>Receitas previstas</span><b>${brl(inc)}</b></div>
        <div><span>Despesas previstas</span><b>${brl(exp)}</b></div>
        <div><span>Resultado previsto</span><b class="${inc-exp<0?'negative':'positive'}">${brl(inc-exp)}</b></div>
      </section>
      <section class="panel lov-section-panel"><div class="panelhead"><h2>Projeção mensal</h2><span class="small muted">Do mês atual até dezembro/2027</span></div>
      <div class="tablewrap"><table class="table lov-projection-table"><thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Resultado</th><th>Simulações</th></tr></thead><tbody>
      ${rows.map(x=>`<tr><td><b>${H.monthLabel(x.m)}</b></td><td>${brl(x.income)}</td><td>${brl(x.expense)}</td><td class="${x.net<0?'negative':'positive'}">${brl(x.net)}</td><td>${x.sim?brl(x.sim):'—'}</td></tr>`).join('')}
      </tbody></table></div></section>`;
  }

  function renegotiationsPage(){
    const rows=[...(S.reneg||[])].sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')));
    return `<div class="lov-section-toolbar"><p>Simulações só viram obrigação real quando você confirma que contratou.</p></div>
      <section class="panel lov-section-panel"><div class="panelhead"><h2>Renegociações</h2><span class="small muted">${rows.length} registro(s)</span></div>
      ${rows.length?`<div class="lov-data-list">${rows.map(r=>`<div class="lov-data-row"><div><b>${esc(r.description)}</b><span>Original ${brl(r.original_amount)} · total ${brl(r.total_amount)}</span></div><strong>${brl(r.total_amount)}</strong><span class="badge ${r.status}">${status(r.status)}</span>${r.status==='simulation'?`<button class="btn sm" onclick="G.contract('${r.id}')">Contratei</button>`:'<span></span>'}</div>`).join('')}</div>`:empty('Nenhuma renegociação cadastrada.')}</section>`;
  }

  function guidePage(){
    const c=S.household?.settings||{};
    const floor=Number(S.household?.security_floor||1000);
    const review=Number(c.purchase_review_amount||100);
    const avoid=c.avoid_installments_until||'2027-04-30';
    const balance=Number(S.family||0),below=balance<floor;
    return `<section class="lov-guide-hero ${below?'warning':''}">
        <span>Guia financeiro da família</span>
        <h2>${below?'Caixa abaixo do piso de segurança':'Caixa dentro do piso configurado'}</h2>
        <p>Saldo familiar real: <b>${brl(balance)}</b> · piso de segurança: <b>${brl(floor)}</b>.</p>
      </section>
      <section class="lov-guide-grid">
        <article><span>01</span><h3>Preservar caixa</h3><p>Evitar novas parcelas até <b>${dateBR(avoid)}</b>, salvo emergência ou decisão consciente.</p></article>
        <article><span>02</span><h3>Revisar compras</h3><p>Compras acima de <b>${brl(review)}</b> recebem aviso para revisão.</p></article>
        <article><span>03</span><h3>Reserva e bebê</h3><p>Priorizar segurança financeira, bebê e compromissos já assumidos antes de novas compras grandes.</p></article>
        <article><span>04</span><h3>Sem bloqueios</h3><p>O guia aconselha, mas não impede lançamentos. A decisão final continua sendo de vocês.</p></article>
      </section>
      <section class="panel lov-section-panel"><div class="panelhead"><h2>Metas relacionadas</h2><button class="btn sm" onclick="G.go('goals')">Abrir metas</button></div>
      <div class="goalsgrid grid">${S.goals.slice(0,4).map(g=>{const target=Number(g.target_amount||0),current=Number(g.current_amount||0),pct=target?Math.min(100,current/target*100):0;return`<article class="goal"><div class="muted small">Meta</div><h3>${esc(g.name)}</h3><strong>${brl(current)}</strong>${target?`<div class="muted small">de ${brl(target)}</div><div class="progress"><i style="width:${pct}%"></i></div>`:''}</article>`}).join('')||empty('Nenhuma meta cadastrada.')}</div></section>`;
  }

  function historyPage(){
    const rows=[...(S.audit||[])].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
    return `<section class="panel lov-section-panel"><div class="panelhead"><h2>Histórico de alterações</h2><span class="small muted">${rows.length} registro(s) carregados</span></div>
      ${rows.length?`<div class="lov-history-list">${rows.map(a=>`<div class="lov-history-row"><div class="lov-history-dot"></div><div><b>${esc(a.action||'Alteração')}</b><span>${esc(a.entity_type||'registro')} · ${new Date(a.created_at).toLocaleString('pt-BR')}</span></div></div>`).join('')}</div>`:empty('Sem alterações registradas.')}</section>`;
  }

  function familyPage(){
    const c=S.household?.settings||{};
    return `<section class="lov-family-people">${S.people.map((p,i)=>`<article><span class="lov-person-avatar">${i===0?'D':'T'}</span><div><b>${esc(p.name)}</b><small>${S.accounts.filter(a=>a.owner_person_id===p.id).map(a=>esc(a.name)).join(' · ')||'Sem conta principal'}</small></div></article>`).join('')}</section>
      <section class="grid settings lov-family-settings">
        <div class="panel"><div class="panelhead"><h2>Configurações da família</h2></div>
          <form onsubmit="G.saveSettings(event)" class="formgrid">
            <div class="field full"><label>Nome</label><input name="name" value="${esc(S.household?.name||'Gestão Financeira Matrimonial')}"></div>
            <div class="field"><label>Piso de segurança</label><input name="floor" inputmode="decimal" value="${Number(S.household?.security_floor||1000).toFixed(2).replace('.',',')}"></div>
            <div class="field"><label>Revisar compras acima de</label><input name="review" inputmode="decimal" value="${Number(c.purchase_review_amount||100).toFixed(2).replace('.',',')}"></div>
            <div class="field"><label>Alerta de vencimento (dias)</label><input name="days" type="number" min="1" max="30" value="${Number(c.due_alert_days||3)}"></div>
            <div class="field"><label>Evitar parcelamento até</label><input name="avoid" type="date" value="${esc(c.avoid_installments_until||'2027-04-30')}"></div>
            <div class="field full"><button class="btn primary" type="submit">Salvar configurações</button></div>
          </form>
        </div>
        <div class="panel"><div class="panelhead"><h2>Convidar Thayna</h2></div>
          <form onsubmit="G.invite(event)" class="formgrid"><div class="field full"><label>E-mail da Thayna</label><input name="email" type="email" required placeholder="email@exemplo.com"></div><div class="field full"><button class="btn primary" type="submit">Gerar link de convite</button></div><div id="inviteOut" class="field full"></div></form>
        </div>
      </section>`;
  }

  V.more=()=>{
    switch(S.lovableSectionTitle){
      case 'Parcelas': return installmentsPage();
      case 'Reembolsos': return reimbursementsPage();
      case 'Recorrências': return recurringPage();
      case 'Projeções': return projectionsPage();
      case 'Renegociações': return renegotiationsPage();
      case 'Guia financeiro': return guidePage();
      case 'Histórico': return historyPage();
      case 'Família e ajustes': return familyPage();
      default:return `<section class="lov-more-grid">
        <button onclick="G.goLovableSection('Reembolsos')"><span>↩</span><b>Reembolsos</b><small>Valores a receber de terceiros</small></button>
        <button onclick="G.goLovableSection('Recorrências')"><span>↻</span><b>Recorrências</b><small>Regras e lançamentos fixos</small></button>
        <button onclick="G.goLovableSection('Projeções')"><span>↗</span><b>Projeções</b><small>Visão mensal até 2027</small></button>
        <button onclick="G.goLovableSection('Renegociações')"><span>⚖</span><b>Renegociações</b><small>Simulações e contratos</small></button>
        <button onclick="G.goLovableSection('Guia financeiro')"><span>▤</span><b>Guia financeiro</b><small>Regras de segurança do caixa</small></button>
        <button onclick="G.goLovableSection('Histórico')"><span>◷</span><b>Histórico</b><small>Alterações registradas</small></button>
        <button onclick="G.goLovableSection('Família e ajustes')"><span>⚙</span><b>Família e ajustes</b><small>Preferências e membros</small></button>
      </section>`;
    }
  };

  C.render();
})();