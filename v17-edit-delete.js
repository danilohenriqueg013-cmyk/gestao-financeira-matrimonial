(()=>{
  const C=window.__GFM,V=window.GFMV4,G=window.G;
  if(!C||!V||!G)return;
  const {S,esc,brl,today,dateBR,num,by,pname,status,toast,api,render,mutate}=C,H=V.helpers;

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
  const typeLabel=t=>t==='income'?'Receita':t==='card_payment'?'Cartão / fatura':'Despesa / débito';

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
    <section class="panel"><div class="panelhead"><div><h2>Lançamentos</h2><div class="small muted">Use Editar para corrigir valor, data, descrição, responsável, conta ou status.</div></div><button class="btn sm" onclick="G.csv()">Exportar CSV</button></div>
      ${rows.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Descrição</th><th><select class="thfilter" onchange="G.setTxPerson(this.value)"><option value="all">Responsável: todos</option>${S.people.map(p=>`<option value="${p.id}" ${S.txPerson===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></th><th><select class="thfilter" onchange="G.setTxDue(this.value)"><option value="asc" ${S.txDue==='asc'?'selected':''}>Vencimento ↑</option><option value="desc" ${S.txDue==='desc'?'selected':''}>Vencimento ↓</option><option value="overdue" ${S.txDue==='overdue'?'selected':''}>Vencidos</option><option value="next7" ${S.txDue==='next7'?'selected':''}>Próx. 7 dias</option></select></th><th><select class="thfilter" onchange="G.setTxStatus(this.value)"><option value="all">Status: todos</option>${statusOptions()}</select></th><th>Valor</th><th>Ações</th></tr></thead><tbody>
      ${rows.map(t=>{const l=rowLabel(t);return `<tr><td><b>${esc(l.title)}</b><div class="muted small">${esc(l.sub)} · ${typeLabel(t.type)}</div></td><td>${pname(t.responsible_person_id)}</td><td>${dateBR(H.txdate(t))}</td><td><span class="badge ${t.status}">${status(t.status)}</span></td><td>${t.type==='income'?'+ ':'− '}${brl(amount(t))}</td><td><div class="tx-actions-v17">${t.status==='pending'&&t.type!=='card_payment'?`<button class="btn sm" onclick="G.settle('${t.id}')">${t.type==='income'?'Receber':'Pagar'}</button>`:''}<button class="btn sm" onclick="G.modal('txedit',null,'${t.id}')">Editar</button><button class="btn sm danger-v17" onclick="G.deleteTxV17('${t.id}')">Excluir</button>${t.type==='card_payment'&&t.credit_card_id?`<button class="btn sm" onclick="G.modal('cardinvoice','${H.monthKey(H.txdate(t))}','${t.credit_card_id}')">Detalhar</button>`:''}</div></td></tr>`}).join('')}
      </tbody></table></div>`:'<div class="empty">Nenhum lançamento com esses filtros.</div>'}
      <div class="filteredtotal"><div><span>Quantidade</span><b>${rows.length}</b></div><div><span>Receitas contabilizadas</span><b>${brl(receipts)}</b></div><div><span>Despesas contabilizadas</span><b>${brl(expenses)}</b></div><div><span>Saldo filtrado</span><b class="${net<0?'negative':''}">${brl(net)}</b></div></div>
    </section>`;
  };

  V.modalHandlers=V.modalHandlers||{};
  V.modalHandlers.txedit=()=>{
    const t=by(S.tx,S.modal?.id);
    if(!t)return '';
    const parts=H.catParts(t.category_id);
    const isIncome=t.type==='income';
    const settled=['paid','received'].includes(t.status);
    return `<div class="modalback" onclick="if(event.target===this)G.close()"><div class="modal"><div class="modalhead"><div><h2>Editar lançamento</h2><div class="small muted">${typeLabel(t.type)}</div></div><button class="close" type="button" onclick="G.close()">×</button></div>
      <form onsubmit="G.saveTxEditV17(event,'${t.id}')" class="formgrid">
        <div class="field full"><label>Descrição</label><input name="description" required value="${esc(t.description)}"></div>
        <div class="field"><label>Valor</label><input name="amount" required inputmode="decimal" value="${Number(amount(t)).toFixed(2).replace('.',',')}"></div>
        <div class="field"><label>Data / vencimento</label><input name="due" type="date" required value="${esc(H.txdate(t)||today())}"></div>
        <div class="field"><label>Responsável</label><select name="person" onchange="G.personChanged(this.value)">${S.people.map(p=>`<option value="${p.id}" ${p.id===t.responsible_person_id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Conta</label><select name="account"><option value="">Sem conta</option>${S.accounts.map(a=>`<option value="${a.id}" ${a.id===t.account_id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
        ${H.categoryFields('editTxV17',parts.parent,parts.sub)}
        <div class="field"><label>Status</label><select name="status">
          <option value="pending" ${t.status==='pending'?'selected':''}>Pendente</option>
          ${isIncome?`<option value="received" ${t.status==='received'?'selected':''}>Recebido</option>`:`<option value="paid" ${t.status==='paid'?'selected':''}>Pago</option>`}
          <option value="cancelled" ${t.status==='cancelled'?'selected':''}>Cancelado</option>
          ${t.status==='simulation'?'<option value="simulation" selected>Simulação</option>':''}
          ${t.status==='renegotiated'?'<option value="renegotiated" selected>Renegociado</option>':''}
        </select></div>
        <div class="field full"><label>Observação</label><textarea name="notes">${esc(t.notes||'')}</textarea></div>
        <div class="field full formactions"><button class="btn" type="button" onclick="G.close()">Cancelar</button><button class="btn primary" type="submit">Salvar alterações</button></div>
      </form>
      <div class="tx-delete-zone-v17"><span>Excluir remove o lançamento da visão financeira, mas mantém o registro técnico no banco para segurança.</span><button class="btn danger-v17" type="button" onclick="G.deleteTxV17('${t.id}')">Excluir lançamento</button></div>
    </div></div>`;
  };

  G.saveTxEditV17=async(e,id)=>{
    e.preventDefault();
    const t=by(S.tx,id);if(!t)return;
    const f=new FormData(e.target),amt=num(f.get('amount')),due=String(f.get('due')),st=String(f.get('status'));
    const cat=f.get('subcategory')||f.get('category')||null;
    const body={
      description:String(f.get('description')).trim(),
      planned_amount:amt,
      actual_amount:['paid','received'].includes(st)?amt:null,
      competency_date:due,
      due_date:due,
      effective_date:['paid','received'].includes(st)?(t.effective_date||today()):null,
      responsible_person_id:String(f.get('person')),
      account_id:f.get('account')||null,
      category_id:cat,
      status:st,
      notes:f.get('notes')||null
    };
    await mutate(()=>api(`/rest/v1/transactions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body}), 'Lançamento atualizado');
  };

  G.deleteTxV17=async id=>{
    const t=by(S.tx,id);if(!t)return;
    const label=`${t.description} — ${brl(amount(t))}`;
    if(!confirm(`Excluir este lançamento?\n\n${label}\n\nEle sairá dos saldos, projeções e listas. Esta ação usa exclusão segura (soft delete).`))return;
    await mutate(()=>api(`/rest/v1/transactions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{deleted_at:new Date().toISOString()}}),'Lançamento excluído');
  };

  render();
})();