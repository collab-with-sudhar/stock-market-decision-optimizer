import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  socketConnected: false,
  lastConnected: null,
  lastDisconnected: null,
};

export const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    setSocketConnected: (state, action) => {
      state.socketConnected = action.payload;
      if (action.payload) {
        state.lastConnected = new Date().toISOString();
      } else {
        state.lastDisconnected = new Date().toISOString();
      }
    },
  },
});

export const { setSocketConnected } = websocketSlice.actions;
export default websocketSlice.reducer;
