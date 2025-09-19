
import React, { useEffect, useMemo, useRef, useState } from "react";

// --- Tipos ---------------------------------------------------------------
const TIPOS = ["Automóvel", "Serviços", "Imóvel", "Moto", "Caminhão"] as const;

type Tipo = typeof TIPOS[number];

type PlanoConsorcio = {
  id: string;
  administradora: string;
  tipo: Tipo;
  valorCarta: number; // Valor do crédito/carta
  valorParcela: number; // Valor estimado da parcela atual
  prazo: number; // meses
  taxaAdm: number; // % total (aprox.)
  mediaLance: number; // % sugerida/observada
  grupo?: string;
  observacoes?: string;
  atualizadoEm: string; // ISO
};

// --- Utilidades ----------------------------------------------------------
const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

const PCT = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

const uid = () => Math.random().toString(36).slice(2, 10);

const STORAGE_KEY = "hiperban.consorcio.planos.v1";

// --- Componente Principal ----------------------------------------------
export default function SimuladorConsorcio() {
  const [planos, setPlanos] = useState<PlanoConsorcio[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtros
  const [fTipo, setFTipo] = useState<Tipo | "Todos">("Todos");
  const [fValorMin, setFValorMin] = useState<number | "">("");
  const [fValorMax, setFValorMax] = useState<number | "">("");
  const [fPrazoMin, setFPrazoMin] = useState<number | "">("");
  const [fPrazoMax, setFPrazoMax] = useState<number | "">("");
  const [fLanceMin, setFLanceMin] = useState<number | "">("");
  const [fLanceMax, setFLanceMax] = useState<number | "">("");
  const [fTaxaMax, setFTaxaMax] = useState<number | "">("");
  const [fAdm, setFAdm] = useState<string[]>([]); // multiselect
  const [fBusca, setFBusca] = useState("");

  // Seleção para comparação
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // Formulário de cadastro/edição
  const [form, setForm] = useState<Omit<PlanoConsorcio, "id" | "atualizadoEm">>({
    administradora: "",
    tipo: "Automóvel",
    valorCarta: 0,
    valorParcela: 0,
    prazo: 60,
    taxaAdm: 15,
    mediaLance: 20,
    grupo: "",
    observacoes: "",
  });

  // LocalStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PlanoConsorcio[];
        setPlanos(parsed);
      } catch {}
    } else {
      // seed com exemplos
      const seed: PlanoConsorcio[] = [
        {
          id: uid(),
          administradora: "Rodobens",
          tipo: "Automóvel",
          valorCarta: 60000,
          valorParcela: 980,
          prazo: 72,
          taxaAdm: 16,
          mediaLance: 25,
          grupo: "A123",
          observacoes: "Plano popular",
          atualizadoEm: new Date().toISOString(),
        },
        {
          id: uid(),
          administradora: "Porto Seguro",
          tipo: "Automóvel",
          valorCarta: 100000,
          valorParcela: 1620,
          prazo: 84,
          taxaAdm: 17,
          mediaLance: 30,
          grupo: "PS-09",
          observacoes: "Carta alta flex",
          atualizadoEm: new Date().toISOString(),
        },
        {
          id: uid(),
          administradora: "Porto Seguro",
          tipo: "Imóvel",
          valorCarta: 300000,
          valorParcela: 2850,
          prazo: 200,
          taxaAdm: 18,
          mediaLance: 35,
          grupo: "IM-22",
          observacoes: "Residencial",
          atualizadoEm: new Date().toISOString(),
        },
        {
          id: uid(),
          administradora: "Rodobens",
          tipo: "Moto",
          valorCarta: 22000,
          valorParcela: 420,
          prazo: 60,
          taxaAdm: 15,
          mediaLance: 18,
          grupo: "M-7",
          observacoes: "Entry",
          atualizadoEm: new Date().toISOString(),
        },
      ];
      setPlanos(seed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planos));
  }, [planos]);

  const administradorasDisponiveis = useMemo(
    () => Array.from(new Set(planos.map((p) => p.administradora))).sort(),
    [planos]
  );

  // Filtro de resultados
  const resultados = useMemo(() => {
    return planos.filter((p) => {
      if (fTipo !== "Todos" && p.tipo !== fTipo) return false;
      if (fValorMin !== "" && p.valorCarta < fValorMin) return false;
      if (fValorMax !== "" && p.valorCarta > fValorMax) return false;
      if (fPrazoMin !== "" && p.prazo < fPrazoMin) return false;
      if (fPrazoMax !== "" && p.prazo > fPrazoMax) return false;
      if (fLanceMin !== "" && p.mediaLance < fLanceMin) return false;
      if (fLanceMax !== "" && p.mediaLance > fLanceMax) return false;
      if (fTaxaMax !== "" && p.taxaAdm > fTaxaMax) return false;
      if (fAdm.length && !fAdm.includes(p.administradora)) return false;
      if (fBusca) {
        const b = fBusca.toLowerCase();
        const hay = `${p.administradora} ${p.tipo} ${p.grupo ?? ""} ${p.observacoes ?? ""}`.toLowerCase();
        if (!hay.includes(b)) return false;
      }
      return true;
    });
  }, [planos, fTipo, fValorMin, fValorMax, fPrazoMin, fPrazoMax, fLanceMin, fLanceMax, fTaxaMax, fAdm, fBusca]);

  // Comparação
  const comparacao = useMemo(() => planos.filter((p) => selecionados.includes(p.id)), [planos, selecionados]);

  // Handlers
  const handleSave = () => {
    const payload: PlanoConsorcio = { id: editingId ?? uid(), atualizadoEm: new Date().toISOString(), ...form };
    if (!form.administradora || !form.tipo || !form.valorCarta || !form.prazo) return;

    setPlanos((prev) => {
      const exists = prev.some((p) => p.id === payload.id);
      return exists ? prev.map((p) => (p.id === payload.id ? payload : p)) : [payload, ...prev];
    });
    setEditingId(null);
    setForm({ ...form, administradora: "", valorCarta: 0, valorParcela: 0, prazo: 60, taxaAdm: 15, mediaLance: 20, grupo: "", observacoes: "" });
  };

  const handleEdit = (id: string) => {
    const p = planos.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    const { id: _id, atualizadoEm: _a, ...rest } = p;
    setForm(rest);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    setPlanos((prev) => prev.filter((p) => p.id !== id));
    setSelecionados((s) => s.filter((x) => x !== id));
  };

  const toggleSelect = (id: string) => {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 4 ? prev : [...prev, id]));
  };

  const fileInput = useRef<HTMLInputElement>(null);

  const exportar = () => {
    const blob = new Blob([JSON.stringify(planos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planos-consorcio-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data)) throw new Error("JSON inválido");
        const normalized: PlanoConsorcio[] = data.map((d: any) => ({
          id: d.id ?? uid(),
          administradora: String(d.administradora ?? ""),
          tipo: TIPOS.includes(d.tipo) ? d.tipo : "Automóvel",
          valorCarta: Number(d.valorCarta ?? 0),
          valorParcela: Number(d.valorParcela ?? 0),
          prazo: Number(d.prazo ?? 0),
          taxaAdm: Number(d.taxaAdm ?? 0),
          mediaLance: Number(d.mediaLance ?? 0),
          grupo: d.grupo ? String(d.grupo) : undefined,
          observacoes: d.observacoes ? String(d.observacoes) : undefined,
          atualizadoEm: d.atualizadoEm ?? new Date().toISOString(),
        }));
        setPlanos(normalized);
      } catch (err) {
        alert("Falha ao importar JSON");
      }
    };
    reader.readAsText(file);
    if (fileInput.current) fileInput.current.value = "";
  };

  // --- UI ----------------------------------------------------------------
  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Simulador de Consórcio — Hiperban (MVP)</h1>
            <p className="text-sm text-neutral-600">Cadastre planos (Rodobens, Porto, etc.), filtre por categoria, valor, lance, prazo e compare até 4 opções.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportar} className="px-3 py-2 rounded-xl border bg-white hover:bg-neutral-100 text-sm">Exportar JSON</button>
            <input ref={fileInput} type="file" accept="application/json" className="hidden" onChange={importar} />
            <button onClick={() => fileInput.current?.click()} className="px-3 py-2 rounded-xl border bg-white hover:bg-neutral-100 text-sm">Importar JSON</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Filtros */}
          <section className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <h2 className="text-lg font-semibold">Filtros</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm">Tipo</label>
                  <select value={fTipo} onChange={(e) => setFTipo(e.target.value as any)} className="w-full mt-1 rounded-xl border p-2">
                    <option>Todos</option>
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Valor carta (mín.)</label>
                  <input type="number" value={fValorMin as any} onChange={(e) => setFValorMin(e.target.value === "" ? "" : Number(e.target.value))} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 40000" />
                </div>
                <div>
                  <label className="text-sm">Valor carta (máx.)</label>
                  <input type="number" value={fValorMax as any} onChange={(e) => setFValorMax(e.target.value === "" ? "" : Number(e.target.value))} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 100000" />
                </div>
                <div>
                  <label className="text-sm">Prazo (mín., meses)</label>
                  <input type="number" value={fPrazoMin as any} onChange={(e) => setFPrazoMin(e.target.value === "" ? "" : Number(e.target.value))} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 60" />
                </div>
                <div>
                  <label className="text-sm">Prazo (máx., meses)</label>
                  <input type="number" value={fPrazoMax as any} onChange={(e) => setFPrazoMax(e.target.value === "" ? "" : Number(e.target.value))} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 200" />
                </div>
                <div>
                  <label className="text-sm">Lance % (mín.)</label>
                  <input type="number" value={fLanceMin as any} onChange={(e) => setFLanceMin(e.target.value === "" ? "" : Number(e.target.value))} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 15" />
                </div>
                <div>
                  <label className="text-sm">Lance % (máx.)</label>
                  <input type="number" value={fLanceMax as any} onChange={(e) => setFLanceMax(e.target.value === "" ? "" : Number(e.target.value))} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 40" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm">Taxa Adm % (máx.)</label>
                  <input type="number" value={fTaxaMax as any} onChange={(e) => setFTaxaMax(e.target.value === "" ? "" : Number(e.target.value))} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 18" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm">Administradora</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {administradorasDisponiveis.map((adm) => (
                      <button key={adm} onClick={() => setFAdm((prev) => (prev.includes(adm) ? prev.filter((x) => x !== adm) : [...prev, adm]))} className={`px-3 py-1 rounded-full border ${fAdm.includes(adm) ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-100"}`}>
                        {adm}
                      </button>
                    ))}
                    {!administradorasDisponiveis.length && <span className="text-sm text-neutral-500">— sem dados —</span>}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-sm">Busca</label>
                  <input value={fBusca} onChange={(e) => setFBusca(e.target.value)} placeholder="admin, grupo, observações" className="w-full mt-1 rounded-xl border p-2" />
                </div>
              </div>
            </div>
          </section>

          {/* Coluna 2: Resultados */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Resultados ({resultados.length})</h2>
                <div className="text-sm text-neutral-600">Selecione até 4 para comparar</div>
              </div>

              {resultados.length === 0 ? (
                <div className="p-6 text-center text-neutral-500">Nenhum plano encontrado com os filtros atuais.</div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {resultados.map((p) => (
                    <article key={p.id} className={`rounded-2xl border p-4 relative ${selecionados.includes(p.id) ? "ring-2 ring-neutral-900" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{p.administradora}</h3>
                          <p className="text-xs text-neutral-600 -mt-0.5">{p.tipo} • Grupo {p.grupo ?? "—"}</p>
                        </div>
                        <label className="text-xs flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={selecionados.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                          comparar
                        </label>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        <div className="col-span-2 flex items-baseline justify-between">
                          <span className="text-neutral-600">Valor da carta</span>
                          <strong>{BRL(p.valorCarta)}</strong>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-neutral-600">Parcela</span>
                          <strong>{p.valorParcela ? BRL(p.valorParcela) : "—"}</strong>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-neutral-600">Prazo</span>
                          <strong>{p.prazo}m</strong>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-neutral-600">Taxa Adm</span>
                          <strong>{PCT(p.taxaAdm)}</strong>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-neutral-600">Média lance</span>
                          <strong>{PCT(p.mediaLance)} ({BRL((p.mediaLance/100)*p.valorCarta)})</strong>
                        </div>
                      </div>

                      {p.observacoes && (
                        <p className="mt-3 text-xs text-neutral-600 line-clamp-2">{p.observacoes}</p>
                      )}

                      <div className="mt-4 flex items-center gap-2">
                        <button onClick={() => handleEdit(p.id)} className="px-3 py-1.5 rounded-xl border text-sm bg-white hover:bg-neutral-100">Editar</button>
                        <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 rounded-xl border text-sm bg-white hover:bg-neutral-100">Excluir</button>
                      </div>

                      <p className="mt-3 text-[10px] text-neutral-500">Atualizado em {new Date(p.atualizadoEm).toLocaleString("pt-BR")}</p>
                    </article>
                  ))}
                </div>
              )}

              {/* Comparação */}
              {comparacao.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Comparativo ({comparacao.length}/4)</h3>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="p-2">Campo</th>
                          {comparacao.map((p) => (
                            <th key={p.id} className="p-2 font-semibold">{p.administradora} • {p.tipo}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Valor da carta", (p: PlanoConsorcio) => BRL(p.valorCarta)],
                          ["Parcela", (p: PlanoConsorcio) => (p.valorParcela ? BRL(p.valorParcela) : "—")],
                          ["Prazo (meses)", (p: PlanoConsorcio) => p.prazo],
                          ["Taxa Adm % (aprox)", (p: PlanoConsorcio) => PCT(p.taxaAdm)],
                          ["Média de lance", (p: PlanoConsorcio) => `${PCT(p.mediaLance)} (${BRL((p.mediaLance/100)*p.valorCarta)})`],
                          ["Grupo", (p: PlanoConsorcio) => p.grupo ?? "—"],
                          ["Observações", (p: PlanoConsorcio) => p.observacoes ?? "—"],
                          ["Total estimado em parcelas", (p: PlanoConsorcio) => (p.valorParcela && p.prazo ? BRL(p.valorParcela * p.prazo) : "—")],
                        ].map(([label, fn]) => (
                          <tr key={String(label)} className="border-b">
                            <td className="p-2 font-medium whitespace-nowrap">{label as string}</td>
                            {comparacao.map((p) => (
                              <td key={p.id + String(label)} className="p-2">{(fn as any)(p)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Coluna 3 (abaixo em mobile): Cadastro */}
          <section className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow p-4 mt-6">
              <h2 className="text-lg font-semibold mb-3">Cadastro de Planos</h2>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm">Administradora</label>
                  <input value={form.administradora} onChange={(e) => setForm({ ...form, administradora: e.target.value })} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: Rodobens, Porto Seguro" />
                </div>
                <div>
                  <label className="text-sm">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Tipo })} className="w-full mt-1 rounded-xl border p-2">
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Valor da carta</label>
                  <input type="number" value={form.valorCarta} onChange={(e) => setForm({ ...form, valorCarta: Number(e.target.value) })} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 60000" />
                </div>
                <div>
                  <label className="text-sm">Valor da parcela</label>
                  <input type="number" value={form.valorParcela} onChange={(e) => setForm({ ...form, valorParcela: Number(e.target.value) })} className="w-full mt-1 rounded-xl border p-2" placeholder="opcional" />
                </div>
                <div>
                  <label className="text-sm">Prazo (meses)</label>
                  <input type="number" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: Number(e.target.value) })} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 84" />
                </div>
                <div>
                  <label className="text-sm">Taxa Adm % (aprox.)</label>
                  <input type="number" value={form.taxaAdm} onChange={(e) => setForm({ ...form, taxaAdm: Number(e.target.value) })} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 16" />
                </div>
                <div>
                  <label className="text-sm">Média de lance %</label>
                  <input type="number" value={form.mediaLance} onChange={(e) => setForm({ ...form, mediaLance: Number(e.target.value) })} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: 25" />
                </div>
                <div>
                  <label className="text-sm">Grupo</label>
                  <input value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} className="w-full mt-1 rounded-xl border p-2" placeholder="Ex: A123" />
                </div>
                <div className="md:col-span-3">
                  <label className="text-sm">Observações</label>
                  <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full mt-1 rounded-xl border p-2" rows={2} placeholder="Regras específicas, FR, seguro, administração, etc." />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:opacity-90">
                  {editingId ? "Salvar alterações" : "Adicionar plano"}
                </button>
                {editingId && (
                  <button onClick={() => { setEditingId(null); setForm({ administradora: "", tipo: "Automóvel", valorCarta: 0, valorParcela: 0, prazo: 60, taxaAdm: 15, mediaLance: 20, grupo: "", observacoes: "" }); }} className="px-4 py-2 rounded-xl border bg-white hover:bg-neutral-100">Cancelar</button>
                )}
              </div>

              {/* Tabela simples dos planos */}
              <div className="mt-6 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      {[
                        "Adm.",
                        "Tipo",
                        "Carta",
                        "Parcela",
                        "Prazo",
                        "Taxa%",
                        "Lance%",
                        "Grupo",
                        "Atualizado",
                        "Ações",
                      ].map((h) => (
                        <th key={h} className="p-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {planos.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="p-2 whitespace-nowrap">{p.administradora}</td>
                        <td className="p-2 whitespace-nowrap">{p.tipo}</td>
                        <td className="p-2 whitespace-nowrap">{BRL(p.valorCarta)}</td>
                        <td className="p-2 whitespace-nowrap">{p.valorParcela ? BRL(p.valorParcela) : "—"}</td>
                        <td className="p-2 whitespace-nowrap">{p.prazo}m</td>
                        <td className="p-2 whitespace-nowrap">{PCT(p.taxaAdm)}</td>
                        <td className="p-2 whitespace-nowrap">{PCT(p.mediaLance)}</td>
                        <td className="p-2 whitespace-nowrap">{p.grupo ?? "—"}</td>
                        <td className="p-2 whitespace-nowrap">{new Date(p.atualizadoEm).toLocaleDateString("pt-BR")}</td>
                        <td className="p-2 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(p.id)} className="px-2 py-1 rounded-lg border bg-white hover:bg-neutral-100">Editar</button>
                            <button onClick={() => handleDelete(p.id)} className="px-2 py-1 rounded-lg border bg-white hover:bg-neutral-100">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!planos.length && (
                      <tr>
                        <td className="p-4 text-neutral-500" colSpan={10}>Sem planos cadastrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Quick helper: simulador de lance */}
          <section className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow p-4 mt-6">
              <h2 className="text-lg font-semibold mb-3">Simular lance sobre o valor da carta</h2>
              <LanceHelper />
              <p className="mt-3 text-xs text-neutral-600">Nota: os cálculos são aproximados e não substituem as regras oficiais de cada administradora/grupo.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function LanceHelper() {
  const [valor, setValor] = useState(60000);
  const [pct, setPct] = useState(25);
  const [fixo, setFixo] = useState<number | "">("");
  const lance = useMemo(() => (fixo !== "" ? fixo : (pct/100)*valor), [valor, pct, fixo]);
  return (
    <div className="grid sm:grid-cols-4 gap-3">
      <div>
        <label className="text-sm">Valor da carta</label>
        <input type="number" value={valor} onChange={(e) => setValor(Number(e.target.value))} className="w-full mt-1 rounded-xl border p-2" />
      </div>
      <div>
        <label className="text-sm">Lance %</label>
        <input type="number" value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full mt-1 rounded-xl border p-2" />
      </div>
      <div>
        <label className="text-sm">Ou lance fixo (R$)</label>
        <input type="number" value={fixo as any} onChange={(e) => setFixo(e.target.value === "" ? "" : Number(e.target.value))} className="w-full mt-1 rounded-xl border p-2" />
      </div>
      <div className="flex items-end">
        <div className="w-full rounded-2xl border p-3">
          <div className="text-xs text-neutral-600">Lance estimado</div>
          <div className="text-lg font-semibold">{BRL(lance || 0)}</div>
        </div>
      </div>
    </div>
  );
}
