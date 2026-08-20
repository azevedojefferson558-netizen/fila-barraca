"use client";

import { useState } from "react";

export default function Home() {
  const [pronto, setPronto] = useState(false);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center text-blue-600">
        Fila da Barraca
      </h1>

      <p className="mt-2 text-center text-gray-600">
        Controle de pedidos
      </p>

      <div className="mt-8 max-w-md mx-auto bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold">
          Pedido #001
        </h2>

        <p className="mt-4 text-gray-700">
          2x X-Burguer
        </p>

        <p className="text-gray-700">
          1x Coca-Cola
        </p>

        {!pronto ? (
          <>
            <div className="mt-6 rounded-lg bg-yellow-100 p-4 text-center">
              <p className="font-bold text-yellow-800">
                🟡 Preparando
              </p>
            </div>

            <button
              onClick={() => setPronto(true)}
              className="mt-6 w-full rounded-lg bg-green-600 px-4 py-3 font-bold text-white"
            >
              Pedido pronto
            </button>
          </>
        ) : (
          <div className="mt-6 rounded-lg bg-green-100 p-6 text-center">
            <p className="text-2xl font-bold text-green-700">
              🟢 PEDIDO PRONTO!
            </p>

            <p className="mt-2 text-green-700">
              Pode retirar no balcão.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
