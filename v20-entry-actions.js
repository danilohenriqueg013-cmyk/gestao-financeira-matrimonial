(()=>{
  const C=window.__GFM,V=window.GFMV4,G=window.G;
  if(!C||!V||!G)return;
  const {S,esc,brl,today,dateBR,num,by,pname,status,type,toast,render,mutate,rpc,optionPeople}=C,H=V.helpers;

  const previousTransactions=V.transactions;
  if(previousTransactions){
    V.transactions=()=>{
      const html=previousTransactions();
      return html.replace(
        '<div class="small muted"></div>',
        '<div class="small muted">Toque em um lançamento para abrir, editar ou excluir.</div>'
      );
    };
  }

  V.modalHandlers.txdetail=()=>{
    const t=by(S.tx,S.modal.id);
    if(!t)return'';
    const canDelete=t.type!=='card_payment';
    return `<div class="modalback" onclick="if(event.target===this)G.close()"><div class="modal">
      <div class="modalhead"><div><h2>Detalhes do lançamento</h2><div class="muted small">${esc(t.description)}</div></div><button class="close" onclick="G.close()">×</button></div>
      <div class="detailgrid">
        <div><span>Tipo</span><b>${type(t.type)}</b></div>
        <div><span>Status</span><b>${status(t.status)}</b></div>
        <div><span>Previsto</span><b>${brl(t.planned_amount)}</b></div>
        <div><span>Efetivo</span><b>${t.actual_amount==null?'—':brl(t.actual_amount)}</b></div>
        <div><span>Responsável</span><b>${pname(t.responsible_person_id)}</b></div>
        <div><span>Vencimento</span><b>${dateBR(t.due_date)}</b></div>
        <div><span>Competência</span><b>${dateBR(t.competency_date)}</b></div>
        <div><span>Categoria</span><b>${esc(H.catPath(t.category_id))}</b></div>
        <div><span>Origem</span><b>${esc(t.origin||'manual')}</b></div>
        <div class="wide"><span>Observação</span><b>${esc(t.notes||'—')}</b></div>
      </div>
      <div class="formactions manage-actions">
        ${t.status==='pending'? `<button class="btn" onclick="G.settle('${t.id}')">${t.type==='income'?'Receber':'Pagar'}</button>` : ''}
        ${canDelete? `<button class="btn danger" onclick="G.deleteTxV20('${t.id}')">Excluir</button>` : ''}
        <button class="btn primary" onclick="G.modal('txedit',null,'${t.id}')">Editar</button>
      </div>
      ${!canDelete?'<div class="manage-note">Para editar ou excluir uma fatura de cartão, abra os itens da fatura e altere o lançamento específico.</div>':''}
    </div></div>`;
  };

  G.deleteTxV20=async id=>{
    const t=by(S.tx,id);
    if(!t)return;
    const extra=H.seriesId(t)||t.recurring_rule_id?'\n\nIsso exclui somente esta ocorrência. As próximas continuam cadastradas.':'';
    if(!confirm(`Excluir “${t.description}” no valor de ${brl(H.amount(t))}?${extra}\n\nO lançamento sairá dos saldos e projeções, mas a alteração continuará registrada no Histórico.`))return;
    await mutate(()=>rpc('delete_transaction_safe',{p_transaction_id:id}),'Lançamento excluído');
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
  const dateFor=(m,day)=>{const d=Math.max(1,Math.min(28,Number(day||1)));return `${m}-${String(d).padStart(2,'0')}`};
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
  const itemActionButtons=i=>`<div class="entry-actions">
    <button class="btn sm" onclick="G.modal('carditemedit',null,'${i.id}')">Editar</button>
    <button class="btn sm danger" onclick="G.deleteCardItemV20('${i.id}')">Excluir</button>
  </div>`;

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
          <button class="lov-small-btn" onclick="G.modal('cardsettings',null,'${detail.id}')">⚙ Editar cartão</button>
        </section>
        <section class="lov-invoice-stats">
          <div><span>Total da fatura</span><b>${brl(g)}</b></div>
          <div><span>Reembolsos</span><b>${brl(r)}</b></div>
          <div><span>Líquido (custo real)</span><b>${brl(g-r)}</b></div>
          <div><span>Em aberto</span><b>${brl(o)}</b></div>
        </section>
        <div class="lov-invoice-actions"><button class="btn primary" onclick="G.modal('purchase')">＋ Compra</button><button class="btn" onclick="G.modal('cardpay',null,'${detail.id}')">✓ Registrar pagamento</button><button class="btn" onclick="G.modal('cardplan',null,'${detail.id}')">Parcelar fatura</button></div>
        <section class="lov-items"><div class="panelhead"><div><h2>Itens da fatura</h2><span class="small muted">Use Editar ou Excluir para corrigir qualquer lançamento do cartão.</span></div></div>
          ${items.length?items.map(i=>`<div class="lov-item-row lov-item-row-manage"><div><b>${esc(i.item)}</b><span>${esc(i.installment_label||i.item_type||'Compra no cartão')}</span></div><strong>${brl(i.amount)}</strong>${itemActionButtons(i)}</div>`).join(''):'<div class="lov-empty-line">Nenhuma compra nesta fatura.</div>'}
        </section>`;
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
        <div class="lov-card-footer"><button onclick="G.modal('cardpay',null,'${c.id}')">✓ Registrar pagamento</button><button class="lov-card-settings" onclick="G.modal('cardsettings',null,'${c.id}')">⚙</button></div>
      </article>`;
    }).join('')}</div>`;
  };

  V.modalHandlers.cardinvoice=()=>{
    const c=by(S.cards,S.modal.id),m=S.modal.arg||S.txMonth;
    if(!c)return'';
    const its=cardItems(c,m);
    const grossValue=its.reduce((s,i)=>s+Number(i.amount||0),0);
    const reimbValue=its.reduce((s,i)=>s+Number(i.reimbursement_expected||0),0);
    const invoice=S.tx.find(t=>t.credit_card_id===c.id&&t.type==='card_payment'&&H.monthKey(H.txdate(t))===m&&t.origin!=='renegotiation'&&!['cancelled'].includes(t.status));
    const sim=S.reneg.find(r=>r.credit_card_id===c.id&&r.status==='simulation');
    const contracted=S.reneg.find(r=>r.credit_card_id===c.id&&r.status==='contracted');
    const shownTotal=invoice?H.amount(invoice):grossValue;
    return `<div class="modalback" onclick="if(event.target===this)G.close()"><div class="modal invoice-modal">
      <div class="modalhead"><div><h2>${esc(c.name)}</h2><div class="muted small">${H.monthLabel(m)} · ${pname(c.responsible_person_id)}</div></div><button class="close" onclick="G.close()">×</button></div>
      <div class="invoicebrief"><div><span>Fatura do mês</span><b>${brl(shownTotal)}</b></div><div><span>Reembolsos previstos</span><b>${brl(reimbValue)}</b></div><div><span>Líquido dos itens</span><b>${brl(Math.max(0,grossValue-reimbValue))}</b></div></div>
      ${sim?`<div class="reneg-sim"><div><b>Simulação de parcelamento</b></div><div class="reneg-values"><span>Entrada <b>${brl(sim.entry_amount)}</b></span><span>${sim.installments_count}x de <b>${brl(sim.installment_amount)}</b></span><span>Total do acordo <b>${brl(sim.total_amount)}</b></span></div><button class="btn primary" onclick="G.acceptRenegV6('${sim.id}')">Confirmar parcelamento</button></div>`:contracted?`<div class="reneg-contracted"><b>Parcelamento confirmado</b><span>Entrada ${brl(contracted.entry_amount)} + ${contracted.installments_count}x de ${brl(contracted.installment_amount)} · total ${brl(contracted.total_amount)}</span></div>`:''}
      <div class="panelhead invoice-items-head"><div><h2>Lançamentos deste cartão</h2><span class="small muted">Editar e excluir alteram automaticamente o total da fatura.</span></div><span class="small muted">${its.length} item(ns)</span></div>
      ${its.length?`<div class="tablewrap"><table class="table invoice-items manage-table"><thead><tr><th>Descrição</th><th>Parcela</th><th>Valor</th><th>Reembolso</th><th>Ações</th></tr></thead><tbody>${its.map(i=>`<tr><td><b>${esc(i.item)}</b><div class="small muted">${esc(i.item_type||'')}</div></td><td>${esc(i.installment_label||'—')}</td><td>${brl(i.amount)}</td><td>${Number(i.reimbursement_expected||0)>0?`${brl(i.reimbursement_expected)}${i.reimburser?' · '+esc(i.reimburser):''}`:'—'}</td><td>${itemActionButtons(i)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Não há itens detalhados cadastrados para este cartão neste mês.</div>'}
      <div class="formactions"><button class="btn" onclick="G.close()">Fechar</button><button class="btn" onclick="G.openCardAreaV6('${c.id}','${m}')">Abrir área de cartões</button></div>
    </div></div>`;
  };

  V.modalHandlers.carditemedit=()=>{
    const i=by(S.cardSchedule,S.modal.id);
    if(!i)return'';
    const c=by(S.cards,i.credit_card_id);
    return `<div class="modalback" onclick="if(event.target===this)G.close()"><div class="modal">
      <div class="modalhead"><div><h2>Editar lançamento do cartão</h2><div class="small muted">${esc(c?.name||'Cartão')} · ${H.monthLabel(H.monthKey(i.competency_date))}</div></div><button class="close" onclick="G.close()">×</button></div>
      <form onsubmit="G.submitCardItemEditV20(event,'${i.id}')" class="formgrid">
        <div class="field full"><label>Descrição</label><input name="item" value="${esc(i.item)}" required></div>
        <div class="field"><label>Valor</label><input name="amount" inputmode="decimal" value="${String(Number(i.amount||0).toFixed(2)).replace('.',',')}" required></div>
        <div class="field full"><label>Reembolso</label><div class="readonly">${Number(i.reimbursement_expected||0)>0?`${brl(i.reimbursement_expected)} · ${esc(i.reimburser||'A receber')}`:'Sem reembolso'}</div></div>
        <div class="field full manage-note">A edição vale para este lançamento/parcela. O total da fatura é recalculado automaticamente. Reembolsos são gerenciados separadamente para não alterar recebimentos por engano.</div>
        <div class="field full formactions"><button class="btn danger" type="button" onclick="G.deleteCardItemV20('${i.id}')">Excluir lançamento</button><button class="btn" type="button" onclick="G.close()">Cancelar</button><button class="btn primary">Salvar alterações</button></div>
      </form>
    </div></div>`;
  };

  G.submitCardItemEditV20=async(e,id)=>{
    e.preventDefault();
    const i=by(S.cardSchedule,id),f=new FormData(e.target),amount=num(f.get('amount'));
    if(!i)return;
    if(!(amount>=0))return toast('Informe um valor válido.',true);
    await mutate(()=>rpc('manage_card_schedule_item',{
      p_item_id:id,
      p_action:'edit',
      p_item:String(f.get('item')||'').trim(),
      p_amount:amount,
      p_reimbursement_expected:Number(i.reimbursement_expected||0),
      p_reimburser:i.reimburser||null
    }),'Lançamento do cartão atualizado');
  };

  G.deleteCardItemV20=async id=>{
    const i=by(S.cardSchedule,id);
    if(!i)return;
    const c=by(S.cards,i.credit_card_id);
    if(!confirm(`Excluir “${i.item}” de ${c?.name||'cartão'} no valor de ${brl(i.amount)}?\n\nIsso altera o total da fatura. A exclusão ficará registrada no Histórico.`))return;
    await mutate(()=>rpc('manage_card_schedule_item',{
      p_item_id:id,
      p_action:'delete',
      p_item:null,
      p_amount:null,
      p_reimbursement_expected:null,
      p_reimburser:null
    }),'Lançamento do cartão excluído');
  };

  render();
})();