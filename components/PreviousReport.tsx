import React, { useState, useMemo } from 'react';
import { Sale, HistoricalReport, PaymentMethod, Withdrawal, CashDrawer } from '../types';
import { formatCurrency } from '../App';
import WithdrawalModal from './WithdrawalModal';

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
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
);

interface PreviousReportProps {
    allSales: Sale[];
    historicalReports: Record<string, HistoricalReport>;
    onAddWithdrawal: (date: string, amount: number, reason: string) => void;
    cashDrawer: CashDrawer;
}

const PreviousReport: React.FC<PreviousReportProps> = ({ allSales, historicalReports, onAddWithdrawal, cashDrawer }) => {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

    const reportData = useMemo(() => {
        return historicalReports[selectedDate];
    }, [selectedDate, historicalReports]);

    const salesForSelectedDate = useMemo(() => {
        return allSales.filter(sale => new Date(sale.timestamp).toISOString().split('T')[0] === selectedDate);
    }, [selectedDate, allSales]);

    const stats = useMemo(() => {
        const totalSales = salesForSelectedDate.reduce((acc, sale) => acc + sale.total, 0);
        const cashSales = salesForSelectedDate.filter(s => s.paymentMethod === PaymentMethod.Cash).reduce((acc, sale) => acc + sale.total, 0);
        const pixSales = salesForSelectedDate.filter(s => s.paymentMethod === PaymentMethod.Pix).reduce((acc, sale) => acc + sale.total, 0);
        const totalDiscounts = salesForSelectedDate.reduce((acc, sale) => acc + sale.discountAmount, 0);
        const totalWithdrawals = reportData?.withdrawals?.reduce((acc, w) => acc + w.amount, 0) || 0;
        return { totalSales, cashSales, pixSales, totalDiscounts, totalWithdrawals };
    }, [salesForSelectedDate, reportData]);
    
    const handleConfirmWithdrawal = (amount: number, reason: string) => {
        onAddWithdrawal(selectedDate, amount, reason);
        setIsWithdrawalModalOpen(false);
    };

    const ICONS = {
        total: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>,
        cash: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        pix: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
        discount: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 8v-3c0-1.1.9-2 2-2h2z" /></svg>,
        drawer: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
        withdrawal: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    };

    return (
        <div className="space-y-8 mt-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Resumo Geral do Caixa</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     <StatCard 
                        title="Total em Caixa Atual (Último Fechamento)" 
                        value={formatCurrency(cashDrawer.previousClosingCash)} 
                        icon={ICONS.drawer} 
                        color="bg-purple-500" 
                     />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <label htmlFor="report-date" className="font-semibold">Selecione uma data para ver o relatório detalhado:</label>
                <input 
                    type="date" 
                    id="report-date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
            
            {reportData ? (
                 <>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Resumo de vendas</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Total de Vendas" value={formatCurrency(stats.totalSales)} icon={ICONS.total} color="bg-blue-500" />
                            <StatCard title="Vendas em Dinheiro" value={formatCurrency(stats.cashSales)} icon={ICONS.cash} color="bg-green-500" />
                            <StatCard title="Vendas por Pix" value={formatCurrency(stats.pixSales)} icon={ICONS.pix} color="bg-sky-500" />
                            <StatCard title="Total de Descontos" value={formatCurrency(stats.totalDiscounts)} icon={ICONS.discount} color="bg-amber-500" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Resumo do Caixa</h2>
                            <button
                                onClick={() => setIsWithdrawalModalOpen(true)}
                                className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                            >
                                Fazer Retirada
                            </button>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Valor de Abertura" value={formatCurrency(reportData.openingCash)} icon={ICONS.drawer} color="bg-gray-500" />
                            <StatCard title="Entradas em Dinheiro" value={formatCurrency(stats.cashSales)} icon={ICONS.cash} color="bg-green-500" />
                            <StatCard title="Total Retirado" value={formatCurrency(stats.totalWithdrawals)} icon={ICONS.withdrawal} color="bg-red-500" />
                            <StatCard title="Valor de Fechamento" value={formatCurrency(reportData.closingCash)} icon={ICONS.drawer} color="bg-indigo-500" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Vendas de {new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}</h2>
                        <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hora</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Itens</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Pagamento</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Desconto</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                   {salesForSelectedDate.length > 0 ? salesForSelectedDate.map(sale => (
                                       <tr key={sale.id}>
                                           <td className="px-6 py-4 whitespace-nowrap">{new Date(sale.timestamp).toLocaleTimeString('pt-BR')}</td>
                                           <td className="px-6 py-4">{sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</td>
                                           <td className="px-6 py-4">{sale.paymentMethod}</td>
                                           <td className="px-6 py-4 text-red-500">{formatCurrency(sale.discountAmount)}</td>
                                           <td className="px-6 py-4 font-bold">{formatCurrency(sale.total)}</td>
                                       </tr>
                                   )) : (
                                       <tr><td colSpan={5} className="text-center py-4 text-gray-500">Nenhuma venda neste dia.</td></tr>
                                   )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {(reportData.withdrawals && reportData.withdrawals.length > 0) && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                            <h2 className="text-xl font-bold mb-4">Retiradas do Dia</h2>
                            <div className="overflow-x-auto">
                               <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hora</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Valor</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Motivo / Responsável</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                       {reportData.withdrawals.map((wd: Withdrawal) => (
                                           <tr key={wd.id}>
                                               <td className="px-6 py-4 whitespace-nowrap">{new Date(wd.timestamp).toLocaleTimeString('pt-BR')}</td>
                                               <td className="px-6 py-4 font-bold text-red-500">{formatCurrency(wd.amount)}</td>
                                               <td className="px-6 py-4">{wd.reason}</td>
                                           </tr>
                                       ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center mt-8">
                    <h3 className="text-xl font-semibold">Sem dados de relatório</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Nenhum relatório de fechamento foi encontrado para esta data. O dia pode não ter sido formalmente encerrado.</p>
                </div>
            )}
            
            <WithdrawalModal
                isOpen={isWithdrawalModalOpen}
                onClose={() => setIsWithdrawalModalOpen(false)}
                onConfirm={handleConfirmWithdrawal}
                maxAmount={reportData ? reportData.openingCash + stats.cashSales - stats.totalWithdrawals : 0}
            />
        </div>
    );
};

export default PreviousReport;
