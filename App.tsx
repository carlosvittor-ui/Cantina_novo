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

// ===== Data (fuso local) =====
// [ALTERAÇÃO] Usar chave de dia baseada no HORÁRIO LOCAL, evita virar o dia às 21/22h (UTC).
function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  const [products, setProducts] = usePersistentState<Product[]>('products', []);
  const [sales, setSales] = usePersistentState<Sale[]>('sales', []);
  const [currentView, setCurrentView] = usePersistentState<View>('currentView', 'register');

  const [cashDrawer, setCashDrawer] = usePersistentState<CashDrawer>('cashDrawer', {
    isOpen: false,
    openingCash: 0,
    previousClosingCash: 0,
  });

  const [historicalReports, setHistoricalReports] = usePersistentState<Record<string, HistoricalReport>>(
    'historicalReports',
    {}
  );

  const [notification, setNotification] = useState<string | null>(null);
  const [isCashDrawerModalOpen, setIsCashDrawerModalOpen] = useState(false);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2500);
  }, []);

  // ===== Carregar dados iniciais do Supabase (opcional) =====
  useEffect(() => {
    (async () => {
      try {
        const initial = await fetchInitialData();
        if (initial?.products?.length) setProducts(initial.products);
        if (initial?.sales?.length) setSales(initial.sales);
        if (initial?.cashDrawer) setCashDrawer(initial.cashDrawer);
        if (initial?.historicalReports) setHistoricalReports(initial.historicalReports);
      } catch (e) {
        console.warn('Falha ao buscar dados iniciais:', e);
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
    discount: { type: 'percentage' | 'fixed'; value?: number }
  ) => {
    if (!cartItems.length) return;

    const subtotal = cartItems.reduce((acc, it) => acc + it.pricePerItem * it.quantity, 0);
    let discountAmount = 0;
    if (discount.value && discount.value > 0) {
      discountAmount = discount.type === 'percentage'
        ? (subtotal * discount.value) / 100
        : discount.value;
    }
    discountAmount = Math.min(subtotal, discountAmount);
    const total = subtotal - discountAmount;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      items: cartItems,
      subtotal,
      discountType: discount.value ? discount.type : undefined,
      discountValue: discount.value,
      discountAmount,
      total,
      paymentMethod,
      timestamp: new Date(),
    };

    // Atualiza estoque local
    const updatedProducts = products.map(p => {
      const item = cartItems.find(ci => ci.productId === p.id);
      if (!item) return p;
      return { ...p, stock: Math.max(0, p.stock - item.quantity) };
    });

    setSales(prev => [...prev, newSale]);
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
      await openCashDrawer(openingAmount);
    } catch (e) {
      console.warn(e);
    }

    showNotification(`Caixa iniciado com ${formatCurrency(openingAmount)}.`);
  };

  const handleEndDay = async () => {
    const today = new Date();
    const todayStr = localDayKey(today); // [ALTERAÇÃO] antes: toISOString (UTC)

    const todaySales = sales.filter(
      sale => localDayKey(new Date(sale.timestamp as any)) === todayStr // [ALTERAÇÃO]
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

  const today = useMemo(() => localDayKey(new Date()), []); // [ALTERAÇÃO]

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
              <div className="text-2xl font-bold mb-2">Caixa fechado</div>
              <div className="mb-6 text-gray-500">
                Vá até a aba <b>Relatório</b> para iniciar o dia antes de vender.
              </div>
              <button
                onClick={() => setCurrentView('report')}
                className="px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Ir para Relatório
              </button>
            </div>
          )
        )}

        {currentView === 'report' && (
          <DailyReport
            sales={sales}
            formatCurrency={formatCurrency}
            openingCash={cashDrawer.openingCash}
            isCashDrawerOpen={cashDrawer.isOpen}
            onStartDayClick={() => setIsCashDrawerModalOpen(true)}
            onEndDay={handleEndDay}
            todayKey={today}
            withdrawals={historicalReports[today]?.withdrawals || []}
            onAddWithdrawal={handleAddWithdrawal}
          />
        )}

        {currentView === 'previousReport' && (
          <PreviousReport
            allSales={sales}
            historicalReports={historicalReports}
            onAddWithdrawal={handleAddWithdrawal}
          />
        )}
      </main>

      {notification && (
        <div className="fixed bottom-5 right-5 px-4 py-2 rounded bg-green-600 text-white shadow-lg">
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
