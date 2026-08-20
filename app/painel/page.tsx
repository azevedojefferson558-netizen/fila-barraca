"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { supabase } from "@/lib/supabase"

type Item = {
  nome: string
  quantidade: number
}

type Pedido = {
  id: number
  numero: number
  codigo: string | null
  itens: Item[]
  status: string
  criado_em: string
}

export default function Painel() {
  const router = useRouter()

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)

  const [nomeItem, setNomeItem] = useState("")
  const [quantidadeItem, setQuantidadeItem] = useState(1)
  const [itensNovos, setItensNovos] = useState<Item[]>([])
  const [criando, setCriando] = useState(false)

  const [saindo, setSaindo] = useState(false)
  const [origem, setOrigem] = useState("")

  async function verificarAcesso() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      router.replace("/login")
      return false
    }

    return true
  }

  async function carregarPedidos() {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("numero", { ascending: false })

    if (error) {
      console.error("Erro ao carregar pedidos:", error)
      return
    }

    setPedidos((data as Pedido[]) || [])
    setCarregando(false)
  }

  async function marcarComoPronto(id: number) {
    const { error } = await supabase
      .from("pedidos")
      .update({
        status: "pronto",
      })
      .eq("id", id)

    if (error) {
      console.error("Erro ao marcar pedido como pronto:", error)

      alert(
        "Não foi possível atualizar o pedido."
      )

      return
    }

    await carregarPedidos()
  }

  function adicionarItem() {
    const nome = nomeItem.trim()

    if (!nome) {
      alert("Digite o nome do produto.")
      return
    }

    if (quantidadeItem < 1) {
      alert("A quantidade precisa ser pelo menos 1.")
      return
    }

    setItensNovos([
      ...itensNovos,
      {
        nome,
        quantidade: quantidadeItem,
      },
    ])

    setNomeItem("")
    setQuantidadeItem(1)
  }

  function removerItem(index: number) {
    setItensNovos(
      itensNovos.filter(
        (_, i) => i !== index
      )
    )
  }

  async function criarPedido() {
    if (itensNovos.length === 0) {
      alert(
        "Adicione pelo menos um item."
      )
      return
    }

    setCriando(true)

    const {
      data: ultimoPedido,
      error: erroBusca,
    } = await supabase
      .from("pedidos")
      .select("numero")
      .order("numero", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (erroBusca) {
      console.error(
        "Erro ao buscar último pedido:",
        erroBusca
      )

      alert(
        "Não foi possível descobrir o próximo número do pedido."
      )

      setCriando(false)
      return
    }

    const numero = ultimoPedido
      ? ultimoPedido.numero + 1
      : 1

    const codigo = crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)

    const { error } = await supabase
      .from("pedidos")
      .insert({
        numero,
        codigo,
        itens: itensNovos,
        status: "aguardando",
      })

    if (error) {
      console.error(
        "Erro ao criar pedido:",
        error
      )

      alert(
        "Erro ao criar pedido."
      )

      setCriando(false)
      return
    }

    setItensNovos([])
    setNomeItem("")
    setQuantidadeItem(1)
    setCriando(false)

    await carregarPedidos()
  }

  async function sair() {
    setSaindo(true)

    const { error } =
      await supabase.auth.signOut()

    if (error) {
      console.error(
        "Erro ao sair:",
        error
      )

      alert(
        "Não foi possível sair."
      )

      setSaindo(false)
      return
    }

    router.replace("/login")
  }

  useEffect(() => {
    setOrigem(window.location.origin)

    let canal:
      ReturnType<
        typeof supabase.channel
      > | null = null

    async function iniciar() {
      const ok =
        await verificarAcesso()

      if (!ok) {
        setCarregando(false)
        return
      }

      await carregarPedidos()

      canal = supabase
        .channel("pedidos")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pedidos",
          },
          () => {
            carregarPedidos()
          }
        )
        .subscribe()
    }

    iniciar()

    return () => {
      if (canal) {
        supabase.removeChannel(
          canal
        )
      }
    }
  }, [])

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow">
          <p className="text-lg font-semibold text-gray-600">
            Carregando painel...
          </p>
        </div>
      </main>
    )
  }

  const pedidosAtivos =
    pedidos.filter(
      (pedido) =>
        pedido.status !== "pronto"
    )

  const pedidosProntos =
    pedidos.filter(
      (pedido) =>
        pedido.status === "pronto"
    )

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">

        {/* CABEÇALHO */}

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">

            <div>
              <h1 className="text-3xl font-black text-blue-600">
                Painel da Barraca
              </h1>

              <p className="text-gray-600">
                Controle dos pedidos
              </p>
            </div>

            <button
              onClick={sair}
              disabled={saindo}
              className="rounded-xl border border-gray-300 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {saindo
                ? "SAINDO..."
                : "SAIR"}
            </button>

          </div>
        </div>


        {/* NOVO PEDIDO */}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">

          <h2 className="text-2xl font-black text-gray-900">
            Novo pedido
          </h2>

          <p className="mt-1 text-gray-500">
            Adicione os produtos do cliente
          </p>

          <div className="mt-5 flex gap-3">

            <input
              type="number"
              min="1"
              value={quantidadeItem}
              onChange={(e) =>
                setQuantidadeItem(
                  Number(e.target.value)
                )
              }
              className="w-24 rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
            />

            <input
              type="text"
              value={nomeItem}
              onChange={(e) =>
                setNomeItem(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  adicionarItem()
                }
              }}
              className="flex-1 rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
              placeholder="Produto"
            />

            <button
              onClick={adicionarItem}
              className="rounded-xl bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-700"
            >
              ADICIONAR
            </button>

          </div>


          {/* ITENS DO NOVO PEDIDO */}

          {itensNovos.length > 0 && (
            <div className="mt-5">

              <p className="mb-3 font-black text-gray-700">
                Itens do pedido
              </p>

              <div className="space-y-2">

                {itensNovos.map(
                  (item, index) => (

                    <div
                      key={index}
                      className="flex items-center justify-between rounded-xl bg-gray-100 p-3"
                    >

                      <span className="font-semibold">
                        {item.quantidade}x{" "}
                        {item.nome}
                      </span>

                      <button
                        onClick={() =>
                          removerItem(index)
                        }
                        className="font-bold text-red-600 hover:text-red-700"
                      >
                        Remover
                      </button>

                    </div>

                  )
                )}

              </div>


              <button
                onClick={criarPedido}
                disabled={criando}
                className="mt-5 w-full rounded-xl bg-green-600 p-4 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {criando
                  ? "CRIANDO..."
                  : "CRIAR PEDIDO"}
              </button>

            </div>
          )}

        </div>


        {/* PEDIDOS EM PREPARAÇÃO */}

        <div className="mt-8">

          <div className="mb-4 flex items-center justify-between">

            <div>
              <h2 className="text-2xl font-black text-yellow-700">
                🟡 Pedidos em preparação
              </h2>

              <p className="text-sm text-gray-500">
                {pedidosAtivos.length} pedido(s)
              </p>
            </div>

          </div>


          {pedidosAtivos.length === 0 ? (

            <div className="rounded-2xl bg-white p-8 text-center shadow">

              <p className="font-bold text-gray-600">
                Nenhum pedido em preparação.
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Os novos pedidos aparecerão aqui.
              </p>

            </div>

          ) : (

            <div className="grid gap-5 md:grid-cols-2">

              {pedidosAtivos.map(
                (pedido) => (

                  <div
                    key={pedido.id}
                    className="overflow-hidden rounded-2xl bg-white shadow"
                  >

                    {/* CABEÇALHO */}

                    <div className="bg-yellow-50 p-5">

                      <div className="flex items-center justify-between">

                        <h2 className="text-2xl font-black text-gray-900">
                          Pedido #
                          {String(
                            pedido.numero
                          ).padStart(
                            3,
                            "0"
                          )}
                        </h2>

                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-black text-yellow-700">
                          PREPARANDO
                        </span>

                      </div>

                    </div>


                    {/* CONTEÚDO */}

                    <div className="p-5">

                      <div className="space-y-2">

                        {pedido.itens.map(
                          (
                            item,
                            index
                          ) => (

                            <div
                              key={index}
                              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
                            >

                              <span className="font-semibold text-gray-700">
                                {item.nome}
                              </span>

                              <span className="rounded-lg bg-white px-3 py-1 font-black shadow-sm">
                                {item.quantidade}x
                              </span>

                            </div>

                          )
                        )}

                      </div>


                      {/* QR CODE */}

                      {pedido.codigo &&
                        origem && (

                          <div className="mt-5 flex flex-col items-center rounded-xl bg-slate-50 p-5">

                            <p className="mb-4 font-black text-gray-700">
                              QR Code do cliente
                            </p>

                            <div className="rounded-xl bg-white p-3 shadow-sm">

                              <QRCodeSVG
                                value={`${origem}/pedido/${pedido.codigo}`}
                                size={180}
                              />

                            </div>

                            <p className="mt-3 text-center text-sm text-gray-500">
                              Cliente: escaneie este código para acompanhar o pedido.
                            </p>

                            <p className="mt-2 rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold text-gray-700">
                              {pedido.codigo}
                            </p>

                          </div>

                        )}


                      {/* BOTÃO PRONTO */}

                      <button
                        onClick={() =>
                          marcarComoPronto(
                            pedido.id
                          )
                        }
                        className="mt-5 w-full rounded-xl bg-green-600 p-4 font-black text-white transition hover:bg-green-700 active:scale-[0.99]"
                      >
                        ✓ MARCAR COMO PRONTO
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>


        {/* PEDIDOS PRONTOS */}

        <div className="mt-10">

          <div className="mb-4">

            <h2 className="text-2xl font-black text-green-700">
              🟢 Pedidos prontos
            </h2>

            <p className="text-sm text-gray-500">
              {pedidosProntos.length} pedido(s)
            </p>

          </div>


          {pedidosProntos.length === 0 ? (

            <div className="rounded-2xl bg-white p-8 text-center shadow">

              <p className="font-bold text-gray-600">
                Nenhum pedido pronto.
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Quando um pedido for concluído, ele aparecerá aqui.
              </p>

            </div>

          ) : (

            <div className="grid gap-5 md:grid-cols-2">

              {pedidosProntos.map(
                (pedido) => (

                  <div
                    key={pedido.id}
                    className="overflow-hidden rounded-2xl bg-white shadow"
                  >

                    {/* CABEÇALHO */}

                    <div className="bg-green-50 p-5">

                      <div className="flex items-center justify-between">

                        <h2 className="text-2xl font-black text-gray-900">
                          Pedido #
                          {String(
                            pedido.numero
                          ).padStart(
                            3,
                            "0"
                          )}
                        </h2>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-black text-green-700">
                          PRONTO
                        </span>

                      </div>

                    </div>


                    {/* CONTEÚDO */}

                    <div className="p-5">

                      <div className="space-y-2">

                        {pedido.itens.map(
                          (
                            item,
                            index
                          ) => (

                            <div
                              key={index}
                              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
                            >

                              <span className="font-semibold text-gray-700">
                                {item.nome}
                              </span>

                              <span className="rounded-lg bg-white px-3 py-1 font-black shadow-sm">
                                {item.quantidade}x
                              </span>

                            </div>

                          )
                        )}

                      </div>


                      <div className="mt-5 rounded-xl bg-green-100 p-4 text-center font-black text-green-700">
                        ✓ Cliente avisado
                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>
    </main>
  )
}