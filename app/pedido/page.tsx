
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
  const [saindo, setSaindo] = useState(false)

  const [nomeItem, setNomeItem] = useState("")
  const [quantidadeItem, setQuantidadeItem] = useState(1)
  const [itensNovos, setItensNovos] = useState<Item[]>([])
  const [criando, setCriando] = useState(false)

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
      .order("numero", { ascending: true })

    if (error) {
      console.error("Erro ao carregar pedidos:", error)
      setCarregando(false)
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
      alert("Não foi possível atualizar o pedido.")
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
      itensNovos.filter((_, i) => i !== index)
    )
  }

  async function criarPedido() {
    if (itensNovos.length === 0) {
      alert("Adicione pelo menos um item ao pedido.")
      return
    }

    setCriando(true)

    try {
      const { data: ultimoPedido, error: erroBusca } =
        await supabase
          .from("pedidos")
          .select("numero")
          .order("numero", { ascending: false })
          .limit(1)
          .maybeSingle()

      if (erroBusca) {
        console.error(erroBusca)
        alert("Não foi possível descobrir o próximo número do pedido.")
        setCriando(false)
        return
      }

      const proximoNumero = ultimoPedido
        ? ultimoPedido.numero + 1
        : 1

      const codigo = crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 8)

      const { error } = await supabase
        .from("pedidos")
        .insert({
          numero: proximoNumero,
          codigo,
          itens: itensNovos,
          status: "preparando",
        })

      if (error) {
        console.error(error)
        alert("Não foi possível criar o pedido.")
        setCriando(false)
        return
      }

      setItensNovos([])
      setNomeItem("")
      setQuantidadeItem(1)

      await carregarPedidos()
    } catch (error) {
      console.error(error)
      alert("Ocorreu um erro ao criar o pedido.")
    }

    setCriando(false)
  }

  async function sair() {
    setSaindo(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error(error)
      alert("Não foi possível sair.")
      setSaindo(false)
      return
    }

    router.replace("/login")
  }

  useEffect(() => {
    let canal: ReturnType<typeof supabase.channel> | null = null

    async function iniciarPainel() {
      const autorizado = await verificarAcesso()

      if (!autorizado) {
        setCarregando(false)
        return
      }

      await carregarPedidos()

      canal = supabase
        .channel("painel-pedidos")
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

    iniciarPainel()

    return () => {
      if (canal) {
        supabase.removeChannel(canal)
      }
    }
  }, [])

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow">
          <div className="text-lg font-semibold text-gray-600">
            Carregando painel...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">

        {/* CABEÇALHO */}

        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h1 className="text-3xl font-black text-blue-600">
                Painel da Barraca
              </h1>

              <p className="mt-1 text-gray-500">
                Controle dos pedidos
              </p>
            </div>

            <button
              onClick={sair}
              disabled={saindo}
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {saindo ? "SAINDO..." : "SAIR"}
            </button>

          </div>
        </div>


        {/* NOVO PEDIDO */}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl">
              ➕
            </div>

            <div>
              <h2 className="text-2xl font-black text-gray-900">
                Novo pedido
              </h2>

              <p className="text-sm text-gray-500">
                Adicione os produtos do cliente
              </p>
            </div>

          </div>


          <div className="mt-6 grid gap-3 sm:grid-cols-[120px_1fr_auto]">

            <input
              type="number"
              min="1"
              value={quantidadeItem}
              onChange={(e) =>
                setQuantidadeItem(Number(e.target.value))
              }
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Qtd."
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
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Nome do produto"
            />

            <button
              onClick={adicionarItem}
              className="rounded-xl bg-blue-600 px-6 py-3 font-black text-white transition hover:bg-blue-700"
            >
              ADICIONAR
            </button>

          </div>


          {itensNovos.length > 0 && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">

              <p className="font-black text-gray-700">
                Itens do pedido
              </p>

              <div className="mt-3 space-y-2">

                {itensNovos.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 rounded-xl bg-white p-3 shadow-sm"
                  >

                    <span className="font-semibold text-gray-700">
                      {item.quantidade}x {item.nome}
                    </span>

                    <button
                      onClick={() => removerItem(index)}
                      className="font-bold text-red-600 hover:text-red-700"
                    >
                      Remover
                    </button>

                  </div>
                ))}

              </div>

              <button
                onClick={criarPedido}
                disabled={criando}
                className="mt-5 w-full rounded-xl bg-green-600 py-4 text-lg font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {criando
                  ? "CRIANDO PEDIDO..."
                  : "CRIAR PEDIDO"}
              </button>

            </div>
          )}

        </div>


        {/* PEDIDOS */}

        <div className="mt-8">

          <h2 className="text-2xl font-black text-gray-900">
            Pedidos
          </h2>

          <p className="text-sm text-gray-500">
            {pedidos.length} pedido(s)
          </p>

        </div>


        <div className="mt-4 grid gap-5 md:grid-cols-2">

          {pedidos.map((pedido) => {

            const pronto = pedido.status === "pronto"

            const enderecoCliente =
              typeof window !== "undefined"
                ? `${window.location.origin}/pedido/${pedido.codigo}`
                : ""

            return (

              <div
                key={pedido.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >

                {/* CABEÇALHO */}

                <div
                  className={`p-5 ${
                    pronto
                      ? "bg-green-50"
                      : "bg-yellow-50"
                  }`}
                >

                  <div className="flex items-center justify-between gap-4">

                    <h3 className="text-2xl font-black text-gray-900">
                      Pedido #
                      {String(pedido.numero).padStart(3, "0")}
                    </h3>

                    {pronto ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-black text-green-700">
                        PRONTO
                      </span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-black text-yellow-700">
                        PREPARANDO
                      </span>
                    )}

                  </div>

                </div>


                {/* ITENS */}

                <div className="p-5">

                  <div className="space-y-2">

                    {pedido.itens.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
                      >

                        <span className="font-semibold text-gray-700">
                          {item.nome}
                        </span>

                        <span className="rounded-lg bg-white px-3 py-1 text-lg font-black text-gray-900 shadow-sm">
                          {item.quantidade}x
                        </span>

                      </div>
                    ))}

                  </div>


                  {/* QR CODE */}

                  {pedido.codigo && enderecoCliente && (

                    <div className="mt-5 flex flex-col items-center rounded-xl bg-slate-50 p-5">

                      <p className="mb-4 font-black text-gray-700">
                        QR Code do cliente
                      </p>

                      <div className="rounded-xl bg-white p-3 shadow-sm">

                        <QRCodeSVG
                          value={enderecoCliente}
                          size={180}
                        />

                      </div>

                      <p className="mt-3 text-center text-sm text-gray-500">
                        Cliente: escaneie este código
                        para acompanhar o pedido.
                      </p>

                      <p className="mt-2 rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold text-gray-700">
                        {pedido.codigo}
                      </p>

                    </div>

                  )}


                  {/* BOTÃO MARCAR COMO PRONTO */}

                  {!pronto && (
                    <button
                      onClick={() => marcarComoPronto(pedido.id)}
                      className="mt-5 w-full rounded-xl bg-green-600 py-4 text-lg font-black text-white transition hover:bg-green-700 active:scale-[0.99]"
                    >
                      ✓ MARCAR COMO PRONTO
                    </button>
                  )}


                  {/* PEDIDO JÁ PRONTO */}

                  {pronto && (
                    <div className="mt-5 rounded-xl bg-green-100 p-4 text-center font-black text-green-700">
                      ✓ Cliente avisado
                    </div>
                  )}

                </div>

              </div>
            )
          })}

        </div>


        {/* SEM PEDIDOS */}

        {pedidos.length === 0 && (
          <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="text-4xl">
              📋
            </div>

            <p className="mt-3 font-bold text-gray-700">
              Nenhum pedido encontrado.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Os novos pedidos aparecerão aqui.
            </p>

          </div>
        )}

      </div>
    </main>
  )
}

