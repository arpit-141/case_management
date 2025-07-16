import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CasesProvider } from "./contexts/CasesContext";
import Header from "./components/Header";
import CasesDashboard from "./pages/CasesDashboard";
import CaseDetail from "./pages/CaseDetail";
import CreateCase from "./pages/CreateCase";
import EditCase from "./pages/EditCase";
import "./App.css";

function App() {
  return (
    <CasesProvider>
      <div className="App min-h-screen bg-gray-50">
        <BrowserRouter>
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<CasesDashboard />} />
              <Route path="/cases" element={<CasesDashboard />} />
              <Route path="/cases/new" element={<CreateCase />} />
              <Route path="/cases/:id" element={<CaseDetail />} />
              <Route path="/cases/:id/edit" element={<EditCase />} />
            </Routes>
          </main>
        </BrowserRouter>
      </div>
    </CasesProvider>
  );
}

export default App;