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
      .order("numero", {
        ascending: true,
      })


    if (error) {
      console.error(error)
      return
    }


    setPedidos((data as Pedido[]) || [])
    setCarregando(false)

  }



  async function marcarComoPronto(id:number) {

    const { error } = await supabase
      .from("pedidos")
      .update({
        status:"pronto",
      })
      .eq("id",id)


    if(error){

      console.error(error)

      alert(
        "Não foi possível atualizar o pedido."
      )

      return
    }


    carregarPedidos()

  }




  function adicionarItem(){

    const nome = nomeItem.trim()


    if(!nome){

      alert(
        "Digite o nome do produto."
      )

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





  function removerItem(index:number){

    setItensNovos(
      itensNovos.filter(
        (_,i)=>i!==index
      )
    )

  }





  async function criarPedido(){

    if(itensNovos.length===0){

      alert(
        "Adicione pelo menos um item."
      )

      return
    }


    setCriando(true)


    const {data: ultimoPedido} =
      await supabase
      .from("pedidos")
      .select("numero")
      .order(
        "numero",
        {
          ascending:false
        }
      )
      .limit(1)
      .maybeSingle()



    const numero =
      ultimoPedido
      ? ultimoPedido.numero + 1
      : 1



    const codigo =
      crypto
      .randomUUID()
      .replace(/-/g,"")
      .slice(0,8)



    const {error} =
      await supabase
      .from("pedidos")
      .insert({

        numero,

        codigo,

        itens:itensNovos,

        status:"aguardando",

      })



    if(error){

      console.error(error)

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


    carregarPedidos()

  }





  async function sair(){

    setSaindo(true)

    await supabase.auth.signOut()

    router.replace("/login")

  }





  useEffect(()=>{


    let canal:any


    async function iniciar(){


      const ok =
        await verificarAcesso()


      if(!ok)
        return



      carregarPedidos()



      canal =
        supabase
        .channel(
          "pedidos"
        )
        .on(
          "postgres_changes",
          {
            event:"*",
            schema:"public",
            table:"pedidos",
          },
          ()=>{
            carregarPedidos()
          }
        )
        .subscribe()


    }



    iniciar()



    return ()=>{

      if(canal){

        supabase.removeChannel(
          canal
        )

      }

    }


  },[])





  if(carregando){

    return (

      <main className="flex min-h-screen items-center justify-center">

        <p>
          Carregando painel...
        </p>

      </main>

    )

  }





  return (

    <main className="min-h-screen bg-slate-100 p-6">


      <div className="mx-auto max-w-6xl">


        <div className="rounded-2xl bg-white p-6 shadow">

          <div className="flex justify-between items-center">

            <div>

              <h1 className="text-3xl font-black text-blue-600">

                Painel da Barraca

              </h1>


              <p>

                Controle dos pedidos

              </p>

            </div>


            <button

              onClick={sair}

              disabled={saindo}

              className="rounded-xl border px-5 py-3 font-bold"

            >

              SAIR

            </button>


          </div>

        </div>





        <div className="mt-6 rounded-2xl bg-white p-6 shadow">


          <h2 className="text-2xl font-black">

            Novo pedido

          </h2>



          <div className="mt-5 flex gap-3">


            <input

              type="number"

              value={quantidadeItem}

              onChange={
                e=>setQuantidadeItem(
                  Number(e.target.value)
                )
              }

              className="w-24 rounded-xl border p-3"

            />



            <input

              value={nomeItem}

              onChange={
                e=>setNomeItem(
                  e.target.value
                )
              }

              className="flex-1 rounded-xl border p-3"

              placeholder="Produto"

            />



            <button

              onClick={adicionarItem}

              className="rounded-xl bg-blue-600 px-5 text-white font-bold"

            >

              ADICIONAR

            </button>


          </div>




          {itensNovos.map((item,index)=>(

            <div
              key={index}
              className="mt-3 flex justify-between bg-gray-100 p-3 rounded-xl"
            >

              {item.quantidade}x {item.nome}


              <button
                onClick={()=>removerItem(index)}
                className="text-red-600"
              >

                Remover

              </button>


            </div>

          ))}




          {itensNovos.length>0 && (

            <button

              onClick={criarPedido}

              disabled={criando}

              className="mt-5 w-full rounded-xl bg-green-600 p-4 font-black text-white"

            >

              {criando
              ?
              "CRIANDO..."
              :
              "CRIAR PEDIDO"}

            </button>

          )}


        </div>






        <div className="mt-8 grid gap-5 md:grid-cols-2">


        {pedidos.map(pedido=>{


          const pronto =
          pedido.status==="pronto"



          const urlPedido =
          typeof window !== "undefined" &&
          pedido.codigo

          ?

          `${window.location.origin}/pedido/${pedido.codigo}`

          :

          ""




          return (

          <div
          key={pedido.id}
          className="rounded-2xl bg-white shadow overflow-hidden"
          >


          <div className="p-5 bg-yellow-50">


          <h2 className="text-2xl font-black">

          Pedido #{String(pedido.numero).padStart(3,"0")}

          </h2>


          </div>



          <div className="p-5">


          {pedido.itens.map((item,i)=>(

            <p key={i}>

              {item.quantidade}x {item.nome}

            </p>

          ))}





          {pedido.codigo && (

          <div className="mt-5 text-center">


          <QRCodeSVG

          value={urlPedido}

          size={180}

          />


          <p className="mt-3 font-mono">

          {pedido.codigo}

          </p>


          </div>

          )}




          {!pronto && (

          <button

          onClick={()=>
            marcarComoPronto(
              pedido.id
            )
          }

          className="mt-5 w-full rounded-xl bg-green-600 p-4 text-white font-black"

          >

          ✓ MARCAR COMO PRONTO

          </button>

          )}



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


      </div>


    </main>

  )

}