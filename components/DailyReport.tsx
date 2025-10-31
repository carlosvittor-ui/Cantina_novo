
import React, { useMemo } from 'react';
import { Sale, CashDrawer, PaymentMethod } from '../types';
import { formatCurrency } from '../App';

interface StatCardProps {
    title: string;
    value: string;
    // FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error by using the type from the imported React module.
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


interface DailyReportProps {
    sales: Sale[];
    cashDrawer: CashDrawer;
    onOpenCashDrawer: () => void;
    onEndDay: () => void;
}

const DailyReport: React.FC<DailyReportProps> = ({ sales, cashDrawer, onOpenCashDrawer, onEndDay }) => {
    
    const todaySales = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return sales.filter(sale => new Date(sale.timestamp).toISOString().split('T')[0] === todayStr);
    }, [sales]);

    const stats = useMemo(() => {
        const totalSales = todaySales.reduce((acc, sale) => acc + sale.total, 0);
        const cashSales = todaySales.filter(s => s.paymentMethod === PaymentMethod.Cash).reduce((acc, sale) => acc + sale.total, 0);
        const pixSales = todaySales.filter(s => s.paymentMethod === PaymentMethod.Pix).reduce((acc, sale) => acc + sale.total, 0);
        const totalDiscounts = todaySales.reduce((acc, sale) => acc + sale.discountAmount, 0);
        const cashInDrawer = cashDrawer.openingCash + cashSales;
        return { totalSales, cashSales, pixSales, totalDiscounts, cashInDrawer };
    }, [todaySales, cashDrawer.openingCash]);

    if (!cashDrawer.isOpen) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-4 mt-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                     <h2 className="text-2xl font-bold mb-2">Caixa Fechado</h2>
                     <p className="text-gray-600 dark:text-gray-300 mb-6">Inicie o dia para começar a registrar vendas e visualizar o relatório diário.</p>
                     <button
                        onClick={onOpenCashDrawer}
                        className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-indigo-700 transition-colors"
                     >
                        Iniciar Caixa
                    </button>
                </div>
            </div>
        );
    }

    const ICONS = {
        total: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>,
        cash: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        pix: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
        discount: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 8v-3c0-1.1.9-2 2-2h2z" /></svg>,
        drawer: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
    };

    return (
        <div className="space-y-8 mt-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Relatório de Hoje</h1>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Resumo de vendas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Valor total da gira (Pix + dinheiro)" value={formatCurrency(stats.totalSales)} icon={ICONS.total} color="bg-blue-500" />
                    <StatCard title="Vendas em Dinheiro" value={formatCurrency(stats.cashSales)} icon={ICONS.cash} color="bg-green-500" />
                    <StatCard title="Vendas por Pix" value={formatCurrency(stats.pixSales)} icon={ICONS.pix} color="bg-sky-500" />
                    <StatCard title="Total de Descontos" value={formatCurrency(stats.totalDiscounts)} icon={ICONS.discount} color="bg-amber-500" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Resumo do Caixa</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <StatCard title="Valor de abertura" value={formatCurrency(cashDrawer.openingCash)} icon={ICONS.drawer} color="bg-gray-500" />
                     <StatCard title="Total em caixa hoje (dinheiro)" value={formatCurrency(stats.cashInDrawer)} icon={ICONS.cash} color="bg-indigo-500" />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Vendas do Dia</h2>
                    <button 
                        onClick={onEndDay}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                        Encerrar Dia
                    </button>
                </div>
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
                           {todaySales.map(sale => (
                               <tr key={sale.id}>
                                   <td className="px-6 py-4 whitespace-nowrap">{new Date(sale.timestamp).toLocaleTimeString('pt-BR')}</td>
                                   <td className="px-6 py-4">{sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</td>
                                   <td className="px-6 py-4">{sale.paymentMethod}</td>
                                   <td className="px-6 py-4 text-red-500">{formatCurrency(sale.discountAmount)}</td>
                                   <td className="px-6 py-4 font-bold">{formatCurrency(sale.total)}</td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DailyReport;
