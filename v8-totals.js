(()=>{
  const C=window.__GFM,V=window.GFMV4;
  if(!C||!V||!V.transactions)return;
  const {S,brl}=C,H=V.helpers;
  const previous=V.transactions;

  function totals(m){
    const rows=S.tx.filter(t=>H.monthKey(H.txdate(t))===m&&!['cancelled','simulation','renegotiated'].includes(t.status));
    const incomeReceived=rows.filter(t=>t.type==='income'&&t.status==='received').reduce((s,t)=>s+H.amount(t),0);
    const incomePending=rows.filter(t=>t.type==='income'&&t.status==='pending').reduce((s,t)=>s+H.amount(t),0);
    const expensePaid=rows.filter(t=>(t.type==='expense'||t.type==='card_payment')&&t.status==='paid').reduce((s,t)=>s+H.amount(t),0);
    const expensePending=rows.filter(t=>(t.type==='expense'||t.type==='card_payment')&&t.status==='pending').reduce((s,t)=>s+H.amount(t),0);
    return {
      incomeReceived,incomePending,incomeTotal:incomeReceived+incomePending,
      expensePaid,expensePending,expenseTotal:expensePaid+expensePending
    };
  }

  V.transactions=()=>{
    let html=previous();
    const t=totals(S.txMonth);
    const footer=`<div class="month-ledger-totals"><div class="month-ledger-title"><b>Totais de ${H.monthLabel(S.txMonth)}</b><span>Estes valores não mudam quando você usa os filtros acima.</span></div>
      <div class="month-ledger-grid">
        <div class="ledger-group income"><div class="ledger-group-title">Receitas</div><div><span>Já recebido</span><b>${brl(t.incomeReceived)}</b></div><div><span>A receber</span><b>${brl(t.incomePending)}</b></div><div class="absolute"><span>Total absoluto</span><b>${brl(t.incomeTotal)}</b></div></div>
        <div class="ledger-group expense"><div class="ledger-group-title">Despesas</div><div><span>Já pago</span><b>${brl(t.expensePaid)}</b></div><div><span>A pagar</span><b>${brl(t.expensePending)}</b></div><div class="absolute"><span>Total absoluto</span><b>${brl(t.expenseTotal)}</b></div></div>
      </div>
    </div>`;
    html=html.replace(/<div class="filteredtotal">[\s\S]*?<\/div><\/section>$/,footer+'</section>');
    return html;
  };
})();