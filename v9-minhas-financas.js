(()=>{
  const C=window.__GFM,V=window.GFMV4,G=window.G;
  if(!C||!V||!G)return;
  const {S,esc,brl,today,dateBR,by,pname,status,render}=C,H=V.helpers;

  const mkey=v=>H.monthKey(v);
  const txMonth=t=>mkey(H.txdate(t));
  const amt=t=>H.amount(t);
  const real=t=>!['cancelled','simulation','renegotiated'].includes(t.status);
  const exp=t=>t.type==='expense'||t.type==='card_payment';
  const shiftMonth=(m,n)=>{const d=new Date(m+'-01T12:00:00');d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,7)};
  const curMonth=()=>today().slice(0,7);

  function baseInfo(pid=null){
    const accounts=S.accounts.filter(a=>!pid||a.owner_person_id===pid);
    const dates=accounts.map(a=>a.opening_balance_date).filter(Boolean).sort();
    const date=dates[0]||'2026-10-01';
    return {
      date,
      month:date.slice(0,7),
      amount:accounts.reduce((s,a)=>s+Number(a.opening_balance||0),0)
    };
  }

  function transferNet(m,pid=null){
    if(!pid)return 0;
    const owned=new Set(S.accounts.filter(a=>a.owner_person_id===pid).map(a=>a.id));
    return S.transfers.filter(t=>transferMonth(t)===m&&t.status!=='cancelled').reduce((s,t)=>{
      const v=Number(t.amount||0);
      if(owned.has(t.to_account_id))s+=v;
      if(owned.has(t.from_account_id))s-=v;
      return s;
    },0);
  }

  function settledNet(m,pid=null,baseDate=null){
    const tx=S.tx.filter(t=>real(t)&&txMonth(t)===m&&(!pid||t.responsible_person_id===pid)&&((t.type==='income'&&t.status==='received')||(exp(t)&&t.status==='paid')))
      .filter(t=>!baseDate||(t.effective_date||H.txdate(t)||'')>baseDate)
      .reduce((s,t)=>s+(t.type==='income'?1:-1)*amt(t),0);
    return tx+transferNet(m,pid);
  }

  function pendingNet(m,pid=null){
    return S.tx.filter(t=>real(t)&&txMonth(t)===m&&t.status==='pending'&&(!pid||t.responsible_person_id===pid))
      .reduce((s,t)=>s+(t.type==='income'?1:-1)*amt(t),0);
  }

  function monthMoney(m,pid=null){
    const rows=S.tx.filter(t=>real(t)&&txMonth(t)===m&&(!pid||t.responsible_person_id===pid));
    const incomeReceived=rows.filter(t=>t.type==='income'&&t.status==='received').reduce((s,t)=>s+amt(t),0);
    const incomePending=rows.filter(t=>t.type==='income'&&t.status==='pending').reduce((s,t)=>s+amt(t),0);
    const expensePaid=rows.filter(t=>exp(t)&&t.status==='paid').reduce((s,t)=>s+amt(t),0);
    const expensePending=rows.filter(t=>exp(t)&&t.status==='pending').reduce((s,t)=>s+amt(t),0);
    const simulations=S.tx.filter(t=>txMonth(t)===m&&t.status==='simulation'&&(!pid||t.responsible_person_id===pid)).reduce((s,t)=>s+amt(t),0);
    return {
      incomeReceived,incomePending,incomeTotal:incomeReceived+incomePending,
      expensePaid,expensePending,expenseTotal:expensePaid+expensePending,
      settledMovement:incomeReceived-expensePaid+transferNet(m,pid),
      pendingMovement:incomePending-expensePending,
      simulations
    };
  }

  function liveBalance(pid=null){
    return pid
      ? Number(S.balances.find(b=>b.person_id===pid)?.current_balance||0)
      : Number(S.family||0);
  }

  function historicalOpening(m,pid=null,guard=0){
    if(guard>48)return 0;
    const base=baseInfo(pid);
    if(m<=base.month)return base.amount;
    const prev=shiftMonth(m,-1);
    const prevOpen=historicalOpening(prev,pid,guard+1);
    const prevBase=baseInfo(pid);
    return prevOpen+settledNet(prev,pid,prev===prevBase.month?prevBase.date:null);
  }

  function summary(m,pid=null){
    const base=baseInfo(pid),money=monthMoney(m,pid),now=curMonth();
    if(m>now){
      return {...money,initial:0,current:0,predicted:money.settledMovement+money.pendingMovement};
    }
    if(m===now){
      const current=liveBalance(pid);
      const monthSettled=settledNet(m,pid,m===base.month?base.date:null);
      const initial=m===base.month?base.amount:current-monthSettled;
      return {...money,initial,current,predicted:current+money.pendingMovement};
    }
    const initial=historicalOpening(m,pid);
    const current=initial+settledNet(m,pid,m===base.month?base.date:null);
    return {...money,initial,current,predicted:current+money.pendingMovement};
  }

  function allMonths(){
    const set=new Set([baseInfo().month,curMonth(),'2027-12']);
    S.tx.forEach(t=>{const m=txMonth(t);if(m)set.add(m)});
    S.cardSchedule.forEach(i=>{const m=mkey(i.competency_date);if(m)set.add(m)});
    const raw=[...set].sort(),start=raw[0]||curMonth(),end=raw.at(-1)||'2027-12',out=[];
    const d=new Date(start+'-01T12:00:00'),last=new Date(end+'-01T12:00:00');
    while(d<=last){out.push(d.toISOString().slice(0,7));d.setMonth(d.getMonth()+1)}
    return out;
  }

  function ensureMonth(){
    const months=allMonths();
    if(!S.dashboardMonth||!months.includes(S.dashboardMonth))S.dashboardMonth=months.includes(curMonth())?curMonth():months[0];
    return months;
  }

  function transferMonth(t){return mkey(t.effective_date||t.due_date||String(t.created_at||'').slice(0,10))}
  function transferAmount(m){
    return S.transfers.filter(t=>transferMonth(t)===m&&t.status!=='cancelled').reduce((s,t)=>s+Number(t.amount||0),0);
  }
  const aname=id=>by(S.accounts,id)?.name||'Conta';

  function monthSelector(m,onchange,prev,next){
    return `<div class="mf-monthbar"><button class="btn sm" onclick="${prev}">‹</button><select class="btn monthselect" onchange="${onchange}">${allMonths().map(x=>`<option value="${x}" ${x===m?'selected':''}>${H.monthLabel(x)}</option>`).join('')}</select><button class="btn sm" onclick="${next}">›</button></div>`;
  }

  function statusBox(label,value,cls=''){
    return `<div class="mf-status-line ${cls}"><span>${label}</span><b>${brl(value)}</b></div>`;
  }

  function pendingRow(t){
    const isCard=t.type==='card_payment'&&t.credit_card_id,card=by(S.cards,t.credit_card_id);
    const click=isCard?` onclick="G.modal('cardinvoice','${txMonth(t)}','${t.credit_card_id}')"`:'';
    return `<div class="row ${isCard?'clickrow':''}"${click}><div><div class="title">${esc(isCard?(card?.name||t.description):t.description)}</div><div class="sub">${pname(t.responsible_person_id)} · ${dateBR(H.txdate(t))}</div></div><div class="money ${t.type==='income'?'positive':''}">${t.type==='income'?'+':'−'} ${brl(amt(t))}</div><div><span class="badge ${t.status}">${status(t.status)}</span></div><div>${t.status==='pending'&&!isCard?`<button class="btn sm" onclick="event.stopPropagation();G.settle('${t.id}')">${t.type==='income'?'Receber':'Pagar'}</button>`:isCard?'<span class="small muted">Detalhar ›</span>':''}</div></div>`;
  }

  V.dashboard=()=>{
    const m=ensureMonth()&&S.dashboardMonth,s=summary(m),transfers=transferAmount(m);
    const pending=S.tx.filter(t=>txMonth(t)===m&&t.status==='pending').sort((a,b)=>(H.txdate(a)||'').localeCompare(H.txdate(b)||'')).slice(0,7);
    return `${monthSelector(m,"G.dashboardMonthV9(this.value)","G.shiftDashboardMonthV9(-1)","G.shiftDashboardMonthV9(1)")}
      <section class="panel mf-balance-strip">
        <div><span>Saldo inicial</span><b class="${s.initial<0?'negative':''}">${brl(s.initial)}</b></div>
        <div><span>Saldo atual</span><b class="${s.current<0?'negative':''}">${brl(s.current)}</b></div>
        <div><span>Previsto</span><b class="${s.predicted<0?'negative':'positive'}">${brl(s.predicted)}</b></div>
        ${s.simulations>0?`<div class="mf-simulation-chip"><span>Simulação</span><b>${brl(s.simulations)}</b></div>`:''}
      </section>

      <section class="mf-overview-grid">
        <button class="mf-overview-card banks" onclick="G.openAccountsV9()"><span class="mf-icon">▦</span><div><small>Contas / bancos</small><b class="${s.current<0?'negative':''}">${brl(s.current)}</b></div><span class="arrow">›</span></button>
        <button class="mf-overview-card income" onclick="G.openMonthTypeV9('income')"><span class="mf-icon">＋</span><div><small>Receitas</small><b>${brl(s.incomeTotal)}</b></div><span class="arrow">›</span></button>
        <button class="mf-overview-card expense" onclick="G.openMonthTypeV9('expense')"><span class="mf-icon">−</span><div><small>Despesas</small><b>${brl(s.expenseTotal)}</b></div><span class="arrow">›</span></button>
        <button class="mf-overview-card transfer" onclick="G.openTransfersV9()"><span class="mf-icon">⇅</span><div><small>Transferências</small><b>${brl(0)}</b></div><span class="arrow">›</span></button>
      </section>

      <section class="grid quick mf-quick"><button onclick="G.modal('tx','expense')"><span>−</span>Despesa</button><button onclick="G.modal('tx','income')"><span>＋</span>Receita</button><button onclick="G.modal('transfer')"><span>⇄</span>Transferir</button><button onclick="G.modal('purchase')"><span>▣</span>Compra no cartão</button><button onclick="G.go('more')"><span>☷</span>Mais opções</button></section>

      <section class="grid twocol"><div class="panel"><div class="panelhead"><h2>Pendências de ${H.monthLabel(m)}</h2><button class="btn sm" onclick="G.openMonthTypeV9('all')">Ver todos</button></div>${pending.length?`<div class="list">${pending.map(pendingRow).join('')}</div>`:'<div class="empty">Nenhuma pendência neste mês.</div>'}</div>
      <div class="panel"><div class="panelhead"><h2>Resumo do mês</h2></div><div class="mf-mini-summary">
        <div><span>Receitas</span><b>${brl(s.incomeTotal)}</b></div>
        <div><span>Despesas</span><b>${brl(s.expenseTotal)}</b></div>
        <div><span>Resultado</span><b class="${(s.incomeTotal-s.expenseTotal)<0?'negative':'positive'}">${brl(s.incomeTotal-s.expenseTotal)}</b></div>
        <div><span>Previsto</span><b class="${s.predicted<0?'negative':'positive'}">${brl(s.predicted)}</b></div>
      </div></div></section>

      <section class="panel"><div class="panelhead"><h2>Metas</h2><button class="btn sm" onclick="G.go('goals')">Abrir</button></div><div class="grid goalsgrid">${S.goals.slice(0,3).map(g=>{const target=Number(g.target_amount||0),current=Number(g.current_amount||0),pct=target?Math.min(100,current/target*100):0;return`<article class="goal"><div class="muted small">Meta</div><h3>${esc(g.name)}</h3><strong>${brl(current)}</strong>${target?`<div class="progress"><i style="width:${pct}%"></i></div>`:''}<div style="margin-top:10px"><button class="btn sm" onclick="G.modal('goal',null,'${g.id}')">Editar</button></div></article>`}).join('')||'<div class="empty">Sem metas.</div>'}</div></section>`;
  };

  V.accounts=()=>{
    const m=ensureMonth()&&S.dashboardMonth;
    const fam=summary(m);
    return `${monthSelector(m,"G.detailMonthV9(this.value)","G.shiftDetailMonthV9(-1)","G.shiftDetailMonthV9(1)")}
      <div class="actions subpage-back"><button class="btn" onclick="G.go('dashboard')">← Voltar</button></div>
      <section class="panel"><div class="panelhead"><h2>Contas / bancos</h2></div>
      <div class="account-month-grid">${S.people.map(p=>{const s=summary(m,p.id),accounts=S.accounts.filter(a=>a.owner_person_id===p.id);return`<article class="account-month-card"><div><span class="eyebrow">${esc(p.name)}</span><h3>${esc(accounts.map(a=>a.name).join(' · ')||'Conta principal')}</h3></div><div class="account-values"><div><span>Inicial</span><b>${brl(s.initial)}</b></div><div><span>Atual</span><b>${brl(s.current)}</b></div><div class="close"><span>Previsto</span><b class="${s.predicted<0?'negative':'positive'}">${brl(s.predicted)}</b></div></div></article>`}).join('')}</div>
      <div class="mf-family-account"><span>Família</span><b class="${fam.predicted<0?'negative':'positive'}">${brl(fam.predicted)}</b></div></section>`;
  };

  V.transfers=()=>{
    const m=ensureMonth()&&S.dashboardMonth;
    const rows=S.transfers.filter(t=>transferMonth(t)===m&&t.status!=='cancelled').sort((a,b)=>String(a.effective_date||a.due_date||a.created_at).localeCompare(String(b.effective_date||b.due_date||b.created_at)));
    const total=rows.reduce((s,t)=>s+Number(t.amount||0),0);
    return `${monthSelector(m,"G.detailMonthV9(this.value)","G.shiftDetailMonthV9(-1)","G.shiftDetailMonthV9(1)")}
      <div class="actions subpage-back"><button class="btn" onclick="G.go('dashboard')">← Voltar à visão geral</button><button class="btn primary" onclick="G.modal('transfer')">＋ Nova transferência</button></div>
      <section class="panel"><div class="panelhead"><h2>Transferências · ${H.monthLabel(m)}</h2><b>${brl(total)}</b></div>
      ${rows.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Origem</th><th>Destino</th><th>Data</th><th>Status</th><th>Valor</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${esc(aname(t.from_account_id))}</td><td>${esc(aname(t.to_account_id))}</td><td>${dateBR(t.effective_date||t.due_date||String(t.created_at||'').slice(0,10))}</td><td><span class="badge ${t.status}">${status(t.status)}</span></td><td>${brl(t.amount)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma transferência neste mês.</div>'}
      </section>`;
  };

  Object.assign(G,{
    dashboardMonthV9(v){S.dashboardMonth=v;render()},
    shiftDashboardMonthV9(n){const months=allMonths(),i=months.indexOf(S.dashboardMonth),j=Math.max(0,Math.min(months.length-1,i+n));S.dashboardMonth=months[j];render()},
    openMonthTypeV9(kind){S.txMonth=S.dashboardMonth;S.filter=kind==='all'?'all':kind;S.txStatus='all';S.txPerson='all';S.txDue='asc';S.page='transactions';S.modal=null;render()},
    openAccountsV9(){S.page='accounts';S.modal=null;render()},
    openTransfersV9(){S.page='transfers';S.modal=null;render()},
    detailMonthV9(v){S.dashboardMonth=v;render()},
    shiftDetailMonthV9(n){const months=allMonths(),i=months.indexOf(S.dashboardMonth),j=Math.max(0,Math.min(months.length-1,i+n));S.dashboardMonth=months[j];render()},
    txMonth(v){S.txMonth=v;S.dashboardMonth=v;render()},
    shiftTxMonth(n){S.txMonth=shiftMonth(S.txMonth||curMonth(),n);S.dashboardMonth=S.txMonth;render()}
  });
})();