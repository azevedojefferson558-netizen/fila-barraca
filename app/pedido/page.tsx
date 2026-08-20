"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Item = {
  nome: string
  quantidade: number
}

type Pedido = {
  numero: number
  itens: Item[]
  status: string
}

export default function Pedido() {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [erro, setErro] = useState("")

  useEffect(() => {
    async function carregarPedido() {
      const { data, error } = await supabase
        .from("pedidos")
        .select("numero, itens, status")
        .eq("numero", 1)
        .single()

      if (error) {
        console.error(error)
        setErro("Não foi possível carregar o pedido.")
        return
      }

      setPedido(data)
    }

    carregarPedido()

    const canal = supabase
      .channel("pedido-1")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedidos",
          filter: "numero=eq.1",
        },
        (payload) => {
          setPedido(payload.new as Pedido)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  if (erro) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 shadow max-w-md w-full">
          <p className="text-center text-red-600">{erro}</p>
        </div>
      </main>
    )
  }

  if (!pedido) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 shadow max-w-md w-full">
          <p className="text-center text-gray-500">
            Carregando pedido...
          </p>
        </div>
      </main>
    )
  }

  const pronto = pedido.status === "pronto"

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto">

        <h1 className="text-center text-3xl font-bold text-blue-600">
          Fila da Barraca
        </h1>

        <div className="mt-8 rounded-xl bg-white p-6 shadow">

          <p className="text-center text-gray-500">
            Seu pedido
          </p>

          <h2 className="mt-2 text-center text-4xl font-bold">
            #{String(pedido.numero).padStart(3, "0")}
          </h2>

          <div className="mt-6">
            {pedido.itens.map((item, index) => (
              <p key={index} className="text-lg text-gray-700">
                {item.quantidade}x {item.nome}
              </p>
            ))}
          </div>

          {pronto ? (
            <div className="mt-8 rounded-xl bg-green-100 p-6 text-center">
              <div className="text-4xl">🎉</div>

              <p className="mt-2 text-2xl font-bold text-green-700">
                PEDIDO PRONTO!
              </p>

              <p className="mt-2 text-green-700">
                Pode retirar seu pedido na barraca.
              </p>
            </div>
          ) : (
            <div className="mt-8 rounded-xl bg-yellow-100 p-6 text-center">
              <p className="text-xl font-bold text-yellow-700">
                🟡 {pedido.status === "aguardando"
                  ? "Aguardando"
                  : "Preparando"}
              </p>

              <p className="mt-2 text-yellow-700">
                Aguarde. Avisaremos quando seu pedido estiver pronto.
              </p>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}