/* ==== App.tsx (versão completa com Supabase) ==== */
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ProductRegistration from './components/ProductRegistration';
import SalesScreen from './components/SalesScreen';
import DailyReport from './components/DailyReport';
import PreviousReport from './components/PreviousReport';
import OpenCashDrawerModal from './components/OpenCashDrawerModal';
import { Product, Sale, View, CashDrawer, HistoricalReport, PaymentMethod, SaleItem, Withdrawal } from './types';
import { getSupabase } from './supabaseClient';


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

/* ==================== UTIL SUPABASE (ADICIONADO) ==================== */

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
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
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

    /* ===== Carregar do Supabase na abertura (ADICIONADO) ===== */
    useEffect(() => {
        (async () => {
            const { data, error } = await supabase
                .from('app_state')
                .select('value')
                .eq('key', 'default')
                .maybeSingle();
            if (error) {
                console.error('Supabase load error:', error);
                return;
            }
            if (data?.value) {
                const v = reviveDates(data.value as AppState);
                setProducts(v.products ?? []);
                setSales(v.sales ?? []);
                setCurrentView(v.currentView ?? 'register');
                setCashDrawer(v.cashDrawer ?? { isOpen: false, openingCash: 0, previousClosingCash: 0 });
                setHistoricalReports(v.historicalReports ?? {} as any);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ===== Salvar no Supabase a cada mudança (ADICIONADO) ===== */
    useEffect(() => {
        const state: AppState = { products, sales, currentView, cashDrawer, historicalReports };
        const t = setTimeout(async () => {
            const { error } = await supabase
                .from('app_state')
                .upsert({
                    key: 'default',
                    value: state,
                    updated_at: new Date().toISOString(),
                });
            if (error) console.error('Supabase save error:', error);
        }, 500);
        return () => clearTimeout(t);
    }, [products, sales, currentView, cashDrawer, historicalReports]);

    /* ==== (restante do seu App.tsx permanece exatamente como estava) ==== */
    // ... (seu código existente — componentes, handlers, UI, etc.)
}
