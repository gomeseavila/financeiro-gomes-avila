import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatBRL = (v) => brl.format(Number(v || 0));

const cores = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

export default function App() {
  const [lancamentos, setLancamentos] = useState([
    { descricao: "Vendas", valor: 18500, tipo: "receita", categoria: "Receitas" },
    { descricao: "Aluguel", valor: 3000, tipo: "despesa", categoria: "Despesas" },
    { descricao: "Serviços", valor: 2400, tipo: "custo", categoria: "Custos" },
    { descricao: "Estoque", valor: 6200, tipo: "cmv", categoria: "CMV" },
  ]);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("receita");

  const adicionar = () => {
    if (!descricao || !valor) return;

    setLancamentos((prev) => [
      ...prev,
      {
        descricao,
        valor: Number(String(valor).replace(",", ".")),
        tipo,
        categoria:
          tipo === "receita"
            ? "Receitas"
            : tipo === "despesa"
            ? "Despesas"
            : tipo === "custo"
            ? "Custos"
            : "CMV",
      },
    ]);

    setDescricao("");
    setValor("");
    setTipo("receita");
  };

  const totais = useMemo(() => {
    const receita = lancamentos
      .filter((l) => l.tipo === "receita")
      .reduce((acc, l) => acc + l.valor, 0);

    const despesa = lancamentos
      .filter((l) => l.tipo === "despesa")
      .reduce((acc, l) => acc + l.valor, 0);

    const custo = lancamentos
      .filter((l) => l.tipo === "custo")
      .reduce((acc, l) => acc + l.valor, 0);

    const cmv = lancamentos
      .filter((l) => l.tipo === "cmv")
      .reduce((acc, l) => acc + l.valor, 0);

    const margem = receita - custo - cmv;
    const lucro = receita - despesa - custo - cmv;

    return { receita, despesa, custo, cmv, margem, lucro };
  }, [lancamentos]);

  const barras = [
    { nome: "Receitas", valor: totais.receita },
    { nome: "Despesas", valor: totais.despesa },
    { nome: "Custos", valor: totais.custo },
    { nome: "CMV", valor: totais.cmv },
    { nome: "Lucro", valor: totais.lucro },
  ];

  const pizza = [
    { nome: "Despesas", valor: totais.despesa },
    { nome: "Custos", valor: totais.custo },
    { nome: "CMV", valor: totais.cmv },
  ].filter((item) => item.valor > 0);

  const mensal = [
    { mes: "Jan", receitas: 12000, saidas: 7000 },
    { mes: "Fev", receitas: 16000, saidas: 8500 },
    { mes: "Mar", receitas: totais.receita, saidas: totais.despesa + totais.custo + totais.cmv },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#fff", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 34, marginBottom: 8 }}>Gomes & Avila | Financeiro Empresarial</h1>
          <p style={{ color: "#a1a1aa" }}>
            Dashboard financeiro com visão executiva, lançamentos e gráficos gerenciais.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            ["Receitas", totais.receita],
            ["Despesas", totais.despesa],
            ["Custos", totais.custo],
            ["CMV", totais.cmv],
            ["Margem", totais.margem],
            ["Lucro", totais.lucro],
          ].map(([titulo, valor]) => (
            <div key={titulo} style={{ background: "#121a2f", borderRadius: 16, padding: 16, border: "1px solid #24314f" }}>
              <div style={{ color: "#94a3b8", fontSize: 14 }}>{titulo}</div>
              <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>{formatBRL(valor)}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#121a2f", borderRadius: 20, padding: 20, border: "1px solid #24314f", marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Novo lançamento</h2>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12 }}>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição"
              style={{ padding: 12, borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
            />
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Valor"
              style={{ padding: 12, borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={{ padding: 12, borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
              <option value="custo">Custo</option>
              <option value="cmv">CMV</option>
            </select>
            <button
              onClick={adicionar}
              style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700 }}
            >
              Adicionar
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={{ background: "#121a2f", borderRadius: 20, padding: 20, border: "1px solid #24314f", height: 340 }}>
            <h2 style={{ marginTop: 0 }}>Gráfico comparativo</h2>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={barras}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="nome" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip formatter={(value) => formatBRL(value)} />
                <Bar dataKey="valor" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: "#121a2f", borderRadius: 20, padding: 20, border: "1px solid #24314f", height: 340 }}>
            <h2 style={{ marginTop: 0 }}>Composição das saídas</h2>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={pizza} dataKey="valor" nameKey="nome" outerRadius={95} label>
                  {pizza.map((_, index) => (
                    <Cell key={index} fill={cores[index % cores.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatBRL(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: "#121a2f", borderRadius: 20, padding: 20, border: "1px solid #24314f", height: 340, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Evolução mensal</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={mensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip formatter={(value) => formatBRL(value)} />
              <Bar dataKey="receitas" fill="#16a34a" radius={[8, 8, 0, 0]} />
              <Bar dataKey="saidas" fill="#dc2626" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#121a2f", borderRadius: 20, padding: 20, border: "1px solid #24314f" }}>
          <h2 style={{ marginTop: 0 }}>Lançamentos</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #24314f" }}>Descrição</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #24314f" }}>Tipo</th>
                <th style={{ textAlign: "right", padding: 12, borderBottom: "1px solid #24314f" }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l, i) => (
                <tr key={i}>
                  <td style={{ padding: 12, borderBottom: "1px solid #1e293b" }}>{l.descricao}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #1e293b", textTransform: "capitalize" }}>{l.tipo}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #1e293b", textAlign: "right" }}>{formatBRL(l.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
