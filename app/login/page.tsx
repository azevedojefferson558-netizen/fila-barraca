"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState("")

  async function entrar(e: FormEvent) {
    e.preventDefault()

    setErro("")
    setEntrando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      console.error(error)
      setErro("Email ou senha incorretos.")
      setEntrando(false)
      return
    }

    router.replace("/painel")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">

      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg sm:p-8">

        <div className="text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            🏪
          </div>

          <h1 className="mt-5 text-3xl font-black text-gray-900">
            Fila da Barraca
          </h1>

          <p className="mt-2 text-gray-500">
            Acesso ao painel da barraca
          </p>

        </div>


        <form
          onSubmit={entrar}
          className="mt-8 space-y-4"
        >

          <div>

            <label className="mb-2 block text-sm font-bold text-gray-700">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Digite seu email"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold text-gray-700">
              Senha
            </label>

            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Digite sua senha"
            />

          </div>


          {erro && (
            <div className="rounded-xl bg-red-50 p-4 text-center text-sm font-semibold text-red-700">
              {erro}
            </div>
          )}


          <button
            type="submit"
            disabled={entrando}
            className="min-h-12 w-full rounded-xl bg-blue-600 py-3 font-black text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {entrando ? "ENTRANDO..." : "ENTRAR"}
          </button>

        </form>

      </div>

    </main>
  )
}