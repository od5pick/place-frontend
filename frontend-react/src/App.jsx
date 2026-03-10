
import React, { useState } from "react";
import Home from "./pages/Home";
import Result from "./pages/Result";

export default function App() {
  const [result, setResult] = useState(null);

  return result
    ? <Result data={result} onBack={() => setResult(null)} />
    : <Home onResult={setResult} />;
}
