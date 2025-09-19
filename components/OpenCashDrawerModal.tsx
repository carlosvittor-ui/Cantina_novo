
import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../App';

interface OpenCashDrawerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartDay: (amount: number) => void;
    previousClosingCash: number;
}

type StartOption = 'previous' | 'manual';

const OpenCashDrawerModal: React.FC<OpenCashDrawerModalProps> = ({ isOpen, onClose, onStartDay, previousClosingCash }) => {
    const [selectedOption, setSelectedOption] = useState<StartOption>('previous');
    const [manualAmount, setManualAmount] = useState<string>('');
    
    useEffect(() => {
        if(isOpen) {
            setSelectedOption('previous');
            setManualAmount('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleStart = () => {
        if (selectedOption === 'previous') {
            onStartDay(previousClosingCash);
        } else {
            const amount = parseFloat(manualAmount);
            if (!isNaN(amount) && amount >= 0) {
                onStartDay(amount);
            }
        }
    };
    
    const openingAmount = selectedOption === 'previous' ? previousClosingCash : parseFloat(manualAmount) || 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Iniciar Caixa</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Selecione o valor de abertura para o caixa de hoje.</p>
                
                <div className="space-y-4">
                    <button 
                        onClick={() => setSelectedOption('previous')}
                        className={`w-full text-left p-4 border rounded-lg transition-colors ${selectedOption === 'previous' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50 ring-2 ring-indigo-500' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <p className="font-semibold">Usar saldo de fechamento anterior</p>
                        <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(previousClosingCash)}</p>
                    </button>
                    
                    <button 
                        onClick={() => setSelectedOption('manual')}
                        className={`w-full text-left p-4 border rounded-lg transition-colors ${selectedOption === 'manual' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50 ring-2 ring-indigo-500' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <p className="font-semibold">Inserir valor manual</p>
                         <div className="relative mt-2">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                           <input 
                                type="number"
                                placeholder="0.00"
                                value={manualAmount}
                                onChange={e => setManualAmount(e.target.value)}
                                onClick={() => setSelectedOption('manual')}
                                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                step="0.01"
                                min="0"
                            />
                        </div>
                    </button>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                     <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 py-2 px-4 rounded-md font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        onClick={handleStart} 
                        className="bg-indigo-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-indigo-700 transition-colors"
                        disabled={selectedOption === 'manual' && (manualAmount === '' || parseFloat(manualAmount) < 0)}
                    >
                        Iniciar Dia com {formatCurrency(openingAmount)}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OpenCashDrawerModal;
