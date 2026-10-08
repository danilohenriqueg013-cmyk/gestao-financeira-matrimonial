(()=>{
  const C=window.__GFM,V=window.GFMV4,G=window.G;
  if(!C||!V||!G)return;
  const {S,brl,today}=C,H=V.helpers;
  const oldMore=V.more;
  const amount=t=>Number(t.actual_amount??t.planned_amount??0);
  const txDate=t=>H.txdate(t);
  const shiftMonth=(m,n)=>{const d=new Date(m+'-01T12:00:00');d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,7)};
  const monthRange=(start,end)=>{const out=[];let m=start;while(m<=end){out.push(m);m=shiftMonth(m,1)}return out};

  function projectionsV18(){
    const currentMonth=today().slice(0,7);
    const activeReneg=(S.reneg||[]).filter(r=>r.status==='simulation');
    let markedBalance=Number(S.family||0);

    const rows=monthRange(currentMonth,'2027-12').map(m=>{
      const current=m===currentMonth;
      const real=S.tx.filter(t=>H.monthKey(txDate(t))===m&&!['cancelled','simulation','renegotiated'].includes(t.status));
      const income=(current?real.filter(t=>t.type==='income'&&t.status==='pending'):real.filter(t=>t.type==='income')).reduce((s,t)=>s+amount(t),0);
      const expense=(current?real.filter(t=>t.type!=='income'&&t.status==='pending'):real.filter(t=>t.type!=='income')).reduce((s,t)=>s+amount(t),0);
      const result=current?Number(S.family||0)+income-expense:income-expense;
      const sim=S.tx.filter(t=>H.monthKey(txDate(t))===m&&t.status==='simulation').reduce((s,t)=>s+amount(t),0);
      const plan=S.tx.filter(t=>H.monthKey(txDate(t))===m&&t.status==='simulation'&&t.origin==='renegotiation').reduce((s,t)=>s+amount(t),0);
      const replaced=activeReneg.reduce((sum,r)=>{
        const original=S.tx.find(t=>t.credit_card_id===r.credit_card_id&&t.type==='card_payment'&&t.status==='pending'&&t.origin!=='renegotiation'&&H.monthKey(txDate(t))===m&&Math.abs(amount(t)-Number(r.original_amount||0))<0.01);
        return sum+(original?amount(original):0);
      },0);
      markedBalance+=income-expense+replaced-plan;
      return{m,current,income,expense,result,sim,markedBalance};
    });

    const inc=rows.reduce((s,x)=>s+x.income,0),exp=rows.reduce((s,x)=>s+x.expense,0),base=rows.reduce((s,x)=>s+x.result,0);
    return `<section class="lov-summary-strip">
      <div><span>Receitas previstas</span><b>${brl(inc)}</b></div>
      <div><span>Despesas previstas</span><b>${brl(exp)}</b></div>
      <div><span>Resultado previsto</span><b class="${base<0?'negative':'positive'}">${brl(base)}</b></div>
    </section>
    <section class="panel lov-section-panel">
      <div class="panelhead"><div><h2>Projeção mensal</h2><span class="small muted">No mês atual entra o saldo real de hoje. Depois, o saldo projetado carrega o que sobrou do mês anterior.</span></div><span class="small muted">A opção marcada substitui a fatura original.</span></div>
      <div class="tablewrap"><table class="table lov-projection-table"><thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Resultado</th><th>Simulações</th><th>Saldo projetado com opção marcada</th></tr></thead><tbody>
      ${rows.map(x=>`<tr><td><b>${H.monthLabel(x.m)}</b>${x.current?'<small class="lov-current-month-tag">mês atual</small>':''}</td><td>${brl(x.income)}</td><td>${brl(x.expense)}</td><td class="${x.result<0?'negative':'positive'}">${brl(x.result)}${x.current?'<small>inclui saldo atual</small>':''}</td><td>${x.sim?brl(x.sim):'—'}</td><td class="lov-marked-result ${x.markedBalance<0?'negative':'positive'}"><b>${brl(x.markedBalance)}</b><small>${x.current?'saldo final projetado do mês':'carrega o saldo do mês anterior'}</small></td></tr>`).join('')}
      </tbody></table></div>
    </section>`;
  }

  V.more=()=>S.lovableSectionTitle==='Projeções'?projectionsV18():oldMore();
  C.render();
})();