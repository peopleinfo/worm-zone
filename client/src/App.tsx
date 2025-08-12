import { GameLayout } from "./components/Layout/GameLayout";
import { useEffect } from "react";

function App() {
  useEffect(() => {
   window.mos.getWindowInfo().then((info) => console.log('getWindowInfo', info));
  }, []);
  return (
    <div className="App">
      <GameLayout />
    </div>
  );
}

export default App;
