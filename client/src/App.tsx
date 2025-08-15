import { GameLayout } from "./components/Layout/GameLayout";
import { SplashScreen } from "./components/SplashScreen";
import { useEffect } from "react";
import { useAuthStore } from "./stores/authStore";

function App() {
  const initializeAuth = useAuthStore((s)=> s.initializeAuth);
  const isLoadingInit = useAuthStore((s) => s.isLoadingInit);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

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

  // useEffect(() => {
  //   const test = async () => {
  //     const mos = window.mos;
  //     console.log("mosSDK ", mos);
  //     return mos;
  //   };
  //   test().then(console.log);
  // }, []);
  
  if (isLoadingInit || !isLoggedIn) {
    return <SplashScreen />;
  }
  return (
    <div className="App">
      <GameLayout />
    </div>
  );
}

export default App;
