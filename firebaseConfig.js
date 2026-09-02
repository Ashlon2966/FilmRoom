import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCGaH7dVEnuDLa0bVu6goDk5lR88gEvIs0",
  authDomain: "testapp-51c3c.firebaseapp.com",
  projectId: "testapp-51c3c",
  storageBucket: "testapp-51c3c.firebasestorage.app",
  messagingSenderId: "928002592446",
  appId: "1:928002592446:web:57e83da348823e8df018ef",
  measurementId: "G-DXYTGQ67H5"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;