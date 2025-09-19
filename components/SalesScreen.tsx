
import React, { useState, useMemo, useEffect } from 'react';
import { Product, SaleItem, PaymentMethod } from '../types';
import { formatCurrency } from '../App';

interface SalesScreenProps {
    products: Product[];
    onAddSale: (
        cartItems: SaleItem[], 
        paymentMethod: PaymentMethod, 
        discount?: { type: 'percentage' | 'fixed'; value: number }
    ) => void;
}

type Category = 'Alimentos' | 'Loja';

const SalesScreen: React.FC<SalesScreenProps> = ({ products, onAddSale }) => {
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
    const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
    const [discountValue, setDiscountValue] = useState<string>('');
    const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
    const [totalPulse, setTotalPulse] = useState(false);
    const [activeCategory, setActiveCategory] = useState<Category>('Alimentos');

    const availableProducts = useMemo(() => {
        return products.filter(p => p.stock > 0 && p.category === activeCategory)
    }, [products, activeCategory]);

    const triggerHighlight = (productId: string) => {
        setHighlightedProductId(productId);
        setTimeout(() => {
            setHighlightedProductId(null);
        }, 1000);
    };

    const addToCart = (product: Product) => {
        const existingItem = cart.find(item => item.productId === product.id);
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
            }
        } else {
            setCart([...cart, { productId: product.id, productName: product.name, quantity: 1, pricePerItem: product.price }]);
        }
        triggerHighlight(product.id);
    };
    
    const updateQuantity = (productId: string, newQuantity: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        const clampedQuantity = Math.max(0, Math.min(newQuantity, product.stock));
        
        if (clampedQuantity === 0) {
            setCart(cart.filter(item => item.productId !== productId));
        } else {
            setCart(cart.map(item => item.productId === productId ? { ...item, quantity: clampedQuantity } : item));
        }
        triggerHighlight(productId);
    };

    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.pricePerItem * item.quantity, 0), [cart]);

    const discountAmount = useMemo(() => {
        const value = parseFloat(discountValue) || 0;
        if (value <= 0) return 0;
        if (discountType === 'percentage') {
            return subtotal * (value / 100);
        }
        return Math.min(value, subtotal);
    }, [discountValue, discountType, subtotal]);

    const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

    const prevTotalRef = React.useRef(total);
    useEffect(() => {
        if (prevTotalRef.current !== total) {
            setTotalPulse(true);
            const timer = setTimeout(() => setTotalPulse(false), 500);
            return () => clearTimeout(timer);
        }
        prevTotalRef.current = total;
    }, [total]);

    const handleFinalizeSale = () => {
        onAddSale(
            cart, 
            paymentMethod, 
            discountValue ? { type: discountType, value: parseFloat(discountValue) } : undefined
        );
        setCart([]);
        setDiscountValue('');
        setPaymentMethod(PaymentMethod.Cash);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-100px)] mt-6">
            {/* Products Grid */}
            <div className="lg:col-span-2 overflow-y-auto pr-4">
                 <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveCategory('Alimentos')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeCategory === 'Alimentos'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                            }`}
                        >
                            Alimentos
                        </button>
                        <button
                            onClick={() => setActiveCategory('Loja')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeCategory === 'Loja'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                            }`}
                        >
                            Loja
                        </button>
                    </nav>
                </div>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {availableProducts.map(product => (
                        <button key={product.id} onClick={() => addToCart(product)} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 text-center transition-transform transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                            <p className="text-indigo-600 dark:text-indigo-400 font-bold my-1">{formatCurrency(product.price)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Estoque: {product.stock}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Current Sale Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-full">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold">Venda Atual</h2>
                </div>
                
                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-10">Carrinho vazio</p>
                    ) : (
                        cart.map(item => (
                            <div key={item.productId} className={`flex items-center justify-between p-2 rounded-md transition-colors duration-1000 ${item.productId === highlightedProductId ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-transparent'}`}>
                                <div>
                                    <p className="font-semibold">{item.productName}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.pricePerItem)}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700">-</button>
                                    <input 
                                        type="number" 
                                        value={item.quantity} 
                                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                                        className="w-12 text-center bg-transparent dark:text-white"
                                    />
                                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700">+</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700 space-y-4">
                    {/* Summary */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-500">
                            <span>Desconto</span>
                            <span>- {formatCurrency(discountAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold">
                            <span>Total</span>
                            <span className={totalPulse ? 'pulse-text' : ''}>{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Discount */}
                    <div className="flex space-x-2">
                        <div className="flex-grow relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{discountType === 'fixed' ? 'R$' : '%'}</span>
                           <input 
                                type="number"
                                placeholder="Desconto"
                                value={discountValue}
                                onChange={e => setDiscountValue(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <button onClick={() => setDiscountType('fixed')} className={`px-3 py-2 rounded-md ${discountType === 'fixed' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>R$</button>
                        <button onClick={() => setDiscountType('percentage')} className={`px-3 py-2 rounded-md ${discountType === 'percentage' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>%</button>
                    </div>

                    {/* Payment */}
                     <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setPaymentMethod(PaymentMethod.Cash)} className={`py-2 rounded-md font-semibold ${paymentMethod === PaymentMethod.Cash ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Dinheiro</button>
                        <button onClick={() => setPaymentMethod(PaymentMethod.Pix)} className={`py-2 rounded-md font-semibold ${paymentMethod === PaymentMethod.Pix ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Pix</button>
                    </div>

                    <button 
                        onClick={handleFinalizeSale}
                        disabled={cart.length === 0}
                        className="w-full bg-indigo-600 text-white py-3 rounded-md font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                    >
                        Finalizar Venda
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalesScreen;