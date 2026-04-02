
import React, { useState, useCallback } from "react";
import ShellHeader from "./layout/ShellHeader";
import ShellFooter from "./layout/ShellFooter";
import { SHELL_TAB } from "./layout/shellTabs";
import Home from "./pages/Home";
import "./pages/home.css";
import "./pages/result.css";
import "./pages/result/result-blog-tab.css";

export default function App() {
  const [result, setResult] = useState(null);
  const [shellTab, setShellTab] = useState(SHELL_TAB.HOME);
  const [blogIndustry, setBlogIndustry] = useState("hairshop");

  const changeTab = useCallback((next) => {
    setShellTab(next);
    window.scrollTo(0, 0);
  }, []);

  const onDiagnoseResult = useCallback((payload) => {
    setResult(payload);
    setShellTab(SHELL_TAB.PLACE);
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="home-page">
      <ShellHeader activeTab={shellTab} onTabChange={changeTab} />
      <main className="home-tab-main">
        <Home
          tab={shellTab}
          setTab={changeTab}
          result={result}
          onDiagnoseResult={onDiagnoseResult}
          onClearResult={() => setResult(null)}
          blogIndustry={blogIndustry}
          setBlogIndustry={setBlogIndustry}
        />
      </main>
      <ShellFooter />
    </div>
  );
}
