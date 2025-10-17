// components/DailyReport.tsx
import React, { useMemo, useState } from "react";
import { Sale, PaymentMethod } from "../types";

// Helper local de data (sem UTC)
function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Tipos das props alinhados com o App.tsx atual
interface DailyReportProps {
  sales: Sale[];
  formatCurrency: (value: number) => string;
  openingCash: number;
  isCashDrawerOpen: boolean;
  onStartDayClick: () => void;
  onEndDay: () => void;

  // passados pelo App.tsx (opcional)
  todayKey: string; // chave do dia local (YYYY-MM-DD)
  withdrawals?: { id: string; amount: number; reason: string; timestamp: Date | string }[];
  onAddWithdrawal?: (date: string, amount: number, reason: string) => void;
}

const StatCard: React.FC<{ title: string; value: string; icon: JSX.Element; color: string }> = ({
  title,
  value,
  icon,
  color,
}) => (
  <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 flex items-start">
    <div className={`rounded-full p-3 mr-4 ${color}`}>{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

const DailyReport: React.FC<DailyReportProps> = ({
  sales,
  formatCurrency,
  openingCash,
  isCashDrawerOpen,
  onStartDayClick,
  onEndDay,
  todayKey,
  withdrawals = [],
  onAddWithdrawal,
}) => {
  // Se caixa não está aberto, mostra card de instrução
  if (!isCashDrawerOpen) {
    return (
      <div className="text-center p-10 bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md mx-auto">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h2 className="mt-6 text-2xl font-bold text-gray-800 dark:text-white">Caixa Fechado</h2>
        <p className="mt-2 mb-6 text-gray-600 dark:text-gray-400">
          Inicie o caixa para visualizar o relatório do dia e efetuar vendas.
        </p>
        <button
          onClick={onStartDayClick}
          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
        >
          Iniciar Caixa
        </button>
      </div>
    );
  }

  // Filtrar as vendas do "dia atual" com base no todayKey local:
  const salesToday = useMemo(() => {
    return sales.filter((s) => {
      // usa dayKey se existir (versões novas), senão calcula do timestamp local
      const key = (s as any).dayKey ?? localDayKey(new Date(s.timestamp as any));
      return key === todayKey;
    });
  }, [sales, todayKey]);

  const totalCashSales = salesToday
    .filter((s) => s.paymentMethod === PaymentMethod.Cash)
    .reduce((sum, s) => sum + s.total, 0);

  const totalPix = salesToday
    .filter((s) => s.paymentMethod === PaymentMethod.Pix)
    .reduce((sum, s) => sum + s.total, 0);

  const totalDiscounts = salesToday.reduce((sum, s) => sum + s.discountAmount, 0);
  const grandTotal = totalCashSales + totalPix;

  // Fechamento esperado (apenas para exibir no dia em andamento)
  const expectedClosingCash = openingCash + totalCashSales;

  // Modal de retirada (opcional)
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number | "">("");
  const [withdrawReason, setWithdrawReason] = useState("");

  const confirmWithdrawal = () => {
    if (!onAddWithdrawal || withdrawAmount === "" || Number(withdrawAmount) <= 0) {
      setIsWithdrawalOpen(false);
      return;
    }
    onAddWithdrawal(todayKey, Number(withdrawAmount), withdrawReason || "Retirada");
    setWithdrawAmount("");
    setWithdrawReason("");
    setIsWithdrawalOpen(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Relatório do Dia</h2>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Resumo de Vendas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total (Vendas)"
              value={formatCurrency(grandTotal)}
              color="bg-purple-100 dark:bg-purple-900"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
                </svg>
              }
            />
            <StatCard
              title="Dinheiro (Vendas)"
              value={formatCurrency(totalCashSales)}
              color="bg-green-100 dark:bg-green-900"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <StatCard
              title="Pix"
              value={formatCurrency(totalPix)}
              color="bg-blue-100 dark:bg-blue-900"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            />
            <StatCard
              title="Descontos"
              value={formatCurrency(totalDiscounts)}
              color="bg-yellow-100 dark:bg-yellow-900"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                </svg>
              }
            />
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Resumo do Caixa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="Abertura"
              value={formatCurrency(openingCash)}
              color="bg-gray-100 dark:bg-gray-700"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-600 dark:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              }
            />
            <StatCard
              title="Fechamento (Previsto)"
              value={formatCurrency(expectedClosingCash)}
              color="bg-indigo-100 dark:bg-indigo-900"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />
          </div>
        </div>
      </div>

      {/* Tabela de vendas do dia */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Vendas de Hoje</h3>
          <div className="flex gap-2">
            {onAddWithdrawal && (
              <button
                onClick={() => setIsWithdrawalOpen(true)}
                className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
              >
                Registrar Retirada
              </button>
            )}
            <button
              onClick={onEndDay}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Encerrar Dia
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium">Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Itens</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Pagamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Desconto</th>
                <th className="px-6 py-3 text-left text-xs font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {salesToday.length > 0 ? (
                salesToday.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Date(sale.timestamp as any).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {sale.items.map((item) => `${item.quantity}x ${item.productName}`).join(", ")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-800">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">
                      {sale.discountAmount > 0 ? (
                        <span>- {formatCurrency(sale.discountAmount)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(sale.total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Sem vendas registradas hoje.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lista de retiradas do dia (se houver) */}
        {withdrawals.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-2">Retiradas</h4>
            <ul className="space-y-2">
              {withdrawals.map((w) => (
                <li key={w.id} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded p-2">
                  <span>{new Date(w.timestamp as any).toLocaleTimeString()} — {w.reason}</span>
                  <span className="font-medium">{formatCurrency(w.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Modal simples de retirada */}
      {onAddWithdrawal && isWithdrawalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-sm">
            <h4 className="text-lg font-semibold mb-4">Registrar Retirada</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm block mb-1">Valor</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="text-sm block mb-1">Motivo</label>
                <input
                  type="text"
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsWithdrawalOpen(false)}
                  className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmWithdrawal}
                  className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReport;
