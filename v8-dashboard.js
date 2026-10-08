(()=>{
  const C=window.__GFM,V=window.GFMV4,G=window.G;
  if(!C||!V||!G)return;
  const {S,esc,brl,today,dateBR,by,pname,status,render}=C,H=V.helpers;

  const txReal=t=>!['cancelled','simulation','renegotiated'].includes(t.status);
  const txExpense=t=>t.type==='expense'||t.type==='card_payment';
  const monthOf=t=>H.monthKey(H.txdate(t));
  const amount=t=>H.amount(t);

  function monthList(){
    const set=new Set([today().slice(0,7),'2027-12']);
    S.tx.forEach(t=>{const m=monthOf(t);if(m)set.add(m)});
    S.cardSchedule.forEach(i=>{const m=H.monthKey(i.competency_date);if(m)set.add(m)});
    const raw=[...set].sort();
    let start=raw[0]||today().slice(0,7), end=raw.at(-1)||'2027-12';
    if(start>'2026-10')start='2026-10';
    if(end<'2027-12')end='2027-12';
    const out=[],d=new Date(start+'-01T12:00:00'),last=new Date(end+'-01T12:00:00');
    while(d<=last){out.push(d.toISOString().slice(0,7));d.setMonth(d.getMonth()+1)}
    return out;
  }

  function ensureMonth(){
    const months=monthList();
    if(!S.dashboardMonth||!months.includes(S.dashboardMonth)){
      S.dashboardMonth=months.includes(today().slice(0,7))?today().slice(0,7):(months[0]||today().slice(0,7));
    }
    return months;
  }

  function monthStats(m){
    const rows=S.tx.filter(t=>monthOf(t)===m&&txReal(t));
    const received=rows.filter(t=>t.type==='income'&&t.status==='received').reduce((s,t)=>s+amount(t),0);
    const toReceive=rows.filter(t=>t.type==='income'&&t.status==='pending').reduce((s,t)=>s+amount(t),0);
    const paid=rows.filter(t=>txExpense(t)&&t.status==='paid').reduce((s,t)=>s+amount(t),0);
    const toPay=rows.filter(t=>txExpense(t)&&t.status==='pending').reduce((s,t)=>s+amount(t),0);
    const income=received+toReceive, expense=paid+toPay;
    const sim=S.tx.filter(t=>monthOf(t)===m&&t.status==='simulation').reduce((s,t)=>s+amount(t),0);
    return {received,toReceive,paid,toPay,income,expense,project:income-expense,sim};
  }

  function dashboardAlerts(m,s){
    const out=[],isCurrent=m===today().slice(0,7),cfg=S.household?.settings||{};
    if(s.project<0)out.push({c:'warn',t:`A projeção de ${H.monthLabel(m)} fecha em ${brl(s.project)}, partindo de saldo inicial R$ 0,00.`});
    else out.push({c:'good',t:`A projeção de ${H.monthLabel(m)} fecha em ${brl(s.project)}, partindo de saldo inicial R$ 0,00.`});
    if(s.sim>0)out.push({c:'warn',t:`${brl(s.sim)} estão em simulação de renegociação neste mês e não entram na projeção até você confirmar a contratação.`});
    if(isCurrent){
      const floor=Number(S.household?.security_floor||1000);
      if(cfg.enable_safety_floor_alert!==false&&S.family<floor)out.push({c:'bad',t:`Saldo familiar real ${brl(S.family)} está abaixo do piso de segurança de ${brl(floor)}.`});
      const overdue=S.tx.filter(t=>t.status==='pending'&&H.txdate(t)&&H.txdate(t)<today());
      if(overdue.length)out.push({c:'bad',t:`${overdue.length} lançamento(s) estão em aberto com vencimento anterior a hoje.`});
    }
    return out;
  }

  function row(t){
    const a=amount(t),past=t.status==='pending'&&H.txdate(t)&&H.txdate(t)<today();
    const isCard=t.type==='card_payment'&&t.credit_card_id;
    const click=isCard?` onclick="G.modal('cardinvoice','${monthOf(t)}','${t.credit_card_id}')"`:'';
    return `<div class="row ${isCard?'clickrow':''}"${click}><div><div class="title">${esc(isCard?(by(S.cards,t.credit_card_id)?.name||t.description):t.description)}</div><div class="sub">${pname(t.responsible_person_id)} · ${dateBR(H.txdate(t))}${past?' · em aberto':''}${isCard?' · clique para detalhar':''}</div></div><div class="money ${t.type==='income'?'positive':''}">${t.type==='income'?'+':'−'} ${brl(a)}</div><div><span class="badge ${t.status}">${status(t.status)}</span></div><div>${t.status==='pending'&&!isCard?`<button class="btn sm" onclick="event.stopPropagation();G.settle('${t.id}')">${t.type==='income'?'Receber':'Pagar'}</button>`:isCard?'<span class="small muted">Detalhar ›</span>':''}</div></div>`;
  }

  V.dashboard=()=>{
    const months=ensureMonth(),m=S.dashboardMonth,s=monthStats(m),isCurrent=m===today().slice(0,7);
    const pending=S.tx.filter(t=>monthOf(t)===m&&t.status==='pending').sort((a,b)=>(H.txdate(a)||'').localeCompare(H.txdate(b)||'')).slice(0,6);
    return `<div class="dashboard-monthbar"><button class="btn sm" onclick="G.shiftDashboardMonth(-1)">‹</button><select class="btn monthselect" onchange="G.dashboardMonth(this.value)">${months.map(x=>`<option value="${x}" ${x===m?'selected':''}>${H.monthLabel(x)}</option>`).join('')}</select><button class="btn sm" onclick="G.shiftDashboardMonth(1)">›</button><span class="dashboard-month-rule">Projeções sempre começam em <b>R$ 0,00</b>. O saldo real do mês anterior só passa a valer quando o mês realmente virar.</span></div>
    <section class="grid metrics">
      <div class="metric"><span class="label">Danilo</span><strong>${brl(Number(S.balances.find(b=>b.name==='Danilo')?.current_balance||0))}</strong><small>saldo real hoje</small></div>
      <div class="metric"><span class="label">Thayna</span><strong>${brl(Number(S.balances.find(b=>b.name==='Thayna')?.current_balance||0))}</strong><small>saldo real hoje</small></div>
      <div class="metric"><span class="label">Família</span><strong>${brl(S.family)}</strong><small>saldo real hoje</small></div>
      <div class="metric projection-metric"><span class="label">Projeção de ${H.monthLabel(m)}</span><strong class="${s.project<0?'negative':'positive'}">${brl(s.project)}</strong><small>saldo inicial R$ 0,00 · ${brl(s.income)} receitas · ${brl(s.expense)} despesas${s.sim?` · ${brl(s.sim)} em simulação (fora)`:''}</small></div>
    </section>
    <section class="projection-split"><div><span>Recebido</span><b>${brl(s.received)}</b></div><div><span>A receber</span><b>${brl(s.toReceive)}</b></div><div><span>Pago</span><b>${brl(s.paid)}</b></div><div><span>A pagar</span><b>${brl(s.toPay)}</b></div></section>
    <section class="grid quick"><button onclick="G.modal('tx','expense')"><span>−</span>Despesa</button><button onclick="G.modal('tx','income')"><span>＋</span>Receita</button><button onclick="G.modal('transfer')"><span>⇄</span>Transferir</button><button onclick="G.modal('purchase')"><span>▣</span>Compra no cartão</button><button onclick="G.go('more')"><span>☷</span>Mais opções</button></section>
    <section class="grid twocol"><div class="panel"><div class="panelhead"><div><h2>Pendências de ${H.monthLabel(m)}</h2><div class="small muted">${isCurrent?'Mês atual':'Projeção mensal sem carregar saldo de outro mês'}</div></div><button class="btn sm" onclick="G.openDashboardMonthTransactions()">Ver todos</button></div>${pending.length?`<div class="list">${pending.map(row).join('')}</div>`:'<div class="empty">Nenhuma pendência real neste mês.</div>'}</div><div class="panel"><div class="panelhead"><h2>Alertas inteligentes</h2></div>${dashboardAlerts(m,s).map(a=>`<div class="alert ${a.c}">${esc(a.t)}</div>`).join('')}</div></section>
    <section class="panel"><div class="panelhead"><h2>Resumo das metas</h2><button class="btn sm" onclick="G.go('goals')">Abrir metas</button></div><div class="grid goalsgrid">${S.goals.slice(0,3).map(g=>{const target=Number(g.target_amount||0),current=Number(g.current_amount||0),pct=target?Math.min(100,current/target*100):0;return`<article class="goal"><div class="muted small">Meta</div><h3>${esc(g.name)}</h3><strong>${brl(current)}</strong><div class="muted small">${target?'de '+brl(target):'sem valor-alvo definido'}</div>${target?`<div class="progress"><i style="width:${pct}%"></i></div>`:''}<div style="margin-top:10px"><button class="btn sm" onclick="G.modal('goal',null,'${g.id}')">Editar</button></div></article>`}).join('')||'<div class="empty">Sem metas.</div>'}</div></section>`;
  };

  Object.assign(G,{
    dashboardMonth(v){S.dashboardMonth=v;render()},
    shiftDashboardMonth(n){const months=ensureMonth(),i=months.indexOf(S.dashboardMonth),j=Math.max(0,Math.min(months.length-1,i+n));S.dashboardMonth=months[j];render()},
    openDashboardMonthTransactions(){S.txMonth=S.dashboardMonth;S.page='transactions';S.modal=null;render()}
  });
})();