import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ProductRegistration from './components/ProductRegistration';
import SalesScreen from './components/SalesScreen';
import DailyReport from './components/DailyReport';
import PreviousReport from './components/PreviousReport';
import OpenCashDrawerModal from './components/OpenCashDrawerModal';
import { Product, Sale, View, CashDrawer, HistoricalReport, PaymentMethod, SaleItem, Withdrawal } from './types';
import { fetchInitialData, upsertProduct, upsertProducts, recordSale, openCashDrawer, closeCashDrawer, recordWithdrawal } from './services/supabaseRepo';


// Custom hook for persisting state to localStorage
function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = window.localStorage.getItem(key);
            if (storedValue) {
                // Special handling for dates during parsing
                return JSON.parse(storedValue, (k, v) => {
                    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(v)) {
                        return new Date(v);
                    }
                    return v;
                });
            }
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
        }
        return initialValue;
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    }, [key, state]);

    return [state, setState];
}


export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export default function App() {
    const [products, setProducts] = usePersistentState<Product[]>('pdv-products', []);
    const [sales, setSales] = usePersistentState<Sale[]>('pdv-sales', []);
    const [currentView, setCurrentView] = usePersistentState<View>('pdv-view', 'register');
    const [cashDrawer, setCashDrawer] = usePersistentState<CashDrawer>('pdv-cashDrawer', {
        isOpen: false,
        openingCash: 0,
        previousClosingCash: 0,
    });
    const [historicalReports, setHistoricalReports] = usePersistentState<Record<string, HistoricalReport>>('pdv-historicalReports', {});
    
    const [notification, setNotification] = useState<string | null>(null);
    const [isCashDrawerModalOpen, setIsCashDrawerModalOpen] = useState(false);
    
    const showNotification = useCallback((message: string) => {
        setNotification(message);
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    }, []);

    const handleAddProduct = (productData: Omit<Product, 'id'>) => {
        const newProduct: Product = {
            ...productData,
            id: Date.now().toString(),
        };
        setProducts(prev => [...prev, newProduct]);
        showNotification(`Produto "${newProduct.name}" adicionado!`);
    };

    const handleBulkAddProducts = (newProductsData: Omit<Product, 'id'>[]) => {
        const newProducts: Product[] = newProductsData.map((p, index) => ({
            ...p,
            id: `${Date.now()}-${index}`,
        }));
        setProducts(prev => [...prev, ...newProducts]);
        showNotification(`${newProducts.length} produtos importados com sucesso!`);
    };

    const handleUpdateProduct = (updatedProduct: Product) => {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        showNotification(`Produto "${updatedProduct.name}" atualizado!`);
    };

    const handleAddSale = (
        cartItems: SaleItem[], 
        paymentMethod: PaymentMethod, 
        discount?: { type: 'percentage' | 'fixed'; value: number }
    ) => {
        if (cartItems.length === 0) return;

        const subtotal = cartItems.reduce((acc, item) => acc + item.pricePerItem * item.quantity, 0);
        let discountAmount = 0;
        if (discount && discount.value > 0) {
            if (discount.type === 'percentage') {
                discountAmount = subtotal * (discount.value / 100);
            } else {
                discountAmount = discount.value;
            }
        }
        const total = subtotal - discountAmount;

        const newSale: Sale = {
            id: `sale-${Date.now()}`,
            items: cartItems,
            subtotal,
            discountType: discount?.type,
            discountValue: discount?.value,
            discountAmount,
            total,
            paymentMethod,
            timestamp: new Date(),
        };

        setSales(prev => [...prev, newSale]);

        // Update stock
        const updatedProducts = [...products];
        cartItems.forEach(item => {
            const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
            if (productIndex !== -1) {
                updatedProducts[productIndex].stock -= item.quantity;
            }
        });
        setProducts(updatedProducts);

        showNotification('Venda finalizada com sucesso!');
    };

    const handleStartDay = (openingAmount: number) => {
        setCashDrawer(prev => ({ ...prev, isOpen: true, openingCash: openingAmount }));
        setIsCashDrawerModalOpen(false);
        showNotification(`Caixa iniciado com ${formatCurrency(openingAmount)}.`);
    };

    const handleEndDay = () => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const todaySales = sales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate.toISOString().split('T')[0] === todayStr;
        });

        const totalCashSales = todaySales
            .filter(sale => sale.paymentMethod === PaymentMethod.Cash)
            .reduce((acc, sale) => acc + sale.total, 0);

        const closingCash = cashDrawer.openingCash + totalCashSales;

        const newReport: HistoricalReport = {
            date: todayStr,
            openingCash: cashDrawer.openingCash,
            closingCash: closingCash,
            withdrawals: [],
        };

        setHistoricalReports(prev => ({ ...prev, [todayStr]: newReport }));
        setCashDrawer({ isOpen: false, openingCash: 0, previousClosingCash: closingCash });
        showNotification(`Dia encerrado. Saldo final do caixa: ${formatCurrency(closingCash)}.`);
    };

    const handleAddWithdrawal = (date: string, amount: number, reason: string) => {
        const reportToUpdate = historicalReports[date];
        if (!reportToUpdate) {
            showNotification("Erro: Relatório não encontrado para esta data.");
            return;
        }

        const newWithdrawal: Withdrawal = {
            id: `wd-${Date.now()}`,
            amount,
            reason,
            timestamp: new Date(),
        };

        const updatedReport: HistoricalReport = {
            ...reportToUpdate,
            closingCash: reportToUpdate.closingCash - amount,
            withdrawals: [...(reportToUpdate.withdrawals || []), newWithdrawal],
        };
        
        const updatedReports = { ...historicalReports, [date]: updatedReport };
        setHistoricalReports(updatedReports);

        // Check if the withdrawal was made on the most recent report day.
        const reportDates = Object.keys(updatedReports);
        if (reportDates.length > 0) {
            const latestDate = reportDates.reduce((a, b) => a > b ? a : b);
            if (date === latestDate) {
                // If it is the latest day, update the main cash drawer state.
                setCashDrawer(prev => ({
                    ...prev,
                    previousClosingCash: updatedReport.closingCash,
                }));
            }
        }
        
        showNotification(`Retirada de ${formatCurrency(amount)} registrada com sucesso.`);
    };
    
    const exportSalesCSV = () => {
        const headers = [
            'ID da Venda',
            'Data',
            'Hora',
            'Itens',
            'Subtotal',
            'Tipo de Desconto',
            'Valor do Desconto',
            'Valor Descontado',
            'Total',
            'Método de Pagamento'
        ];
        
        const rows = sales.map(sale => [
            sale.id,
            new Date(sale.timestamp).toLocaleDateString('pt-BR'),
            new Date(sale.timestamp).toLocaleTimeString('pt-BR'),
            `"${sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}"`,
            sale.subtotal.toFixed(2),
            sale.discountType || '',
            sale.discountValue || '',
            sale.discountAmount.toFixed(2),
            sale.total.toFixed(2),
            sale.paymentMethod
        ].join(','));
        
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "vendas_cantina.csv");
        document.body.appendChild(link); 
        link.click();
        document.body.removeChild(link);
        showNotification("Exportação CSV iniciada.");
    };

    const renderView = () => {
        if (currentView === 'sales' && !cashDrawer.isOpen) {
            return (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] text-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h2 className="text-2xl font-bold mb-2">Caixa Fechado</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Para registrar vendas, você precisa primeiro iniciar o dia.</p>
                        <button 
                            onClick={() => setCurrentView('report')}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Ir para a aba "Relatório"
                        </button>
                    </div>
                </div>
            );
        }
        
        switch (currentView) {
            case 'register':
                return <ProductRegistration products={products} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onBulkAddProducts={handleBulkAddProducts} />;
            case 'sales':
                return <SalesScreen products={products} onAddSale={handleAddSale} />;
            case 'report':
                return <DailyReport sales={sales} cashDrawer={cashDrawer} onOpenCashDrawer={() => setIsCashDrawerModalOpen(true)} onEndDay={handleEndDay} />;
            case 'previousReport':
                return <PreviousReport allSales={sales} historicalReports={historicalReports} onAddWithdrawal={handleAddWithdrawal} cashDrawer={cashDrawer} />;
            default:
                return <div>Selecione uma visão</div>;
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header currentView={currentView} setCurrentView={setCurrentView} />
            <main className="flex-grow p-4 sm:p-6 lg:p-8 pt-20">
                <div key={currentView} className="animate-fade-in">
                    {renderView()}
                </div>
            </main>
            
             <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={exportSalesCSV}
                    className="bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 transition-transform transform hover:scale-105"
                    title="Exportar Todas as Vendas para CSV"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
            </div>
            
            {notification && (
                <div className="fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-out z-50">
                    {notification}
                </div>
            )}
            
            <OpenCashDrawerModal
                isOpen={isCashDrawerModalOpen}
                onClose={() => setIsCashDrawerModalOpen(false)}
                onStartDay={handleStartDay}
                previousClosingCash={cashDrawer.previousClosingCash}
            />
        </div>
    );
}
