import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { CatalogPage } from '@/pages/public/CatalogPage'
import { CertificateDetailPage } from '@/pages/public/CertificateDetailPage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'

// Routes from specs/FRONTEND.md §3. Admin pages are loaded on demand, so visitors of the public catalog
// never download them.
const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin" replace /> },
  {
    path: '/c/:shareToken',
    element: <CatalogPage />,
    children: [{ path: ':certificateId', element: <CertificateDetailPage /> }],
  },
  {
    path: '/login',
    lazy: async () => ({ Component: (await import('@/pages/admin/LoginPage')).LoginPage }),
  },
  {
    path: '/admin',
    lazy: async () => ({ Component: (await import('@/components/RequireAuth')).RequireAuth }),
    children: [
      {
        lazy: async () => ({ Component: (await import('@/components/AdminLayout')).AdminLayout }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/pages/admin/CertificateListPage')).CertificateListPage,
            }),
          },
          {
            path: 'certificates/new',
            lazy: async () => ({
              Component: (await import('@/pages/admin/CertificateFormPage')).CertificateFormPage,
            }),
          },
          {
            path: 'certificates/:id',
            lazy: async () => ({
              Component: (await import('@/pages/admin/CertificateFormPage')).CertificateFormPage,
            }),
          },
          {
            path: 'settings',
            lazy: async () => ({
              Component: (await import('@/pages/admin/SettingsPage')).SettingsPage,
            }),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export function App() {
  return <RouterProvider router={router} />
}
