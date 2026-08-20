"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Item = {
  nome: string
  quantidade: number
}

type Pedido = {
  id: number
  numero: number
  codigo: string
  itens: Item[]
  status: string
  criado_em: string
}

export default function PedidoPage() {
  const params = useParams()

  const codigoParam = params?.codigo

  const codigo =
    Array.isArray(codigoParam)
      ? codigoParam[0]
      : codigoParam

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  async function carregarPedido() {
    if (!codigo) {
      setErro("Código do pedido não informado.")
      setCarregando(false)
      return
    }

    const { data, error } = await supabase.rpc(
      "buscar_pedido_por_codigo",
      {
        p_codigo: codigo,
      }
    )

    if (error) {
      console.error(error)
      setErro("Não foi possível carregar o pedido.")
      setCarregando(false)
      return
    }

    const resultado = Array.isArray(data)
      ? data[0]
      : data

    if (!resultado) {
      setErro("Pedido não encontrado.")
      setCarregando(false)
      return
    }

    setPedido(resultado as Pedido)
    setCarregando(false)
  }

  useEffect(() => {
    carregarPedido()

    if (!codigo) {
      return
    }

    const canal = supabase
      .channel(`pedido-codigo-${codigo}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedidos",
          filter: `codigo=eq.${codigo}`,
        },
        () => {
          carregarPedido()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [codigo])

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow">
          <p className="text-lg font-semibold text-gray-600">
            Carregando pedido...
          </p>
        </div>
      </main>
    )
  }

  if (erro || !pedido) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">

          <div className="text-5xl">
            😕
          </div>

          <h1 className="mt-4 text-2xl font-black text-gray-900">
            Pedido não encontrado
          </h1>

          <p className="mt-2 text-gray-500">
            {erro || "Não foi possível localizar este pedido."}
          </p>

        </div>
      </main>
    )
  }

  const pronto = pedido.status === "pronto"

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">

      <div className="mx-auto max-w-md">

        {/* CABEÇALHO */}

        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            🏪
          </div>

          <h1 className="mt-4 text-3xl font-black text-blue-600">
            Fila da Barraca
          </h1>

          <p className="mt-2 text-gray-500">
            Acompanhe seu pedido
          </p>

        </div>


        {/* PEDIDO */}

        <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div
            className={`p-6 text-center ${
              pronto
                ? "bg-green-50"
                : "bg-yellow-50"
            }`}
          >

            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Seu pedido
            </p>

            <h2 className="mt-1 text-4xl font-black text-gray-900">
              #{String(pedido.numero).padStart(3, "0")}
            </h2>

            <div className="mt-4">

              {pronto ? (

                <div className="rounded-xl bg-green-100 p-4">

                  <div className="text-3xl">
                    ✓
                  </div>

                  <p className="mt-1 text-xl font-black text-green-700">
                    PEDIDO PRONTO!
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    Você já pode retirar seu pedido.
                  </p>

                </div>

              ) : (

                <div className="rounded-xl bg-yellow-100 p-4">

                  <div className="text-3xl">
                    👨‍🍳
                  </div>

                  <p className="mt-1 text-xl font-black text-yellow-700">
                    PREPARANDO
                  </p>

                  <p className="mt-1 text-sm text-yellow-700">
                    Aguarde. Avisaremos quando estiver pronto.
                  </p>

                </div>

              )}

            </div>

          </div>


          {/* ITENS */}

          <div className="p-6">

            <h3 className="text-lg font-black text-gray-900">
              Itens do pedido
            </h3>

            <div className="mt-4 space-y-2">

              {pedido.itens.map((item, index) => (

                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                >

                  <span className="font-semibold text-gray-700">
                    {item.nome}
                  </span>

                  <span className="rounded-lg bg-white px-3 py-1 font-black text-gray-900 shadow-sm">
                    {item.quantidade}x
                  </span>

                </div>

              ))}

            </div>

          </div>


          {/* CÓDIGO */}

          <div className="border-t border-gray-100 p-6 text-center">

            <p className="text-sm text-gray-500">
              Código do pedido
            </p>

            <p className="mt-2 font-mono text-lg font-black tracking-wider text-gray-700">
              {pedido.codigo}
            </p>

          </div>

        </div>


        {/* ATUALIZAÇÃO */}

        {!pronto && (

          <div className="mt-5 rounded-2xl bg-white p-5 text-center shadow-sm">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              🔄
            </div>

            <p className="mt-3 font-bold text-gray-700">
              Esta página atualiza automaticamente.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Não é necessário atualizar o navegador.
            </p>

          </div>

        )}

        {pronto && (

          <div className="mt-5 rounded-2xl bg-green-600 p-5 text-center text-white shadow-sm">

            <div className="text-3xl">
              🎉
            </div>

            <p className="mt-2 text-lg font-black">
              Seu pedido está pronto!
            </p>

            <p className="mt-1 text-sm text-green-50">
              Dirija-se à barraca para retirar.
            </p>

          </div>

        )}

      </div>

    </main>
  )
}