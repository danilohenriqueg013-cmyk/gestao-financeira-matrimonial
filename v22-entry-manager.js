(()=>{
  const C=window.__GFM,V=window.GFMV4,G=window.G;
  if(!C||!V||!G)return;
  const {S,esc,brl,today,dateBR,num,by,pname,status,toast,render,mutate,api,optionPeople}=C,H=V.helpers;

  const real=t=>!['cancelled','simulation','renegotiated'].includes(t.status);
  const expenseLike=t=>t.type==='expense'||t.type==='card_payment';
  const amount=t=>H.amount(t);
  const ensureMonth=()=>{
    if(S.txMonth)return;
    const ms=[...new Set(S.tx.map(H.txdate).filter(Boolean).map(H.monthKey))].sort();
    S.txMonth=ms.includes(today().slice(0,7))?today().slice(0,7):(ms.at(-1)||today().slice(0,7));
  };
  const monthOptions=()=>{
    const ms=[...new Set(S.tx.map(H.txdate).filter(Boolean).map(H.monthKey))].sort();
    if(!ms.includes(S.txMonth))ms.push(S.txMonth);
    return ms.sort().map(m=>`<option value="${m}" ${m===S.txMonth?'selected':''}>${H.monthLabel(m)}</option>`).join('');
  };
  const statusOptions=()=>['pending','paid','received','renegotiated','cancelled','simulation'].map(x=>`<option value="${x}" ${S.txStatus===x?'selected':''}>${status(x)}</option>`).join('');
  const cardFor=t=>by(S.cards,t.credit_card_id);
  const cardItems=(cardId,month)=>S.cardSchedule.filter(i=>i.credit_card_id===cardId&&H.monthKey(i.competency_date)===month);
  const rowLabel=t=>{
    const c=cardFor(t);
    if(t.type==='card_payment'&&c&&t.origin!=='renegotiation'){
      const n=cardItems(c.id,H.monthKey(H.txdate(t))).length;
      return {title:c.name,sub:`Fatura · ${n} lançamento(s)`};
    }
    if(t.type==='card_payment'&&c&&t.origin==='renegotiation'){
      return {title:t.description,sub:`${c.name} · parcelamento contratado`};
    }
    return {title:t.description,sub:H.catPath(t.category_id)};
  };
  const rowClick=t=>t.type==='card_payment'&&t.credit_card_id
    ?`G.modal('cardinvoice','${H.monthKey(H.txdate(t))}','${t.credit_card_id}')`
    :`G.modal('txdetail',null,'${t.id}')`;
  const rowActions=t=>{
    if(t.type==='card_payment'&&t.credit_card_id){
      return `<div class="tx-row-actions"><button class="btn sm" onclick="event.stopPropagation();G.modal('cardinvoice','${H.monthKey(H.txdate(t))}','${t.credit_card_id}')">Abrir fatura</button></div>`;
    }
    return `<div class="tx-row-actions">
      ${t.status==='pending'?`<button class="btn sm" onclick="event.stopPropagation();G.settle('${t.id}')">${t.type==='income'?'Receber':'Pagar'}</button>`:''}
      <button class="btn sm" onclick="event.stopPropagation();G.modal('txedit',null,'${t.id}')">Editar</button>
      <button class="btn sm danger" onclick="event.stopPropagation();G.deleteTxV20('${t.id}')">Excluir</button>
    </div>`;
  };

  V.transactions=()=>{
    ensureMonth();
    let rows=S.tx.filter(t=>H.monthKey(H.txdate(t))===S.txMonth);
    if(S.filter!=='all'){
      if(S.filter==='pending')rows=rows.filter(t=>t.status==='pending');
      else if(S.filter==='simulation')rows=rows.filter(t=>t.status==='simulation');
      else if(S.filter==='expense')rows=rows.filter(t=>expenseLike(t)&&real(t));
      else if(S.filter==='income')rows=rows.filter(t=>t.type==='income'&&real(t));
      else if(S.filter==='card_payment')rows=rows.filter(t=>t.type==='card_payment');
      else rows=rows.filter(t=>t.type===S.filter);
    }
    if(S.txPerson!=='all')rows=rows.filter(t=>t.responsible_person_id===S.txPerson);
    if(S.txStatus!=='all')rows=rows.filter(t=>t.status===S.txStatus);
    const now=today(),week=H.weekDate(now,1);
    if(S.txDue==='overdue')rows=rows.filter(t=>H.txdate(t)&&H.txdate(t)<now&&t.status==='pending');
    if(S.txDue==='next7')rows=rows.filter(t=>H.txdate(t)>=now&&H.txdate(t)<=week);
    rows.sort((a,b)=>(H.txdate(a)||'').localeCompare(H.txdate(b)||'')*(S.txDue==='desc'?-1:1));

    const counted=rows.filter(real);
    const receipts=counted.filter(t=>t.type==='income').reduce((s,t)=>s+amount(t),0);
    const expenses=counted.filter(expenseLike).reduce((s,t)=>s+amount(t),0);
    const net=receipts-expenses;

    const monthRows=S.tx.filter(t=>H.monthKey(H.txdate(t))===S.txMonth&&real(t));
    const isCurrentMonth=S.txMonth===today().slice(0,7);
    const summaries=S.people.map(p=>{
      const rr=monthRows.filter(t=>t.responsible_person_id===p.id);
      const inc=rr.filter(t=>t.type==='income').reduce((s,t)=>s+amount(t),0);
      const exp=rr.filter(expenseLike).reduce((s,t)=>s+amount(t),0);
      const pendingInc=rr.filter(t=>t.type==='income'&&t.status==='pending').reduce((s,t)=>s+amount(t),0);
      const pendingExp=rr.filter(t=>expenseLike(t)&&t.status==='pending').reduce((s,t)=>s+amount(t),0);
      const balance=Number(S.balances.find(b=>b.person_id===p.id)?.current_balance||0);
      const projected=isCurrentMonth?balance+pendingInc-pendingExp:inc-exp;
      return {p,inc,exp,balance,projected};
    });
    const all=summaries.reduce((a,x)=>({inc:a.inc+x.inc,exp:a.exp+x.exp,projected:a.projected+x.projected}),{inc:0,exp:0,projected:0});
    const sims=S.tx.filter(t=>H.monthKey(H.txdate(t))===S.txMonth&&t.status==='simulation').reduce((s,t)=>s+amount(t),0);
    const projectionRule=isCurrentMonth
      ? 'Mês atual: projeção = saldo real de hoje + receitas pendentes − despesas pendentes.'
      : 'Mês futuro: projeção sem carregar o saldo atual. Quando este mês virar o mês atual, o saldo real que sobrou do mês anterior entra automaticamente.';

    return `<div class="monthbar"><button class="btn sm" onclick="G.shiftTxMonth(-1)">‹</button><select class="btn monthselect" onchange="G.txMonth(this.value)">${monthOptions()}</select><button class="btn sm" onclick="G.shiftTxMonth(1)">›</button></div>
    <div class="tabs">${[['all','Todos'],['pending','Pendentes'],['simulation','Simulações'],['expense','Despesas'],['income','Receitas'],['card_payment','Faturas']].map(([v,l])=>`<button class="tab ${S.filter===v?'active':''}" onclick="G.filter('${v}')">${l}</button>`).join('')}</div>
    <section class="panel summarypanel"><div class="panelhead"><div><h2>Resumo de ${H.monthLabel(S.txMonth)}</h2><span class="small muted">${projectionRule}</span></div><span class="small muted">Simulações não entram nos totais${sims>0?` · ${brl(sims)} em simulação`:''}</span></div>
      <div class="tablewrap"><table class="table summarytable"><thead><tr><th>Descrição</th><th>Receitas</th><th>Despesas</th><th>Saldo atual</th><th>Projeção do mês</th></tr></thead><tbody>
      ${summaries.map(x=>`<tr><td><b>${esc(x.p.name)}</b></td><td>${brl(x.inc)}</td><td>${brl(x.exp)}</td><td class="${isCurrentMonth&&x.balance<0?'negative':''}">${isCurrentMonth?brl(x.balance):'—'}</td><td class="${x.projected<0?'negative':'positive'}"><b>${brl(x.projected)}</b></td></tr>`).join('')}
      <tr class="totalrow"><td><b>Total</b></td><td>${brl(all.inc)}</td><td>${brl(all.exp)}</td><td class="${isCurrentMonth&&S.family<0?'negative':''}">${isCurrentMonth?brl(S.family):'—'}</td><td class="${all.projected<0?'negative':'positive'}"><b>${brl(all.projected)}</b></td></tr></tbody></table></div>
    </section>
    <section class="panel"><div class="panelhead"><div><h2>Lançamentos</h2><div class="small muted">Agora você pode editar ou excluir diretamente cada receita, despesa e débito. Faturas abrem os itens do cartão.</div></div><button class="btn sm" onclick="G.csv()">Exportar CSV</button></div>
      ${rows.length?`<div class="tablewrap"><table class="table manage-launch-table"><thead><tr><th>Descrição</th><th><select class="thfilter" onchange="G.setTxPerson(this.value)"><option value="all">Responsável: todos</option>${S.people.map(p=>`<option value="${p.id}" ${S.txPerson===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></th><th><select class="thfilter" onchange="G.setTxDue(this.value)"><option value="asc" ${S.txDue==='asc'?'selected':''}>Vencimento ↑</option><option value="desc" ${S.txDue==='desc'?'selected':''}>Vencimento ↓</option><option value="overdue" ${S.txDue==='overdue'?'selected':''}>Vencidos</option><option value="next7" ${S.txDue==='next7'?'selected':''}>Próx. 7 dias</option></select></th><th><select class="thfilter" onchange="G.setTxStatus(this.value)"><option value="all">Status: todos</option>${statusOptions()}</select></th><th>Valor</th><th>Ações</th></tr></thead><tbody>
      ${rows.map(t=>{const l=rowLabel(t);return `<tr class="clickrow ${t.type==='card_payment'?'card-expense-row':''}" onclick="${rowClick(t)}"><td><b>${esc(l.title)}</b><div class="muted small">${esc(l.sub)}</div></td><td>${pname(t.responsible_person_id)}</td><td>${dateBR(H.txdate(t))}</td><td><span class="badge ${t.status}">${status(t.status)}</span></td><td>${t.type==='income'?'+ ':'− '}${brl(amount(t))}</td><td>${rowActions(t)}</td></tr>`}).join('')}
      </tbody></table></div>`:'<div class="empty">Nenhum lançamento com esses filtros.</div>'}
      <div class="filteredtotal"><div><span>Quantidade</span><b>${rows.length}</b></div><div><span>Receitas contabilizadas</span><b>${brl(receipts)}</b></div><div><span>Despesas contabilizadas</span><b>${brl(expenses)}</b></div><div><span>Saldo filtrado</span><b class="${net<0?'negative':''}">${brl(net)}</b></div></div>
    </section>`;
  };

  const editStatusOptions=t=>{
    const settled=t.type==='income'?'received':'paid';
    const rows=[
      ['pending','Pendente'],
      [settled,t.type==='income'?'Recebido':'Pago'],
      ['cancelled','Cancelado']
    ];
    if(t.status==='simulation')rows.push(['simulation','Simulação']);
    if(t.status==='renegotiated')rows.push(['renegotiated','Renegociado']);
    return rows.map(([v,l])=>`<option value="${v}" ${t.status===v?'selected':''}>${l}</option>`).join('');
  };

  V.modalHandlers.txedit=()=>{
    const t=by(S.tx,S.modal.id);
    if(!t)return'';
    if(t.type==='card_payment'&&t.credit_card_id){
      const m=H.monthKey(H.txdate(t));
      queueMicrotask(()=>G.modal('cardinvoice',m,t.credit_card_id));
      return'';
    }
    const cp=H.catParts(t.category_id);
    return `<div class="modalback" onclick="if(event.target===this)G.close()"><div class="modal">
      <div class="modalhead"><div><h2>Editar lançamento</h2><div class="small muted">${t.type==='income'?'Receita':'Despesa / débito'}</div></div><button class="close" onclick="G.close()">×</button></div>
      <form onsubmit="G.submitTxEditV22(event,'${t.id}')" class="formgrid">
        <div class="field full"><label>Descrição</label><input name="description" value="${esc(t.description)}" required></div>
        <div class="field"><label>Valor</label><input name="amount" inputmode="decimal" value="${String(H.amount(t).toFixed(2)).replace('.',',')}" required></div>
        <div class="field"><label>Vencimento / data</label><input name="due" type="date" value="${t.due_date||t.competency_date||today()}" required></div>
        <div class="field"><label>Responsável</label><select name="person">${optionPeople(t.responsible_person_id)}</select></div>
        <div class="field"><label>Status</label><select name="status">${editStatusOptions(t)}</select></div>
        <div class="field"><label>Data efetiva (se pago/recebido)</label><input name="effective" type="date" value="${t.effective_date||today()}"></div>
        ${H.categoryFields('editv22',cp.parent,cp.sub)}
        <div class="field full"><label>Observação</label><textarea name="notes">${esc(t.notes||'')}</textarea></div>
        <div class="field full manage-note">Esta edição altera somente este lançamento. Para compras no cartão, use a área de Cartões/Faturas, onde cada item também tem Editar e Excluir.</div>
        <div class="field full formactions">
          <button class="btn danger" type="button" onclick="G.deleteTxV20('${t.id}')">Excluir</button>
          <button class="btn" type="button" onclick="G.modal('txdetail',null,'${t.id}')">Cancelar</button>
          <button class="btn primary">Salvar alterações</button>
        </div>
      </form>
    </div></div>`;
  };

  G.submitTxEditV22=async(e,id)=>{
    e.preventDefault();
    const t=by(S.tx,id),f=new FormData(e.target);
    if(!t)return;
    const pid=String(f.get('person')),acct=H.primaryAccount(pid),category=f.get('subcategory')||f.get('category')||null;
    const due=String(f.get('due')),st=String(f.get('status')),amt=num(f.get('amount'));
    if(!(amt>=0))return toast('Informe um valor válido.',true);
    const settled=st==='paid'||st==='received';
    const body={
      description:String(f.get('description')||'').trim(),
      category_id:category,
      responsible_person_id:pid,
      account_id:acct?.id||t.account_id,
      competency_date:due,
      due_date:due,
      planned_amount:amt,
      status:st,
      actual_amount:settled?amt:null,
      effective_date:settled?(String(f.get('effective'))||due):null,
      notes:String(f.get('notes')||'')
    };
    await mutate(()=>api(`/rest/v1/transactions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body}),'Lançamento atualizado');
  };

  render();
})();