const { useState, useEffect, useMemo } = React;

const App = () => {
    // --- PERSISTÊNCIA ---
    const load = (k, d) => { try { const i = localStorage.getItem(k); return i ? JSON.parse(i) : d; } catch { return d; } };
    const [abaAtiva, setAbaAtiva] = useState(load('abaAtiva', 'resumo'));
    const [entradas, setEntradas] = useState(load('entradas', []));
    const [vendas, setVendas] = useState(load('vendas', []));
    const [perdas, setPerdas] = useState(load('perdas', []));

    // Estados dos Formulários
    const [produto, setProduto] = useState('');
    const [custo, setCusto] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [tipo, setTipo] = useState('Unidade');
    const [vendaProduct, setVendaProduct] = useState('');
    const [vendaQty, setVendaQty] = useState('');
    const [vendaPrice, setVendaPrice] = useState('');
    const [perdaProduct, setPerdaProduct] = useState('');
    const [perdaQty, setPerdaQty] = useState('');

    useEffect(() => {
        localStorage.setItem('entradas', JSON.stringify(entradas));
        localStorage.setItem('vendas', JSON.stringify(vendas));
        localStorage.setItem('perdas', JSON.stringify(perdas));
        localStorage.setItem('abaAtiva', JSON.stringify(abaAtiva));
    }, [entradas, vendas, perdas, abaAtiva]);

    // --- CÁLCULOS ---
    const produtosLista = useMemo(() => [...new Set(entradas.map(e => e.product))].sort(), [entradas]);

    const calculateSummary = useMemo(() => {
        const s = {};
        entradas.forEach(e => {
            if (!s[e.product]) s[e.product] = { estoque: 0, totalCusto: 0, lucro: 0, custoPerdas: 0, tipo: e.tipo };
            s[e.product].estoque += parseFloat(e.qty);
            s[e.product].totalCusto += (parseFloat(e.qty) * parseFloat(e.cost));
        });
        vendas.forEach(v => {
            if (s[v.product]) {
                const totalEntrado = entradas.filter(ent => ent.product === v.product).reduce((a, b) => a + b.qty, 0);
                const cMedio = s[v.product].totalCusto / (totalEntrado || 1);
                s[v.product].estoque -= parseFloat(v.qty);
                s[v.product].lucro += (parseFloat(v.price) - (parseFloat(v.qty) * cMedio));
            }
        });
        perdas.forEach(p => {
            if (s[p.product]) {
                const totalEntrado = entradas.filter(ent => ent.product === p.product).reduce((a, b) => a + b.qty, 0);
                const cMedio = s[p.product].totalCusto / (totalEntrado || 1);
                s[p.product].estoque -= parseFloat(p.qty);
                s[p.product].custoPerdas += (parseFloat(p.qty) * cMedio);
            }
        });
        return Object.keys(s).map(p => ({ name: p, ...s[p], custoMedio: s[p].totalCusto / (entradas.filter(ent => ent.product === p).reduce((a, b) => a + b.qty, 0) || 1) }));
    }, [entradas, vendas, perdas]);

    const totals = useMemo(() => calculateSummary.reduce((a, b) => ({
        estoque: a.estoque + b.estoque,
        lucro: a.lucro + b.lucro,
        perdas: a.perdas + b.custoPerdas
    }), { estoque: 0, lucro: 0, perdas: 0 }), [calculateSummary]);

    // --- FUNÇÃO PDF ---
    const gerarPDF = () => {
        const doc = new jspdf.jsPDF();
        doc.setFontSize(20);
        doc.text("Relatório Hortifruti Pro", 14, 22);
        doc.setFontSize(11);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

        const tableData = calculateSummary.map(s => [
            s.name, 
            `R$ ${s.custoMedio.toFixed(2)}`, 
            `${s.estoque.toFixed(2)} ${s.tipo}`, 
            `R$ ${s.lucro.toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Produto', 'Custo Médio', 'Estoque', 'Lucro']],
            body: tableData,
            headStyles: { fillColor: [16, 185, 129] }
        });

        doc.save('relatorio-hortifruti.pdf');
    };

    // --- TELAS ---
    const renderContent = () => {
        if (abaAtiva === 'resumo') return (
            <div className="animate-fadeIn space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="summary-card bg-yellow-50 border-yellow-100 shadow-sm"><p className="text-yellow-700 font-bold mb-1">Estoque Total</p><p className="text-4xl font-black text-yellow-800">{totals.estoque.toFixed(2)}</p></div>
                    <div className="summary-card bg-emerald-50 border-emerald-100 shadow-sm"><p className="text-emerald-700 font-bold mb-1">Lucro Líquido</p><p className="text-4xl font-black text-emerald-800">R$ {totals.lucro.toFixed(2)}</p></div>
                    <div className="summary-card bg-red-50 border-red-100 shadow-sm"><p className="text-red-700 font-bold mb-1">Perdas (Custo)</p><p className="text-4xl font-black text-red-800">R$ {totals.perdas.toFixed(2)}</p></div>
                </div>
                <div className="container-card">
                    <h2 className="text-2xl font-bold mb-6 text-emerald-900">📊 Visão Geral por Produto</h2>
                    <table className="w-full text-left">
                        <thead className="bg-emerald-50 text-emerald-800 uppercase text-xs font-black">
                            <tr><th className="p-4">Produto</th><th className="p-4 text-center">Custo Médio</th><th className="p-4 text-center">Estoque</th><th className="p-4 text-right">Lucro</th></tr>
                        </thead>
                        <tbody>
                            {calculateSummary.map(s => (
                                <tr key={s.name} className="border-b">
                                    <td className="p-4 font-bold">{s.name}</td>
                                    <td className="p-4 text-center">R$ {s.custoMedio.toFixed(2)}</td>
                                    <td className="p-4 text-center font-bold">{s.estoque.toFixed(2)}</td>
                                    <td className={`p-4 text-right font-black ${s.lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>R$ {s.lucro.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );

        if (abaAtiva === 'entradas') return (
            <div className="animate-fadeIn space-y-8">
                <div className="container-card">
                    <h2 className="text-2xl font-bold mb-6 text-emerald-900 font-black">🛒 Registrar Nova Compra</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input className="input-style" placeholder="Produto" value={produto} onChange={e=>setProduto(e.target.value)}/>
                        <input type="number" className="input-style" placeholder="Custo (R$)" value={custo} onChange={e=>setCusto(e.target.value)}/>
                        <input type="number" className="input-style" placeholder="Quantidade" value={quantidade} onChange={e=>setQuantidade(e.target.value)}/>
                        <select className="input-style" value={tipo} onChange={e=>setTipo(e.target.value)}><option>Unidade</option><option>KG</option><option>Caixa</option></select>
                    </div>
                    <button className="main-button mt-6 w-full" onClick={() => { if(produto&&custo&&quantidade){setEntradas([{id:Date.now(), product:produto, cost:parseFloat(custo), qty:parseFloat(quantidade), tipo, date:new Date().toLocaleDateString('pt-BR')}, ...entradas]); setProduto(''); setCusto(''); setQuantidade('');}}}>➕ Registrar Entrada</button>
                </div>
                <div className="container-card">
                    <h3 className="font-bold mb-4">📜 Histórico de Compras </h3>
                    {entradas.map(e => (
                        <div key={e.id} className="flex justify-between items-center p-3 border-b hover:bg-slate-50">
                            <span>{e.date} - <b>{e.product}</b> ({e.qty} {e.tipo})</span>
                            <button onClick={() => setEntradas(entradas.filter(x => x.id !== e.id))} className="text-red-500 hover:scale-110">🗑️</button>
                        </div>
                    ))}
                </div>
            </div>
        );

        if (abaAtiva === 'vendas') return (
            <div className="animate-fadeIn space-y-8">
                <div className="container-card">
                    <h2 className="text-2xl font-bold mb-6 text-emerald-900 font-black">💲 Registrar Venda</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select className="input-style" value={vendaProduct} onChange={e=>setVendaProduct(e.target.value)}><option value="">Selecione...</option>{produtosLista.map(p=><option key={p} value={p}>{p}</option>)}</select>
                        <input type="number" className="input-style" placeholder="Qtd Vendida" value={vendaQty} onChange={e=>setVendaQty(e.target.value)}/>
                        <input type="number" className="input-style" placeholder="Valor Total (R$)" value={vendaPrice} onChange={e=>setVendaPrice(e.target.value)}/>
                    </div>
                    <button className="main-button bg-emerald-500 mt-6 w-full" onClick={()=>{if(vendaProduct&&vendaQty&&vendaPrice){setVendas([{id:Date.now(), product:vendaProduct, qty:parseFloat(vendaQty), price:parseFloat(vendaPrice), date:new Date().toLocaleDateString('pt-BR')}, ...vendas]); setVendaProduct(''); setVendaQty(''); setVendaPrice('');}}}>✔️ Confirmar Venda</button>
                </div>
                <div className="container-card">
                    <h3 className="font-bold mb-4">📜 Histórico de Vendas </h3>
                    {vendas.map(v => (
                        <div key={v.id} className="flex justify-between items-center p-3 border-b hover:bg-slate-50">
                            <span>{v.date} - <b>{v.product}</b> (Qtd: {v.qty} | R$ {v.price.toFixed(2)})</span>
                            <button onClick={() => setVendas(vendas.filter(x => x.id !== v.id))} className="text-red-500 hover:scale-110">🗑️</button>
                        </div>
                    ))}
                </div>
            </div>
        );

        if (abaAtiva === 'perdas') return (
            <div className="animate-fadeIn space-y-8">
                <div className="container-card">
                    <h2 className="text-2xl font-bold mb-6 text-red-900 font-black">🗑️ Registrar Baixa / Perda</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select className="input-style" value={perdaProduct} onChange={e=>setPerdaProduct(e.target.value)}><option value="">Selecione...</option>{produtosLista.map(p=><option key={p} value={p}>{p}</option>)}</select>
                        <input type="number" className="input-style" placeholder="Qtd Perdida" value={perdaQty} onChange={e=>setPerdaQty(e.target.value)}/>
                    </div>
                    <button className="main-button bg-red-600 mt-6 w-full" onClick={()=>{if(perdaProduct&&perdaQty){setPerdas([{id:Date.now(), product:perdaProduct, qty:parseFloat(perdaQty), date:new Date().toLocaleDateString('pt-BR')}, ...perdas]); setPerdaProduct(''); setPerdaQty('');}}}>⚠️ Registrar Perda</button>
                </div>
                <div className="container-card">
                    <h3 className="font-bold mb-4 text-red-700">📜 Histórico de Perdas</h3>
                    {perdas.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 border-b hover:bg-slate-50">
                            <span>{p.date} - <b>{p.product}</b> (Perda: {p.qty})</span>
                            <button onClick={() => setPerdas(perdas.filter(x => x.id !== p.id))} className="text-red-500 hover:scale-110">🗑️</button>
                        </div>
                    ))}
                </div>
            </div>
        );

        if (abaAtiva === 'estoque') return (
            <div className="animate-fadeIn container-card">
                <h2 className="text-2xl font-bold mb-6 text-emerald-900 font-black">📦 Estoque Atual</h2>
                <table className="w-full text-left">
                    <thead className="bg-emerald-50 text-emerald-800 uppercase text-xs font-black">
                        <tr><th className="p-4">Produto</th><th className="p-4 text-center">Estoque</th><th className="p-4 text-right">Custo Médio</th></tr>
                    </thead>
                    <tbody>
                        {calculateSummary.map(s => (
                            <tr key={s.name} className="border-b">
                                <td className="p-4 font-bold">{s.name}</td>
                                <td className={`p-4 text-center font-black ${s.estoque < 5 ? 'text-red-500' : 'text-emerald-600'}`}>{s.estoque.toFixed(2)} {s.tipo}</td>
                                <td className="p-4 text-right text-slate-500">R$ {s.custoMedio.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-10">
            <header className="header-bg flex flex-col md:flex-row items-center justify-between gap-10 mb-12 shadow-xl border-emerald-200">
                <div className="flex items-center gap-10">
                    <img src="assets/logo.png" alt="Logo" className="w-48 h-48 object-contain mix-blend-multiply transition-transform hover:scale-110 duration-300" />
                    <div><h1 className="text-5xl font-black text-emerald-950 tracking-tighter">Hortifruti Pro</h1><p className="text-emerald-800 font-bold text-lg opacity-80 uppercase tracking-widest mt-1">Gestão de Alta Performance</p></div>
                </div>
                <button onClick={gerarPDF} className="bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center gap-3 shadow-2xl hover:bg-emerald-800 hover:-translate-y-1 transition-all active:scale-95">
                    📄 Exportar Relatório PDF
                </button>
            </header>
            <nav className="flex flex-wrap justify-center gap-4 mb-14">
                <button onClick={() => setAbaAtiva('resumo')} className={`nav-button ${abaAtiva === 'resumo' ? 'active' : ''}`}>📊 Resumo e Totais</button>
                <button onClick={() => setAbaAtiva('entradas')} className={`nav-button ${abaAtiva === 'entradas' ? 'active' : ''}`}>🛒 Adicionar Compra</button>
                <button onClick={() => setAbaAtiva('estoque')} className={`nav-button ${abaAtiva === 'estoque' ? 'active' : ''}`}>📦 Estoque</button>
                <button onClick={() => setAbaAtiva('vendas')} className={`nav-button ${abaAtiva === 'vendas' ? 'active' : ''}`}>💲  Registar Vendas</button>
                <button onClick={() => setAbaAtiva('perdas')} className={`nav-button ${abaAtiva === 'perdas' ? 'active' : ''}`}>🗑️ Registar Perdas</button>
            </nav>
            <main className="pb-20">{renderContent()}</main>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));