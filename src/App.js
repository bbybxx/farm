import React, { useState } from 'react';
import CalculatorForm from './components/CalculatorForm.jsx';
import ResultDisplay from './components/ResultDisplay.jsx';
import './App.css';

function App() {
  // Добавляем amount в начальное состояние
  const [calculationResult, setCalculationResult] = useState({
    targetItem: '',  // Целевой предмет
    result: {},      // Здесь будут базовые ресурсы
    recipes: {},
    activePerks: [],
    amount: 1,        // Исходное количество для крафта
    intermediateResources: {} // Промежуточные ресурсы
  });

  // Эта функция получает данные из CalculatorForm
  const handleCalculate = (calculationData) => {
    const { targetItem, result, recipes, activePerks, amount, intermediateResources } = calculationData;
    setCalculationResult({
      targetItem,
      result,
      recipes,
      activePerks,
      amount,
      intermediateResources
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Craft Calculator</h1>
      </header>

      <main className="app-content">
        <div className="calculator-section">
          {/* Передаем обработчик в форму */}
          <CalculatorForm onCalculate={handleCalculate} />
        </div>

        <div className="results-section">
          {console.log('App.js - состояние calculationResult перед передачей в ResultDisplay:', calculationResult)}
          <ResultDisplay calculationResult={calculationResult} />
        </div>
      </main>

      <footer className="app-footer">
        <p>&#169; 2025 Craft Calculator</p> {/* Год можно сделать динамическим, но пока оставим так */}
      </footer>
    </div>
  );
}

export default App;