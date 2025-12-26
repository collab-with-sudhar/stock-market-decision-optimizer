import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { addTick } from '../redux/chartSlice.js';
import { addSignal } from '../redux/signalsSlice.js';
import { setSocketConnected } from '../redux/websocketSlice.js';


export const useWebSocket = () => {
  const dispatch = useDispatch();
  const socketConnected = useSelector((state) => state.websocket.socketConnected);

  useEffect(() => {
    console.log('[useWebSocket] Initializing global WebSocket connection...');

    
    const socket = io('https://hawaiian-stones-jersey-cookbook.trycloudflare.com', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      withCredentials: true,
    });

    
    socket.on('connect', () => {
      console.log('[useWebSocket] Socket connected:', socket.id);
      dispatch(setSocketConnected(true));
    });

    socket.on('disconnect', (reason) => {
      console.log('[useWebSocket] Socket disconnected:', reason);
      dispatch(setSocketConnected(false));
    });

    socket.on('connect_error', (error) => {
      console.error('[useWebSocket] Connection error:', error.message);
      dispatch(setSocketConnected(false));
    });

    
    socket.on('tick', (tick) => {
      try {
        const price = Number(tick?.price ?? tick?.ltp ?? tick?.last_price);
        if (price && !Number.isNaN(price) && price > 0) {
          dispatch(addTick({ price, ts: Number(tick?.ts ?? Date.now()) }));
        }
      } catch (err) {
        console.error('[useWebSocket] Error processing tick:', err);
      }
    });

    
    socket.on('decision', (data) => {
      try {
        console.log('[useWebSocket] Received decision:', data);
        if (!data || typeof data !== 'object') {
          console.warn('[useWebSocket] Invalid decision data received');
          return;
        }

        
        const normalized = {
          ...data,
          action: data.action ?? 0,
          symbol: data.symbol || 'NIFTY',
          createdAt: data.createdAt || new Date().toISOString()
        };

        console.log('[useWebSocket] Dispatching normalized decision:', normalized);
        dispatch(addSignal(normalized));
      } catch (err) {
        console.error('[useWebSocket] Error processing decision:', err);
      }
    });

    
    return () => {
      console.log('[useWebSocket] Cleaning up global WebSocket connection');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('tick');
      socket.off('decision');
      socket.disconnect();
    };
  }, [dispatch]);

  return { socketConnected };
};
