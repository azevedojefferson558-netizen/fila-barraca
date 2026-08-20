```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Item = {
  nome: string
  quantidade: number
}

export default function PedidoPage() {
  const router = useRouter()

  const [xBurger, setXBurger] = useState(0)
  const [cocaCola, setCocaCola] = useState(0)

  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState("")

  async function criarPedido() {
    setErro("")

    const itens: Item[] = []

    if (xBurger > 0) {
      itens.push({
        nome: "X-Burguer",
        quantidade: xBurger,
      })
    }

    if (cocaCola > 0) {
      itens.push({
        nome: "Coca-Cola",
        quantidade: cocaCola,
      })
    }

    if (itens.length === 0) {
      setErro("Escolha pelo menos um produto.")
      return
    }

    setCriando(true)

    try {
      const { data: ultimoPedido, error: erroBusca } = await supabase
        .from("pedidos")
        .select("numero")
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (erroBusca) {
        console.error(erroBusca)
        setErro("Não foi possível preparar o pedido.")
        setCriando(false)
        return
      }

      const proximoNumero = (ultimoPedido?.numero ?? 0) + 1

      const { data, error } = await supabase
        .from("pedidos")
        .insert({
          numero: proximoNumero,
          itens,
          status: "aguardando",
        })
        .select("numero, codigo")
        .single()

      if (error) {
        console.error(error)
        setErro("Não foi possível criar o pedido.")
        setCriando(false)
        return
      }

      if (!data?.codigo) {
        console.error("Pedido criado sem código:", data)
        setErro("O pedido foi criado, mas não recebeu um código.")
        setCriando(false)
        return
      }

      router.push(`/pedido/${data.codigo}`)
    } catch (error) {
      console.error(error)
      setErro("Ocorreu um erro ao criar o pedido.")
      setCriando(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-md">

        <div className="pt-8 text-center">
          <h1 className="text-3xl font-black text-blue-600">
            Fila da Barraca
          </h1>

          <p className="mt-2 text-gray-500">
            Faça seu pedido
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-lg">

          <h2 className="text-2xl font-black text-gray-900">
            Novo pedido
          </h2>

          <p className="mt-1 text-gray-500">
            Escolha os produtos e as quantidades.
          </p>

          {/* X-BURGUER */}
          <div className="mt-6 rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-lg font-bold text-gray-900">
                  X-Burguer
                </p>

                <p className="text-sm text-gray-500">
                  Hambúrguer
                </p>
              </div>

              <div className="flex items-center gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setXBurger(Math.max(0, xBurger - 1))
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xl font-bold"
                >
                  −
                </button>

                <span className="w-6 text-center text-lg font-bold">
                  {xBurger}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setXBurger(xBurger + 1)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white"
                >
                  +
                </button>

              </div>

            </div>
          </div>

          {/* COCA-COLA */}
          <div className="mt-4 rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-lg font-bold text-gray-900">
                  Coca-Cola
                </p>

                <p className="text-sm text-gray-500">
                  Refrigerante
                </p>
              </div>

              <div className="flex items-center gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setCocaCola(Math.max(0, cocaCola - 1))
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xl font-bold"
                >
                  −
                </button>

                <span className="w-6 text-center text-lg font-bold">
                  {cocaCola}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCocaCola(cocaCola + 1)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white"
                >
                  +
                </button>

              </div>

            </div>
          </div>

          {/* ERRO */}
          {erro && (
            <div className="mt-5 rounded-xl bg-red-50 p-4 text-center text-sm font-semibold text-red-600">
              {erro}
            </div>
          )}

          {/* CRIAR PEDIDO */}
          <button
            type="button"
            onClick={criarPedido}
            disabled={criando}
            className="mt-6 min-h-14 w-full rounded-2xl bg-green-600 py-4 text-lg font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {criando ? "CRIANDO PEDIDO..." : "CRIAR PEDIDO"}
          </button>

        </div>
      </div>
    </main>
  )
}
```
