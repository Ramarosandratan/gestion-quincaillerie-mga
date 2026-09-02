import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/ProtectedRoute'
import { Shell } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { POSPage } from './pages/POSPage'
import { ProductsPage } from './pages/ProductsPage'
import { ClientsPage } from './pages/ClientsPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { ClosurePage } from './pages/ClosurePage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="caisse" element={<POSPage />} />
            <Route path="produits" element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route index element={<ProductsPage />} />
            </Route>
            <Route path="clients" element={<ClientsPage />} />
            <Route path="depenses" element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route index element={<ExpensesPage />} />
            </Route>
            <Route path="cloture" element={<ClosurePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
