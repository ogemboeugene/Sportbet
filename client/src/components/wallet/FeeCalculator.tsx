import React, { useState, useEffect } from 'react';

interface FeeCalculatorProps {
  amount: number;
  paymentMethod: string;
  onFeeCalculated: (fee: number, total: number) => void;
}

export const FeeCalculator: React.FC<FeeCalculatorProps> = ({
  amount,
  paymentMethod,
  onFeeCalculated,
}) => {
  const [fee, setFee] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    calculateFee();
  }, [amount, paymentMethod]);

  const calculateFee = () => {
    let calculatedFee = 0;
    
    // Fee structure based on payment method
    switch (paymentMethod) {
      case 'stripe':
        calculatedFee = Math.max(0.30, amount * 0.029); // 2.9% + $0.30
        break;
      case 'paypal':
        calculatedFee = amount * 0.034; // 3.4%
        break;
      case 'flutterwave':
        calculatedFee = amount * 0.014; // 1.4%
        break;
      case 'paystack':
        calculatedFee = amount * 0.015; // 1.5%
        break;
      case 'mpesa':
        calculatedFee = Math.min(amount * 0.01, 5.00); // 1% capped at $5
        break;
      default:
        calculatedFee = 0;
    }

    const calculatedTotal = amount + calculatedFee;
    
    setFee(calculatedFee);
    setTotal(calculatedTotal);
    onFeeCalculated(calculatedFee, calculatedTotal);
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  if (amount <= 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Fee Breakdown</h4>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Amount:</span>
          <span className="font-medium">{formatCurrency(amount)}</span>
        </div>
        
        {fee > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Processing Fee:</span>
            <span className="font-medium">{formatCurrency(fee)}</span>
          </div>
        )}
        
        <div className="border-t border-gray-200 pt-2">
          <div className="flex justify-between">
            <span className="font-medium text-gray-900">Total:</span>
            <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
      
      {fee > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Processing fees are charged by the payment provider
        </p>
      )}
    </div>
  );
};