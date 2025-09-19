// App.tsx — Views separadas (Cadastro x Vendas) + Supabase sync + formatCurrency
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ProductRegistration from './components/ProductRegistration';
import SalesScreen from './components/SalesScreen';
import DailyReport from './components/DailyReport';
import PreviousReport from './components/PreviousReport';
import OpenCashDrawerModal from './components/OpenCashDrawerModal';
import { Product, Sale, View, CashDrawer, HistoricalReport, PaymentMethod, SaleItem, Withdrawal } from './types';
import { getSupabase } from './supabaseClient';

/** Export usado em componentes (ex.: ProductRegistration) */
export function formatCurrency(value: number): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  } catch {
    return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
  }
}

/* ==================== LOCAL STORAGE HOOK ==================== */
function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue) {
        return JSON.parse(storedValue, (k, v) => {
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v)) {
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

/* ==================== SUPABASE SYNC ==================== */
type AppState = {
  products: Product[];
  sales: Sale[];
  currentView: View;
  cashDrawer: CashDrawer;
  historicalReports: Record<string, HistoricalReport>;
};

function reviveDates(o: any): any {
  if (o === null || typeof o !== 'object') return o;
  if (Array.isArray(o)) return o.map(reviveDates);
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  const out: any = {};
  for (const k of Object.keys(o)) {
    const v = (o as any)[k];
    if (typeof v === 'string' && iso.test(v)) out[k] = new Date(v);
    else out[k] = reviveDates(v);
  }
  return out;
}

/* ==================== APP ==================== */
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
  const [isCashDrawerModalOpen, setIsCashDrawerModalOpen] = useState<boolean>(false);

  /* ===== Carregar do Supabase na abertura ===== */
  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data, error } = await supabase
          .from('app_state')
          .select('value')
          .eq('key', 'default')
          .maybeSingle();
        if (error) {
          console.warn('[Supabase] Erro ao carregar estado:', error);
          return;
        }
        if (data?.value) {
          const v = reviveDates(data.value as AppState);
          setProducts(v.products ?? []);
          setSales(v.sales ?? []);
          setCurrentView(v.currentView ?? 'register');
          setCashDrawer(v.cashDrawer ?? { isOpen: false, openingCash: 0, previousClosingCash: 0 });
          setHistoricalReports(v.historicalReports ?? {});
        }
      } catch (e) {
        console.warn('[Supabase] Exceção ao carregar estado:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Salvar no Supabase a cada mudança ===== */
  useEffect(() => {
    const state: AppState = { products, sales, currentView, cashDrawer, historicalReports };
    const t = setTimeout(async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { error } = await supabase
          .from('app_state')
          .upsert({
            key: 'default',
            value: state,
            updated_at: new Date().toISOString(),
          });
        if (error) console.warn('[Supabase] Erro ao salvar estado:', error);
      } catch (e) {
        console.warn('[Supabase] Exceção ao salvar estado:', e);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [products, sales, currentView, cashDrawer, historicalReports]);

  /* ===== Lógica de vendas / cadastro ===== */
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [withdrawals, setWithdrawals] = usePersistentState<Withdrawal[]>('pdv-withdrawals', []);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addItemToSale = (product: Product) => {
    setSelectedItems(prevItems => {
      const existingItem = prevItems.find(item => item.productId === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevItems, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
      }
    });
  };

  const removeItemFromSale = (productId: string) => {
    setSelectedItems(prevItems => {
      const existingItem = prevItems.find(item => item.productId === productId);
      if (existingItem && existingItem.quantity > 1) {
        return prevItems.map(item =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      } else {
        return prevItems.filter(item => item.productId !== productId);
      }
    });
  };

  const calculateTotal = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal - discount;
    return total > 0 ? total : 0;
  };

  const handleRegisterProduct = (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...productData, id: Date.now().toString() };
    setProducts(prev => [...prev, newProduct]);
    setNotification('Produto cadastrado com sucesso!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(product => product.id !== productId));
    setNotification('Produto excluído com sucesso!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleEditProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    setNotification('Produto atualizado com sucesso!');
    setTimeout(() => setNotification(null), 3000);
  };

  const openCashDrawer = (openingCash: number) => {
    setCashDrawer({
      isOpen: true,
      openingCash,
      previousClosingCash: cashDrawer.previousClosingCash,
    });
    setNotification('Caixa aberto com sucesso!');
    setTimeout(() => setNotification(null), 3000);
  };

  const closeCashDrawer = (closingCash: number) => {
    setCashDrawer({
      isOpen: false,
      openingCash: 0,
      previousClosingCash: closingCash,
    });
    setNotification('Caixa fechado com sucesso!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSale = () => {
    if (!selectedPaymentMethod) {
      setNotification('Selecione uma forma de pagamento');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    if (selectedItems.length === 0) {
      setNotification('Adicione itens à venda');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    const total = calculateTotal();
    const newSale: Sale = {
      id: Date.now().toString(),
      items: selectedItems,
      total,
      paymentMethod: selectedPaymentMethod,
      date: new Date(),
      discount: discount,
      withdrawals: withdrawals.length > 0 ? withdrawals : [],
    };
    setSales(prev => [...prev, newSale]);
    setSelectedItems([]);
    setSelectedPaymentMethod(null);
    setDiscount(0);
    setWithdrawals([]);
    setNotification('Venda registrada com sucesso!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleWithdrawal = (amount: number, reason: string) => {
    const newWithdrawal: Withdrawal = {
      id: Date.now().toString(),
      amount,
      reason,
      date: new Date(),
    };
    setWithdrawals(prev => [...prev, newWithdrawal]);
    setNotification('Retirada registrada!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartDay = (openingCash: number) => {
    openCashDrawer(openingCash);
    setIsCashDrawerModalOpen(false);
  };

  const handleChangeView = (view: View) => {
    setCurrentView(view);
    if (view === 'register') {
      // Reset somente dos itens de venda quando sair para cadastro
      setSelectedItems([]);
      setSelectedPaymentMethod(null);
      setDiscount(0);
      setWithdrawals([]);
    }
  };

  const handleGenerateReport = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.toISOString().split('T')[0] === today;
    });

    const totalSales = todaysSales.reduce((acc, sale) => acc + sale.total, 0);
    const totalDiscounts = todaysSales.reduce((acc, sale) => acc + (sale.discount || 0), 0);

    const methodTotals: Record<PaymentMethod, number> = {
      pix: 0,
      credito: 0,
      debito: 0,
      dinheiro: 0,
    };

    todaysSales.forEach(sale => {
      methodTotals[sale.paymentMethod] += sale.total;
    });

    const report = {
      date: today,
      totalSales,
      totalDiscounts,
      methodTotals,
      withdrawals,
    };

    setHistoricalReports(prevReports => ({
      ...prevReports,
      [today]: report,
    }));

    setNotification('Relatório do dia gerado com sucesso!');
    setTimeout(() => setNotification(null), 3000);
  }, [sales, withdrawals]);

  return (
    <div className="min-h-screen bg-gray-100 relative z-10">
      <Header
        currentView={currentView}
        onChangeView={handleChangeView}
        onOpenCashDrawer={() => setIsCashDrawerModalOpen(true)}
        cashDrawer={cashDrawer}
        onCloseCashDrawer={closeCashDrawer}
      />

      <main className="p-6 max-w-6xl mx-auto">
        {/* Cadastro (somente cadastro/lista) */}
        {currentView === 'register' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ProductRegistration
                onRegister={handleRegisterProduct}
                products={products}
                onDelete={handleDeleteProduct}
                onEdit={handleEditProduct}
              />
            </div>
            {/* Mantém o grid alinhado sem exibir Vendas */}
            <div className="lg:col-span-2"></div>
          </div>
        )}

        {/* Vendas (somente vendas/carrinho) */}
        {currentView === 'sales' && (
          <div className="grid grid-cols-1 gap-6">
            <SalesScreen
              products={filteredProducts}
              onAddItem={addItemToSale}
              onRemoveItem={removeItemFromSale}
              selectedItems={selectedItems}
              onConfirmSale={handleSale}
              total={calculateTotal()}
              onPaymentMethodChange={setSelectedPaymentMethod}
              selectedPaymentMethod={selectedPaymentMethod}
              discount={discount}
              setDiscount={setDiscount}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onWithdrawal={handleWithdrawal}
              withdrawals={withdrawals}
            />
          </div>
        )}

        {currentView === 'dailyReport' && (
          <DailyReport
            sales={sales}
            onGenerateReport={handleGenerateReport}
            withdrawals={withdrawals}
          />
        )}

        {currentView === 'previousReport' && (
          <PreviousReport historicalReports={historicalReports} />
        )}
      </main>

      {notification && (
        <div className="fixed top-20 right-4 bg-green-50 text-green-800 border border-green-200 px-6 py-3 rounded-lg shadow-lg z-50">
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
