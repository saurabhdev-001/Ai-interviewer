import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    isSessionLoading: true,
    sessionError: null,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      state.isSessionLoading = false;
      state.sessionError = null;
    },
    setSessionLoading: (state, action) => {
      state.isSessionLoading = action.payload;
    },
    setSessionError: (state, action) => {
      state.sessionError = action.payload;
      state.isSessionLoading = false;
    },
    clearSessionError: (state) => {
      state.sessionError = null;
    },
  },
});

export const {
  setUserData,
  setSessionLoading,
  setSessionError,
  clearSessionError,
} = userSlice.actions;

export default userSlice.reducer;