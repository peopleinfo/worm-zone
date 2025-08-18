import { GameLayout } from "./components/Layout/GameLayout";
import { SplashScreen } from "./components/SplashScreen";
import { UserInfoDeniedModal } from "./components/Game/UserInfoDeniedModal";
import { useEffect } from "react";
import { useAuthStore } from "./stores/authStore";

function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const isLoadingInit = useAuthStore((s) => s.isLoadingInit);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isUserInfoDenied = useAuthStore((s) => s.isUserInfoDenied);

  // Auto login function
  const autoLogin = async () => {
    try {
      await initializeAuth();
    } catch (error: any) {
      console.log("Auto login failed:", error);
    }
  };

  // Auto login on component mount using auth store
  useEffect(() => {
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
  if (!isUserInfoDenied) {
    return <UserInfoDeniedModal onRetry={autoLogin} />;
  }
  if (isLoadingInit || !isLoggedIn) {
    return <SplashScreen />;
  }
  return (
    <div className="App">
      <div className="game-container">
        <GameLayout />
      </div>
    </div>
  );
}

export default App;
