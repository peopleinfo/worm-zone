import { GameLayout } from "./components/Layout/GameLayout";
import { useEffect } from "react";
import { useAuthStore } from "./stores/authStore";

function App() {
  const { initializeAuth } = useAuthStore();

  // Auto login on component mount using auth store
  useEffect(() => {
    const autoLogin = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.log("Auto login failed, continuing as guest:", error);
      }
    };

    // Delay to ensure MOS SDK is loaded
    const timer = setTimeout(autoLogin, 1000);
    return () => clearTimeout(timer);
  }, [initializeAuth]);

  useEffect(() => {
    const test = async () => {
      const mos = window.mos;
      console.log("mosSDK ", mos);
      return mos;
    };
    test().then(console.log);
  }, []);
  return (
    <div className="App">
      <GameLayout />
    </div>
  );
}

export default App;
