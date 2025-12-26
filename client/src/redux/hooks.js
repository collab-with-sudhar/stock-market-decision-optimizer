import { useDispatch, useSelector } from 'react-redux';
import { clearCandles, addTick, setCandles } from './chartSlice';
import { clearSignals, addSignal } from './signalsSlice';


export const useAppState = () => {
  const dispatch = useDispatch();
  
  const candles = useSelector((state) => state.chart.candles);
  const currentPrice = useSelector((state) => state.chart.currentPrice);
  const chartLastUpdated = useSelector((state) => state.chart.lastUpdated);
  
  const signals = useSelector((state) => state.signals.signals);
  const totalSignals = useSelector((state) => state.signals.totalSignals);
  const signalsLastUpdated = useSelector((state) => state.signals.lastUpdated);

  return {
    
    candles,
    currentPrice,
    chartLastUpdated,
    
    
    signals,
    totalSignals,
    signalsLastUpdated,
    
    
    addTick: (payload) => dispatch(addTick(payload)),
    setCandles: (payload) => dispatch(setCandles(payload)),
    clearChartData: () => dispatch(clearCandles()),
    
    
    addSignal: (payload) => dispatch(addSignal(payload)),
    clearSignalData: () => dispatch(clearSignals()),
    
    
    clearAllData: () => {
      dispatch(clearCandles());
      dispatch(clearSignals());
      localStorage.removeItem('reduxState');
    },
  };
};


export const getStorageInfo = () => {
  try {
    const stored = localStorage.getItem('reduxState');
    const sizeInBytes = new Blob([stored]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    return {
      size: sizeInKB,
      unit: 'KB',
      stored: !!stored,
    };
  } catch {
    return { size: 0, unit: 'KB', stored: false };
  }
};
