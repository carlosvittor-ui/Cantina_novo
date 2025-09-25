import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import ProductRegistration from './components/ProductRegistration';
import SalesScreen from './components/SalesScreen';
import DailyReport from './components/DailyReport';
import PreviousReport from './components/PreviousReport';
import OpenCashDrawerModal from './components/OpenCashDrawerModal';

import { Product, Sale, View, CashDrawer, HistoricalReport, PaymentMethod, SaleItem, Withdrawal } from './types';

// ===== Integração Supabase (deixe estes imports; se ainda não criou os arquivos, comente temporariamente) =====
import {
  fetchInitialData,
  upsertProduct,
  upsertProducts,
  recordSale,
  openCashDrawer,
  closeCashDrawer,
  recordWithdrawal,
} from './services/supabaseRepo';

// ===== Util =====
export function formatCurrency(value: number): string {
  try {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    return `R$ ${Number(value || 0).toFixed(2)}`;
  }
}

// ===== Hook de estado persistente no localStorage =====
function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      if (!storedValue) return initialValue;
      return JSON.parse(storedValue, (_k, v) => {
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)) {
          return new Date(v);
        }
        return v;
      });
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [key, state]);

  return [state, setState];
}

const App: React.FC = () => {
  const [products, setProducts] = usePersistentState<Product[]>('pdv-products', []);
  const [sales, setSales] = usePersistentState<Sale[]>('pdv-sales', []);
  const [currentView, setCurrentView] = usePersistentState<View>('pdv-view', 'register');
  const [cashDrawer, setCashDrawer] = usePersistentState<CashDrawer>('pdv-cashDrawer', {
    isOpen: false,
    openingCash: 0,
    previousClosingCash: 0,
  });
  const [historicalReports, setHistoricalReports] =
    usePersistentState<Record<string, HistoricalReport>>('pdv-historicalReports', {});

  const [notification, setNotification] = useState<string | null>(null);
  const [isCashDrawerModalOpen, setIsCashDrawerModalOpen] = useState(false);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Carrega dados do Supabase ao iniciar (mantém app funcionando offline caso falhe)
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchInitialData();
        if (data?.products) setProducts(data.products);
        if (data?.sales) setSales(data.sales);
        if (data?.historicalReports) setHistoricalReports(data.historicalReports);
        if (data?.cashDrawer) {
          setCashDrawer(prev => ({
            ...prev,
            isOpen: !!data.cashDrawer.isOpen,
            openingCash: data.cashDrawer.openingCash ?? 0,
            previousClosingCash: data.cashDrawer.previousClosingCash ?? prev.previousClosingCash,
          }));
        }
      } catch (e) {
        console.warn('Falha ao carregar do Supabase (seguindo local):', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Handlers =====
  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      id: crypto?.randomUUID?.() ?? `p-${Date.now()}`,
      ...productData,
    };
    setProducts(prev => [...prev, newProduct]);
    try {
      await upsertProduct(newProduct);
    } catch (e) {
      console.warn(e);
    }
    showNotification(`Produto "${newProduct.name}" adicionado!`);
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => (p.id === updatedProduct.id ? updatedProduct : p)));
    try {
      await upsertProduct(updatedProduct);
    } catch (e) {
      console.warn(e);
    }
    showNotification(`Produto "${updatedProduct.name}" atualizado!`);
  };

  const handleBulkAddProducts = async (newProducts: Omit<Product, 'id'>[]) => {
    const withIds: Product[] = newProducts.map(p => ({
      id: crypto?.randomUUID?.() ?? `p-${Date.now()}-${p.name}`,
      ...p,
    }));
    setProducts(prev => [...prev, ...withIds]);
    try {
      await upsertProducts(withIds);
    } catch (e) {
      console.warn(e);
    }
    showNotification(`${withIds.length} produtos adicionados!`);
  };

  const handleAddSale = async (
    cartItems: SaleItem[],
    paymentMethod: PaymentMethod,
    discount?: { type: 'percentage' | 'fixed'; value: number }
  ) => {
    if (!cartItems?.length) return;

    const subtotal = cartItems.reduce((acc, item) => acc + item.pricePerItem * item.quantity, 0);

    let discountAmount = 0;
    if (discount && discount.value > 0) {
      discountAmount = discount.type === 'percentage' ? subtotal * (discount.value / 100) : discount.value;
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

    // Atualiza estoque local
    const updatedProducts = [...products];
    cartItems.forEach(item => {
      const idx = updatedProducts.findIndex(p => p.id === item.productId);
      if (idx !== -1) {
        updatedProducts[idx] = {
          ...updatedProducts[idx],
          stock: Math.max(0, updatedProducts[idx].stock - item.quantity),
        };
      }
    });
    setProducts(updatedProducts);

    // Persiste no Supabase (se falhar, segue local)
    try {
      await recordSale(newSale);
      await upsertProducts(updatedProducts);
    } catch (e) {
      console.warn('Falha ao salvar venda no Supabase:', e);
    }

    showNotification('Venda finalizada com sucesso!');
  };

  const handleStartDay = async (openingAmount: number) => {
    setCashDrawer(prev => ({ ...prev, isOpen: true, openingCash: openingAmount }));
    setIsCashDrawerModalOpen(false);
    try {
      await openCashDrawer(openingAmount, cashDrawer.previousClosingCash);
    } catch (e) {
      console.warn(e);
    }
    showNotification(`Caixa iniciado com ${formatCurrency(openingAmount)}.`);
  };

  const handleEndDay = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const todaySales = sales.filter(
      sale => new Date(sale.timestamp).toISOString().split('T')[0] === todayStr
    );

    const totalCashSales = todaySales
      .filter(s => s.paymentMethod === PaymentMethod.Cash)
      .reduce((acc, sale) => acc + sale.total, 0);

    const closingCash = cashDrawer.openingCash + totalCashSales;

    const newReport: HistoricalReport = {
      openingCash: cashDrawer.openingCash,
      closingCash,
      date: todayStr,
      withdrawals: historicalReports[todayStr]?.withdrawals ?? [],
    };

    setHistoricalReports(prev => ({ ...prev, [todayStr]: newReport }));
    setCashDrawer({ isOpen: false, openingCash: 0, previousClosingCash: closingCash });

    try {
      await closeCashDrawer(closingCash);
    } catch (e) {
      console.warn(e);
    }

    showNotification(`Dia encerrado. Caixa final: ${formatCurrency(closingCash)}.`);
  };

  const handleAddWithdrawal = async (date: string, amount: number, reason: string) => {
    const report = historicalReports[date] ?? {
      openingCash: 0,
      closingCash: 0,
      date,
      withdrawals: [] as Withdrawal[],
    };

    const newWithdrawal: Withdrawal = {
      id: `wd-${Date.now()}`,
      amount,
      reason,
      timestamp: new Date(),
    };

    setHistoricalReports(prev => ({
      ...prev,
      [date]: {
        ...report,
        withdrawals: [...(report.withdrawals || []), newWithdrawal],
      },
    }));

    try {
      await recordWithdrawal(newWithdrawal, date);
    } catch (e) {
      console.warn(e);
    }

    showNotification('Retirada registrada!');
  };

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header currentView={currentView} setCurrentView={setCurrentView} />

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {currentView === 'register' && (
          <ProductRegistration
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onBulkAddProducts={handleBulkAddProducts}
          />
        )}

        {currentView === 'sales' && (
          cashDrawer.isOpen ? (
            <SalesScreen products={products} onAddSale={handleAddSale} />
          ) : (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] text-center p-4">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-2xl font-bold mb-2">Caixa Fechado</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">Para registrar vendas, você precisa primeiro iniciar o dia.</p>
                <button
                  onClick={() => setCurrentView('report')}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Ir para a aba "Relatório"
                </button>
              </div>
            </div>
          )
        )}

        {currentView === 'report' && (
          <DailyReport
            sales={sales}
            cashDrawer={cashDrawer}
            onOpenCashDrawer={() => setIsCashDrawerModalOpen(true)}
            onEndDay={handleEndDay}
          />
        )}

        {currentView === 'previousReport' && (
          <PreviousReport
            allSales={sales}
            historicalReports={historicalReports}
            onAddWithdrawal={handleAddWithdrawal}
            cashDrawer={cashDrawer}
          />
        )}
      </main>

      {notification && (
        <div className="fixed top-20 right-4 bg-green-50 dark:bg-green-900 text-green-900 dark:text-green-50 border border-green-200 dark:border-green-800 rounded-lg px-6 py-3 shadow-lg z-50">
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
};

export default App;
