import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Method } from "./pages/Method";
import { Overview } from "./pages/Overview";
import { Season } from "./pages/Season";
import { SeasonsProvider } from "./seasons";

export function App() {
  return (
    <BrowserRouter>
      <SeasonsProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="season/:year" element={<Season />} />
            <Route path="method" element={<Method />} />
            <Route path="*" element={<p className="status">That page is not part of the lab.</p>} />
          </Route>
        </Routes>
      </SeasonsProvider>
    </BrowserRouter>
  );
}
