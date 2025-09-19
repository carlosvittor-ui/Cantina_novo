import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../App';

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, reason: string) => void;
    maxAmount: number;
}

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, onConfirm, maxAmount }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setReason('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Por favor, insira um valor válido.");
            return;
        }
        if (numAmount > maxAmount) {
            setError(`O valor não pode exceder o total em caixa: ${formatCurrency(maxAmount)}`);
            return;
        }
        if (!reason.trim()) {
            setError("Por favor, preencha o motivo da retirada.");
            return;
        }
        onConfirm(numAmount, reason.trim());
    };

    const isConfirmDisabled = !amount || !reason.trim() || parseFloat(amount) <= 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Registrar Retirada de Caixa</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Insira os detalhes da retirada. O valor será deduzido do fechamento do caixa.</p>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="withdrawal-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Valor da Retirada (Disponível: {formatCurrency(maxAmount)})
                        </label>
                        <div className="relative mt-1">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                           <input 
                                type="number"
                                id="withdrawal-amount"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError(null);
                                }}
                                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                step="0.01"
                                min="0"
                            />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="withdrawal-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo / Responsável</label>
                        <input
                            type="text"
                            id="withdrawal-reason"
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                setError(null);
                            }}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                </div>

                {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

                <div className="mt-8 flex justify-end space-x-4">
                     <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 py-2 px-4 rounded-md font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        onClick={handleConfirm}
                        className="bg-orange-500 text-white py-2 px-4 rounded-md font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={isConfirmDisabled}
                    >
                        Confirmar Retirada
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WithdrawalModal;
