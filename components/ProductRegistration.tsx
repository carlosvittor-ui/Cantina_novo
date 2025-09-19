import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { Product } from '../types';
import { formatCurrency } from '../App';

interface ProductRegistrationProps {
    products: Product[];
    onAddProduct: (productData: Omit<Product, 'id'>) => void;
    onUpdateProduct: (updatedProduct: Product) => void;
    onBulkAddProducts: (newProducts: Omit<Product, 'id'>[]) => void;
}

interface NumberInputProps {
    label: string;
    id: string;
    value: number;
    onValueChange: (value: number) => void;
    min?: number;
    step?: number;
}

const NumberInputWithControls: React.FC<NumberInputProps> = ({ label, id, value, onValueChange, min = 0, step = 1 }) => {
    const handleIncrement = () => onValueChange(value + step);
    const handleDecrement = () => onValueChange(Math.max(min, value - step));

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="mt-1 flex items-center rounded-md shadow-sm border border-gray-300 dark:border-gray-600">
                <button
                    type="button"
                    onClick={handleDecrement}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-l-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none"
                    aria-label={`Diminuir ${label}`}
                >
                    -
                </button>
                <input
                    type="number"
                    id={id}
                    value={value}
                    onChange={(e) => onValueChange(Number(e.target.value))}
                    min={min}
                    step={step}
                    className="block w-full text-center px-3 py-2 bg-white dark:bg-gray-900 border-x-0 focus:outline-none focus:ring-0"
                    required
                />
                <button
                    type="button"
                    onClick={handleIncrement}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-r-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none"
                    aria-label={`Aumentar ${label}`}
                >
                    +
                </button>
            </div>
        </div>
    );
};


const ProductRegistration: React.FC<ProductRegistrationProps> = ({ products, onAddProduct, onUpdateProduct, onBulkAddProducts }) => {
    const [name, setName] = useState('');
    const [stock, setStock] = useState(0);
    const [price, setPrice] = useState(0);
    const [category, setCategory] = useState<'Alimentos' | 'Loja'>('Alimentos');
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const prevProductsRef = useRef<Product[]>(products);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Detect product addition by comparing current and previous products list
        if (products.length > prevProductsRef.current.length) {
            const newProduct = products.find(p => !prevProductsRef.current.some(prevP => prevP.id === p.id));
            if (newProduct) {
                setHighlightedId(newProduct.id);
                setTimeout(() => {
                    setHighlightedId(null);
                }, 1500);
            }
        }
        prevProductsRef.current = products;
    }, [products]);

    const handleAddSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (name && price >= 0 && stock >= 0) {
            onAddProduct({ name, stock, price, category });
            setName('');
            setStock(0);
            setPrice(0);
            setCategory('Alimentos');
        }
    };
    
    const handleEditClick = (product: Product) => {
        setEditingProduct({ ...product });
        setIsEditModalOpen(true);
    };
    
    const handleUpdateSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            onUpdateProduct(editingProduct);
            setHighlightedId(editingProduct.id);
            setTimeout(() => {
                setHighlightedId(null);
            }, 1500);
            setIsEditModalOpen(false);
            setEditingProduct(null);
        }
    };

    const handleExportTemplate = () => {
        const headers = 'name,stock,price,category';
        const exampleRow = 'Exemplo Produto,10,2.50,Alimentos';
        const csvContent = "data:text/csv;charset=utf-8," + [headers, exampleRow].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "modelo_produtos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) {
                alert("CSV vazio ou contém apenas o cabeçalho.");
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const requiredHeaders = ['name', 'stock', 'price', 'category'];
            if (!requiredHeaders.every(h => headers.includes(h))) {
                alert(`Cabeçalho do CSV inválido. Certifique-se de que contém: ${requiredHeaders.join(', ')}`);
                return;
            }

            const newProducts: Omit<Product, 'id'>[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const productData = headers.reduce((obj, header, index) => {
                    obj[header] = values[index]?.trim();
                    return obj;
                }, {} as any);

                const stock = parseInt(productData.stock, 10);
                const price = parseFloat(productData.price);
                const category = productData.category === 'Loja' ? 'Loja' : 'Alimentos';

                if (productData.name && !isNaN(stock) && !isNaN(price)) {
                    newProducts.push({ name: productData.name, stock, price, category });
                }
            }
            onBulkAddProducts(newProducts);
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-6">
            {/* Form Column */}
            <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold mb-4">Adicionar Novo Produto</h2>
                    <form onSubmit={handleAddSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Produto</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                            <div className="mt-2 flex space-x-4">
                                <label className="flex items-center">
                                    <input type="radio" value="Alimentos" checked={category === 'Alimentos'} onChange={() => setCategory('Alimentos')} className="form-radio h-4 w-4 text-indigo-600 transition duration-150 ease-in-out" />
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Alimentos</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="radio" value="Loja" checked={category === 'Loja'} onChange={() => setCategory('Loja')} className="form-radio h-4 w-4 text-indigo-600 transition duration-150 ease-in-out" />
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Loja</span>
                                </label>
                            </div>
                        </div>

                        <NumberInputWithControls
                            label="Estoque"
                            id="stock"
                            value={stock}
                            onValueChange={setStock}
                            min={0}
                            step={1}
                        />
                        <NumberInputWithControls
                            label="Preço (R$)"
                            id="price"
                            value={price}
                            onValueChange={setPrice}
                            min={0}
                            step={0.50}
                        />
                        <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-indigo-700 transition-colors">
                            Adicionar Produto
                        </button>
                    </form>
                </div>
            </div>

            {/* Table Column */}
            <div className="lg:col-span-3">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                        <h2 className="text-xl font-bold">Produtos Cadastrados</h2>
                        <div className="flex items-center space-x-2">
                             <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv" className="hidden" />
                             <button onClick={handleExportTemplate} className="text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-3 rounded-md font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                Exportar Modelo
                            </button>
                            <button onClick={handleImportClick} className="text-sm bg-green-600 text-white py-2 px-3 rounded-md font-semibold hover:bg-green-700 transition-colors">
                                Importar Produtos
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nome</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Categoria</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estoque</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Preço</th>
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">Editar</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {products.map((product) => (
                                    <tr key={product.id} className={product.id === highlightedId ? 'highlight-row' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.category}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.stock}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(product.price)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleEditClick(product)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && editingProduct && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                        <h2 className="text-xl font-bold mb-4">Editar Produto</h2>
                        <form onSubmit={handleUpdateSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Produto</label>
                                <input
                                    type="text"
                                    id="edit-name"
                                    value={editingProduct.name}
                                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                                <div className="mt-2 flex space-x-4">
                                    <label className="flex items-center">
                                        <input type="radio" value="Alimentos" checked={editingProduct.category === 'Alimentos'} onChange={() => setEditingProduct({...editingProduct, category: 'Alimentos'})} className="form-radio h-4 w-4 text-indigo-600" />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Alimentos</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="radio" value="Loja" checked={editingProduct.category === 'Loja'} onChange={() => setEditingProduct({...editingProduct, category: 'Loja'})} className="form-radio h-4 w-4 text-indigo-600" />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Loja</span>
                                    </label>
                                </div>
                            </div>
                           <NumberInputWithControls
                                label="Estoque"
                                id="edit-stock"
                                value={editingProduct.stock}
                                onValueChange={(value) => setEditingProduct({...editingProduct, stock: value})}
                                min={0}
                                step={1}
                            />
                            <NumberInputWithControls
                                label="Preço (R$)"
                                id="edit-price"
                                value={editingProduct.price}
                                onValueChange={(value) => setEditingProduct({...editingProduct, price: value})}
                                min={0}
                                step={0.50}
                            />
                            <div className="flex justify-end space-x-4 pt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 py-2 px-4 rounded-md font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-indigo-700 transition-colors">
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductRegistration;