import { createBrowserRouter, RouterProvider } from 'react-router'
import { AdminLayout } from '@/components/AdminLayout'
import { RequireAuth } from '@/components/RequireAuth'
import { CertificateFormPage } from '@/pages/admin/CertificateFormPage'
import { CertificateListPage } from '@/pages/admin/CertificateListPage'
import { LoginPage } from '@/pages/admin/LoginPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { CatalogPage } from '@/pages/public/CatalogPage'
import { CertificateDetailPage } from '@/pages/public/CertificateDetailPage'
import { HomePage } from '@/pages/public/HomePage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'

// Routes from specs/FRONTEND.md §3.
const router = createBrowserRouter([
  { path: '/', element: <HomePage /> }, // temporary M1 check page
  { path: '/c/:shareToken', element: <CatalogPage /> },
  { path: '/c/:shareToken/:certificateId', element: <CertificateDetailPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <CertificateListPage /> },
          { path: 'certificates/new', element: <CertificateFormPage /> },
          { path: 'certificates/:id', element: <CertificateFormPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export function App() {
  return <RouterProvider router={router} />
}
