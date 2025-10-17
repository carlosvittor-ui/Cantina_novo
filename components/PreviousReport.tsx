import React, { useState, useMemo } from 'react';
import { Sale, HistoricalReport, PaymentMethod, Withdrawal, CashDrawer } from '../types';
import { formatCurrency } from '../App';
import WithdrawalModal from './WithdrawalModal';

// [ALTERAÇÃO] Helper de chave de dia local (sem UTC)
function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactElement;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex items-center space-x-4">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

interface PreviousReportProps {
    allSales: Sale[];
    historicalReports: Record<string, HistoricalReport>;
    onAddWithdrawal: (date: string, amount: number, reason: string) => void;
}

const PreviousReport: React.FC<PreviousReportProps> = ({ allSales, historicalReports, onAddWithdrawal }) => {
    const today = localDayKey(new Date()); // [ALTERAÇÃO]
    const [selectedDate, setSelectedDate] = useState<string>(today);
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

    const salesForSelectedDate = useMemo(() => {
        if (!selectedDate) return [];
        return allSales.filter(sale => localDayKey(new Date(sale.timestamp as any)) === selectedDate // [ALTERAÇÃO]
        );
    }, [allSales, selectedDate]);

    const reportData = historicalReports[selectedDate];

    const totals = useMemo(() => {
        const totalSales = salesForSelectedDate.reduce((acc, s) => acc + s.total, 0);
        const cashSales = salesForSelectedDate
            .filter(s => s.paymentMethod === PaymentMethod.Cash)
            .reduce((acc, s) => acc + s.total, 0);
        const pixSales = salesForSelectedDate
            .filter(s => s.paymentMethod === PaymentMethod.Pix)
            .reduce((acc, s) => acc + s.total, 0);
        const totalDiscounts = salesForSelectedDate.reduce((acc, s) => acc + s.discountAmount, 0);
        const totalWithdrawals = reportData?.withdrawals?.reduce((acc, w) => acc + w.amount, 0) || 0;
        return { totalSales, cashSales, pixSales, totalDiscounts, totalWithdrawals };
    }, [salesForSelectedDate, reportData]);
    
    const handleConfirmWithdrawal = (amount: number, reason: string) => {
        onAddWithdrawal(selectedDate, amount, reason);
        setIsWithdrawalModalOpen(false);
    };

    const ICONS = {
        total: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>,
        cash: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        pix: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
        discount: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>,
        drawer: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    };

    const openingCash = reportData?.openingCash ?? 0;
    const closingCash = reportData?.closingCash ?? (openingCash + totals.cashSales);

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Relatórios Anteriores</h2>
                <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Escolha a data</label>
                    <input
                        type="date" 
                        className="rounded border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total de Vendas" value={formatCurrency(totals.totalSales)} icon={ICONS.total} color="bg-purple-100 dark:bg-purple-900" />
                <StatCard title="Dinheiro (vendas)" value={formatCurrency(totals.cashSales)} icon={ICONS.cash} color="bg-green-100 dark:bg-green-900" />
                <StatCard title="Pix" value={formatCurrency(totals.pixSales)} icon={ICONS.pix} color="bg-blue-100 dark:bg-blue-900" />
                <StatCard title="Descontos" value={formatCurrency(totals.totalDiscounts)} icon={ICONS.discount} color="bg-yellow-100 dark:bg-yellow-900" />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">Caixa (resumo salvo)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard title="Abertura" value={formatCurrency(openingCash)} icon={ICONS.drawer} color="bg-gray-100 dark:bg-gray-700" />
                    {/* [ALTERAÇÃO] garantir número, não objeto */}
                    <StatCard title="Fechamento" value={formatCurrency(closingCash)} icon={ICONS.drawer} color="bg-indigo-100 dark:bg-indigo-900" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Vendas da data</h3>
                    <button
                        onClick={() => setIsWithdrawalModalOpen(true)}
                        className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                    >
                        Registrar Retirada
                    </button>
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
                            {salesForSelectedDate.length > 0 ? (
                                salesForSelectedDate.map((sale) => (
                                    <tr key={sale.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            {new Date(sale.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {sale.items.map(item => `${item.quantity}x ${item.productName}`).join(', ')}
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
                                        Sem vendas arquivadas para esta data.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <WithdrawalModal
                isOpen={isWithdrawalModalOpen}
                onClose={() => setIsWithdrawalModalOpen(false)}
                onConfirm={handleConfirmWithdrawal}
            />
        </div>
    );
};

export default PreviousReport;
