(()=>{
  const X=window.GFMV5,C=window.__GFM,V=window.GFMV4,G=window.G;
  if(!X||!C||!V||!G)return;
  const {S,esc,brl,today,by,pname,status,type,toast,render,mutate,rpc}=C,H=V.helpers;
  const dateBR=C.dateBR;
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
      return {title:c.name,sub:`Cartão de crédito · ${n} lançamento(s) · clique para detalhar`};
    }
    if(t.type==='card_payment'&&c&&t.origin==='renegotiation'){
      return {title:t.description,sub:`${c.name} · parcelamento contratado`};
    }
    return {title:t.description,sub:H.catPath(t.category_id)};
  };
  const rowClick=t=>t.type==='card_payment'&&t.credit_card_id
    ?`G.modal('cardinvoice','${H.monthKey(H.txdate(t))}','${t.credit_card_id}')`
    :`G.modal('txdetail',null,'${t.id}')`;

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
    const summaries=S.people.map(p=>{
      const rr=monthRows.filter(t=>t.responsible_person_id===p.id);
      const inc=rr.filter(t=>t.type==='income').reduce((s,t)=>s+amount(t),0);
      const exp=rr.filter(expenseLike).reduce((s,t)=>s+amount(t),0);
      return {p,inc,exp,net:inc-exp};
    });
    const all=summaries.reduce((a,x)=>({inc:a.inc+x.inc,exp:a.exp+x.exp,net:a.net+x.net}),{inc:0,exp:0,net:0});
    const sims=S.tx.filter(t=>H.monthKey(H.txdate(t))===S.txMonth&&t.status==='simulation').reduce((s,t)=>s+amount(t),0);

    return `<div class="monthbar"><button class="btn sm" onclick="G.shiftTxMonth(-1)">‹</button><select class="btn monthselect" onchange="G.txMonth(this.value)">${monthOptions()}</select><button class="btn sm" onclick="G.shiftTxMonth(1)">›</button></div>
    <div class="tabs">${[['all','Todos'],['pending','Pendentes'],['simulation','Simulações'],['expense','Despesas'],['income','Receitas'],['card_payment','Faturas']].map(([v,l])=>`<button class="tab ${S.filter===v?'active':''}" onclick="G.filter('${v}')">${l}</button>`).join('')}</div>
    <section class="panel summarypanel"><div class="panelhead"><h2>Resumo de ${H.monthLabel(S.txMonth)}</h2><span class="small muted">Simulações não entram nos totais${sims>0?` · ${brl(sims)} em simulação`:''}</span></div>
      <div class="tablewrap"><table class="table summarytable"><thead><tr><th>Descrição</th><th>Receitas</th><th>Despesas</th><th>Saldo atual</th><th>Sem saldo inicial</th></tr></thead><tbody>
      ${summaries.map(x=>`<tr><td><b>${esc(x.p.name)}</b></td><td>${brl(x.inc)}</td><td>${brl(x.exp)}</td><td class="${Number(S.balances.find(b=>b.person_id===x.p.id)?.current_balance||0)<0?'negative':''}">${brl(Number(S.balances.find(b=>b.person_id===x.p.id)?.current_balance||0))}</td><td class="${x.net<0?'negative':''}">${brl(x.net)}</td></tr>`).join('')}
      <tr class="totalrow"><td><b>Total</b></td><td>${brl(all.inc)}</td><td>${brl(all.exp)}</td><td class="${S.family<0?'negative':''}">${brl(S.family)}</td><td class="${all.net<0?'negative':''}">${brl(all.net)}</td></tr></tbody></table></div>
    </section>
    <section class="panel"><div class="panelhead"><div><h2>Lançamentos</h2><div class="small muted">${S.filter==='expense'?'Despesas comuns + faturas de cartão':''}</div></div><button class="btn sm" onclick="G.csv()">Exportar CSV</button></div>
      ${rows.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Descrição</th><th><select class="thfilter" onchange="G.setTxPerson(this.value)"><option value="all">Responsável: todos</option>${S.people.map(p=>`<option value="${p.id}" ${S.txPerson===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></th><th><select class="thfilter" onchange="G.setTxDue(this.value)"><option value="asc" ${S.txDue==='asc'?'selected':''}>Vencimento ↑</option><option value="desc" ${S.txDue==='desc'?'selected':''}>Vencimento ↓</option><option value="overdue" ${S.txDue==='overdue'?'selected':''}>Vencidos</option><option value="next7" ${S.txDue==='next7'?'selected':''}>Próx. 7 dias</option></select></th><th><select class="thfilter" onchange="G.setTxStatus(this.value)"><option value="all">Status: todos</option>${statusOptions()}</select></th><th>Valor</th><th></th></tr></thead><tbody>
      ${rows.map(t=>{const l=rowLabel(t);return `<tr class="clickrow ${t.type==='card_payment'?'card-expense-row':''}" onclick="${rowClick(t)}"><td><b>${esc(l.title)}</b><div class="muted small">${esc(l.sub)}</div></td><td>${pname(t.responsible_person_id)}</td><td>${dateBR(H.txdate(t))}</td><td><span class="badge ${t.status}">${status(t.status)}</span></td><td>${t.type==='income'?'+ ':'− '}${brl(amount(t))}</td><td>${t.status==='pending'&&t.type!=='card_payment'?`<button class="btn sm" onclick="event.stopPropagation();G.settle('${t.id}')">${t.type==='income'?'Receber':'Pagar'}</button>`:t.type==='card_payment'?'<span class="small muted">Detalhar ›</span>':''}</td></tr>`}).join('')}
      </tbody></table></div>`:'<div class="empty">Nenhum lançamento com esses filtros.</div>'}
      <div class="filteredtotal"><div><span>Quantidade</span><b>${rows.length}</b></div><div><span>Receitas contabilizadas</span><b>${brl(receipts)}</b></div><div><span>Despesas contabilizadas</span><b>${brl(expenses)}</b></div><div><span>Saldo filtrado</span><b class="${net<0?'negative':''}">${brl(net)}</b></div></div>
    </section>`;
  };

  V.modalHandlers.cardinvoice=()=>{
    const c=by(S.cards,S.modal.id),m=S.modal.arg||S.txMonth;
    if(!c)return'';
    const its=cardItems(c.id,m);
    const gross=its.reduce((s,i)=>s+Number(i.amount||0),0);
    const reimb=its.reduce((s,i)=>s+Number(i.reimbursement_expected||0),0);
    const invoice=S.tx.find(t=>t.credit_card_id===c.id&&t.type==='card_payment'&&H.monthKey(H.txdate(t))===m&&t.origin!=='renegotiation'&&!['cancelled'].includes(t.status));
    const sim=S.reneg.find(r=>r.credit_card_id===c.id&&r.status==='simulation');
    const contracted=S.reneg.find(r=>r.credit_card_id===c.id&&r.status==='contracted');
    const shownTotal=invoice?amount(invoice):gross;
    return `<div class="modalback" onclick="if(event.target===this)G.close()"><div class="modal invoice-modal"><div class="modalhead"><div><h2>${esc(c.name)}</h2><div class="muted small">${H.monthLabel(m)} · ${pname(c.responsible_person_id)}</div></div><button class="close" onclick="G.close()">×</button></div>
      <div class="invoicebrief"><div><span>Fatura do mês</span><b>${brl(shownTotal)}</b></div><div><span>Reembolsos previstos</span><b>${brl(reimb)}</b></div><div><span>Líquido dos itens</span><b>${brl(Math.max(0,gross-reimb))}</b></div></div>
      ${sim?`<div class="reneg-sim"><div><b>Parcelamento apenas simulado — não contabilizado</b><small>Hoje a fatura original continua valendo. Só muda quando você confirmar que realmente aceitou o acordo no banco.</small></div><div class="reneg-values"><span>Entrada <b>${brl(sim.entry_amount)}</b></span><span>${sim.installments_count}x de <b>${brl(sim.installment_amount)}</b></span><span>Total do acordo <b>${brl(sim.total_amount)}</b></span></div><button class="btn primary" onclick="G.acceptRenegV6('${sim.id}')">✓ Eu aceitei esse parcelamento</button></div>`:contracted?`<div class="reneg-contracted"><b>Parcelamento confirmado</b><span>Entrada ${brl(contracted.entry_amount)} + ${contracted.installments_count}x de ${brl(contracted.installment_amount)} · total ${brl(contracted.total_amount)}</span></div>`:''}
      <div class="panelhead invoice-items-head"><h2>Lançamentos deste cartão</h2><span class="small muted">${its.length} item(ns)</span></div>
      ${its.length?`<div class="tablewrap"><table class="table invoice-items"><thead><tr><th>Descrição</th><th>Parcela</th><th>Valor</th><th>Reembolso</th></tr></thead><tbody>${its.map(i=>`<tr><td><b>${esc(i.item)}</b><div class="small muted">${esc(i.item_type||'')}</div></td><td>${esc(i.installment_label||'—')}</td><td>${brl(i.amount)}</td><td>${Number(i.reimbursement_expected||0)>0?`${brl(i.reimbursement_expected)}${i.reimburser?' · '+esc(i.reimburser):''}`:'—'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Não há itens detalhados cadastrados para este cartão neste mês.</div>'}
      <div class="formactions"><button class="btn" onclick="G.close()">Fechar</button><button class="btn" onclick="G.openCardAreaV6('${c.id}','${m}')">Abrir área de cartões</button></div>
    </div></div>`;
  };

  G.openCardAreaV6=(cardId,m)=>{S.cardFilter=cardId;S.cardMonth=m;S.page='cards';S.modal=null;render()};

  G.acceptRenegV6=async id=>{
    const r=by(S.reneg,id);
    if(!r||r.status!=='simulation')return;
    if(!confirm(`Confirma que você realmente aceitou este parcelamento?\n\nA fatura original será substituída pela entrada e pelas parcelas do acordo, e todos os totais/projeções serão recalculados.`))return;
    await mutate(()=>rpc('contract_renegotiation',{p_renegotiation_id:id}),'Parcelamento confirmado. Valores recalculados.');
  };
})();