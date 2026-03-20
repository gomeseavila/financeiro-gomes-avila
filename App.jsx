import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileUp, Pencil, Plus, Trash2, Building2, Users, Wallet, TrendingUp, TrendingDown, Package, Percent, Landmark, Filter, Database, CheckCircle2, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const uid = () => Math.random().toString(36).slice(2, 10)
const formatBRL = (v) => brl.format(Number(v || 0))
const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : ''

const DEFAULT_CLIENTS = [
  { id: uid(), name: 'Cliente Exemplo', contact: 'Responsável Financeiro', phone: '(51) 99999-9999', email: 'financeiro@cliente.com', active: true },
]
const DEFAULT_COMPANIES = [
  { id: uid(), clientId: '', tradeName: 'Restaurante Exemplo', legalName: 'Restaurante Exemplo LTDA', document: '12.345.678/0001-90', segment: 'Restaurante', city: 'Porto Alegre/RS', active: true },
]
DEFAULT_COMPANIES[0].clientId = DEFAULT_CLIENTS[0].id
const DEFAULT_COST_CENTERS = [
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, code: 'CC-001', name: 'Administrativo', manager: 'Diretoria', active: true },
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, code: 'CC-002', name: 'Operação', manager: 'Operações', active: true },
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, code: 'CC-003', name: 'Comercial', manager: 'Comercial', active: true },
]
const DEFAULT_ACCOUNTS = [
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, code: '1.1.01', name: 'Vendas à Vista', group: 'Receitas', type: 'receita', active: true },
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, code: '1.1.02', name: 'Vendas a Prazo', group: 'Receitas', type: 'receita', active: true },
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, code: '2.1.01', name: 'Compras de Mercadorias', group: 'CMV', type: 'cmv', active: true },
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, code: '3.1.01', name: 'Folha de Pagamento', group: 'Despesas', type: 'despesa', active: true },
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, code: '3.1.02', name: 'Marketing', group: 'Despesas', type: 'despesa', active: true },
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, code: '3.1.03', name: 'Serviço Terceirizado', group: 'Custos', type: 'custo', active: true },
]
const DEFAULT_USERS = [
  { id: uid(), name: 'Administrador', email: 'admin@gomeseavila.com', profile: 'Admin', active: true },
  { id: uid(), name: 'Consultor', email: 'consultor@gomeseavila.com', profile: 'Analista', active: true },
]
const DEFAULT_TRANSACTIONS = [
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, accountId: DEFAULT_ACCOUNTS[0].id, costCenterId: DEFAULT_COST_CENTERS[1].id, date: '2026-03-01', description: 'Venda balcão', type: 'receita', amount: 18500, category: 'Vendas', group: 'Operacional', source: 'manual', user: 'Administrador', reference: 'Caixa', conciliated: true },
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, accountId: DEFAULT_ACCOUNTS[2].id, costCenterId: DEFAULT_COST_CENTERS[1].id, date: '2026-03-03', description: 'Compra de insumos', type: 'cmv', amount: 6200, category: 'Estoque', group: 'CMV', source: 'manual', user: 'Administrador', reference: 'Fornecedor XPTO', conciliated: false },
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, accountId: DEFAULT_ACCOUNTS[3].id, costCenterId: DEFAULT_COST_CENTERS[0].id, date: '2026-03-05', description: 'Aluguel', type: 'despesa', amount: 3000, category: 'Estrutura', group: 'Fixas', source: 'manual', user: 'Administrador', reference: 'Locador', conciliated: true },
  { id: uid(), companyId: DEFAULT_COMPANIES[0].id, accountId: DEFAULT_ACCOUNTS[5].id, costCenterId: DEFAULT_COST_CENTERS[1].id, date: '2026-03-08', description: 'Serviço terceirizado', type: 'custo', amount: 2400, category: 'Operação', group: 'Custos', source: 'manual', user: 'Consultor', reference: 'NF 123', conciliated: false },
]

function getStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function exportToExcel(fileName, sheets) {
  const wb = XLSX.utils.book_new()
  Object.entries(sheets).forEach(([sheetName, rows]) => {
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  })
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

function exportTablePdf(title, rows, columns) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(title, 14, 16)
  autoTable(doc, {
    startY: 22,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => r[c.key])),
    styles: { fontSize: 8 },
  })
  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`)
}

function normalizeImportedRow(row, fallbackCompanyId, fallbackCostCenterId) {
  const date = row.data || row.date || row.Data || row.DATE || new Date().toISOString().slice(0, 10)
  const description = row.historico || row.descricao || row.description || row.Histórico || row.Descrição || 'Lançamento importado'
  const amountRaw = row.valor || row.amount || row.Valor || row.VALOR || 0
  const type = (row.tipo || row.type || 'despesa').toString().toLowerCase()
  const amount = Number(String(amountRaw).replace(/\./g, '').replace(',', '.')) || 0
  return {
    id: uid(),
    companyId: fallbackCompanyId,
    accountId: '',
    costCenterId: fallbackCostCenterId,
    date: String(date).slice(0, 10),
    description,
    type: ['receita', 'despesa', 'custo', 'cmv'].includes(type) ? type : amount >= 0 ? 'receita' : 'despesa',
    amount: Math.abs(amount),
    category: row.categoria || row.category || 'Importado',
    group: row.grupo || row.group || 'Importado',
    source: 'importação',
    user: 'Importador',
    reference: row.referencia || row.reference || 'Arquivo importado',
    conciliated: false,
  }
}

function KPI({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="card kpi">
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div className="muted small">{title}</div>
            <div className="value">{value}</div>
            {subtitle ? <div className="subtitle">{subtitle}</div> : null}
          </div>
          <div style={{ opacity: .85 }}><Icon size={20} /></div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [companyName, setCompanyName] = useState(() => getStorage('ga_company_name', 'Gomes & Ávila | Financeiro Empresarial'))
  const [clients, setClients] = useState(() => getStorage('ga_clients', DEFAULT_CLIENTS))
  const [companies, setCompanies] = useState(() => getStorage('ga_companies', DEFAULT_COMPANIES))
  const [costCenters, setCostCenters] = useState(() => getStorage('ga_cost_centers', DEFAULT_COST_CENTERS))
  const [accounts, setAccounts] = useState(() => getStorage('ga_accounts', DEFAULT_ACCOUNTS))
  const [users, setUsers] = useState(() => getStorage('ga_users', DEFAULT_USERS))
  const [transactions, setTransactions] = useState(() => getStorage('ga_transactions', DEFAULT_TRANSACTIONS))
  const [notes, setNotes] = useState(() => getStorage('ga_notes', ''))
  const [filters, setFilters] = useState({ search: '', type: 'todos', companyId: 'todos', category: 'todos', group: 'todos', costCenterId: 'todos', conciliation: 'todos', start: '', end: '' })

  const [clientForm, setClientForm] = useState({ id: '', name: '', contact: '', phone: '', email: '', active: true })
  const [companyForm, setCompanyForm] = useState({ id: '', clientId: '', tradeName: '', legalName: '', document: '', segment: '', city: '', active: true })
  const [costCenterForm, setCostCenterForm] = useState({ id: '', companyId: '', code: '', name: '', manager: '', active: true })
  const [accountForm, setAccountForm] = useState({ id: '', companyId: '', code: '', name: '', group: 'Receitas', type: 'receita', active: true })
  const [userForm, setUserForm] = useState({ id: '', name: '', email: '', profile: 'Analista', active: true })
  const [transactionForm, setTransactionForm] = useState({ id: '', companyId: '', accountId: '', costCenterId: '', date: new Date().toISOString().slice(0, 10), description: '', type: 'receita', amount: '', category: '', group: '', source: 'manual', user: 'Administrador', reference: '', conciliated: false })

  const fileRef = useRef(null)

  useEffect(() => localStorage.setItem('ga_company_name', JSON.stringify(companyName)), [companyName])
  useEffect(() => localStorage.setItem('ga_clients', JSON.stringify(clients)), [clients])
  useEffect(() => localStorage.setItem('ga_companies', JSON.stringify(companies)), [companies])
  useEffect(() => localStorage.setItem('ga_cost_centers', JSON.stringify(costCenters)), [costCenters])
  useEffect(() => localStorage.setItem('ga_accounts', JSON.stringify(accounts)), [accounts])
  useEffect(() => localStorage.setItem('ga_users', JSON.stringify(users)), [users])
  useEffect(() => localStorage.setItem('ga_transactions', JSON.stringify(transactions)), [transactions])
  useEffect(() => localStorage.setItem('ga_notes', JSON.stringify(notes)), [notes])

  const companyOptions = useMemo(() => companies.filter((x) => x.active), [companies])
  const userOptions = useMemo(() => users.filter((x) => x.active), [users])
  const filteredCostCenters = useMemo(() => costCenters.filter((x) => x.active), [costCenters])
  const filteredAccounts = useMemo(() => accounts.filter((x) => x.active), [accounts])
  const groups = useMemo(() => [...new Set(transactions.map((t) => t.group).filter(Boolean))], [transactions])
  const categories = useMemo(() => [...new Set(transactions.map((t) => t.category).filter(Boolean))], [transactions])

  const filteredTransactions = useMemo(() => transactions.filter((t) => {
    const text = [t.description, t.category, t.group, t.reference, t.user].join(' ').toLowerCase()
    const matchSearch = text.includes(filters.search.toLowerCase())
    const matchType = filters.type === 'todos' || t.type === filters.type
    const matchCompany = filters.companyId === 'todos' || t.companyId === filters.companyId
    const matchCategory = filters.category === 'todos' || t.category === filters.category
    const matchGroup = filters.group === 'todos' || t.group === filters.group
    const matchCenter = filters.costCenterId === 'todos' || t.costCenterId === filters.costCenterId
    const matchConc = filters.conciliation === 'todos' || String(Boolean(t.conciliated)) === filters.conciliation
    const matchStart = !filters.start || t.date >= filters.start
    const matchEnd = !filters.end || t.date <= filters.end
    return matchSearch && matchType && matchCompany && matchCategory && matchGroup && matchCenter && matchConc && matchStart && matchEnd
  }), [transactions, filters])

  const totals = useMemo(() => {
    const receita = filteredTransactions.filter((t) => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
    const despesa = filteredTransactions.filter((t) => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
    const custo = filteredTransactions.filter((t) => t.type === 'custo').reduce((s, t) => s + Number(t.amount), 0)
    const cmv = filteredTransactions.filter((t) => t.type === 'cmv').reduce((s, t) => s + Number(t.amount), 0)
    const margemContribuicao = receita - custo - cmv
    const lucro = receita - custo - cmv - despesa
    const margemPercentual = receita ? (margemContribuicao / receita) * 100 : 0
    return { receita, despesa, custo, cmv, margemContribuicao, lucro, margemPercentual }
  }, [filteredTransactions])

  const dreRows = useMemo(() => [
    { linha: 'Receita Bruta', valor: totals.receita },
    { linha: '(-) Custos', valor: -totals.custo },
    { linha: '(-) CMV', valor: -totals.cmv },
    { linha: '= Margem de Contribuição', valor: totals.margemContribuicao },
    { linha: '(-) Despesas', valor: -totals.despesa },
    { linha: '= Lucro / Prejuízo', valor: totals.lucro },
  ], [totals])

  const monthlyDreRows = useMemo(() => {
    const byMonth = {}
    filteredTransactions.forEach((t) => {
      const month = t.date.slice(0, 7)
      if (!byMonth[month]) byMonth[month] = { receita: 0, despesa: 0, custo: 0, cmv: 0 }
      byMonth[month][t.type] += Number(t.amount)
    })
    return Object.entries(byMonth).sort(([a],[b]) => a.localeCompare(b)).map(([month, v]) => {
      const margem = v.receita - v.custo - v.cmv
      const lucro = v.receita - v.custo - v.cmv - v.despesa
      return {
        mes: new Date(month + '-01T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
        receita: formatBRL(v.receita), custos: formatBRL(v.custo), cmv: formatBRL(v.cmv), margem: formatBRL(margem), despesas: formatBRL(v.despesa), lucro: formatBRL(lucro),
      }
    })
  }, [filteredTransactions])

  const cashflowRows = useMemo(() => {
    let saldo = 0
    return [...filteredTransactions].sort((a,b) => a.date.localeCompare(b.date)).map((t) => {
      const entrada = t.type === 'receita' ? Number(t.amount) : 0
      const saida = t.type !== 'receita' ? Number(t.amount) : 0
      saldo += entrada - saida
      return {
        data: formatDate(t.date),
        empresa: companies.find((c) => c.id === t.companyId)?.tradeName || '-',
        descricao: t.description,
        tipo: t.type,
        centro: costCenters.find((c) => c.id === t.costCenterId)?.name || '-',
        entrada: entrada ? formatBRL(entrada) : '',
        saida: saida ? formatBRL(saida) : '',
        saldo: formatBRL(saldo),
      }
    })
  }, [filteredTransactions, companies, costCenters])

  const conciliationSummary = useMemo(() => {
    const total = filteredTransactions.length
    const conciliated = filteredTransactions.filter((t) => t.conciliated).length
    return { total, conciliated, pending: total - conciliated }
  }, [filteredTransactions])

  function resetTransactionForm() {
    setTransactionForm({ id: '', companyId: companyOptions[0]?.id || '', accountId: '', costCenterId: '', date: new Date().toISOString().slice(0, 10), description: '', type: 'receita', amount: '', category: '', group: '', source: 'manual', user: userOptions[0]?.name || 'Administrador', reference: '', conciliated: false })
  }

  useEffect(() => {
    if (!transactionForm.companyId && companyOptions[0]?.id) {
      resetTransactionForm()
    }
  }, [companyOptions.length])

  function saveItem(setter, form, resetter) {
    const payload = { ...form, id: form.id || uid() }
    setter((prev) => prev.some((x) => x.id === payload.id) ? prev.map((x) => x.id === payload.id ? payload : x) : [payload, ...prev])
    resetter()
  }

  function saveTransaction() {
    if (!transactionForm.description || !transactionForm.amount || !transactionForm.date || !transactionForm.companyId) return
    const payload = { ...transactionForm, amount: Number(String(transactionForm.amount).replace(/\./g, '').replace(',', '.')), id: transactionForm.id || uid() }
    setTransactions((prev) => prev.some((x) => x.id === payload.id) ? prev.map((x) => x.id === payload.id ? payload : x) : [payload, ...prev])
    resetTransactionForm()
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json(ws)
    const fallbackCompanyId = companyOptions[0]?.id || ''
    const fallbackCostCenterId = filteredCostCenters.find((c) => c.companyId === fallbackCompanyId)?.id || ''
    const imported = json.map((row) => normalizeImportedRow(row, fallbackCompanyId, fallbackCostCenterId))
    setTransactions((prev) => [...imported, ...prev])
    e.target.value = ''
    alert(`${imported.length} lançamentos importados com sucesso.`)
  }

  function exportReportsExcel() {
    exportToExcel(`${companyName}_relatorios`, {
      Dashboard: [
        { indicador: 'Receitas', valor: totals.receita },
        { indicador: 'Despesas', valor: totals.despesa },
        { indicador: 'Custos', valor: totals.custo },
        { indicador: 'CMV', valor: totals.cmv },
        { indicador: 'Margem de Contribuição', valor: totals.margemContribuicao },
        { indicador: '% Margem de Contribuição', valor: `${totals.margemPercentual.toFixed(2)}%` },
        { indicador: 'Lucro / Prejuízo', valor: totals.lucro },
      ],
      Fluxo_de_Caixa: cashflowRows,
      DRE: dreRows.map((r) => ({ linha: r.linha, valor: r.valor })),
      DRE_Mensal: monthlyDreRows,
      Lancamentos: filteredTransactions.map((t) => ({
        data: t.date,
        empresa: companies.find((c) => c.id === t.companyId)?.tradeName || '-',
        descricao: t.description,
        tipo: t.type,
        valor: t.amount,
        categoria: t.category,
        grupo: t.group,
        usuario: t.user,
        referencia: t.reference,
        conciliado: t.conciliated ? 'Sim' : 'Não',
      })),
      Empresas: companies,
      Clientes: clients,
      Centros_de_Custos: costCenters,
      Plano_de_Contas: accounts,
    })
  }

  function exportPdf(which) {
    if (which === 'dre') {
      exportTablePdf('DRE', dreRows.map((r) => ({ linha: r.linha, valor: formatBRL(r.valor) })), [
        { key: 'linha', label: 'Linha' }, { key: 'valor', label: 'Valor' },
      ])
    }
    if (which === 'fluxo') {
      exportTablePdf('Fluxo de Caixa', cashflowRows, [
        { key: 'data', label: 'Data' }, { key: 'empresa', label: 'Empresa' }, { key: 'descricao', label: 'Descrição' }, { key: 'tipo', label: 'Tipo' }, { key: 'centro', label: 'Centro' }, { key: 'entrada', label: 'Entrada' }, { key: 'saida', label: 'Saída' }, { key: 'saldo', label: 'Saldo' },
      ])
    }
    if (which === 'dreMensal') {
      exportTablePdf('DRE Mensal', monthlyDreRows, [
        { key: 'mes', label: 'Mês' }, { key: 'receita', label: 'Receita' }, { key: 'custos', label: 'Custos' }, { key: 'cmv', label: 'CMV' }, { key: 'margem', label: 'Margem' }, { key: 'despesas', label: 'Despesas' }, { key: 'lucro', label: 'Lucro' },
      ])
    }
  }

  function clearAllData() {
    if (!window.confirm('Deseja resetar todos os dados de demonstração?')) return
    setClients(DEFAULT_CLIENTS)
    setCompanies(DEFAULT_COMPANIES)
    setCostCenters(DEFAULT_COST_CENTERS)
    setAccounts(DEFAULT_ACCOUNTS)
    setUsers(DEFAULT_USERS)
    setTransactions(DEFAULT_TRANSACTIONS)
    setNotes('')
  }

  const companyIdForForms = companyOptions[0]?.id || ''

  return (
    <div className="app-shell">
      <div className="hero">
        <div className="card">
          <div className="card-body">
            <div style={{ display:'flex', justifyContent:'space-between', gap: 12, alignItems:'flex-start', flexWrap:'wrap' }}>
              <div>
                <div className="muted small">Software Financeiro Empresarial</div>
                <h1>{companyName}</h1>
                <div className="muted">Versão web profissional para uso imediato, com múltiplos clientes e empresas, centros de custos, conciliação bancária e relatórios gerenciais.</div>
              </div>
              <div style={{ minWidth: 260, display:'grid', gap:10 }}>
                <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome do sistema" />
                <div className="top-actions">
                  <button className="btn btn-primary" onClick={exportReportsExcel}><Download size={16} /> Exportar Excel</button>
                  <button className="btn" onClick={() => fileRef.current?.click()}><FileUp size={16} /> Importar Extrato</button>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }} onChange={onImportFile} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body stack">
            <div style={{ display:'flex', justifyContent:'space-between' }}><span className="muted">Clientes ativos</span><strong>{clients.filter((x) => x.active).length}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span className="muted">Empresas ativas</span><strong>{companies.filter((x) => x.active).length}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span className="muted">Usuários ativos</span><strong>{users.filter((x) => x.active).length}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span className="muted">Lançamentos salvos</span><strong>{transactions.length}</strong></div>
            <div className="summary-box">Moeda em formato brasileiro: <strong>{formatBRL(12345.67)}</strong></div>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <KPI title="Receitas" value={formatBRL(totals.receita)} icon={TrendingUp} />
        <KPI title="Despesas" value={formatBRL(totals.despesa)} icon={TrendingDown} />
        <KPI title="Custos" value={formatBRL(totals.custo)} icon={Wallet} />
        <KPI title="CMV" value={formatBRL(totals.cmv)} icon={Package} />
        <KPI title="Margem de Contribuição" value={formatBRL(totals.margemContribuicao)} subtitle={`${totals.margemPercentual.toFixed(2)}% da receita`} icon={Percent} />
        <KPI title="Lucro / Prejuízo" value={formatBRL(totals.lucro)} icon={Landmark} />
      </div>

      <div className="tabs">
        {[
          ['dashboard', 'Dashboard'], ['clientes', 'Clientes'], ['empresas', 'Empresas'], ['lancamentos', 'Lançamentos'], ['conciliacao', 'Conciliação'], ['relatorios', 'Relatórios'], ['contas', 'Plano de Contas'], ['usuarios', 'Usuários'], ['config', 'Configurações'],
        ].map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="grid-2">
          <div className="card"><div className="card-body">
            <div className="section-title"><div><h2>DRE resumida</h2><div className="muted small">Visão do período filtrado</div></div></div>
            <div className="stack">
              {dreRows.map((r) => <div key={r.linha} style={{ display:'flex', justifyContent:'space-between', padding:'12px 14px', border:'1px solid var(--line)', borderRadius:16 }}><span>{r.linha}</span><strong>{formatBRL(r.valor)}</strong></div>)}
            </div>
          </div></div>
          <div className="stack">
            <div className="card"><div className="card-body">
              <div className="section-title"><div><h2>Resumo operacional</h2><div className="muted small">Indicadores rápidos</div></div></div>
              <div className="grid-2">
                <div className="summary-box"><div className="muted small">Receitas</div><div style={{ fontSize: 24, fontWeight:700 }}>{filteredTransactions.filter((t) => t.type === 'receita').length}</div></div>
                <div className="summary-box"><div className="muted small">Saídas</div><div style={{ fontSize: 24, fontWeight:700 }}>{filteredTransactions.filter((t) => t.type !== 'receita').length}</div></div>
                <div className="summary-box"><div className="muted small">Centros de custos</div><div style={{ fontSize: 24, fontWeight:700 }}>{costCenters.filter((x) => x.active).length}</div></div>
                <div className="summary-box"><div className="muted small">Pendências</div><div style={{ fontSize: 24, fontWeight:700 }}>{conciliationSummary.pending}</div></div>
              </div>
            </div></div>
            <div className="card"><div className="card-body">
              <div className="section-title"><div><h2>DRE mensal automática</h2></div><div className="actions"><button className="btn" onClick={() => exportPdf('dreMensal')}>PDF DRE Mensal</button></div></div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Mês</th><th>Receita</th><th>Custos</th><th>CMV</th><th>Margem</th><th>Despesas</th><th>Lucro</th></tr></thead>
                  <tbody>
                    {monthlyDreRows.map((r, i) => <tr key={i}><td>{r.mes}</td><td>{r.receita}</td><td>{r.custos}</td><td>{r.cmv}</td><td>{r.margem}</td><td>{r.despesas}</td><td>{r.lucro}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div></div>
          </div>
        </div>
      )}

      {tab === 'clientes' && (
        <div className="grid-2">
          <div className="card"><div className="card-body stack">
            <div className="section-title"><div><h2>Cadastro de clientes</h2><div className="muted small">Base comercial e operacional</div></div><button className="btn btn-primary" onClick={() => saveItem(setClients, clientForm, () => setClientForm({ id: '', name: '', contact: '', phone: '', email: '', active: true }))}><Plus size={16} /> Salvar cliente</button></div>
            <div className="form-grid">
              <div><label className="label">Nome do cliente</label><input className="input" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} /></div>
              <div><label className="label">Responsável</label><input className="input" value={clientForm.contact} onChange={(e) => setClientForm({ ...clientForm, contact: e.target.value })} /></div>
              <div><label className="label">Telefone</label><input className="input" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} /></div>
              <div><label className="label">E-mail</label><input className="input" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} /></div>
            </div>
          </div></div>
          <div className="card"><div className="card-body">
            <div className="section-title"><div><h2>Lista de clientes</h2></div></div>
            <div className="table-wrap"><table className="table"><thead><tr><th>Cliente</th><th>Responsável</th><th>Contato</th><th>Status</th><th>Ações</th></tr></thead><tbody>
              {clients.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.contact}</td><td>{c.email || c.phone}</td><td>{c.active ? 'Ativo' : 'Inativo'}</td><td className="actions"><button className="btn" onClick={() => setClientForm(c)}><Pencil size={14} /></button><button className="btn btn-danger" onClick={() => setClients((prev) => prev.filter((x) => x.id !== c.id))}><Trash2 size={14} /></button></td></tr>)}
            </tbody></table></div>
          </div></div>
        </div>
      )}

      {tab === 'empresas' && (
        <div className="grid-2">
          <div className="card"><div className="card-body stack">
            <div className="section-title"><div><h2>Cadastro de empresas</h2><div className="muted small">Vincule empresas aos clientes</div></div><button className="btn btn-primary" onClick={() => saveItem(setCompanies, companyForm, () => setCompanyForm({ id: '', clientId: clients[0]?.id || '', tradeName: '', legalName: '', document: '', segment: '', city: '', active: true }))}><Plus size={16} /> Salvar empresa</button></div>
            <div className="form-grid">
              <div><label className="label">Cliente</label><select className="select" value={companyForm.clientId} onChange={(e) => setCompanyForm({ ...companyForm, clientId: e.target.value })}><option value="">Selecione</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="label">Nome fantasia</label><input className="input" value={companyForm.tradeName} onChange={(e) => setCompanyForm({ ...companyForm, tradeName: e.target.value })} /></div>
              <div><label className="label">Razão social</label><input className="input" value={companyForm.legalName} onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })} /></div>
              <div><label className="label">CNPJ</label><input className="input" value={companyForm.document} onChange={(e) => setCompanyForm({ ...companyForm, document: e.target.value })} /></div>
              <div><label className="label">Segmento</label><input className="input" value={companyForm.segment} onChange={(e) => setCompanyForm({ ...companyForm, segment: e.target.value })} /></div>
              <div><label className="label">Cidade/UF</label><input className="input" value={companyForm.city} onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} /></div>
            </div>
          </div></div>
          <div className="card"><div className="card-body">
            <div className="section-title"><div><h2>Lista de empresas</h2></div></div>
            <div className="table-wrap"><table className="table"><thead><tr><th>Empresa</th><th>Cliente</th><th>CNPJ</th><th>Segmento</th><th>Ações</th></tr></thead><tbody>
              {companies.map((c) => <tr key={c.id}><td>{c.tradeName}</td><td>{clients.find((x) => x.id === c.clientId)?.name || '-'}</td><td>{c.document}</td><td>{c.segment}</td><td className="actions"><button className="btn" onClick={() => setCompanyForm(c)}><Pencil size={14} /></button><button className="btn btn-danger" onClick={() => setCompanies((prev) => prev.filter((x) => x.id !== c.id))}><Trash2 size={14} /></button></td></tr>)}
            </tbody></table></div>
          </div></div>
        </div>
      )}

      {tab === 'lancamentos' && (
        <div className="stack">
          <div className="card"><div className="card-body">
            <div className="section-title"><div><h2>Novo lançamento</h2><div className="muted small">Lançamento manual com vínculo por empresa, conta e centro de custo</div></div><div className="actions"><button className="btn" onClick={resetTransactionForm}>Limpar</button><button className="btn btn-primary" onClick={saveTransaction}><Plus size={16} /> Salvar lançamento</button></div></div>
            <div className="form-grid">
              <div><label className="label">Empresa</label><select className="select" value={transactionForm.companyId} onChange={(e) => setTransactionForm({ ...transactionForm, companyId: e.target.value })}><option value="">Selecione</option>{companyOptions.map((c) => <option key={c.id} value={c.id}>{c.tradeName}</option>)}</select></div>
              <div><label className="label">Data</label><input className="input" type="date" value={transactionForm.date} onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })} /></div>
              <div><label className="label">Tipo</label><select className="select" value={transactionForm.type} onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}><option value="receita">Receita</option><option value="despesa">Despesa</option><option value="custo">Custo</option><option value="cmv">CMV</option></select></div>
              <div><label className="label">Valor (R$)</label><input className="input" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })} placeholder="0,00" /></div>
              <div className="span-2"><label className="label">Descrição</label><input className="input" value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} /></div>
              <div><label className="label">Plano de contas</label><select className="select" value={transactionForm.accountId} onChange={(e) => setTransactionForm({ ...transactionForm, accountId: e.target.value })}><option value="">Sem vínculo</option>{filteredAccounts.filter((a) => !transactionForm.companyId || a.companyId === transactionForm.companyId).map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
              <div><label className="label">Centro de custo</label><select className="select" value={transactionForm.costCenterId} onChange={(e) => setTransactionForm({ ...transactionForm, costCenterId: e.target.value })}><option value="">Sem vínculo</option>{filteredCostCenters.filter((c) => !transactionForm.companyId || c.companyId === transactionForm.companyId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="label">Grupo</label><input className="input" value={transactionForm.group} onChange={(e) => setTransactionForm({ ...transactionForm, group: e.target.value })} /></div>
              <div><label className="label">Categoria</label><input className="input" value={transactionForm.category} onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })} /></div>
              <div><label className="label">Usuário</label><select className="select" value={transactionForm.user} onChange={(e) => setTransactionForm({ ...transactionForm, user: e.target.value })}>{userOptions.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
              <div><label className="label">Referência</label><input className="input" value={transactionForm.reference} onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })} /></div>
            </div>
          </div></div>

          <div className="card"><div className="card-body stack">
            <div className="section-title"><div><h2>Filtros de lançamentos</h2></div><div className="actions"><button className="btn" onClick={() => setFilters({ search: '', type: 'todos', companyId: 'todos', category: 'todos', group: 'todos', costCenterId: 'todos', conciliation: 'todos', start: '', end: '' })}><Filter size={15} /> Limpar filtros</button></div></div>
            <div className="toolbar">
              <input className="input" placeholder="Buscar descrição, referência, categoria..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              <select className="select" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="todos">Todos os tipos</option><option value="receita">Receita</option><option value="despesa">Despesa</option><option value="custo">Custo</option><option value="cmv">CMV</option></select>
              <select className="select" value={filters.companyId} onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}><option value="todos">Todas empresas</option>{companyOptions.map((c) => <option key={c.id} value={c.id}>{c.tradeName}</option>)}</select>
              <select className="select" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="todos">Todas categorias</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select className="select" value={filters.group} onChange={(e) => setFilters({ ...filters, group: e.target.value })}><option value="todos">Todos grupos</option>{groups.map((g) => <option key={g} value={g}>{g}</option>)}</select>
              <select className="select" value={filters.conciliation} onChange={(e) => setFilters({ ...filters, conciliation: e.target.value })}><option value="todos">Conciliação</option><option value="true">Conciliados</option><option value="false">Pendentes</option></select>
            </div>
            <div className="toolbar" style={{ gridTemplateColumns:'1fr 1fr 1fr 1fr 2fr 1fr' }}>
              <input className="input" type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} />
              <input className="input" type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
              <select className="select" value={filters.costCenterId} onChange={(e) => setFilters({ ...filters, costCenterId: e.target.value })}><option value="todos">Todos centros</option>{filteredCostCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
          </div></div>

          <div className="card"><div className="card-body">
            <div className="section-title"><div><h2>Movimentações</h2></div></div>
            <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Empresa</th><th>Descrição</th><th>Tipo</th><th>Grupo</th><th>Categoria</th><th>Usuário</th><th>Conciliação</th><th>Valor</th><th>Ações</th></tr></thead><tbody>
              {filteredTransactions.map((t) => <tr key={t.id}>
                <td>{formatDate(t.date)}</td>
                <td>{companies.find((c) => c.id === t.companyId)?.tradeName || '-'}</td>
                <td>{t.description}</td>
                <td><span className={`badge ${t.type}`}>{t.type}</span></td>
                <td>{t.group}</td>
                <td>{t.category}</td>
                <td>{t.user}</td>
                <td>{t.conciliated ? 'Conciliado' : 'Pendente'}</td>
                <td>{formatBRL(t.amount)}</td>
                <td className="actions"><button className="btn" onClick={() => setTransactionForm({ ...t, amount: String(t.amount).replace('.', ',') })}><Pencil size={14} /></button><button className="btn btn-danger" onClick={() => setTransactions((prev) => prev.filter((x) => x.id !== t.id))}><Trash2 size={14} /></button></td>
              </tr>)}
            </tbody></table></div>
          </div></div>
        </div>
      )}

      {tab === 'conciliacao' && (
        <div className="stack">
          <div className="grid-3">
            <KPI title="Total" value={String(conciliationSummary.total)} icon={Database} />
            <KPI title="Conciliados" value={String(conciliationSummary.conciliated)} icon={CheckCircle2} />
            <KPI title="Pendentes" value={String(conciliationSummary.pending)} icon={AlertTriangle} />
          </div>
          <div className="card"><div className="card-body">
            <div className="section-title"><div><h2>Pendências de conciliação</h2></div></div>
            <div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Empresa</th><th>Descrição</th><th>Referência</th><th>Valor</th><th>Status</th><th>Ação</th></tr></thead><tbody>
              {filteredTransactions.filter((t) => !t.conciliated).map((t) => <tr key={t.id}><td>{formatDate(t.date)}</td><td>{companies.find((c) => c.id === t.companyId)?.tradeName || '-'}</td><td>{t.description}</td><td>{t.reference || '-'}</td><td>{formatBRL(t.amount)}</td><td>Pendente</td><td><button className="btn btn-primary" onClick={() => setTransactions((prev) => prev.map((x) => x.id === t.id ? { ...x, conciliated: true } : x))}>Conciliar</button></td></tr>)}
            </tbody></table></div>
          </div></div>
        </div>
      )}

      {tab === 'relatorios' && (
        <div className="stack">
          <div className="card"><div className="card-body">
            <div className="section-title"><div><h2>Relatórios gerenciais</h2><div className="muted small">Baixe PDF ou Excel</div></div><div className="actions"><button className="btn" onClick={() => exportPdf('fluxo')}>PDF Fluxo</button><button className="btn" onClick={() => exportPdf('dre')}>PDF DRE</button><button className="btn" onClick={() => exportPdf('dreMensal')}>PDF DRE Mensal</button></div></div>
            <div className="grid-2">
              <div className="card"><div className="card-body"><h3>Fluxo de Caixa</h3><div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th>Descrição</th><th>Entrada</th><th>Saída</th><th>Saldo</th></tr></thead><tbody>{cashflowRows.map((r,i) => <tr key={i}><td>{r.data}</td><td>{r.descricao}</td><td>{r.entrada}</td><td>{r.saida}</td><td>{r.saldo}</td></tr>)}</tbody></table></div></div></div>
              <div className="card"><div className="card-body"><h3>DRE</h3><div className="stack">{dreRows.map((r) => <div key={r.linha} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--line)' }}><span>{r.linha}</span><strong>{formatBRL(r.valor)}</strong></div>)}</div></div></div>
            </div>
          </div></div>
        </div>
      )}

      {tab === 'contas' && (
        <div className="grid-2">
          <div className="card"><div className="card-body stack">
            <div className="section-title"><div><h2>Plano de contas</h2></div><button className="btn btn-primary" onClick={() => saveItem(setAccounts, accountForm, () => setAccountForm({ id: '', companyId: companyIdForForms, code: '', name: '', group: 'Receitas', type: 'receita', active: true }))}><Plus size={16} /> Salvar conta</button></div>
            <div className="form-grid">
              <div><label className="label">Empresa</label><select className="select" value={accountForm.companyId} onChange={(e) => setAccountForm({ ...accountForm, companyId: e.target.value })}><option value="">Selecione</option>{companyOptions.map((c) => <option key={c.id} value={c.id}>{c.tradeName}</option>)}</select></div>
              <div><label className="label">Código</label><input className="input" value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} /></div>
              <div className="span-2"><label className="label">Nome da conta</label><input className="input" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} /></div>
              <div><label className="label">Grupo</label><input className="input" value={accountForm.group} onChange={(e) => setAccountForm({ ...accountForm, group: e.target.value })} /></div>
              <div><label className="label">Tipo</label><select className="select" value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}><option value="receita">Receita</option><option value="despesa">Despesa</option><option value="custo">Custo</option><option value="cmv">CMV</option></select></div>
            </div>
          </div></div>
          <div className="card"><div className="card-body">
            <div className="section-title"><div><h2>Contas cadastradas</h2></div></div>
            <div className="table-wrap"><table className="table"><thead><tr><th>Código</th><th>Conta</th><th>Empresa</th><th>Tipo</th><th>Ações</th></tr></thead><tbody>{accounts.map((a) => <tr key={a.id}><td>{a.code}</td><td>{a.name}</td><td>{companies.find((c) => c.id === a.companyId)?.tradeName || '-'}</td><td>{a.type}</td><td className="actions"><button className="btn" onClick={() => setAccountForm(a)}><Pencil size={14} /></button><button className="btn btn-danger" onClick={() => setAccounts((prev) => prev.filter((x) => x.id !== a.id))}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
          </div></div>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="grid-2">
          <div className="card"><div className="card-body stack">
            <div className="section-title"><div><h2>Usuários</h2></div><button className="btn btn-primary" onClick={() => saveItem(setUsers, userForm, () => setUserForm({ id: '', name: '', email: '', profile: 'Analista', active: true }))}><Plus size={16} /> Salvar usuário</button></div>
            <div className="form-grid">
              <div><label className="label">Nome</label><input className="input" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></div>
              <div><label className="label">E-mail</label><input className="input" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
              <div><label className="label">Perfil</label><select className="select" value={userForm.profile} onChange={(e) => setUserForm({ ...userForm, profile: e.target.value })}><option>Admin</option><option>Analista</option><option>Consulta</option></select></div>
            </div>
          </div></div>
          <div className="card"><div className="card-body">
            <div className="table-wrap"><table className="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ações</th></tr></thead><tbody>{users.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.profile}</td><td className="actions"><button className="btn" onClick={() => setUserForm(u)}><Pencil size={14} /></button><button className="btn btn-danger" onClick={() => setUsers((prev) => prev.filter((x) => x.id !== u.id))}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
          </div></div>
        </div>
      )}

      {tab === 'config' && (
        <div className="grid-2">
          <div className="card"><div className="card-body stack">
            <div className="section-title"><div><h2>Centros de custos</h2></div><button className="btn btn-primary" onClick={() => saveItem(setCostCenters, costCenterForm, () => setCostCenterForm({ id: '', companyId: companyIdForForms, code: '', name: '', manager: '', active: true }))}><Plus size={16} /> Salvar centro</button></div>
            <div className="form-grid">
              <div><label className="label">Empresa</label><select className="select" value={costCenterForm.companyId} onChange={(e) => setCostCenterForm({ ...costCenterForm, companyId: e.target.value })}><option value="">Selecione</option>{companyOptions.map((c) => <option key={c.id} value={c.id}>{c.tradeName}</option>)}</select></div>
              <div><label className="label">Código</label><input className="input" value={costCenterForm.code} onChange={(e) => setCostCenterForm({ ...costCenterForm, code: e.target.value })} /></div>
              <div><label className="label">Nome</label><input className="input" value={costCenterForm.name} onChange={(e) => setCostCenterForm({ ...costCenterForm, name: e.target.value })} /></div>
              <div><label className="label">Responsável</label><input className="input" value={costCenterForm.manager} onChange={(e) => setCostCenterForm({ ...costCenterForm, manager: e.target.value })} /></div>
            </div>
            <div className="table-wrap"><table className="table"><thead><tr><th>Código</th><th>Centro</th><th>Empresa</th><th>Ações</th></tr></thead><tbody>{costCenters.map((c) => <tr key={c.id}><td>{c.code}</td><td>{c.name}</td><td>{companies.find((x) => x.id === c.companyId)?.tradeName || '-'}</td><td className="actions"><button className="btn" onClick={() => setCostCenterForm(c)}><Pencil size={14} /></button><button className="btn btn-danger" onClick={() => setCostCenters((prev) => prev.filter((x) => x.id !== c.id))}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
          </div></div>

          <div className="card"><div className="card-body stack">
            <div className="section-title"><div><h2>Observações do consultor</h2></div><div className="actions"><button className="btn" onClick={clearAllData}>Resetar demonstração</button></div></div>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações sobre clientes, premissas, histórico e decisões gerenciais..." />
            <div className="summary-box">
              Recursos incluídos nesta entrega: dashboard, clientes, empresas, plano de contas, centros de custos, lançamentos, importação de extratos, conciliação, DRE mensal, Excel e PDF.
            </div>
            <div className="footer-note">Esta versão funciona com armazenamento local no navegador. Para produção com login real e banco em nuvem, a próxima etapa é conectar Supabase/Vercel.</div>
          </div></div>
        </div>
      )}
    </div>
  )
}
